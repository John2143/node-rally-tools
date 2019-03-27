import {RallyBase, lib, AbortError, Collection} from  "./rally-tools.js";
import {basename, resolve as pathResolve, dirname} from "path";
import {cached, defineAssoc} from "./decorators.js";
import {configObject} from "./config.js";
import Provider from "./providers.js";
import Asset from "./asset.js";

import {writeFileSync, readFileSync} from "./fswrap.js";
import path from "path";

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
            if(exists[path]) return exists[path];
            exists[path] = this;
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
                    this.data = Preset.newShell();
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
        this.data.attributes.rallyConfiguration = undefined;
        this.data.attributes.systemManaged = undefined;
    }
    //Given a metadata file, get its actualy file
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

    static newShell(){
        return {
            "attributes": {
                "providerSettings": {
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
        if(!this.code) return;

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
            await asset.startEvaluate(remote.id);
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
        writeFileSync(this.localpath, this.code);
    }
    async uploadRemote(env){
        await this.uploadCodeToEnv(env, true);
    }
    async save(env){
        this.saved = true;
        if(!this.isGeneric){
            await this.resolve();
        }

        this.cleanup();
        if(lib.isLocalEnv(env)){
            log(chalk`Saving preset {green ${this.name}} to {blue ${lib.envName(env)}}.`)
            await this.saveLocal();
        }else{
            await this.uploadRemote(env);
        }
    }

    async downloadCode(){
        if(!this.remote || this.code) return this.code;
        return this.code = await lib.makeAPIRequest({
            env: this.remote,
            path_full: this.data.links.providerData,
            json: false,
        });
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
        const name_regex = /name\s?:\s([\w\d. \/]+)[\r\s\n]*?/;
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
        return path.join(configObject.repodir, subproject || "", "silo-presets", name + "." + ext);
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
        this._nameInner = val;
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
            return this.path.replace("silo-presets", "silo-metadata").replace(this.ext, "json")
        }
        return path.join(configObject.repodir, this.subproject || "",  "silo-metadata", fname + ".json");
    }
    get immutable(){
        return this.name.includes("Constant");
    }
    async uploadPresetData(env, id){
        let res = await lib.makeAPIRequest({
            env, path: `/presets/${id}/providerData`,
            body: this.code, method: "PUT", fullResponse: true, timeout: 5000
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
    async uploadCodeToEnv(env, includeMetadata, shouldTest = true){
        if(!this.name){
            log(chalk`Failed uploading {red ${this.path}}. No name found.`);
            return;
        }

        write(chalk`Uploading preset {green ${this.name}} to {green ${env}}: `);

        if(this.immutable){
            log(chalk`{magenta IMMUTABLE}. Nothing to do.`);
            return;
        }

        //First query the api to see if this already exists.
        let remote = await Preset.getByName(env, this.name);

        if(remote){
            //If it exists we can replace it
            write("replace, ");
            if(includeMetadata){
                let res = await lib.makeAPIRequest({
                    env, path: `/presets/${remote.id}`, method: "PATCH",
                    payload: {data: {attributes: this.data.attributes, type: "presets"}},
                    fullResponse: true,
                });
                write(chalk`metadata {yellow ${res.statusCode}}, `);
            }

            await this.uploadPresetData(env, remote.id);
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
            await this.uploadPresetData(env, id);
        }
        if(this.test[0] && shouldTest){
            await this.runTest(env);
        }else{
            log("No tests. Done.");
        }
    }

    getLocalMetadata(){
        return JSON.parse(readFileSync(this.localmetadatapath, "utf-8"));
    }
    getLocalCode(){
        return readFileSync(this.path, "utf-8");
    }
}

defineAssoc(Preset, "_nameInner", "data.attributes.providerSettings.PresetName");
defineAssoc(Preset, "_nameOuter", "data.attributes.name");
defineAssoc(Preset, "id", "data.id");
defineAssoc(Preset, "attributes", "data.attributes");
defineAssoc(Preset, "relationships", "data.relationships");
defineAssoc(Preset, "remote", "meta.remote");
defineAssoc(Preset, "_code", "meta.code");
defineAssoc(Preset, "_path", "meta.path");
defineAssoc(Preset, "isGeneric", "meta.isGeneric");
defineAssoc(Preset, "ext", "meta.ext");
defineAssoc(Preset, "project", "data.attributes.project");
defineAssoc(Preset, "metastring", "meta.metastring");
Preset.endpoint = "presets";

export default Preset;
