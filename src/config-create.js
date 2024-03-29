import {configFile, configObject} from "./config.js";
import {join, basename} from "path";
import {writeFileSync} from "fs";
import Preset from "./preset.js";
import Rule from "./rule.js";
export const inquirer = importLazy("inquirer");
const readdir = importLazy("recursive-readdir");


let hasAutoCompletePrompt = false;
export function addAutoCompletePrompt(){
    if(hasAutoCompletePrompt) return
    hasAutoCompletePrompt = true;
    inquirer.registerPrompt("autocomplete", require("inquirer-autocomplete-prompt"));
}

export async function $api(propArray){
    let q;
    q = await inquirer.prompt([{
        type: "input",
        name: "company",
        message: `What is your company?`,
        default: `discovery`,
    }]);

    let company = q.company;

    const defaults = {
        DEV:  `https://${company}-dev.sdvi.com/api/v2`,
        UAT:  `https://${company}-uat.sdvi.com/api/v2`,
        QA:  `https://${company}-qa.sdvi.com/api/v2`,
        PROD: `https://${company}.sdvi.com/api/v2`,
    };

    if(propArray && propArray[1]){
        q = {envs: [propArray[1]]};
    }else{
        //Create a checkbox prompt to choose enviornments
        q = await inquirer.prompt([{
            type: "checkbox",
            name: "envs",
            message: `What enviornments would you like to configure?`,
            choices: Object.keys(defaults).map(name => ({name, checked:true})),
        }]);
    }

    //Each env should ask 2 for two things: The url and the key.
    let questions = q.envs.map(env => {
        let defaultKey = process.env[`rally_api_key_${env}`];
        if(configObject && configObject.api && configObject.api[env]){
            defaultKey = configObject.api[env].key;
        }

        return [{
            type: "input",
            name: `api.${env}.url`,
            message: `What is the api endpoint for ${env}?`,
            default: defaults[env],
        }, {
            type: "input",
            name: `api.${env}.key`,
            message: `What is your api key for ${env}?`,
            default: defaultKey,
        }];
    });

    //flatten and ask
    questions = [].concat(...questions);
    q = await inquirer.prompt(questions);
    if(propArray){
        q.api = {...configObject.api, ...q.api};
    }
    return q;
}
export async function $chalk(propArray){
    return {chalk: await askQuestion("Would you like chalk enabled (Adds coloring)?")};
}
export async function $restrictUAT(propArray){
    return {restrictUAT: await askQuestion("Would you like to protect UAT?")};
}
export async function $repodir(propArray){
    return await inquirer.prompt([{
        type: "input",
        name: `repodir`,
        message: `Where is your rally repository (empty for N/A)?`,
        default: process.env["rally_repo_path"],
    }]);
}

export async function $appName(propArray){
    let defaultAppName = "cmdline-" + (process.env.USERNAME || process.env.LOGNAME);
    let project = await askInput("Application name?", defaultAppName);
    if(project === "none" || project === "-" || project === "" || !project){
        project = null
    }
    return {appName: project};
}

export async function $project(propArray){
    let project = await askInput("Subproject directory?");
    if(project === "none" || project === "-" || project === "" || !project){
        project = null
    }
    return {project};
}

export async function $defaultEnv(propArray){
    return await inquirer.prompt([{
        type: "input",
        name: `defaultEnv`,
        message: `Default enviornment?`,
        default: "DEV",
    }]);
}

//Internal usage/testing
export async function selectProvider(providers, autoDefault = false){
    addAutoCompletePrompt();
    let defaultProvider = providers.findByName("SdviEvaluate");
    if(autoDefault){
        return defaultProvider;
    }else{
        let choices = providers.arr.map(x => ({
            name: x.chalkPrint(true),
            value: x,
        }))
        let q = await inquirer.prompt([{
            type: "autocomplete",
            name: "provider",
            default: defaultProvider,
            source: async (sofar, input) => {
                return choices.filter(x => input ? x.value.name.toLowerCase().includes(input.toLowerCase()) : true);
            },
        }]);
        return q.provider;
    }
}

export async function loadLocals(path, Class){
    let basePath = configObject.repodir;
    let objs = (await readdir(basePath))
        .filter(name => name.includes(path))
        .filter(name => !basename(name).startsWith("."))
        .map(name => new Class({path: name}));
    return objs;
}

export async function selectLocal(path, typeName, Class, canSelectNone = true){
    addAutoCompletePrompt();
    let objs = await loadLocals(path, Class);
    let objsMap = objs.map(x => ({
        name: x.chalkPrint(true),
        value: x,
    }));

    return await selectLocalMenu(objsMap, typeName, canSelectNone);
}

export async function selectLocalMenu(objs, typeName, canSelectNone = true){
    let none = {
        name: (chalk`      {red None}: {red None}`),
        value: null,
    };
    if(canSelectNone) objs.unshift(none);

    let q = await inquirer.prompt([{
        type: "autocomplete",
        name: "obj",
        message: `What ${typeName} do you want?`,
        source: async (sofar, input) => {
            return objs.filter(x => input ? x.name.toLowerCase().includes(input.toLowerCase()) : true);
        },
    }]);
    return q.obj;
}

export async function selectPreset({purpose = "preset", canSelectNone}){
    return selectLocal("silo-presets", purpose, Preset, canSelectNone);
}
export async function selectRule({purpose = "rule", canSelectNone}){
    return selectLocal("silo-rules", purpose, Rule, canSelectNone);
}

export async function askInput(question, def){
    return (await inquirer.prompt([{
        type: "input",
        name: "ok",
        message: question,
        default: def,
    }])).ok;
}

export async function askQuestion(question){
    return (await inquirer.prompt([{
        type: "confirm",
        name: "ok",
        message: question,
    }])).ok;
}

export async function saveConfig(newConfigObject, {ask = true, print = true} = {}){
    //Create readable json and make sure the user is ok with it
    let newConfig = JSON.stringify(newConfigObject, null, 4);
    if(print) log(newConfig);

    //-y or --set will make this not prompt
    if(ask && !await askQuestion("Write config to disk?")) return;
    writeFileSync(configFile, newConfig, {mode: 0o600});
    log(chalk`Created file {green ${configFile}}.`);
}
