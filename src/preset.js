import {RallyBase, lib, AbortError, Collection} from  "./rally-tools.js";
import {basename} from "path";
import {cached, defineAssoc} from "./decorators.js";
import {configObject} from "./config.js";
import Provider from "./providers.js";

import fs from "fs";
import path from "path";

class Preset extends RallyBase{
    constructor({path, remote, data}){
        super();
        this.remote = remote
        if(lib.isLocalEnv(this.remote)){
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
            }catch(e){
                this.data = Preset.newShell();
            }
            this.name = name;
            this.isGeneric = true;
        }else{
            this.data = data;
            //this.name = data.attributes.name;
            //this.id = data.id;
            this.isGeneric = false;
        }
    }
    static newShell(){
        return {
            "attributes": {},
            "relationships": {},
        };
    }
    cleanup(){
        super.cleanup();
        delete this.attributes["createdAt"];
        delete this.attributes["updatedAt"];
    }
    async acclimatize(env){
        if(!this.isGeneric) throw AbortError("Cannot acclimatize non-generics or shells");
        let providers = await Provider.getProviders(env);
        let ptype = this.relationships["providerType"];
            ptype = ptype.data;

        let provider = providers.findByName(ptype.name);
        ptype.id = provider.id;
    }
    async resolve(){
        if(this.isGeneric) return;

        let providers = await Provider.getProviders(this.remote);
        let proType = this.resolveField(providers, "providerType");
        this.ext = await proType.getFileExtension();

        this.isGeneric = true;

        return {proType};
    }
    async saveLocal(){
        fs.writeFileSync(this.localmetadatapath, JSON.stringify(this.data, null, 4));
        fs.writeFileSync(this.localpath, this.code);
    }
    async uploadRemote(env){
        await this.uploadCodeToEnv(env, true);
    }
    async save(env){
        if(!this.isGeneric){
            await this.resolve();
        }

        this.cleanup();
        if(lib.isLocalEnv(env)){
            await this.saveLocal();
        }else{
            await this.uploadRemote(env);
        }
    }

    async downloadCode(){
        if(this.code) return this.code;
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
        let id = String("P-" + (this.remote && this.remote + "-" + this.id) || "Local")
        if(pad) id = id.padStart(10);
        return chalk`{green ${id}}: {blue ${this.name}}`;
    }
    parseFilenameForName(){
        if(this.path.endsWith(".jinja") || this.path.endsWith(".json")){
            return basename(this.path)
                .replace("_", " ")
                .replace("-", " ");
        }
    }

    parseCodeForName(){
        const name_regex = /name:\s([\w\d. \/]+)[\r\s\n]*?/;
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
    get localpath(){
        return path.join(configObject.repodir, "silo-presets", this.name + "." + this.ext);
    }
    get path(){
        if(this._path) return this._path;
    }
    set path(val){
        this._path = val;
    }
    get localmetadatapath(){
        return path.join(configObject.repodir, "silo-metadata", this.name + ".json");
    }
    get immutable(){
        return this.name.includes("Constant");
    }
    async uploadPresetData(env, id){
        let res = await lib.makeAPIRequest({
            env, path: `/presets/${id}/providerData`,
            body: this.code, method: "PUT", fullResponse: true
        });
        write(chalk`response {yellow ${res.statusCode}} `);
    }
    async uploadCodeToEnv(env, includeMetadata){
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
                payload: metadata,
            });
            let id = res.data.id;
            write(chalk`Created id {green ${id}}... Uploading Code... `);
            await this.uploadPresetData(env, id);
        }
        log("Done");
    }

    constructMetadata(providerID){
        return {
            attributes: {
                name: this.name,
                //providerSettings: {
                //},
            },
            relationships: {
                providerType: {
                    data: {
                        id: providerID,
                        type: "providerTypes",
                    },
                }
            },
            type: "presets"
        };
    }

    getLocalMetadata(){
        return fs.readFileSync(this.localmetadatapath, "utf-8");
    }
    getLocalCode(){
        return fs.readFileSync(this.path, "utf-8");
    }
    static async getByName(env, name){
        if(Preset.hasLoadedAll){
            return (await Preset.getPresets(env)).findByName(name);
        }else{
            let data = await lib.makeAPIRequest({
                env, path: "/presets", qs: {
                    filter: `name=${name}`,
                },
            });
            if(data.data[0]) return new Preset({data: data.data[0], remote: env});
        }
    }

    @cached static async getPresets(env){
        Preset.hasLoadedAll = true;
        let data = await lib.indexPathFast(env, "/presets?page=1p20");
        return new Collection(data.map(dat => new Preset({remote: env, data: dat})));
    }
}

defineAssoc(Preset, "name", "attributes.name");
defineAssoc(Preset, "id", "id");
defineAssoc(Preset, "attributes", "attributes");
defineAssoc(Preset, "relationships", "relationships");

export default Preset;
