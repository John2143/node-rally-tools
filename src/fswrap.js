import fs from "fs";
import {configObject} from "config.js";

const colon = /:/g;
const siloLike = /silo\-(w+)\/(.+)\.([\w1234567890]+)$/g;
export function pathTransform(path){
    if(path.includes(":")){
        path = path.replace(colon, "--");
    }
    if(configObject.invertedPath){
        if(path.replace(siloLike, "a");
    }
}

export function readFileSync(path, options){
    return fs.readFileSync(pathTransform(path), options);
}
export function writeFileSync(path, data, options(){
    return fs.writeFileSync(pathTransform(path), data, options);
}
