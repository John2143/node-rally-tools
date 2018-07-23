import {RallyBase, lib, AbortError, Collection} from  "./rally-tools.js";
import {basename} from "path";
import {cached, defineAssoc} from "./decorators.js";
import {configObject} from "./config.js";
import Provider from "./providers.js";

import fs from "fs";
import path from "path";

let presetShell = {
    "attributes": {},
    "relationships": {},
};

class Preset extends RallyBase{
    constructor({path, remote, data}){
        super();
        this.remote = remote
        if(lib.isLocalEnv(this.remote)){
            this.path = path;
            try{
                this.code = this.getLocalCode();
            }catch(e){
                log(chalk`{red Node Error} e.message`);
                throw new AbortError("Could not load code of local file");
            }
            let name = this.parseFilenameForName() || this.parseCodeForName();
            try{
                this.data = this.getLocalMetadata();
            }catch(e){
                this.data = Object.assign({}, presetShell);
            }
            this.isGeneric = true;
            this.ext = "py";
        }else{
            this.data = data;
            //this.name = data.attributes.name;
            //this.id = data.id;
            this.isGeneric = false;
        }
    }
    cleanup(){
        delete this.relationships.organization;
        delete this.data.id;
        delete this.data.links;

        delete this.attributes["createdAt"];
        delete this.attributes["updatedAt"];
    }
    async acclimatize(env){
        let providers = await Providers.getProviders(env);
        let ptype = this.relationships["providerType"].data;
        let provider = providers.findByName(ptype.name);
        ptype.id = provider.id;
    }
    async resolve(){
        if(this.isGeneric) return;

        let providers = await Provider.getProviders(this.remote);

        let proType = this.resolveField(providers, "providerType");

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
        return path.join(configObject.repodir, "silo-metadata", this.name + "." + this.ext);
        return `${configObject.repodir}/silo-presets/${this.name}.${this.ext}`;
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
    async uploadPresetData(env, id){
        let res = await lib.makeAPIRequest({
            env, path: `/presets/${id}/providerData`,
            body: this.code, method: "PUT", fullResponse: true
        });
        write(chalk`response {yellow ${res.statusCode}}`);
    }
    async uploadCodeToEnv(env, includeMetadata){
        write(chalk`Uploading {green ${this.name}} to {green ${env}}: `);

        //First query the api to see if this already exists.
        let res = await lib.makeAPIRequest({
            env, path: `/presets`,
            qs: {filter: `name=${this.name}`},
        });
        let remote = res.data[0];

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
            await this.acclimatize(env);
            write("Posting to create preset... ");
            let res = await lib.makeAPIRequest({
                env, path: `/presets`, method: "POST",
                payload: {data: metadata},
            });
            let id = res.data.id;
            write(chalk`Created id {green ${id}}... Uploading Code... `);
            await this.uploadPresetData(env, id);
        }
        log();
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


    @cached static async getPresets(env){
        let data = await lib.indexPathFast(env, "/presets?page=1p20");
        return new Collection(data.map(dat => new Preset({remote: env, data: dat})));
    }
}

defineAssoc(Preset, "name", "attributes.name");
defineAssoc(Preset, "id", "id");
defineAssoc(Preset, "attributes", "attributes");
defineAssoc(Preset, "relationships", "relationships");

export default Preset;
