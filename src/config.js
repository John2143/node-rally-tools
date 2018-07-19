import {homedir} from "os";
import {readFileSync} from "fs";

export let configFile = homedir() + "/.rallyconfig";

let configObject = null;
try{
    let json = readFileSync(configFile);
    configObject = JSON.parse(json);
}catch(e){
    if(e.code == "ENOENT"){
        configObject = null;
    }
}

export {configObject};
