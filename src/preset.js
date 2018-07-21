import fs from "fs";
import {lib, AbortError, Collection} from  "./rally-tools.js";
import {basename} from "path";
import {cached} from "./decorators.js";
import {configObject} from "./config.js";

let presetShell = {
    "attributes": {},
    "relationships": {},
};

class Preset{
    constructor({path, remote, data}){
        this.remote = remote
        if(!this.remote){
            this.path = path;
            try{
                this.code = this.getLocalCode();
            }catch(e){
                log(chalk`{red Node Error} e.message`);
                throw new AbortError("Could not load code of local file");
            }
            this.name = this.parseFilenameForName() || this.parseCodeForName();
        }else{
            this.name = data.attributes.name;
            this.id = data.id;
            this.data = data;
        }
    }
    shellData(){
        let data = Object.assign({}, presetShell);
        return data;
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

    chalkPrint(){
        let id = String(this.remote && this.remote + "-" + this.id || "Local").padStart(8);
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
            let regex = new Regexp(str);
            return !!this.code.match(regex);
        });
    }
    getPath(){
        return `${process.env.rally_repo_path}/silo-presets/${this.name}.${this.ext}`;
    }
    getMetadataPath(){
        return `${process.env.rally_repo_path}/silo-metadata/${this.name}.json`;
    }
    codeBinary(){
        if(this.code.startsWith("=BASE64=")){
            return bota(this.code.substring(8));
        }else{
            return this.code;
        }
    }
    async uploadPresetData(env, id){
        let res = await lib.makeAPIRequest({
            env, path: `/presets/${id}/providerData`,
            body: this.code, method: "PUT", fullResponse: true
        });
        write(chalk`response {yellow ${res.statusCode}}`);
    }
    async uploadCodeToEnv(env, createFunction){
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
            await this.uploadPresetData(env, remote.id);
        }else{
            //If it needs to be created then we need to ask the user for metadata
            write("create, ");
            let metadata = await createFunction(this);
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

    getMetadata(){}
    getLocalCode(){
        return fs.readFileSync(this.path, "utf-8");
    }

    @cached static async getPresets(env){
        let data = await lib.indexPathFast(env, "/presets?page=1p20");
        return new Collection(data.map(dat => new Preset({remote: env, data: dat})));
    }
}

export default Preset;
