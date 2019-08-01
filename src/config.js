import { homedir } from "os";
import { readFileSync } from "fs";

export let configFile = homedir() + "/.rallyconfig";

let configObject;
export function loadConfig(file) {
    if (file) configFile = file;

    configObject = { hasConfig: true };
    try {
        let json = readFileSync(configFile);
        configObject = JSON.parse(json);
        configObject.hasConfig = true;
    } catch (e) {
        if (e.code == "ENOENT") {
            configObject.hasConfig = false;
            //ok, they should probably make a config
        } else {
            throw e;
        }
    }
}

export function setConfig(obj) {
    configObject = obj;
}

export function getPrefix() {
    if (configObject.prefix) {
        return configObject.prefix + " - ";
    }
    return "";
}

loadConfig();

export { configObject };
