import {configObject} from "./config.js";
const inquirer = importLazy("inquirer");

export async function $api(propArray){
    const defaults = {
        DEV:  "https://discovery-dev.sdvi.com/api/v2",
        UAT:  "https://discovery-uat.sdvi.com/api/v2",
        PROD: "https://discovery.sdvi.com/api/v2",
    };

    let q;
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
            message: `What is the url endpoint for ${env}`,
            default: defaults[env],
        }, {
            type: "input",
            name: `api.${env}.key`,
            message: `What is your api key for ${env}`,
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
        message: `Where is your rally repository?`,
        default: process.env["rally_repo_path"],
    }]);
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
    let defaultProvider = providers.findByName("SdviEvaluate");
    if(autoDefault){
        return defaultProvider;
    }else{
        let q = await inquirer.prompt([{
            type: "list",
            name: "provider",
            default: defaultProvider,
            choices: providers.arr.map(x => ({
                name: x.chalkPrint(true),
                value: x,
            })),
        }]);
        return q.provider;
    }
}

export async function askInput(name, question, def){
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
