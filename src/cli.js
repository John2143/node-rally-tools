require("source-map-support").install();

import argparse from "minimist";
import * as allIndexBundle from "./index.js"
import {
    rallyFunctions as funcs,
    Preset, Rule, SupplyChain, Provider,
    AbortError, UnconfiguredEnvError, Collection, APIError
} from "./index.js";

import {version as packageVersion} from "../package.json";
import {configFile, configObject, loadConfig} from "./config.js";
import {writeFileSync} from "fs";

import {helpText, arg, param, usage, helpEntries, spawn} from "./decorators.js";

import * as configHelpers from "./config-create.js";

let argv = argparse(process.argv.slice(2), {
    string: ["file", "env"],
    //boolean: ["no-protect"],
    default: {protect: true},
    alias: {
        f: "file", e: "env",
    }
});

//help menu helper
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

let presetsub = {
    async before(args){
        this.env = args.env;
        if(!this.env) throw new AbortError("No env supplied");

        if(args.file){
            let files = args.file;
            if(typeof files === "string") files = [files];
            this.files = files;
        }else if(args._.shift() == "-"){
            log("Reading from stdin");
            let getStdin = require("get-stdin");
            let stdin = await getStdin();
            this.files = stdin.split("\n");
            if(this.files[this.files.length - 1] === "") this.files.pop();
        }
    },
    async $grab(args){
        if(!this.files){
            throw new AbortError("No files provided to grab (use --file argument)");
        }

        log(chalk`Grabbing {green ${this.files.length}} preset(s) to {green ${this.env}}.`);

        let presets = this.files.map(path => new Preset({path, remote: false}));
        for(let preset of presets){
            await preset.grabMetadata(this.env);
            await preset.saveLocalMetadata();
        }
    },
    async $list(args){
        log("Loading...");
        let presets = await Preset.getPresets(this.env);
        if(configObject.rawOutput) return presets;

        log(chalk`{yellow ${presets.length}} presets on {green ${this.env}}.`);
        for(let preset of presets) log(preset.chalkPrint());
    },
    async $upload(args){
        if(!this.files){
            throw new AbortError("No files provided to upload (use --file argument)");
        }

        log(chalk`Uploading {green ${this.files.length}} preset(s) to {green ${this.env}}.`);

        let presets = this.files.map(path => new Preset({path, remote: false}));
        await funcs.uploadPresets(this.env, presets);
    },
    async $diff(args){
        let file = this.files[0];
        if(!this.files){
            throw new AbortError("No files provided to diff (use --file argument)");
        }

        let preset = new Preset({path: file, remote: false});
        if(!preset.name){
            throw new AbortError(chalk`No preset header found. Cannot get name.`);
        }
        let preset2 = await Preset.getByName(this.env, preset.name);
        if(!preset2){
            throw new AbortError(chalk`No preset found with name {red ${preset.name}} on {blue ${this.env}}`);
        }
        await preset2.downloadCode();

        let tempfile = require("tempy").file;
        let temp = tempfile({extension: preset.ext});
        writeFileSync(temp, preset2.code);

        let ptr = `${file},${temp}`;

        //raw output returns "file1" "file2"
        if(configObject.rawOutput) return ptr;

        //standard diff
        argv.command = argv.command || "diff";
        await spawn(argv.command,  [file, temp], {stdio: "inherit"});
    },
    async unknown(arg, args){
        log(chalk`Unknown action {red ${arg}} try '{white rally help preset}'`);
    },
}

let rulesub = {
    async before(args){
        this.env = args.env;
        if(!this.env) throw new AbortError("No env supplied");
    },
    async $list(args){
        log("Loading...");
        let rules = await Rule.getRules(this.env);
        if(configObject.rawOutput) return rules;

        log(chalk`{yellow ${rules.length}} rules on {green ${this.env}}.`);
        for(let rule of rules) log(rule.chalkPrint());
    },
    async $grab(args){
        log("Loading...");
        //let rules = await Rule.getRules(this.env);
        for(let rule in args._){
            log(rule);
        }

        //log(chalk`{yellow ${rules.length}} rules on {green ${this.env}}.`);
        //for(let rule of rules) log(rule.chalkPrint());
    },
    async unknown(arg, args){
        log(chalk`Unknown action {red ${arg}} try '{white rally help rule}'`);
    },
}

let jupytersub = {
    async before(args){
        this.input = args._.shift() || "main.ipynb";
        this.output = args._.shift() || "main.py";
    },
    async $build(args){
        let cmd = `jupyter nbconvert --to python ${this.input} --TagRemovePreprocessor.remove_cell_tags={\"remove_cell\"} --output ${this.output} --TemplateExporter.exclude_markdown=True --TemplateExporter.exclude_input_prompt=True --TemplateExporter.exclude_output_prompt=True`.split(" ");
        log(chalk`Compiling GCR file {green ${this.input}} into {green ${this.output}} using jupyter...`);

        try{
            let {timestr} = await spawn(cmd[0], cmd.slice(1));
            log(chalk`Complete in ~{green.bold ${timestr}}.`);
        }catch(e){
            if(e.code !== "ENOENT") throw e;
            log(chalk`Cannot run the build command. Make sure that you have jupyter notebook installed.\n{green pip install jupyter}`);
            return;
        }
    },
}

let supplysub = {
    async before(args){
        this.env = args.env;
        if(!this.env) throw new AbortError("No env supplied");
    },

    //Calculate a supply chain based on a starting rule at the top of the stack
    async $calc(args){
        let name = args._.shift();
        let stopName = args._.shift();
        if(!name){
            throw new AbortError("No starting rule supplied");
        }

        let rules = await Rule.getRules(this.env);
        let start = rules.findByNameContains(name);
        let stop;
        if(stopName) stop = rules.findByNameContains(stopName);

        if(!start){
            throw new AbortError(chalk`No starting rule found by name {blue ${name}}`);
        }

        log(chalk`Analzying supply chain: ${start.chalkPrint(false)} - ${stop ? stop.chalkPrint(false) : "(open)"}`);

        let chain = new SupplyChain(start, stop);
        await chain.calculate();
        if(args["to"]){
            await chain.syncTo(args["to"]);
        }else{
            await chain.log();
        }
    },

    async $magic(args){
        let big = require("fs").readFileSync("test.json");
        big = JSON.parse(big);

        let presets = big.allPresets.arr.map(obj => {
            let preset = new Preset({
                data: obj.data, remote: big.remote
            });
            preset.code = obj._code;
            return preset;
        });
        Preset.getPresets.cachePush([big.remote], new Collection(presets));

        let rules = big.allRules.arr.map(obj => {
            let rule = new Rule(
                obj.data, big.remote
            );
            return rule;
        });
        Rule.getRules.cachePush([big.remote], new Collection(rules));

        return await this.$calc(args);
    },
    async unknown(arg, args){
        log(chalk`Unknown action {red ${arg}} try '{white rally help supply}'`);
    },
}

function subCommand(object){
    object = {
        before(){}, after(){}, unknown(){},
        ...object
    };
    return async function(args){
        //Grab the next arg on the stack, find a function tied to it, and run
        let arg = args._.shift();
        let key = "$" + arg;
        let ret;
        if(object[key]){
            await object.before(args);
            ret = await object[key](args);
            await object.after(args);
        }else{
            if(arg === undefined) arg = "(None)";
            object.unknown(arg, args);
        }
        return ret;
    }
}

let cli = {
    @helpText(`Display the help menu`)
    @usage(`rally help [subhelp]`)
    @param("subhelp", "The name of the command to see help for")
    async help(args){
        let arg = args._.shift();
        if(arg){
            let help = helpEntries[arg];
            if(!help){
                log(chalk`No help found for '{red ${arg}}'`);
            }else{
                log(printHelp(helpEntries[arg]));
            }
        }else{
            for(let helpArg in helpEntries){
                log(printHelp(helpEntries[helpArg], true));
            }
        }
    },

    @helpText("Rally tools jupyter interface. Requires jupyter to be installed.")
    @usage("rally jupyter build [in] [out]")
    @param("in/out", "input and output file for jupyter. By default main.ipyrb and main.py")
    async jupyter(args){
        return subCommand(jupytersub)(args);
    },

    //@helpText(`Print input args, for debugging`)
    async printArgs(args){
        log(args);
    },

    @helpText(`Preset related actions`)
    @usage(`rally preset [action] --env <enviornment> --file [file1] --file [file2] ...`)
    @param("action", "The action to perform. Can be upload, diff, list")
    @arg("-e", "--env", "The enviornment you wish to perform the action on")
    @arg("-f", "--file", "A file to act on")
    @arg("~", "--command", "If the action is diff, this is the command to run instead of diff")
    async preset(args){
        return subCommand(presetsub)(args);
    },

    @helpText(`Rule related actions`)
    @usage(`rally rule [action] --env [enviornment]`)
    @param("action", "The action to perform. Only list is supported right now")
    @arg("-e", "--env", "The enviornment you wish to perform the action on")
    async rule(args){
        return subCommand(rulesub)(args);
    },

    @helpText(`supply chain related actions`)
    @usage(`rally supply [action] [identifier] --env [enviornment]`)
    @param("action", "The action to perform. Can be calc.")
    @param("identifier", "If the action is calc, then this identifier should be the first rule in the chain.")
    @arg("-e", "--env", "The enviornment you wish to perform the action on")
    async supply(args){
        return subCommand(supplysub)(args);
    },

    @helpText(`List all available providers, or find one by name/id`)
    @usage(`rally providers [identifier] --env [env] --raw`)
    @param("identifier", "Either the name or id of the provider")
    @arg("-e", "--env", "The enviornment you wish to perform the action on")
    @arg("~", "--raw", "Raw output of command. If [identifier] is given, then print editorConfig too")
    async providers(args){
        let env = args.env;
        if(!env) return errorLog("No env supplied.");
        let ident = args._.shift();

        let providers = await Provider.getProviders(env);

        if(ident){
            let pro = providers.arr.find(x => x.id == ident || x.name.includes(ident));
            if(!pro){
                log(chalk`Couldn't find provider by {green ${ident}}`);
            }else{
                log(pro.chalkPrint(false));
                let econfig = await pro.getEditorConfig();
                if(args.raw){
                    return pro;
                }else{
                    if(econfig.helpText.length > 100){
                        econfig.helpText = "<too long to display>";
                    }
                    if(econfig.completions.length > 5){
                        econfig.completions = "<too long to display>";
                    }
                    log(econfig);
                }
            }
        }else{
            if(args.raw) return providers;
            for(let pro of providers) log(pro.chalkPrint());
        }
    },
    @helpText(`Change config for rally tools`)
    @usage("rally config [key] --set [value] --raw")
    @param("key", chalk`Key you want to edit. For example, {green chalk} or {green api.DEV}`)
    @arg("~", "--set", "If this value is given, no interactive prompt will launch and the config option will change.")
    @arg("~", "--raw", "Raw output of json config")
    async config(args){
        let prop = args._.shift();
        let propArray = prop && prop.split(".");

        //if(!await configHelpers.askQuestion(`Would you like to create a new config file in ${configFile}`)) return;
        let newConfigObject;

        if(!prop){
            if(configObject.rawOutput) return configObject;
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
            if(args.set){
                newConfigObject = {
                    ...configObject,
                    [prop]: args.set,
                };
            }else{
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
        }

        newConfigObject.hasConfig = true;

        //Create readable json and make sure the user is ok with it
        let newConfig = JSON.stringify(newConfigObject, null, 4);
        log(newConfig);

        //-y or --set will make this not prompt
        if(!args.y && !args.set && !await configHelpers.askQuestion("Write this config to disk?")) return;
        writeFileSync(configFile, newConfig, {mode: 0o600});
        log(chalk`Created file {green ${configFile}}.`);
    },

    //Used to test startup and teardown speed.
    noop(){
        return true;
    }
};
async function unknownCommand(cmd){
    log(chalk`Unknown command {red ${cmd}}.`);
}

async function noCommand(){
    write(chalk`
Rally Tools {yellow v${packageVersion} (alpha)} CLI
by John Schmidt <John_Schmidt@discovery.com>
`);

    //Prompt users to setup one time config.
    if(!configObject.hasConfig){
        write(chalk`
It looks like you haven't setup the config yet. Please run '{green rally config}'.
`);
        return;
    }

    //API Access tests
    for(let env of ["UAT", "DEV", "PROD", "LOCAL"]){
        //Test access. Returns HTTP response code
        let resultStr;
        try{
            let result = await funcs.testAccess(env);

            //Create a colored display and response
            resultStr = chalk`{yellow ${result} <unknown>}`;
            if(result === 200) resultStr = chalk`{green 200 OK}`;
            else if(result === 401) resultStr = chalk`{red 401 No Access}`;
            else if(result >= 500)  resultStr = chalk`{yellow ${result} API Down?}`;
            else if(result === true) resultStr = chalk`{green OK}`;
            else if(result === false) resultStr = chalk`{red BAD}`;
        }catch(e){
            if(e instanceof UnconfiguredEnvError){
                resultStr = chalk`{yellow Unconfigured}`;
            }else if(e instanceof APIError){
                if(e.request){
                    log(e.request);
                    resultStr = chalk`{red Timeout}`;
                }
            }else{
                throw e;
            }
        }

        log(chalk`   ${env}: ${resultStr}`);
    }
}

async function $main(){
    //Supply --config to load a different config file
    if(argv.config) loadConfig(argv.config);

    // First we need to decide if the user wants color or not. If they do want
    // color, we need to make sure we use the right mode
    chalk.enabled = configObject.hasConfig ? configObject.chalk : true;
    if(chalk.level === 0 || !chalk.enabled){
        let force = argv["force-color"];
        if(force){
            chalk.enabled = true;
            if(force === true && chalk.level === 0){
                chalk.level = 1;
            }else if(Number(force)){
                chalk.level = Number(force);
            }
        }
    }

    //This flag being true allows you to modify UAT and PROD
    if(!argv["protect"]){
        configObject.dangerModify = true;
    }

    //This enables raw output for some functions
    if(argv["raw"]){
        configObject.rawOutput = true;
        global.log = ()=>{};
        global.errorLog = ()=>{};
        global.write = ()=>{};
    }

    //Default enviornment should normally be from config, but it can be
    //overridden by the -e/--env flag
    if(configObject.defaultEnv){
        argv.env = argv.env || configObject.defaultEnv;
    }

    //Enable verbose logging in some places.
    if(argv["vverbose"]){
        configObject.verbose = argv["vverbose"];
        configObject.vverbose = true;
    }else if(argv["verbose"]){
        configObject.verbose = argv["verbose"]
    }

    //copy argument array to new object to allow modification
    argv._old = argv._.slice();

    //Take first argument after `node bundle.js`
    //If there is no argument, display the default version info and API access.
    let func = argv._.shift();
    if(func){
        if(!cli[func]) return await unknownCommand(func);
        try{
            //Call the cli function
            let ret = await cli[func](argv);
            if(ret){
                write(chalk.white("CLI returned: "));
                if(ret instanceof Collection) ret = ret.arr;

                //Directly use console.log so that --raw works as intended.
                if(typeof ret === "object"){
                    console.log(JSON.stringify(ret, null, 4));
                }else{
                    console.log(ret);
                }
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
    //Catch all for errors to avoid ugly default node promise catcher
    try{
        await $main(...args);
    }catch(e){
        errorLog(e.stack);
    }
}

// If this is an imported module, then we should exec the cli interface.
// Oterwise just export everything.
if(require.main === module){
    main();
}else{
    module.exports = allIndexBundle;
}
