require("source-map-support").install();

import argparse from "minimist";
import {rallyFunctions as funcs, Preset, Rule, AbortError} from "./index.js";
import inquirer from "inquirer";

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

let cli = {
    async help(){
        log(this);
    },
    async ["print-args"](args){
        log(args);
    },
    async preset(args){
        let env = args.env;
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
                let provider = await this["select-provider"](args);
                return preset.constructMetadata(provider.id);
            });
        }else if(arg === "list"){
            log("Loading...");
            let presets = await funcs.getPresets(env);
            log(chalk`{yellow ${presets.length}} presets on {green ${env}}.`);
            for(let data of presets) log(new Preset({data, remote: env}).chalkPrint());
        }else{
            log("Unknown Action " + arg);
        }
        //log(presets);
    },
    async rule(args){
        let env = args.env;
        let arg = argv._[1];

        if(arg === "list"){
            log("Loading...");
            let rules = await funcs.getRules(env);
            log(chalk`{yellow ${rules.length}} rules on {green ${env}}.`);
            for(let data of rules) log(new Rule(data, env).chalkPrint());
        }else{
            log("Unknown Action " + arg);
        }
    },
    async providers(args){
        let env = args.env;
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
    async ["select-provider"](args){
        let env = args.env;

        let providers = await funcs.getProviders(env);
        let defaultProvider =  providers.find(x => x.attributes.name === "SdviEvaluate");
        if(args.defaultSelect){
            return defaultProvider;
        }else{
            let q = await inquirer.prompt([{
                type: "list",
                name: "provider",
                default: defaultProvider,
                choices: providers.map(x => ({
                    name: prettyPrintProvider(x),
                    value: x,
                })),
            },]);
            return q.provider;
        }
    },
};

async function $main(){
    let func = argv._[0];
    if(cli[func]){
        try{
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
        log(`Unknown command '${func}'. Try 'help'`);
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
