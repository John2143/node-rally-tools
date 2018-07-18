import fs from "fs";
import {lib, AbortError} from  "./rally-tools.js";
import {basename} from "path";
import chalk from "chalk";

let envs = {};
export default class Preset{
    constructor({path, remote}){
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
        }
    }
    toString(){
        return `<Preset ${this.name} on ${this.remote || "~local"}>`;
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
    async postPresetData(env, id){
    }
    async uploadCodeToEnv(env){
        log(chalk`Uploading {green ${this.name}} to {green ${env}}`);
        let res = await lib.makeAPIRequest({
            env, path: `/presets`,
            qs: {filter: `name=${this.name}aaa`},
        });
        let remote = res.data[0];
        if(remote){
            res = await lib.makeAPIRequest({
                env, path: `/presets/${remote.id}/providerData`,
                body: this.code,
            });
            log(res);
        }else{
            log("Non existant");
            //create if python
        }
    }

    getMetadata(){}
    getLocalCode(){
        return fs.readFileSync(this.path, "utf-8");
    }

    static envs(env){
        return envs[env] = envs[env] || Preset.cache_envs(env);
    }
    static cache_env(env){

    }
}
