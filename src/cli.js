require("source-map-support").install();

import argparse from "minimist";
import * as allIndexBundle from "./index.js"
import {
    rallyFunctions as funcs,
    Preset, Rule, SupplyChain, Provider, Asset, User, Tag, Stage, Deploy, Lint, UnitTest, UserDefinedConnector,
    AbortError, UnconfiguredEnvError, Collection, APIError,
    IndexObject,
} from "./index.js";

import {version as packageVersion} from "../package.json";
import {configFile, configObject, loadConfig, loadConfigFromArgs} from "./config.js";
import {readFileSync, writeFileSync} from "fs";

import {printOutLine, parseTrace, findLineInFile, getInfo as getTraceInfo} from "./trace.js";

import {helpText, arg, param, usage, helpEntries, spawn, runCommand} from "./decorators.js";

import baseCode from "./baseCode.js";
import {sep as pathSeperator} from "path";

import moment from "moment";

import { createClient } from 'redis';

const notifier = require('node-notifier');

import fetch from "node-fetch";

import * as configHelpers from "./config-create.js";

let argv = argparse(process.argv.slice(2), {
    string: ["file", "env"],
    //boolean: ["no-protect"],
    boolean: ["anon","store-stage"],
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

async function getFilesFromArgs(args){
    let lastArg = args._.shift()
    if(args.file){
        let files = args.file;
        if(typeof files === "string") files = [files];
        return files;
    }

    if(lastArg == "-"){
        log("Reading from stdin");
        let getStdin = require("get-stdin");
        let stdin = await getStdin();
        let files  = stdin.split("\n");
        if(files[files.length - 1] === "") files.pop();
        return files;
    }else{
        args._.push(lastArg);
    }
}

let presetsub = {
    async before(args){
        this.env = args.env;
        if(!this.env) throw new AbortError("No env supplied");

        this.files = await getFilesFromArgs(args);
    },
    async $grab(args){
        if(!this.files){
            throw new AbortError("No files provided to grab (use --file argument)");
        }

        log(chalk`Grabbing {green ${this.files.length}} preset(s) metadata from {green ${this.env}}.`);

        let presets = this.files.map(path => new Preset({path, remote: false}));
        for(let preset of presets){
            //TODO small refactor
            await preset.grabMetadata(this.env);
            await preset.saveLocalMetadata();

            Preset.cache = [];

            if(args.full){
                let remo = await Preset.getByName(this.env, preset.name);
                await remo.downloadCode();
                preset.code = remo.code;
                await preset.saveLocalFile();
            }
        }
    },
    async $create(args){
        let provider, name, ext;
        if(args.provider){
            provider = {name: args.provider};
            ext = args.ext
        }else{
            provider = await configHelpers.selectProvider(await Provider.getAll(this.env));
            ext = await provider.getFileExtension();
        }
        if(args.name){
            name = args.name;
        }else{
            name = await configHelpers.askInput("Preset Name", "What is the preset name?");
        }

        let preset = new Preset({subProject: configObject.project});

        preset.providerType = {name: provider.name};
        preset.isGeneric = true;
        preset.name = name;
        preset.ext = ext;
        if(baseCode[provider.name]){
            preset._code = baseCode[provider.name].replaceAll("{name}", name);
        }else{
            preset._code = " ";
        }

        preset.saveLocalMetadata();
        if(!args["only-metadata"]) preset.saveLocalFile();
    },
    async $list(args){
        elog("Loading...");
        let presets = await Preset.getAll(this.env);
        if(args.resolve){
            Provider.getAll(this.env);
            for(let preset of presets){
                let resolve = await preset.resolve(this.env);
                if(args.attach){
                    let {proType} = resolve;
                    proType.editorConfig.helpText = "";
                    preset.meta = {
                        ...preset.meta, proType
                    };
                }
            }
        }
        if(configObject.rawOutput) return presets;
        log(chalk`{yellow ${presets.length}} presets on {green ${this.env}}.`);
        presets.arr.sort((a, b) => {
            return Number(a.attributes.updatedAt) - Number(b.attributes.updatedAt)
        });
        for(let preset of presets){
            log(preset.chalkPrint());
        }
    },
    async $upload(args){
        if(!this.files){
            throw new AbortError("No files provided to upload (use --file argument)");
        }

        log(chalk`Uploading {green ${this.files.length}} preset(s) to {green ${this.env}}.`);

        let presets = this.files.map(path => new Preset({path, remote: false}));
        await funcs.uploadPresets(this.env, presets);
    },
    async $lint(args){
        if(!this.files){
            throw new AbortError("No files provided to upload (use --file argument)");
        }
        let presets = this.files.map(path => {
            try{
                return new Preset({path, remote: false})
            }
            catch (e){
                return void 0
            }
        }).filter(preset => preset);
        log(chalk`Linting {green ${presets.length}} preset(s).`);
        await Lint.defaultLinter(args).printLint(presets);
    },
    async $unitTest(args){
        if(!this.files){
            throw new AbortError("No files provided to upload (use --file argument)");
        }
        let presets = this.files.map(path => {
            try{
                return new Preset({path, remote: false})
            }
            catch (e){
                return void 0
            }
        }).filter(preset => preset);
        log(chalk`Unit testing {green ${presets.length}} preset(s).`);
        await UnitTest.defaultUnitTester(args).printUnitTest(presets);
    },
    async $deleteRemote(args){
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

        log(chalk`Deleting ${preset2.chalkPrint(true)}.`);

        log(await preset2.delete());
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
        let temp = tempfile({extension: `${this.env}.${preset.ext}`});
        writeFileSync(temp, preset2.code);

        let ptr = `${file},${temp}`;


        //raw output returns "file1" "file2"
        if(configObject.rawOutput){
            if(args["only-new"]) return temp;
            else return ptr;
        }

        //standard diff
        argv.command = argv.command || "diff";
        await spawn(argv.command, [file, temp], {stdio: "inherit"});
    },
    async $info(args){
        if(!this.files){
            throw new AbortError("No files provided to diff (use --file argument)");
        }

        let file = this.files[0];
        let preset = new Preset({path: file, remote: false});
        if(!preset.name){
            throw new AbortError(chalk`No preset header found. Cannot get name.`);
        }

        await preset.getInfo(args.env);
    },
    async unknown(arg, args){
        log(chalk`Unknown action {red ${arg}} try '{white rally help preset}'`);
    },
}

let rulesub = {
    async before(args){
        this.env = args.env;
        if(!this.env) throw new AbortError("No env supplied");

        this.files = await getFilesFromArgs(args);
    },
    async $list(args){
        elog("Loading...");
        let rules = await Rule.getAll(this.env);
        if(configObject.rawOutput) return rules;

        log(chalk`{yellow ${rules.length}} rules on {green ${this.env}}.`);
        rules.arr.sort((a, b) => {
            return Number(a.data.attributes.updatedAt) - Number(b.data.attributes.updatedAt)
        });
        for(let rule of rules) log(rule.chalkPrint());
    },
    async $create(args){
        let preset = await configHelpers.selectPreset({canSelectNone: false});
        let passNext = await configHelpers.selectRule({purpose: "'On Exit OK'"});
        let errorNext = await configHelpers.selectRule({purpose: "'On Exit Error'"});
        let name = await configHelpers.askInput("Rule Name", "What is the rule name? ('@' to insert full preset name)");
        name = name.replace("@", preset.name);
        let desc = await configHelpers.askInput("Description", "Enter a description.");

        let dynamicNexts = [];
        let next;
        while(next = await configHelpers.selectRule({purpose: "dynamic next"})){
            let name = await configHelpers.askInput("Key", "Key name for dynamic next");
            dynamicNexts.push({
                meta: {
                    transition: name,
                },
                type: "workflowRules",
                name: next.name,
            });
        }

        let rule = new Rule({subProject: configObject.project});
        rule.name = name;
        rule.description = desc;
        rule.relationships.preset = {data: {name: preset.name, type: "presets"}}
        if(errorNext) rule.relationships.errorNext = {data: {name: errorNext.name, type: "workflowRules"}}
        if(passNext) rule.relationships.passNext = {data: {name: passNext.name, type: "workflowRules"}}
        if(dynamicNexts[0]){
            rule.relationships.dynamicNexts = {
                data: dynamicNexts
            };
        }

        rule.saveB()
    },
    async $upload(args){
        if(!this.files){
            throw new AbortError("No files provided to upload (use --file argument)");
        }

        log(chalk`Uploading {green ${this.files.length}} rule(s) to {green ${this.env}}.`);

        let rules = this.files.map(path => new Rule({path, remote: false}));
        await funcs.uploadRules(this.env, rules);
    },
    async $deleteRemote(args){
        let file = this.files[0];
        if(!this.files){
            throw new AbortError("No files provided to delete (use --file argument)");
        }

        let rule = new Rule({path: file, remote: false});
        if(!rule.name){
            throw new AbortError(chalk`No rule header found. Cannot get name.`);
        }

        let rule2 = await Rule.getByName(this.env, rule.name);
        if(!rule2){
            throw new AbortError(chalk`No rule found with name {red ${rule.name}} on {blue ${this.env}}`);
        }

        log(chalk`Deleting ${rule2.chalkPrint(true)}.`);

        log(await rule2.delete());
    },
    async unknown(arg, args){
        log(chalk`Unknown action {red ${arg}} try '{white rally help rule}'`);
    },
}

let deploysub = {
    async $tag(args) {
        await Deploy.gh(args);
    },
    async $branch(args) {
        await Deploy.makeRelease(args);
    },
    async $stageMsg(args) {
        await Deploy.stageSlackMsg(args);
    },
    async $deployMsg(args) {
        await Deploy.deploySlackMessage(args);
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

let tagsub = {
    async before(args){
        this.env = args.env;
        if(!this.env) throw new AbortError("No env supplied");
    },
    async $list(args){
        elog("Loading...");
        let tags = await Tag.getAll(this.env);
        if(configObject.rawOutput) return tags;

        log(chalk`{yellow ${tags.length}} tags on {green ${this.env}}.`);
        tags.arr.sort((a, b) => {
            return Number(a.data.attributes.updatedAt) - Number(b.data.attributes.updatedAt)
        });
        for(let tag of tags) log(tag.chalkPrint());
    },
    async $create(args){
        return Tag.create(this.env, args._.shift());
    },

    async $curate(args){
        let tag = await Tag.getByName(this.env, args._.shift())
        await tag.curate();
    },
};

let supplysub = {
    async before(args){
        this.env = args.env;
        if(!this.env) throw new AbortError("No env supplied");
        this.files = await getFilesFromArgs(args);
    },

    //Calculate a supply chain based on a starting rule at the top of the stack
    async $calc(args){
        let name = args._.shift();
        let stopName = args._.shift();
        if(!name){
            throw new AbortError("No starting rule or @ supplied");
        }

        if(name === "@"){
            log(chalk`Silo clone started`);
            this.chain = new SupplyChain();
            this.chain.remote = args.env;
        }else{
            let rules = await Rule.getAll(this.env);
            let stop, start;
            start = rules.findByNameContains(name);
            if(stopName) stop = rules.findByNameContains(stopName);

            if(!start){
                throw new AbortError(chalk`No starting rule found by name {blue ${name}}`);
            }
            log(chalk`Analzying supply chain: ${start.chalkPrint(false)} - ${stop ? stop.chalkPrint(false) : "(open)"}`);
            this.chain = new SupplyChain(start, stop);
        }

        await this.chain.calculate();
        return await this.postAction(args);
    },
    async postAction(args){
        //Now that we ahve a supply chain object, do something with it
        if(args["to"]){
            this.chain.log();
            if(this.chain.presets.arr[0]){
                await this.chain.downloadPresetCode(this.chain.presets);
                log("Done");
            }

            if(Array.isArray(args["to"])){
                for(let to of args["to"]){
                    await this.chain.syncTo(to);
                }
            }else{
                await this.chain.syncTo(args["to"]);
            }

        }else if(args["delete"]){
            if(Array.isArray(args["delete"])){
                for(let to of args["delete"]){
                    await this.chain.deleteTo(to);
                }
            }else{
                await this.chain.deleteTo(args["delete"]);
            }
        }else if(args["diff"]){
            //Very basic diff
            let env = args["diff"];
            await Promise.all(this.chain.presets.arr.map(obj => obj.downloadCode()));
            await Promise.all(this.chain.presets.arr.map(obj => obj.resolve()));

            let otherPresets = await Promise.all(this.chain.presets.arr.map(obj => Preset.getByName(env, obj.name)));
            otherPresets = new Collection(otherPresets.filter(x => x));
            for(let obj of otherPresets){
                await obj.downloadCode();
                await obj.resolve();
            }
            //await Promise.all(otherPresets.arr.map(obj => obj.downloadCode()));
            //await Promise.all(otherPresets.arr.map(obj => obj.resolve()));
            //log("test")

            const printPresets = (preset, otherPreset) => {
                log(preset.chalkPrint(true));
                if(otherPreset.name){
                    log(otherPreset.chalkPrint(true));
                }else{
                    log(chalk`{red (None)}`);
                }
            }

            let anyDifferent = false;

            for(let preset of this.chain.presets){
                let otherPreset = otherPresets.arr.find(x => x.name === preset.name) || {};
                if(!preset.code || !otherPreset.code) {
                    printPresets(preset, otherPreset);
                    log("Could not analyze")
                    continue;
                }

                preset.code      = preset.code.replace(/[\r\n ]/, "");
                otherPreset.code = (otherPreset.code || "").replace(/[\r\n ]/, "");

                if(preset.code === otherPreset.code){
                    if(!args["ignore-same"]){
                        printPresets(preset, otherPreset);
                        log("Code Same");
                    }
                }else{
                    printPresets(preset, otherPreset);
                    if(args["ignore-same"]){
                        log("-------");
                    }else{
                        log("Code Different");
                        if (configObject.diffCommand){
                            let tempfile = require("tempy").file;
                            let temp = tempfile({extension: `${env}.${preset.ext}`});
                            writeFileSync(temp, otherPreset.code);
                            runCommand(`${configObject.diffCommand} "${preset.path}" "${temp}"`);
                        }
                    }

                    anyDifferent = true
                }
            }

            if(!anyDifferent) {
                log("All presets are the same");
            }

        }else if(args["swap"]){
            let env = args["swap"];
            await Promise.all(this.chain.presets.arr.map(obj => obj.downloadCode()));
            await Promise.all(this.chain.presets.arr.map(obj => obj.resolve()));

            let otherPresets = await Promise.all(this.chain.presets.arr.map(obj => Preset.getByName(env, obj.name)));
            otherPresets = new Collection(otherPresets.filter(x => x));
            this.chain.presets = otherPresets;

            let otherRules = await Promise.all(this.chain.rules.arr.map(obj => Rule.getByName(env, obj.name)));
            otherRules = new Collection(otherRules.filter(x => x));
            this.chain.rules = otherRules;

            return await this.chain.log();
        } else if(args["lint"]) {
            await this.chain.lint(Lint.defaultLinter(args));

        } else if(args["unitTest"]) {
            await this.chain.unitTest(UnitTest.defaultUnitTester(args));

        } else if(args["monitor"]) {
            let env = args["monitor"];
            let presets = await Promise.all(this.chain.presets.arr.map(obj => Preset.getByName(env, obj.name)));
            let presetMapping = {};
            for (let preset of presets) {
                presetMapping[preset.data.id] = preset.name;
            };
            let host = ["dev","qa","uat"].includes(env.toLowerCase()) ? `https://discovery-${env.toLowerCase()}.sdvi.com` : "https://discovery.sdvi.com";
            let errors = new Set();
            let passes = new Set();
            if (!configObject?.redis[env]) throw new AbortError("Configure redis in your rally tools config");
            const redisClient = createClient({ 
                url: `rediss://127.0.0.1:${configObject.redis[env]}`,
                socket: {
                    tls: true,
                    rejectUnauthorized: false
                }
            });
            await redisClient.connect();
            log(chalk`{blue {bold Listening...}}`);
            await redisClient.subscribe('messagebus', (message) => {
                let data = JSON.parse(message);
                if (data.resourceType == "jobs" && data.event == "update") {
                    let presetId = data?.resourceState?.data?.relationships?.preset?.data?.id;
                    if (presetMapping[presetId]) {
                        let result = data?.resourceState?.data?.attributes?.result;
                        if (result == "Error" && !errors.has(data.resourceId)) {
                            log(chalk`{bold {red Error:} ${presetMapping[presetId]}}    {bold {red Url: }} ${host}/jobs/${data.resourceId}`)
                            errors.add(data.resourceId)
                            notifier.notify({
                                title: `Failure in ${env}`,
                                message: presetMapping[presetId]
                            });
                        }
                        else if (result == "Pass" && !passes.has(data.resourceId)) {
                            log(chalk`{bold {green Passed:} ${presetMapping[presetId]}}`)
                            passes.add(data.resourceId)
                        }
                    }
                }
            });
            for(;;){
                await allIndexBundle.sleep(1000);
            }
        } else if(args["alerts"]) {
            let env = args["alerts"];
            let duration = parseFloat(args["duration"]) || 24;
            let channel = args["channel"] || configObject?.deploymentAlerts?.defaultChannel;
            if (!configObject?.deploymentAlerts?.serviceUrls?.[env]) {log(chalk`{red Deployment alerts service url not configured}`); return};
            let presets = await Promise.all(this.chain.presets.arr.map(obj => Preset.getByName(env, obj.name)));
            let presetIds = presets.map(d => d.data.id);
            let response = await fetch(configObject.deploymentAlerts.serviceUrls?.[env],{
                method: "post",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({presets:presetIds,duration:duration,channel:channel})
            });
            let result = await response.text();
            log(result);
        } else {
            return await this.chain.log();
        }

    },
    async $make(args){
        let set = new Set();
        let hints = args.hint ? (Array.isArray(args.hint) ? args.hint : [args.hint]) : []
        //TODO modify for better hinting, and add this elsewhere
        for(let hint of hints){
            if(hint === "presets-uat"){
                log("got hint");
                await Preset.getAll("UAT");
            }
        }

        for(let file of this.files){
            set.add(await allIndexBundle.categorizeString(file));
        }

        let files = [...set];
        files = files.filter(f => f && !f.missing);
        this.chain = new SupplyChain();

        this.chain.rules = new Collection(files.filter(f => f instanceof Rule));
        this.chain.presets = new Collection(files.filter(f => f instanceof Preset));
        this.chain.providers = new Collection(files.filter(f => f instanceof UserDefinedConnector));
        this.chain.notifications = new Collection([]);

        return await this.postAction(args);
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

    @helpText("Prepare an environment to hold specific branches")
    @usage("rally help stage")
    async stage(args){
        return subCommand(Stage)(args);
    },

    //@helpText(`Print input args, for debugging`)
    async printArgs(args){
        log(args);
    },

    @helpText(`Preset related actions`)
    @usage(`rally preset [action] --env <enviornment> --file [file1] --file [file2] ...`)
    @param("action", "The action to perform. Can be upload, diff, list, deleteRemote")
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

    @helpText(`Deploy related actions`)
    @usage(`rally deploy [action]`)
    @param("action", "'tag' to update github labels, 'branch' to create release branch and merge all tagged branches")
    @arg("~", "--branch", "(branch only) the release branch name (defaults to `date`)")
    async deploy(args){
        return subCommand(deploysub)(args);
    },

    @helpText(`supply chain related actions`)
    @usage(`rally supply [action] [identifier] --env [enviornment] [post actions]`)
    @param("action", "The action to perform. Can be calc or make.")
    @param("identifier", "If the action is calc, then this identifier should be the first rule in the chain. If this is make, then supply '-' to read from stdin")
    @param("post actions", "The action to perform on the created supply chain. See commands below")
    @arg("-e", "--env", "(calc only) environment to do the calculation on")
    @arg("~", "--diff", "(post action) Use as `--diff [env]`. List all files with differences on the given env.")
    @arg("~", "--to", "(post action) Use as `--to [env]`. Upload all objects.")
    @arg("~", "--delete", "(post action) Use as `--delete [env]`. The reverse of uploading. Only presets are supported right now.")
    async supply(args){
        return subCommand(supplysub)(args);
    },

    @helpText(`tags stuff`)
    @usage(`rally tags [action]`)
    @param("action", "The action to perform. Can be list, create, or curate.")
    @arg("-e", "--env", "The enviornment you wish to perform the action on")
    async tag(args){
        return subCommand(tagsub)(args);
    },

    @helpText(`print out some trace info`)
    @usage(`rally trace -e [env] [jobid]`)
    @param("jobid", "a job id like b86d7d90-f0a5-4622-8754-486ca8e9ecbd")
    @arg("-e", "--env", "The enviornment you wish to perform the action on")
    async trace(args){
        let jobId = args._.shift();
        if(!jobId) throw new AbortError("No job id");
        if(!args.env) throw new AbortError("no env");
        let ln = args._.shift();
        if(!ln){
            log("is trace");
            let traceInfo = await parseTrace(args.env, jobId);

            for(let line of traceInfo){
                if(typeof(line) == "string"){
                    log(chalk.red(line));
                }else{
                    printOutLine(line);
                }
            }
        }else{
            log("is ln");
            let {renderedPreset} = await getTraceInfo(args.env, jobId);
            return findLineInFile(renderedPreset, Number(ln));
        }
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

        let providers = await Provider.getAll(env);

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

        await configHelpers.saveConfig(newConfigObject, {ask: !args.y && !args.set});
    },

    async silo(){
        let s = new Silo("UAT");

        await s.grep();
    },

    @helpText(`create/modify asset or files inside asset`)
    @usage("rally asset [action] [action...]")
    @param("action", chalk`Actions are create, delete, launch, addfile, metadata, show, patchMetadata, and launchEvalute, deleteFile, downloadFile, grep, analyze. You can supply multiple actions to chain them.`)
    @arg(`-i`, `--id`,         chalk`MOVIE_ID of asset to select`)
    @arg(`-n`, `--name`,       chalk`MOVIE_NAME of asset. with {white create}, '{white #}' will be replaced with a uuid. Default is '{white TEST_#}'`)
    @arg(`~`,  `--anon`,       chalk`Supply this if no asset is needed (used to lauch anonymous workflows)`)
    @arg(`-j`, `--job-name`,   chalk`Job name to start (used with launch and launchEvalute)`)
    @arg(`~`,  `--init-data`,  chalk`Init data to use when launching job. can be string, or {white @path/to/file} for a file`)
    @arg(`~`,  `--file-label`, chalk`File label (used with addfile)`)
    @arg(`~`,  `--file-uri`,   chalk`File s3 uri. Can use multiple uri's for the same label (used with addfile)`)
    @arg(`~`,  `--auto-analyze`, chalk`autoAnalyze? (default: true) (used with addfile)`)
    @arg(`~`,  `--generate-md5`,   chalk`Generate md5 hash? (default: false) (used with addfile)`)
    @arg(`~`,  `--metadata`,   chalk`Metadata to use with patchMetadata. Can be string, or {white @path/to/file} for a file. Data must contain a top level key Metadata, or Workflow. Metadata will be pached into METADATA. Workflow will be patched into WORKFLOW_METADATA(not currently available)`)
    @arg(`~`,  `--priority`,   chalk`set the priority of all launched jobs`)
    @arg(`~`,  `--new-name`,   chalk`set the new name`)
    @arg(`~`,  `--target-env`, chalk`migrate to the env (when using migrate)`)
    @arg(`~`,  `--to-folder`,  chalk`Folder to download to when using downloadFile. If no folder is given, writes to stdout.`)
    @arg(`~`,  `--artifact`,   chalk`This is the artifact to grep on. Defaults to trace. Values are "trace", "preset", "result", "error", "output"`)
    @arg(`~`,  `--on`,         chalk`alias for artifact`)
    @arg(`~`,  `--name-only`,  chalk`Only show preset name and number of matches when greping`)
    //@arg(`~`,  `--any`,        chalk`allows grep to grep for any preset/provider, not just sdviEval`)
    async asset(args){
        function uuid(args){
            const digits = 16;
            return String(Math.floor(Math.random() * Math.pow(10, digits))).padStart(digits, "0");
        }

        let name = args.name || `TEST_#`;
        let env = args.env;

        let asset;
        let arg = args._.shift()
        if(!arg){
            throw new AbortError(chalk`Missing arguments: see {white 'rally help asset'}`);
        }

        if(args.anon){
            args._.unshift(arg);
        }else if(arg == "create"){
            name = name.replace("#", uuid());
            asset = await Asset.createNew(name, env);
        }else{
            args._.unshift(arg);
            if(args.id){
                asset = Asset.lite(args.id, env);
            }else{
                asset = await Asset.getByName(env, args.name);
            }
        }

        if(!asset && !args.anon){
            throw new AbortError("No asset found/created");
        }
        let launchArg = 0;
        let fileArg = 0;

        let arrayify = (obj, i) => Array.isArray(obj) ? obj[i] : (i == 0 ? obj : undefined);

        function getInitData(args, launchArg){
            let initData = arrayify(args["init-data"], launchArg);
            if(initData && initData.startsWith("@")){
                let initDataFile = initData.slice(1);
                if(initDataFile === "-"){
                    log(chalk`Reading init data from {grey stdin}`);
                    initData = readFileSync(0, "utf-8");
                }else{
                    log(chalk`Reading init data from {white ${initData.slice(1)}}`);
                    initData = readFileSync(initDataFile, "utf-8");
                }
            }

            return initData
        }

        while(arg = args._.shift()){
            if(arg === "launch"){
                let initData = getInitData(args, launchArg);
                let jobName = arrayify(args["job-name"], launchArg);
                let p = await Rule.getByName(env, jobName);
                if(!p){
                    throw new AbortError(`Cannot launch job ${jobName}, does not exist (?)`);
                }else{
                    log(chalk`Launching ${p.chalkPrint(false)} on ${asset ? asset.chalkPrint(false) : "(None)"}`);
                }

                if(asset){
                    await asset.startWorkflow(jobName, {initData, priority: args.priority})
                }else{
                    await Asset.startAnonWorkflow(env, jobName, {initData, priority: args.priority})
                }
                launchArg++;
            }else if(arg === "launchEvaluate"){
                let initData = getInitData(args, launchArg);
                let jobName = arrayify(args["job-name"], launchArg);

                let jobData;
                let ephemeralEval = false;
                let p;
                if(jobName.startsWith("@")){
                    ephemeralEval = true;
                    jobData = readFileSync(jobName.slice(1));
                }else{
                    p = await Preset.getByName(env, jobName);
                    if(!p){
                        throw new AbortError(`Cannot launch preset ${jobName}, does not exist (?)`);
                    }else{
                        log(chalk`Launching ${p.chalkPrint(false)} on ${asset ? asset.chalkPrint(false) : "(None)"}`);
                    }
                }


                if(ephemeralEval){
                    throw new AbortError("could not start");
                    await Asset.startEphemeralEvaluateIdeal(env, p.id, initData)
                }else{
                    await asset.startEvaluate(p.id, initData)
                }
                launchArg++;
            }else if(arg === "addfile"){
                let label = arrayify(args["file-label"], fileArg)
                let uri   = arrayify(args["file-uri"], fileArg)
                if(label === undefined || !uri){
                    throw new AbortError("Number of file-label and file-uri does not match");
                }

                let genMd5 = args["generate-md5"];
                if(genMd5 === undefined) {
                    genMd5 = false;
                }
                let autoA = args["auto-analyze"];
                if(autoA === undefined) {
                    autoA = true;
                }
                await asset.addFile(label, uri, genMd5, autoA);
                log(chalk`Added file ${label}`);
                fileArg++;
            }else if(arg === "delete"){
                await asset.delete();
            }else if(arg === "create"){
                throw new AbortError(`Cannot have more than 1 create/get per asset call`);
            }else if(arg === "show" || arg == "load"){
                if(asset.lite) asset = await Asset.getById(env, asset.id);
                if(arg == "show") log(asset);
            }else if(arg === "metadata" || arg === "md"){
                log(await asset.getMetadata(true));
            }else if(arg === "migrate"){
                await asset.migrate(args["target-env"]);
            }else if(arg === "patchMetadata"){
                let initData = arrayify(args["metadata"], launchArg);
                if(initData && initData.startsWith("@")){
                    log(chalk`Reading data from {white ${initData.slice(1)}}`);
                    initData = readFileSync(initData.slice(1), "utf-8");
                }

                initData = JSON.parse(initData);

                await asset.patchMetadata(initData);
            }else if(arg === "rename"){
                let newName = args["new-name"];
                let oldName = asset.name;
                await asset.rename(newName);
                log(chalk`Rename: {green ${oldName}} -> {green ${newName}}`);
            }else if(arg === "downloadfile" || arg === "downloadFile") {
                let label = arrayify(args["file-label"], fileArg)
                if(!label){
                    throw new AbortError("No label supplied");
                }
                fileArg++;
                await asset.downloadFile(label, args["to-folder"]);
            }else if(arg === "presignfile") {
                let label = arrayify(args["file-label"], fileArg)
                if(!label){
                    throw new AbortError("No label supplied");
                }
                fileArg++;

                let file = await asset.getFileByLabel(label);
                log(await file.getContent(false, true));
            }else if(arg === "deletefile" || arg === "deleteFile" || arg === "removefile" || arg === "removeFile") {
                let label = arrayify(args["file-label"], fileArg)
                if(!label){
                    throw new AbortError("No label supplied");
                }
                fileArg++;
                let result = await asset.deleteFile(label);
                if(!result) {
                    log(`Failed to delete file ${label}`);
                }
            }else if(arg === "grep") {
                await asset.grep(args._.pop(), {
                    artifact: args.on || args.artifact || "trace",
                    nameOnly: args["name-only"],
                    ordering: null,
                });
            }else if (arg === "viewapi") {
                await asset.replay();
            }else if(arg === "analyze") {
                await asset.analyze();
            }else if(arg === "listJobs") {
                await asset.listJobs();
            }else{
                log(`No usage found for ${arg}`);
            }
        }
        if(configObject.rawOutput && !configObject.script) return asset;
    },

    async pullList(args){
        let list = await getFilesFromArgs(args);

        let chain = new SupplyChain();

        chain.rules = new Collection([]);
        chain.presets = new Collection([]);
        chain.notifications = new Collection([]);

        let files = await spawn({noecho: true}, "git", ["ls-files"]);
        files = files.stdout.split("\n");
        log(files);

        let parse = /(\w+) (.+)/;
        for(let item of list) {
            let [_, type, name] = parse.exec(item);

            if(type == "Rule"){
                let rule = await Rule.getByName("UAT", name);
                rule._localpath = files.filter(x => x.includes(name) && x.includes("rules"))[0];
                rule.path = rule._localpath;
                log(rule._localpath);
                chain.rules.arr.push(rule);
            }else if(type == "Preset"){
                let preset = await Preset.getByName("UAT", name);
                preset._localpath = files.filter(x => x.includes(name) && x.includes("presets"))[0];
                preset.path = preset._localpath;
                log(preset._localpath);
                chain.presets.arr.push(preset);
            }
        }

        await chain.log();

        //let maybeFile = files.filter(

        await chain.syncTo("LOCAL");
    },

    async checkSegments(args){
        let asset = args._.shift()
        let res = await allIndexBundle.lib.makeAPIRequest({
            env: args.env, path: `/movies/${asset}/metadata/Metadata`,
        });
        let segments = res.data.attributes.metadata.userMetaData.segments.segments;

        let r = segments.reduce((lastSegment, val, ind) => {
            let curSegment = val.startTime;
            if(curSegment < lastSegment){
                log("bad segment " + (ind + 1))
            }
            return val.endTime
         }, "00:00:00:00");
    },

    async getJobs(args){
        let req = await allIndexBundle.lib.indexPathFast({
            env: args.env, path: "/jobs",
            qs: {
                filter: "presetName=DCTC Add Element US Checkin",
            },
        });

        log(req.map(x => x.relationships.asset.data.id).join("\n"))
    },

    async listAssets(args, tag){
        let req = await allIndexBundle.lib.indexPathFast({
            env: args.env, path: "/assets",
            qs: {
                noRelationships: true,
                sort: "id",
            },
            chunksize: 30,
        });
        for(let asset of req){
            log(asset.id);
        }

        return req;
    },

    async listSegments(args){
        let f = JSON.parse(readFileSync(args.file, "utf-8"));

        for(let asset of f){
            let r = await allIndexBundle.lib.makeAPIRequest({
                env: args.env, path: `/movies/${asset.id}/metadata/Metadata`,
            });

            let segs = r.data.attributes.metadata.userMetaData?.segments?.segments;
            if(segs && segs.length > 1){
                log(asset.id);
                log(asset.name);
            }
        }
    },
    async test4(args){
        let things = await allIndexBundle.lib.indexPathFast({
            env: args.env, path: "/assets",
            qs: {
                filter: `createdBefore=${Date.now() - 1000 * 160 * 24 * 60 * 60},createdSince=${Date.now() - 1000 * 170 * 24 * 60 * 60}`
            }
        });

        log(JSON.stringify(things, null, 4));
    },

    async test5(args){
        let things = await allIndexBundle.lib.indexPathFast({
            env: args.env, path: "/jobs",
            qs: {
                filter: `state=Queued,presetName=E2 P4101 - DNE Compliance Edit - US Output Deal - Edit WorkOrder`
            }
        });

        log(JSON.stringify(things, null, 4));
    },
    async test2(args){
        let wfr = await allIndexBundle.lib.indexPath({
            env: args.env, path: "/workflowRuleMetadata",
        });
        log(wfr);

        for(let wfrm of wfr){
            try{
                wfrm.id = undefined;
                wfrm.links = undefined;
                log(wfrm);
                let req = await allIndexBundle.lib.makeAPIRequest({
                    env: "DEV", path: "/workflowRuleMetadata",
                    method: "POST",
                    payload: {data: wfrm},
                })
            }catch(e){
                log("caught");
            }
            //break;
        }
    },

    async test3(args){
        let wfr = await allIndexBundle.lib.indexPath({
            env: args.env, path: "/workflowRuleMetadata",
        });
        log(wfr);

        for(let wfrm of wfr){
            try{
                wfrm.id = undefined;
                wfrm.links = undefined;
                log(wfrm);
                let req = await allIndexBundle.lib.makeAPIRequest({
                    env: "DEV", path: "/workflowRuleMetadata",
                    method: "POST",
                    payload: {data: wfrm},
                })
            }catch(e){
                log("caught");
            }
            //break;
        }
    },

    async deleteOmneons(args){
        let id = args._.shift();

        let asset;
        if(Number(id)) {
            asset = await Asset.getById("PROD", Number(id));
        }else{
            asset = await Asset.getByName("PROD", id);
        }

        log(asset);
        let f = await asset.getFiles();

        for(let file of f){
            if(file.label.includes("Omneon")){
                log(`removing ${file.label}`);
                await file.delete();
            }
        }
    },

    async audit(args){
        let supportedAudits = ["presets", "rule", "other"];
        await configHelpers.addAutoCompletePrompt();
        let q = await configHelpers.inquirer.prompt([{
            type: "autocomplete", name: "obj",
            message: `What audit do you want?`,
            source: async (sofar, input) => {
                return supportedAudits.filter(x => input ? x.includes(input.toLowerCase()) : true);
            },
        }]);
        let choice = q.obj;
        let resourceId = undefined
        let filterFunc = _=>_;
        if(choice === "presets"){
            let preset = await configHelpers.selectPreset({canSelectNone: false});
            let remote = await Preset.getByName(args.env, preset.name);
            if(!remote) throw new AbortError("Could not find this item on remote env");
            filterFunc = ev => ev.resource == "Preset";
            resourceId = remote.id;
        }else if(choice === "rule"){
            let preset = await configHelpers.selectRule({canSelectNone: false});
            let remote = await Rule.getByName(args.env, preset.name);
            if(!remote) throw new AbortError("Could not find this item on remote env");
            filterFunc = ev => (ev.resource == "Rule" || ev.resource == "WorkflowRule");
            resourceId = remote.id;
        }else{
            resourceId = await configHelpers.askInput(null, "What resourceID?");
        }

        log(chalk`Resource ID on {blue ${args.env}} is {yellow ${resourceId}}`);
        elog(`Loading audits (this might take a while)`);
        const numRows = 100;
        let r = await allIndexBundle.lib.makeAPIRequest({
            env: args.env,
            path: `/v1.0/audit?perPage=${numRows}&count=${numRows}&filter=%7B%22resourceId%22%3A%22${resourceId}%22%7D&autoload=false&pageNum=1&include=`,
            timeout: 180000,
        });
        r.data = r.data.filter(filterFunc);

        log("Data recieved, parsing users");

        for(let event of r.data){
            let uid = event?.correlation?.userId;
            if(!uid) continue;
            try{
                event.user = await User.getById(args.env, uid);
            }catch(e){
                event.user = {name: "????"};
            }
        }

        if(args.raw) return r.data;
        let evCounter = 0;
        for(let event of r.data){
            let evtime = moment(event.createdAt);
            let date = evtime.format("ddd YYYY/MM/DD hh:mm:ssa");
            let timedist = evtime.fromNow();
            log(chalk`${date} {yellow ${timedist}} {green ${event.user?.name}} ${event.event}`);

            if(++evCounter >= 30) break;
        }
    },

    async audit2(args){
        const numRows = 1000
        let r = await allIndexBundle.lib.makeAPIRequest({
            env: args.env,
            //path: `/v1.0/audit?perPage=${numRows}&count=${numRows}&autoload=false&pageNum=1&include=`,
            path: `/v1.0/audit?perPage=${numRows}&count=${numRows}&filter=%7B%22correlation.userId%22%3A%5B%22164%22%5D%7D&autoload=false&pageNum=1&include=`,
            timeout: 60000,
        });
        for(let event of r.data){
            log(event.event);
        }
    },

    async findIDs(args){
        let files = await getFilesFromArgs(args);
        for(let file of files){
            let preset = await Preset.getByName(args.env, file);
            await preset.resolve();
            log(`silo-presets/${file}.${preset.ext}`);
        }
    },

    async getAssets(env, name){
        if(!this.callid) this.callid = 0;
        this.callid++;
        let callid = this.callid;

        await allIndexBundle.sleep(500);

        if(callid != this.callid) return this.lastResult || [];

        let req = await allIndexBundle.lib.makeAPIRequest({
            env, path: `/assets`,
            qs: name ? {filter: `nameContains=${name}`} : undefined,
        })
        this.lastCall = Date.now();

        return this.lastResult = req.data;
    },

    async content(args){
        configHelpers.addAutoCompletePrompt();
        let q = await configHelpers.inquirer.prompt([{
            type: "autocomplete",
            name: "what",
            message: `What asset do you want?`,
            source: async (sofar, input) => {
                let assets = await this.getAssets(args.env, input);
                assets = assets.map(x => new Asset({data: x, remote: args.env}));
                return assets.map(x => ({
                    name: x.chalkPrint(true) + ": " + x.data.links.self.replace("/api/v2/assets/", "/content/"),
                    value: x,
                }));
            },
        }]);
    },

    async analyzeAll(args){
        let files = await getFilesFromArgs(args);
    },

    async elastic(args) {
        let search = args._.join(" ");
        let subtle = args.quiet;
        let firstObserve = false;
        let observe = json => {
            if (subtle) {
                if(!firstObserve) {
                    log("Collecing assets...");
                    firstObserve = true;
                }else{
                    write(".");
                }
            }else{
                for(let a of json.data){
                    log(a.id);
                }
            }

            return json
        };

        log("Starting Query...");
        let apr = await allIndexBundle.lib.indexPathFast({
            env: args.env,
            path: `/assets`,
            observe,
            qs: {
                elasticsearch: search,
            },
            pageSize: 100,
        });

        log();
        log(chalk`Done collecting. Total count: {blue ${apr.length}}`);
        if(configObject.raw) {
            return apr;
        }
    },

    async parseElastic(args) {
        let f = require("fs").readFileSync("./files.txt", "utf8");
        for (let assetid of f.split("\n").filter(x=>x)) {
            let out = {};

            let a = await Asset.getById("PROD", assetid);
            let md = await a.getMetadata();
            let files = await a.getFiles();
            //log(md.Metadata.userMetaData);
            out.files = [];
            for(let file of files){
                out.files.push({
                    label: file.label,
                    content: file.contentLink,
                    instances: file.instancesList.map(({uri}) => uri),
                });
            }
            out.metadata = md;
            out.assetInfo = a.data;
            log(JSON.stringify(out));
        }
    },

    async ["@"](args){
        args._.unshift("-");
        args._.unshift("make");
        return this.supply(args);
    },

    //Used to test startup and teardown speed.
    noop(){
        return true;
    },
};
async function unknownCommand(cmd){
    log(chalk`Unknown command {red ${cmd}}.`);
}

async function noCommand(){
    write(chalk`Rally Tools {yellow v${packageVersion}} CLI\n`);

    //Prompt users to setup one time config.
    if(!configObject.hasConfig){
        write(chalk`
It looks like you haven't setup the config yet. Please run '{green rally config}'.
`);
        return;
    }

    let envs = new Set(["LOCAL", "UAT", "DEV", "PROD", "QA", ...Object.keys(configObject.api)]);

    let proms = [];
    for(let env of envs){
        proms.push({env, prom: funcs.testAccess(env)});
    }

    //API Access tests
    for(let {env, prom} of proms){
        //Test access. Returns HTTP response code
        let resultStr;
        try{
            let [result, timer] = await prom;

            //Create a colored display and response
            resultStr = chalk`{yellow ${result} <unknown>}`;
            if(result === 200) resultStr = chalk`{green 200 OK} {gray ${timer} ms}`;
            else if(result === 401) resultStr = chalk`{red 401 No Access}`;
            else if(result >= 500)  resultStr = chalk`{yellow ${result} API Down?}`;
            else if(result === true) resultStr = chalk`{green OK}`;
            else if(result === false) resultStr = chalk`{red BAD}`;
        }catch(e){
            if(e instanceof UnconfiguredEnvError){
                resultStr = chalk`{yellow Unconfigured}`;
            }else if(e instanceof APIError){
                if(!e.response.body){
                    resultStr = chalk`{red Timeout (???)}`;
                }
            }else if(e.error?.code === "ETIMEDOUT"){
                resultStr = chalk`{red Timeout (>2s)}`;
            }else if(e.name == "RequestError"){
                resultStr = chalk`{red Low level error (check internet): ${e.error}}`;
            }else{
                resultStr = chalk`{red Internal Error: (oh no!)}`;
            }
        }

        log(chalk`   ${env}: ${resultStr}`);
    }
}

async function $main(){
    //Supply --config to load a different config file
    if(typeof(argv.config) === "string"){
        loadConfig(argv.config);
    }else if(typeof(argv.config) === "object") {
        loadConfigFromArgs(argv);
    }else{
        loadConfig();
    }

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

    if(argv["store-stage"]){
        configObject.storeStage = true;
    }

    if(argv["dry-run"]){
        configObject.dryRun = true;
    }

    if(argv["script"]){
        configObject.script = true;
    }

    if(argv["ignore-missing"]){
        configObject.ignoreMissing = true;
    }

    if(argv["update-immutable"]){
        configObject.updateImmutable = true;
    }

    if(argv["skip-header"]){
        configObject.skipHeader = true;
    }

    if(argv["no-replacer"]){
        configObject.noReplacer = true;
    }
    a
    if(argv["no-starred"]){
        configObject.noStarred = true;
    }

    configObject.globalProgress = argv["show-progress"] || false;

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
    }else if(argv["vvverbose"]){
        configObject.verbose = true;
        configObject.vverbose = true;
        configObject.vvverbose = true;
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
                process.exit(1);
            }else{
                throw e;
            }
        }
    }else{
        await noCommand();
    }

    process.exit(0);
}

async function main(...args){
    //Catch all for errors to avoid ugly default node promise catcher
    try{
        await $main(...args);
    }catch(e){
        errorLog(e.stack);
        process.exit(1);
    }
}

// If this is an imported module, then we should exec the cli interface.
// Oterwise just export everything.
if(require.main == module){
    main();
}else{
    loadConfig();
    module.exports = allIndexBundle;
}
