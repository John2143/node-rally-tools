import {homedir} from "os";
import {readFileSync} from "fs";

export let configFile = homedir() + "/.rallyconfig";

let configObject = {api: {}};
try{
    let json = readFileSync(configFile);
    configObject = JSON.parse(json);
}catch(e){
    if(e.code == "ENOENT"){
        //ok
    }else{
        throw e;
    }
}

export {configObject};
