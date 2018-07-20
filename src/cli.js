require("source-map-support").install();

import argparse from "minimist";
import {rallyFunctions as funcs, Preset, Rule, AbortError} from "./index.js";
import inquirer from "inquirer";

import {version as packageVersion} from "../package.json";
import {configFile, configObject} from "./config.js";
import {writeFileSync, chmodSync} from "fs";

import {helpText, arg, param, usage, helpEntries} from "./decorators.js";

import * as configHelpers from "./config-create.js";

let argv = argparse(process.argv.slice(2), {
    string: ["file", "env"],
    alias: {
        f: "file", e: "env",
    }
});

function prettyPrintProvider(pro){
    let id = String(pro.id).padStart(4);
    return chalk`{green ${id}}: {blue ${pro.attributes.category}} - {green ${pro.attributes.name}}`;
}

function printHelp(help, short){
    let helpText = chalk`
{white ${help.name}}: ${help.text}
    Usage: ${help.usage || "<unknown>"}
`
    //Trim newlines
    helpText = helpText.substring(1, helpText.length-1);

    if(!short){
        for(let param of help.params || []){
            helpText += chalk`\n    {blue ${param.param}}: ${param.desc}`
        }
        for(let arg of help.args || []){
            helpText += chalk`\n    {blue ${arg.short}}, {blue ${arg.long}}: ${arg.desc}`
        }
    }

    return helpText;
}

let cli = {
    @helpText(`Display the help menu`)
    @usage(`rally help [subhelp]`)
    @param("subhelp", "The name of the command to see help for")
    async help(){
        let arg = argv._[1];
        if(arg){
            log(printHelp(helpEntries[arg]));
        }else{
            for(let helpArg in helpEntries){
                log(printHelp(helpEntries[helpArg], true));
            }
        }
    },

    //@helpText(`Print input args, for debugging`)
    async printArgs(args){
        log(args);
    },

    @helpText(`Preset related actions`)
    @usage(`rally preset [action] --env <enviornment> --file [file1] --file [file2] ...`)
    @param("action", "The action to perform. Can be upload or list")
    @arg("-e", "--env", "The enviornment you wish to perform the action on")
    @arg("-f", "--file", "A file to act on")
    async preset(args){
        let env = args.env;
        if(!env) return errorLog("No env supplied.");
        let arg = argv._[1];
        if(arg === "upload"){
            let files = args.file;
            if(!files){
                throw new AbortError("No files provided to upload (use --file argument)");
            }
            if(typeof files === "string") files = [files];
            log(chalk`Uploading {green ${files.length}} preset(s) to {green ${env}}.`);

            let presets = files.map(path => new Preset({path, remote: false}));
            await funcs.uploadPresets(args.env, presets, async preset => {
                log("asking... ");
                let providers = await funcs.getProviders(env);
                let provider = await configHelpers.selectProvider(env, providers);
                return preset.constructMetadata(provider.id);
            });
        }else if(arg === "list"){
            log("Loading...");
            let presets = await funcs.getPresets(env);
            log(chalk`{yellow ${presets.length}} presets on {green ${env}}.`);
            for(let data of presets) log(new Preset({data, remote: env}).chalkPrint());
        }else{
            log(chalk`Unknown action {red ${arg}} try '{white rally help preset}'`);
        }
        //log(presets);
    },

    @helpText(`Rule related actions`)
    @usage(`rally rule [action] --env [enviornment]`)
    @param("action", "The action to perform. Only list is supported right now")
    @arg("-e", "--env", "The enviornment you wish to perform the action on")
    async rule(args){
        let env = args.env;
        if(!env) return errorLog("No env supplied.");
        let arg = argv._[1];

        if(arg === "list"){
            log("Loading...");
            let rules = await funcs.getRules(env);
            log(chalk`{yellow ${rules.length}} rules on {green ${env}}.`);
            for(let data of rules) log(new Rule(data, env).chalkPrint());
        }else{
            log(chalk`Unknown action {red ${arg}} try '{white rally help rule}'`);
        }
    },

    @helpText(`List all available providers, or find one by name/id`)
    @usage(`rally providers [identifier] --env [env]`)
    @param("identifier", "Either the name or id of the provider")
    @arg("-e", "--env", "The enviornment you wish to perform the action on")
    async providers(args){
        let env = args.env;
        if(!env) return errorLog("No env supplied.");
        let ident = argv._[1];

        let providers = await funcs.getProviders(env);

        if(ident){
            let pro = providers.find(x => x.id == ident || x.attributes.name.includes(ident));
            if(!pro){
                log(chalk`Couldn't find provider by {green ${ident}}`);
            }else{
                log(prettyPrintProvider(pro));
                log(await funcs.getEditorConfig(env, pro));
            }
        }else{
            for(let pro of providers) log(prettyPrintProvider(pro));
        }
    },
    @helpText(`Change config for rally tools`)
    @usage("rally config [key]")
    @param("key", chalk`Key you want to edit. For example, {green chalk} or {green api.DEV}`)
    async config(args){
        let prop = argv._[1];
        let propArray = prop && prop.split(".");

        //if(!await configHelpers.askQuestion(`Would you like to create a new config file in ${configFile}`)) return;
        let newConfigObject;

        if(!prop){
            log("Creating new config");
            newConfigObject = {
                ...configObject,
            };
            for(let helperName in configHelpers){
                if(helperName.startsWith("$")){
                    newConfigObject = {
                        ...newConfigObject,
                        ...(await configHelpers[helperName](false))
                    }
                }
            }
        }else{
            log(chalk`Editing option {green ${prop}}`);
            let ident = "$" + propArray[0];

            if(configHelpers[ident]){
                newConfigObject = {
                    ...configObject,
                    ...(await configHelpers[ident](propArray))
                };
            }else{
                log(chalk`No helper for {red ${ident}}`);
                return;
            }
        }

        //Create readable json and make sure the user is ok with it
        let newConfig = JSON.stringify(newConfigObject, null, 4);
        log(newConfig);

        if(!await configHelpers.askQuestion("Write this config to disk?")) return;
        writeFileSync(configFile, newConfig);
        log(chalk`Created file {green ${configFile}}.`);

        if(!await configHelpers.askQuestion("Chmod to 600")) return;
        chmodSync(configFile, "600");
        log(chalk`Changed file to user r/w only`);
    },
};

async function noCommand(){
    write(chalk`
Rally Tools {yellow v${packageVersion}} CLI
by John Schmidt <John_Schmidt@discovery.com>
`);
    if(!configObject){
        write(chalk`
It looks like you haven't setup the config yet. Please run '{green rally config}'.
`);
        return;
    }
    for(let env of ["UAT", "DEV", "PROD"]){
        //Test access. Returns HTTP response code
        let result = await funcs.testAccess(env);

        //Create a colored display and response
        let resultStr = "{yellow ${result} <unknown>";
             if(result === 200) resultStr = chalk`{green 200 OK}`;
        else if(result === 401) resultStr = chalk`{red 401 No Access}`;
        else if(result >= 500)  resultStr = chalk`{yellow ${result} API Down?}`;

        log(chalk`   ${env}: ${resultStr}`);
    }
}

async function $main(){
    chalk.enabled = configObject ? configObject.chalk : true;
    if(chalk.level === 0 || !chalk.enabled){
        let force = argv["force-color"];
        if(force){
            chalk.enabled = true;
            if(force === true && chalk.level === 0){
                chalk.level = 1
            }else if(Number(force)){
                chalk.level = Number(force);
            }
        }
    }

    let func = argv._[0];
    if(cli[func]){
        try{
            //Call the cli function
            let ret = await cli[func](argv);
            if(ret){
                write(chalk.white("CLI returned: "));
                log(ret);
            }
        }catch(e){
            if(e instanceof AbortError){
                log(chalk`{red CLI Aborted}: ${e.message}`);
            }else{
                throw e;
            }
        }
    }else{
        await noCommand();
    }
}

async function main(...args){
    try{
        await $main(...args);
    }catch(e){
        errorLog(e.stack);
    }
}

main();
