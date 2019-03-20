import fs from "fs";
import {dirname} from "path";

import {configObject} from "./config.js";
import {homedir} from "os";


const home = homedir();
const colon = /:/g;
const siloLike = /(silo\-\w+?)s?\/([^\/]+)\.([\w1234567890]+)$/g;
export function pathTransform(path){
    if(path.includes(":")){
        //Ignore the first colon in window-like filesystems
        path = path.slice(0, 3) + path.slice(3).replace(colon, "--");
    }
    if(configObject.invertedPath){
        path = path.replace(siloLike, "$2-$1.$3")
    }
    if(path.includes("\\342\\200\\220")){
        path = path.replace("\\342\\200\\220", "‐");
    }
    return path;
}

export function readFileSync(path, options){
    return fs.readFileSync(pathTransform(path), options);
}
//Create writefilesync, with ability to create directory if it doesnt exist
export function writeFileSync(path, data, options, dircreated = false){
    path = pathTransform(path);
    try{
        return fs.writeFileSync(path, data, options);
    }catch(e){
        if(dircreated) throw e;
        let directory = dirname(path);
        try{
            fs.statSync(directory);
            throw e;
        }catch(nodir){
            fs.mkdirSync(directory);
            return writeFileSync(path, data, options, true);
        }
    }
}
