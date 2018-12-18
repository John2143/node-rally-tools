import {RallyBase, lib, AbortError, Collection} from  "./rally-tools.js";
import {basename, resolve as pathResolve, dirname} from "path";
import {cached, defineAssoc} from "./decorators.js";
import {configObject} from "./config.js";
import Provider from "./providers.js";

import fs from "fs";
import path from "path";

let exists = {};

class Preset extends RallyBase{
    constructor({path, remote, data} = {}){
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
        this.remote = remote
        if(lib.isLocalEnv(this.remote)){
            if(path){
                this.path = path;
                let pathspl = this.path.split(".");
                this.ext = pathspl[pathspl.length-1];
                try{
                    this.code = this.getLocalCode();
                }catch(e){
                    log(chalk`{red Node Error} ${e.message}`);
                    throw new AbortError("Could not load code of local file");
                }
                let name = this.parseFilenameForName() || this.parseCodeForName();
                try{
                    this.data = this.getLocalMetadata();
                    this.isGeneric = true;
                    name = this.name;
                }catch(e){
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
    }
    //Given a metadata file, get its actualy file
    static async fromMetadata(path){
        let data = JSON.parse(fs.readFileSync(path));
        let provider = await Provider.getByName("DEV", data.relationships.providerType.data.name);

        let ext = await provider.getFileExtension();
        let name = data.attributes.name;

        let realpath = Preset.getLocalPath(name, ext);
        return new Preset({path: realpath});
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

        const regex = /autotest:\s?([\w\d_\-. \/]+)[\r\s\n]*?/gm;
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
            write(chalk`Starting job {green ${this.name}} on {green ${test}}... `);
            let {movieId} = await lib.startJob(env, test, remote.id);
            if(movieId){
                write(chalk`movie {blue ${movieId}}. `);
                log(chalk`OK`);
            }else{
                log(chalk`{red No movie found}, Fail.`);
            }
        }
    }
    async resolve(){
        if(this.isGeneric) return;

        //log(this);
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
        fs.writeFileSync(this.localmetadatapath, JSON.stringify(this.data, null, 4));
    }
    async saveLocalFile(){
        fs.writeFileSync(this.localpath, this.code);
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
            log(chalk`Saving {green ${this.name}} to {blue ${lib.envName(env)}}.`)
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
        if(pad) id = id.padStart(10);
        if(this.meta.proType){
            return chalk`{green ${id}}: {red ${this.meta.proType.name}} {blue ${this.name}}`;
        }else{
            return chalk`{green ${id}}: {blue ${this.name}}`;
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
    static getLocalPath(name, ext){
        return path.join(configObject.repodir, "silo-presets", name + "." + ext);
    }
    get localpath(){return Preset.getLocalPath(this.name, this.ext)}

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
        let fname = this.name;
        if(!fname && this.path){
            let bname = basename(this.path);
            fname = bname.substring(0, bname.length - (this.ext.length + 1));
        }
        return path.join(configObject.repodir, "silo-metadata", fname + ".json");
    }
    get immutable(){
        return this.name.includes("Constant");
    }
    async uploadPresetData(env, id){
        let res = await lib.makeAPIRequest({
            env, path: `/presets/${id}/providerData`,
            body: this.code, method: "PUT", fullResponse: true, timeout: 5000
        });
        write(chalk`response {yellow ${res.statusCode}} `);
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
    async uploadCodeToEnv(env, includeMetadata){
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
                await lib.makeAPIRequest({
                    env, path: `/presets/${remote.id}`, method: "PATCH",
                    payload: {data: {attributes: this.data.attributes, type: "presets"}},
                });
                write("metadata OK, ");
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
        write("Done. ");
        if(this.test){
            log("test...")
            this.runTest(env)
        }else{
            log("No test");
        }
    }

    getLocalMetadata(){
        return JSON.parse(fs.readFileSync(this.localmetadatapath, "utf-8"));
    }
    getLocalCode(){
        return fs.readFileSync(this.path, "utf-8");
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
Preset.endpoint = "presets";

export default Preset;
