require("source-map-support").install();

import {lib, UnconfiguredEnvError, IndexObject} from "./rally-tools.js";
import {cached} from "./decorators.js";
import {default as Preset} from "./preset.js";
import {default as Rule} from "./rule.js";

export {default as SupplyChain} from "./supply-chain.js";
export {default as Preset} from "./preset.js";
export {default as Rule} from "./rule.js";
export {default as Provider} from "./providers.js";
export {default as Notification} from "./notification.js";
export {default as Asset} from "./asset.js";
export {default as User} from "./user.js";
export {default as Tag} from "./tag.js";
export {default as Stage} from "./stage.js";
export {default as Deploy} from "./deploy.js";
//TODO fix export from index
export {default as Trace} from "./trace.js";

import fs from "fs";
import {configObject} from "./config.js";

export * from "./config.js";

export * from "./rally-tools.js";

export const rallyFunctions = {
    async bestPagintation(){
        global.silentAPI = true;
        for(let i = 10; i <= 30; i+=5){
            console.time("test with " + i);
            let dl = await lib.indexPathFast("DEV", `/workflowRules?page=1p${i}`);
            console.timeEnd("test with " + i);
        }
    },
    async uploadPresets(env, presets, createFunc = ()=>false){
        for(let preset of presets){
            await preset.uploadCodeToEnv(env, createFunc);
        }
    },
    //Dummy test access
    async testAccess(env){
        if(lib.isLocalEnv(env)){
            let repodir = configObject.repodir;
            if(repodir){
                try{
                    fs.lstatSync(repodir).isDirectory();
                    return [true, 0];
                }catch(e){
                    return [false, 0];
                }
            }else{
                throw new UnconfiguredEnvError();
            }
        }
        let start = new Date();
        let result = await lib.makeAPIRequest({env, path: "/providers?page=1p1", fullResponse: true, timeout: 2000});
        let timed = new Date() - start;
        return [result.statusCode, timed];
    },
}

export async function categorizeString(str, defaultSubproject=undefined){
    str = str.trim();
    if(str.startsWith('"')){
        str = str.slice(1, -1);
    }
    if(match = /^(\w)-(\w{1,10})-(\d{1,10}):/.exec(str)){
        if(match[1] === "P"){
            let ret = await Preset.getById(match[2], match[3]);
            //TODO modify for subproject a bit
            return ret;
        }else if(match[1] === "R"){
            return await Rule.getById(match[2], match[3]);
        }else{
            return null;
        }
    }else if(match = /^([\w \/\\\-_]*)[\/\\]?silo\-(\w+)[\/\\]/.exec(str)){
        try{
            switch(match[2]){
                case "presets": return new Preset({path: str, subProject: match[1]});
                case "rules": return new Rule({path: str, subProject: match[1]});
                case "metadata": return await Preset.fromMetadata(str, match[1]);
            }
        }catch(e){
            log(chalk`{red Error}: Failed to parse {blue ${match[2]}}\n    in {green ${str}}:\n   ${e}`);
        }
    }else{
        return null;
    }
}
