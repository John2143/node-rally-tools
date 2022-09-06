import {RallyBase, lib, AbortError} from  "./rally-tools.js";
import {resolve as pathResolve} from "path";
import {defineAssoc} from "./decorators.js";
import {configObject} from "./config.js";

// pathtransform for hotfix
import {writeFileSync, readFileSync, pathTransform} from "./fswrap.js";
import path from "path";
//import moment from "moment";

let exists = {};

class UserDefinedConnector extends RallyBase{
    constructor({path, remote, data, subProject, included, ...rest} = {}){
        // Get full path if possible
        if(path){
            path = pathResolve(path);
        }
        if(Object.values(rest).length > 0) {
            log(chalk`{yellow Warning}: Internal error, got rest param in UDC`);
            log(rest);
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
        this.ext = "py";
        if(lib.isLocalEnv(this.remote)){
            if(!path){
                throw new AbortError("Need either path or remote env + data for UDC constructor");
            }

            this.data = {attributes: {name: null}}
            this.path = path;
            this.code = this.getLocalCode();
            this.loadFromCode();
            this.isGeneric = true;
        }else{
            this.data = data;
            this.isGeneric = false;
        }
        this.data.relationships = this.data.relationships || {};
    }

    loadFromCode() {
        let headerRegex = /^"""$/gim;
        let hasHeaderStart = headerRegex.exec(this.code);
        let hasHeaderEnd = headerRegex.exec(this.code);

        if(hasHeaderEnd){
            this.header = this.code.substring(hasHeaderStart[0].length, hasHeaderEnd.index).trim();

            let helpTextRegex = /======$/gim;
            let k = helpTextRegex.exec(this.header);
            this.helpText = this.header.substring(k.index + 7);
        }

        let abs = {
            provider:  /Provider:(.+)/.exec(this.header)[1]?.trim(),
            langauge:  /Preset Language:(.+)/.exec(this.header)[1]?.trim(),
            library:   /Library:(.+)/.exec(this.header)[1]?.trim(),
        }

        this.name = abs.provider;
        this.library = abs.library;
        this.language = abs.langauge;
    }

    cleanup(){
        super.cleanup();
    }

    async saveLocalFile(){
        writeFileSync(this.localpath, this.code || "");
    }

    async save(env, shouldTest = true){
        this.saved = true;
        if(!this.isGeneric){
            await this.downloadCode();
        }

        this.cleanup();
        if(lib.isLocalEnv(env)){
            log(chalk`Saving provider {green ${this.name}} to {blue ${lib.envName(env)}}.`)
            if(configObject.verbose) {
                log(chalk`Path: ${this.localpath}`);
            }
            await this.saveLocalFile();
        }else{
            await this.uploadCodeToEnv(env, {}, shouldTest);
        }
    }

    async downloadCode(){
        if(!this.remote || this.code) return this.code;

        let pdlink = this.data.links?.userConnCode;
        if(!pdlink) return this.code = "";

        let code = await lib.makeAPIRequest({
            env: this.remote,
            path_full: pdlink,
            json: false,
        });

        this.code = code;
        this.loadFromCode();

        return code;
    }

    get code(){
        if(this._code) return this._code;
    }
    set code(v){this._code = v;}

    chalkPrint(pad=true){
        let id = String("C-" + (this.remote && this.remote + "-" + this.id || "LOCAL"))
        let sub = "";
        if(this.subproject){
            sub = chalk`{yellow ${this.subproject}}`;
        }
        if(pad) id = id.padStart(11);
        if(this.name == undefined){
            return chalk`{green ${id}}: ${sub}{red ${this.path}}`;
        }else{
            return chalk`{green ${id}}: ${sub}{blue ${this.name}}`;
        }
    }

    static getLocalPath(name, ext, subproject){
        return this._localpath || path.join(configObject.repodir, subproject || "", "silo-providers", name + "." + ext);
    }

    get localpath(){
        if(this._path) {
            return this._path;
        }
        return UserDefinedConnector.getLocalPath(this.name, this.ext, this.subproject)
    }

    get path(){
        if(this._path) return this._path;
    }
    set path(val){
        this._path = val;
    }
    
    get localmetadatapath(){
        if(this.path){
            return this.path.replace("silo-presets", "silo-metadata").replace(new RegExp(this.ext + "$"), "json")
        }
        return path.join(configObject.repodir, this.subproject || "",  "silo-metadata", this.name + ".json");
    }

    async uploadPresetData(env, id, {skipcode = false, skiphelp = false, skipmetadata = false} = {}){
        let code = this.code;
        write(chalk`id {green ${id}}... `);

        let a = async () => {
            if(skipcode) return;

            let res = await lib.makeAPIRequest({
                env, path: `/providerTypes/${id}/userConnCode`,
                body: code, method: "PUT", fullResponse: true, timeout: 10000,
            });
            write(chalk`code up {yellow ${res.statusCode}}, `);
        }

        let b = async () =>{
            if(skiphelp) return;

            let res = await lib.makeAPIRequest({
                env, path: `/providerTypes/${id}/userConnHelp`,
                body: this.helpText || "No help text available", method: "PUT", fullResponse: true, timeout: 10000,
            });
            write(chalk`help up {yellow ${res.statusCode}}, `);
        }

        let c = async () => {
            if(skipmetadata) return;

            let res = await lib.makeAPIRequest({
                env, path: `/providerTypes/${id}`,
                json: true,
                payload: {
                    "data": {
                        "attributes": {
                            "userConnPackage": this.library,
                            "userConnPresetLang": this.language,
                        },
                        "type": "providerTypes"
                    }
                }, method: "PATCH", fullResponse: true, timeout: 10000,
            });
            write(chalk`metadata up {yellow ${res.statusCode}}, `);
        }

        await Promise.all([a(), b(), c()]);
        write("Done.")
    }


    async uploadCodeToEnv(env, includeMetadata, shouldTest = true){
        write(chalk`Uploading provider {green ${this.name}} to {green ${env}}: `);

        //First query the api to see if this already exists.
        let remote = await UserDefinedConnector.getByName(env, this.name);

        if(!remote){
            throw new AbortError("Initial provider file does not exist, please see SDVI");
        }

        return await this.uploadPresetData(env, remote.id);
    }

    getLocalCode(){
        return readFileSync(this.path, "utf-8");
    }

}

//defineAssoc(UserDefinedConnector, "_nameInner", "data.attributes.providerSettings.PresetName");
//defineAssoc(UserDefinedConnector, "_nameOuter", "data.attributes.name");
//defineAssoc(UserDefinedConnector, "_nameE2", "data.attributes.providerDataFilename");
defineAssoc(UserDefinedConnector, "id", "data.id");
//defineAssoc(UserDefinedConnector, "importName", "data.attributes.providerDataFilename");
defineAssoc(UserDefinedConnector, "attributes", "data.attributes");
defineAssoc(UserDefinedConnector, "name", "data.attributes.name");
defineAssoc(UserDefinedConnector, "relationships", "data.relationships");
defineAssoc(UserDefinedConnector, "remote", "meta.remote");
//defineAssoc(UserDefinedConnector, "_code", "meta.code");
//defineAssoc(UserDefinedConnector, "_path", "meta.path");
defineAssoc(UserDefinedConnector, "isGeneric", "meta.isGeneric");
defineAssoc(UserDefinedConnector, "ext", "meta.ext");
defineAssoc(UserDefinedConnector, "subproject", "meta.project");
defineAssoc(UserDefinedConnector, "language", "meta.language");
defineAssoc(UserDefinedConnector, "library", "meta.library");
//defineAssoc(UserDefinedConnector, "metastring", "meta.metastring");
//defineAssoc(UserDefinedConnector, "providerName", "relationships.providerType.data.name");
UserDefinedConnector.endpoint = "providerTypes";

export default UserDefinedConnector;
