import argparse from "minimist";
import {rallyFunctions as funcs, Preset, AbortError} from "./index.js";
import chalk from "chalk";

let argv = argparse(process.argv.slice(2), {
    string: ["file", "env"],
    alias: {
        f: "file", e: "env",
    }
});

let cli = {
    async help(){
        log(this);
    },
    async ["print-args"](args){
        log(args);
    },
    async ["upload-preset"](args){
        let env = args.env;
        let files = args.file;
        if(typeof args.file === "string") files = [files];
        log(chalk`Uploading {green ${files.length}} preset(s) to {green ${env}}.`);

        let presets = files.map(path => new Preset({path, remote: false}));
        await funcs.uploadPresets(args.env, presets);
        //log(presets);
    },
    async ["list-providers"](args){
        let env = args.env;
        funcs.getProviders(env);
    },
};

async function $main(){
    let func = argv._[0];
    if(cli[func]){
        try{
            await cli[func](argv);
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
