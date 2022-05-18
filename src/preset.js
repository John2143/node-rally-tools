import {RallyBase, lib, AbortError, Collection, orderedObjectKeys} from  "./rally-tools.js";
import {basename, resolve as pathResolve, dirname} from "path";
import {cached, defineAssoc, spawn} from "./decorators.js";
import {configObject} from "./config.js";
import {loadLocals} from "./config-create.js";
import Provider from "./providers.js";
import Asset from "./asset.js";

// pathtransform for hotfix
import {writeFileSync, readFileSync, pathTransform} from "./fswrap.js";
import path from "path";
import moment from "moment";

let exists = {};

class Preset extends RallyBase{
    constructor({path, remote, data, subProject} = {}){
        // Get full path if possible
        if(path){
            path = pathResolve(path);
            if(dirname(path).includes("silo-metadata")){
                throw new AbortError("Constructing preset from metadata file")
            }
        }

        super();


        // Cache by path
        if(path){
            if(exists[pathTransform(path)]) return exists[pathTransform(path)];
            exists[pathTransform(path)] = this;
        }

        this.meta = {};
        this.subproject = subProject;
        this.remote = remote
        if(lib.isLocalEnv(this.remote)){
            if(path){
                this.path = path;
                let pathspl = this.path.split(".");
                this.ext = pathspl[pathspl.length-1];
                try{
                    this.code = this.getLocalCode();
                }catch(e){
                    if(e.code === "ENOENT" && configObject.ignoreMissing){
                        this.missing = true;
                        return undefined;
                    }else{
                        log(chalk`{red Node Error} ${e.message}`);
                        throw new AbortError("Could not load code of local file");
                    }
                }
                let name = this.parseFilenameForName() || this.parseCodeForName();
                try{
                    this.data = this.getLocalMetadata();
                    this.isGeneric = true;
                    name = this.name;
                }catch(e){
                    log(chalk`{yellow Warning}: ${path} does not have a readable metadata file! Looking for ${this.localmetadatapath}`);
                    this.data = Preset.newShell(name);
                    this.isGeneric = false;
                }
                this.name = name;
            }else{
                this.data = Preset.newShell();
            }
        }else{
            this.data = data;
            //this.name = data.attributes.name;
            //this.id = data.id;
            this.isGeneric = false;
        }
        delete this.data.attributes.rallyConfiguration;
        delete this.data.attributes.systemManaged;
        delete this.data.meta;
    }
    //Given a metadata file, get its actual file
    static async fromMetadata(path, subproject){
        let data;
        try{
            data = JSON.parse(readFileSync(path));
        }catch(e){
            if(e.code === "ENOENT" && configObject.ignoreMissing){
                return null;
            }else{
                throw e;
            }
        }
        let providerType = data.relationships.providerType.data.name;
        let provider = await Provider.getByName("DEV", providerType);

        if(!provider){
            log(chalk`{red The provider type {green ${providerType}} does not exist}`);
            log(chalk`{red Skipping {green ${path}}.}`);
            return null;
        }

        let ext = await provider.getFileExtension();
        let name = data.attributes.name;

        let realpath = Preset.getLocalPath(name, ext, subproject);
        return new Preset({path: realpath, subProject: subproject});
    }

    static newShell(name = undefined){
        return {
            "attributes": {
                "providerSettings": {
                    "PresetName": name
                }
            },
            "relationships": {},
            "type": "presets",
        };
    }
    cleanup(){
        super.cleanup();
        delete this.attributes["createdAt"];
        delete this.attributes["updatedAt"];
    }
    async acclimatize(env){
        if(!this.isGeneric) throw new AbortError("Cannot acclimatize non-generics or shells");
        let providers = await Provider.getAll(env);
        let ptype = this.relationships["providerType"];
            ptype = ptype.data;

        let provider = providers.findByName(ptype.name);
        ptype.id = provider.id;
    }
    get test(){
        if(!this.code) return [];

        const regex = /[^-]autotest:\s?([\w\d_\-. \/]+)[\r\s\n]*?/gm;
        let match
        let matches = []
        while(match = regex.exec(this.code)){
            matches.push(match[1]);
        }
        return matches
    }
    async runTest(env){
        let remote = await Preset.getByName(env, this.name);
        for(let test of this.test){
            log("Tests...");
            let asset;

            if(test.startsWith("id")){
                let match = /id:\s*(\d+)/g.exec(test);
                if(!match){
                    log(chalk`{red Could not parse autotest} ${test}.`);
                    throw new AbortError("Could not properly parse the preset header");
                }
                asset = await Asset.getById(env, match[1]);
            }else{
                asset = await Asset.getByName(env, test);
            }

            if(!asset){
                log(chalk`{yellow No movie found}, skipping test.`);
                continue;
            }

            log(chalk`Starting job {green ${this.name}} on ${asset.chalkPrint(false)}... `);
            await asset.startEvaluate(remote.id, {"uploadPresetName": this.name});
        }
    }
    async resolve(){
        if(this.isGeneric) return;

        let proType = await this.resolveField(Provider, "providerType");

        this.ext = await proType.getFileExtension();

        this.isGeneric = true;

        return {proType};
    }
    async saveLocal(){
        await this.saveLocalMetadata();
        await this.saveLocalFile();
    }
    async saveLocalMetadata(){
        if(!this.isGeneric){
            await this.resolve();
            this.cleanup();
        }
        writeFileSync(this.localmetadatapath, JSON.stringify(this.data, null, 4));
    }
    async saveLocalFile(){
        writeFileSync(this.localpath, this.code || "");
    }
    async uploadRemote(env, shouldTest = true){
        await this.uploadCodeToEnv(env, true, shouldTest);
    }
    async save(env, shouldTest = true){
        this.saved = true;
        if(!this.isGeneric){
            await this.resolve();
        }

        this.cleanup();
        if(lib.isLocalEnv(env)){
            log(chalk`Saving preset {green ${this.name}} to {blue ${lib.envName(env)}}.`)
            await this.saveLocal();
        }else{
            await this.uploadRemote(env, shouldTest);
        }
    }

    async downloadCode(){
        if(!this.remote || this.code) return this.code;
        let pdlink = this.data.links?.providerData;
        if(!pdlink) return this.code = "";
        let code = await lib.makeAPIRequest({
            env: this.remote,
            path_full: pdlink,
            json: false,
        });

        //match header like 
        // # c: d
        // # b
        // # a
        // ##################
        let headerRegex = /(^# .+[\r\n]+)+#+[\r\n]+/gim;
        let hasHeader = headerRegex.exec(code);

        if(hasHeader){
            this.header = code.substring(0, hasHeader[0].length - 1);
            code = code.substring(hasHeader[0].length);
        }

        return this.code = code;
    }

    get code(){
        if(this._code) return this._code;
    }
    set code(v){this._code = v;}

    chalkPrint(pad=true){
        let id = String("P-" + (this.remote && this.remote + "-" + this.id || "LOCAL"))
        let sub = "";
        if(this.subproject){
            sub = chalk`{yellow ${this.subproject}}`;
        }
        if(pad) id = id.padStart(10);
        if(this.name == undefined){
            return chalk`{green ${id}}: ${sub}{red ${this.path}}`;
        }else if(this.meta.proType){
            return chalk`{green ${id}}: ${sub}{red ${this.meta.proType.name}} {blue ${this.name}}`;
        }else{
            return chalk`{green ${id}}: ${sub}{blue ${this.name}}`;
        }
    }
    parseFilenameForName(){
        if(this.path.endsWith(".jinja") || this.path.endsWith(".json")){
            return basename(this.path)
                .replace("_", " ")
                .replace("-", " ")
                .replace(".json", "")
                .replace(".jinja", "");
        }
    }

    parseCodeForName(){
        const name_regex = /name\s*:\s*([\w\d. \/_]+)\s*$/gim;
        const match = name_regex.exec(this.code);
        if(match) return match[1];
    }

    findStringsInCode(strings){
        if(!this.code) return [];

        return strings.filter(str => {
            let regex = new RegExp(str);
            return !!this.code.match(regex);
        });
    }
    static getLocalPath(name, ext, subproject){
        return this._localpath || path.join(configObject.repodir, subproject || "", "silo-presets", name + "." + ext);
    }
    get localpath(){return Preset.getLocalPath(this.name, this.ext, this.subproject)}

    get path(){
        if(this._path) return this._path;
    }
    set path(val){
        this._path = val;
    }
    get name(){
        return this._nameOuter;
    }
    set name(val){
        if(!this._nameInner) this._nameInner = val;
        this._nameOuter = val;
    }
    set providerType(value){
        this.relationships["providerType"] = {
            data: {
                ...value,
                type: "providerTypes",
            }
        };
    }
    get localmetadatapath(){
        if(this.path){
            return this.path.replace("silo-presets", "silo-metadata").replace(new RegExp(this.ext + "$"), "json")
        }
        return path.join(configObject.repodir, this.subproject || "",  "silo-metadata", this.name + ".json");
    }
    get immutable(){
        return this.name.includes("Constant") && !configObject.updateImmutable;
    }

    async convertImports() { 
    }

    async convertIncludes() { 
    }

    isEval() {
        return this.providerName === "SdviEvaluate" || this.providerName === "SdviEvalPro";
    }

    async uploadPresetData(env, id){
        if(this.code.trim() === "NOUPLOAD"){
            write(chalk`code skipped {yellow :)}, `);
            // Not an error, so return null
            return null;
        }

        let code = this.code;
        let headers = {};

        //if(this.isEval()){
            //let crt = 0;
            //code = code.split("\n").map(line => {
                //crt += 1

                //if(line.trim().endsWith("\\")) return line;

                //return [
                    //line,
                    //`# this ^^ is ${this.name}:${crt}`,
                //]
            //}).flat().join("\n");
        //}

        if(!configObject.skipHeader && this.isEval()){
            write(chalk`generate header, `);
            let repodir = configObject.repodir;
            let localpath;
            if(this.path){
                localpath = this.path.replace(repodir, "");
                if(localpath.startsWith("/")) localpath = localpath.substring(1);
            }else{
                localpath = "Other Silo"
            }

            try{
                let {stdout: headerText} = await spawn(
                    {noecho: true},
                    "sh",
                    [
                        path.join(configObject.repodir, `bin/header.sh`),
                        moment(Date.now()).format("ddd YYYY/MM/DD hh:mm:ssa"),
                        localpath,
                    ]
                );
                code = headerText + code;
                write(chalk`header ok, `);
            }catch(e){
                write(chalk`missing unix, `);
            }
        }

        //binary presets
        if(this.providerName == "Vantage"){
            code = Buffer.from(code).toString("base64");
            headers["Content-Transfer-Encoding"] = "base64";
        }

        let res = await lib.makeAPIRequest({
            env, path: `/presets/${id}/providerData`,
            body: code, method: "PUT", fullResponse: true, timeout: 10000,
            headers,
        });
        write(chalk`code up {yellow ${res.statusCode}}, `);
    }
    async grabMetadata(env){
        let remote = await Preset.getByName(env, this.name);
        this.isGeneric = false;
        if(!remote){
            throw new AbortError(`No file found on remote ${env} with name ${this.name}`);
        }
        this.data = remote.data;
        this.remote = env;
    }

    async deleteRemoteVersion(env, id=null){
        if(lib.isLocalEnv(env)) return false;
        if(!id){
            let remote = await Preset.getByName(env, this.name);
            id = remote.id;
        }

        return await lib.makeAPIRequest({
            env, path: `/presets/${id}`,
            method: "DELETE",
        });
    }

    async delete(){
        if(lib.isLocalEnv(this.remote)) return false;

        return await this.deleteRemoteVersion(this.remote, this.id);
    }

    async uploadCodeToEnv(env, includeMetadata, shouldTest = true){
        if(!this.name){
            let match;
            if(match = /^(#|["']{3})\s*EPH (\d+)/.exec(this.code.trim())){
                let a = await Asset.getById(env, Number(match[2]))
                return a.startEphemeralEvaluateIdeal(this);
            }else{
                log(chalk`Failed uploading {red ${this.path}}. No name found.`);
                return "Missing Name";
            }
        }

        write(chalk`Uploading preset {green ${this.name}} to {green ${env}}: `);

        if(this.immutable){
            log(chalk`{magenta IMMUTABLE}. Nothing to do.`);
            return "Immutable Preset";
        }

        //First query the api to see if this already exists.
        let remote = await Preset.getByName(env, this.name);

        let uploadResult = null;
        if(remote){
            //If it exists we can replace it
            if(includeMetadata){
                let payload = {data: {attributes: this.data.attributes, type: "presets"}};
                payload.data.relationships = {};
                if (this.relationships.providerType) {
                    payload.data.relationships.providerType = this.relationships.providerType;
                    let dt = payload.data.relationships.providerType;
                    write(chalk`query type, `);
                    let ptid = await Provider.getByName(env, dt.data.name);
                    write(chalk`({gray ${ptid.name}}) ok, `);
                    dt.data.id = ptid.data.id;
                }else{
                    write("replace (simple), ");
                }

                if(this.providerName === "SdviEvalPro"){
                    log("givin it a name,");
                    let oldName = this.attributes.providerDataFilename;
                    if(!oldName){
                        this.attributes.providerDataFilename = this.name + ".py";
                    }
                }


                let res = await lib.makeAPIRequest({
                    env, path: `/presets/${remote.id}`, method: "PUT",
                    payload,
                    fullResponse: true,
                });
                write(chalk`metadata {yellow ${res.statusCode}}, `);
                if(res.statusCode >= 400){
                    log(chalk`skipping code upload, did not successfully upload metadata`)
                    return "Metadata Upload Failed";
                }
            }

            uploadResult = await this.uploadPresetData(env, remote.id);
        }else{
            write("create, ");
            let metadata = {data: this.data};
            if(!this.relationships["providerType"]){
                throw new AbortError("Cannot acclimatize shelled presets. (try creating it on the env first)");
            }

            await this.acclimatize(env);
            write("Posting to create preset... ");
            let res = await lib.makeAPIRequest({
                env, path: `/presets`, method: "POST",
                payload: metadata, timeout: 5000,
            });
            let id = res.data.id;
            write(chalk`Created id {green ${id}}... Uploading Code... `);
            uploadResult = await this.uploadPresetData(env, id);
        }
        if(this.test[0] && shouldTest){
            await this.runTest(env);
        }else{
            log("No tests. Done.");
        }

        return uploadResult;
    }

    getLocalMetadata(){
        return JSON.parse(readFileSync(this.localmetadatapath, "utf-8"));
    }
    getLocalCode(){
        //todo fixup for binary presets, see uploadPresetData
        return readFileSync(this.path, "utf-8");
    }

    parseHeaderInfo(){
        if(!this.header) return null;
        let abs = {
            built:   /Built On:(.+)/.exec(this.header)[1]?.trim(),
            author:  /Author:(.+)/.exec(this.header)[1]?.trim(),
            build:   /Build:(.+)/.exec(this.header)[1]?.trim(),
            version: /Version:(.+)/.exec(this.header)[1]?.trim(),
            branch:  /Branch:(.+)/.exec(this.header)[1]?.trim(),
            commit:  /Commit:(.+)/.exec(this.header)[1]?.trim(),
            local:   /Local File:(.+)/.exec(this.header)[1]?.trim(),
        }

        let tryFormats = [
            [true,  "ddd MMM DD HH:mm:ss YYYY"],
            [false, "ddd YYYY/MM/DD LTS"],
        ];

        for(let [isUTC, format] of tryFormats){
            let date;
            if(isUTC){
                date = moment.utc(abs.built, format)
            }else{
                date = moment(abs.built, format)
            }

            if(!date.isValid()) continue;

            abs.offset = date.fromNow();

            break;
        }

        return abs;
    }

    async printRemoteInfo(env){
        let remote = await Preset.getByName(env, this.name);
        if(!remote) {
            log(chalk`Not found on {red ${env}}`);
            return;
        }
        await remote.downloadCode();
        let i = remote.parseHeaderInfo();

        if(i){
            log(chalk`
                ENV: {red ${env}}, updated {yellow ~${i.offset}}
                Built on {blue ${i.built}} by {green ${i.author}}
                From ${i.build || "(unknown)"} on ${i.branch} ({yellow ${i.commit}})
                Remote Data Filename "${this.importName}"
            `.replace(/^[ \t]+/gim, "").trim());
        }else{
            log(chalk`No header on {red ${env}}`);
        }
    }

    async getInfo(envs){
        await this.printDepends();
        for(let env of envs.split(",")){
            await this.printRemoteInfo(env);
        }
    }

    async printDepends(indent=0, locals=null, seen={}){
        let includeRegex = /@include ["'](.+)['"]/gim;
        //let includeRegex = /@include/g;

        let includes = [];

        let inc;
        while(inc = includeRegex.exec(this.code)){
            includes.push(inc[1]);
        }

        //let includes = this.code
            //.split("\n")
            //.map(x => includeRegex.exec(x))
            //.filter(x => x)
            //.map(x => x[1]);
        //log(includes);

        if(!locals){
            locals = new Collection(await loadLocals("silo-presets", Preset));
        }

        log(Array(indent + 1).join(" ") + "- " + this.name);

        for(let include of includes){
            if(seen[include]){
                log(Array(indent + 1).join(" ") + "  - (seen) " + include);
            }else{
                seen[include] = true
                let file = await locals.findByName(include);
                if(file){
                    await file.printDepends(indent + 2, locals, seen);
                }else{
                    log(Array(indent + 1).join(" ") + "  - (miss) " + include);
                }
            }
        }
    }

    async lint(linter) {
        return await linter.lintPreset(this);
    }
}

defineAssoc(Preset, "_nameInner", "data.attributes.providerSettings.PresetName");
defineAssoc(Preset, "_nameOuter", "data.attributes.name");
defineAssoc(Preset, "_nameE2", "data.attributes.providerDataFilename");
defineAssoc(Preset, "id", "data.id");
defineAssoc(Preset, "importName", "data.attributes.providerDataFilename");
defineAssoc(Preset, "attributes", "data.attributes");
defineAssoc(Preset, "relationships", "data.relationships");
defineAssoc(Preset, "remote", "meta.remote");
defineAssoc(Preset, "_code", "meta.code");
defineAssoc(Preset, "_path", "meta.path");
defineAssoc(Preset, "isGeneric", "meta.isGeneric");
defineAssoc(Preset, "ext", "meta.ext");
defineAssoc(Preset, "subproject", "meta.project");
defineAssoc(Preset, "metastring", "meta.metastring");
defineAssoc(Preset, "providerName", "relationships.providerType.data.name");
Preset.endpoint = "presets";

export default Preset;
