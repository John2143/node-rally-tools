import {homedir} from "os";
import {readFileSync} from "fs";

export let configFile = homedir() + "/.rallyconfig";

function nodeConfigPackageLoad(){
    try{
        return require("config").get("rallytools");
    }catch(e){
    }
}

let configObject;
export function loadConfig(file){
    if(file) configFile = file;

    configObject = {hasConfig: true};
    try{
        let json = readFileSync(configFile);
        configObject = JSON.parse(json);
    }catch(e){
        if(e.code == "ENOENT"){
            let nodeConfig = nodeConfigPackageLoad();
            if(nodeConfig){
                configObject = nodeConfig;
                nodeConfig.hasConfig = true;
            }else{
                configObject.hasConfig = false;
                //ok, they should probably make a config
            }
        }else{
            throw e;
        }
    }
}

export function setConfig(obj){
    configObject = obj;
}

loadConfig();

export {configObject};
