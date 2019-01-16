import fs from "fs";

import {configObject} from "./config.js";

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
    return path;
}

export function readFileSync(path, options){
    return fs.readFileSync(pathTransform(path), options);
}
export function writeFileSync(path, data, options){
    return fs.writeFileSync(pathTransform(path), data, options);
}
