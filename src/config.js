import {homedir} from "os";
import {readFileSync} from "fs";

export let configFile = null

if(homedir){
    configFile = homedir() + "/.rallyconfig";
}

let configObject;
export function loadConfig(file){
    if(file) configFile = file;
    if(!configFile) return;

    configObject = {hasConfig: true};
    let json;
    try{
        json = readFileSync(configFile);
        configObject = JSON.parse(json);
        configObject.hasConfig = true;
    }catch(e){
        if(e.code == "ENOENT"){
            configObject.hasConfig = false;
            //ok, they should probably make a config
        }else if(e instanceof SyntaxError) {
            configObject.hasConfig = false;
            log(chalk`{red Error}: Syntax Error when loading {blue ${configFile}}`);
            log(chalk`{red ${e.message}}`);
            let charPos = /at position (\d+)/g.exec(e.message);
            if(charPos) {
                let lineNum = 1;
                let charsLeft = Number(charPos[1]) + 1;
                for(let line of json.toString("utf8").split("\n")) {
                    if((line.length + 1) > charsLeft){
                        break;
                    }
                    charsLeft -= line.length + 1; //+1 for newline
                    lineNum++;
                }

                log(chalk`Approximate error loc: {green ${lineNum}:${charsLeft}}`);
            }
        }else{
            throw e;
        }
    }
}

export function loadConfigFromArgs(args){
    let tempConfig = {
        hasConfig: true,
        ...args.config
    };

    configObject = tempConfig;
}

export function setConfig(obj){
    configObject = obj;
}

export {configObject};
