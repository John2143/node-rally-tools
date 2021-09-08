import {RallyBase, lib, AbortError, Collection, sleep, zip} from  "./rally-tools.js";
import {basename, resolve as pathResolve, dirname} from "path";
import {cached, defineAssoc, spawn} from "./decorators.js";
import {configObject} from "./config.js";
import {saveConfig, loadLocals, inquirer, addAutoCompletePrompt, askQuestion, selectPreset, selectLocalMenu, askInput} from "./config-create";
import Provider from "./providers.js";
import Asset from "./asset.js";
import Preset from "./preset.js";

// pathtransform for hotfix
import {writeFileSync, readFileSync, pathTransform} from "./fswrap.js";
import path from "path";
import moment from "moment";

let exists = {};

let Stage = {
    async before(args){
        this.env = args.env;
        if(!this.env) throw new AbortError("No env supplied");
    },

    setStageId() {
        let api = configObject.api[this.env];
        if(!api) return null;
        return this.stageid = api.stage;
    },

    async downloadStage() {
        this.setStageId();

        if(!this.stageid) {
            log(chalk`No stage ID found for {green ${this.env}}. Run "{red rally stage init -e ${this.env} (stage name)}" or select a different env.`);
        }

        let preset = await Preset.getById(this.env, this.stageid);
        await preset.downloadCode();

        this.stageData = JSON.parse(preset.code);
        this.stagePreset = preset;

        log(chalk`Stage loaded: {green ${this.stagePreset.name}}`);
    },

    async uploadStage() {
        if(!this.stagePreset || !this.stageData) {
            throw "Assert fail: no existing prestage (you shouldn't see this)";
        }

        this.stagePreset.code = JSON.stringify(this.stageData, null, 4);

        await this.stagePreset.uploadCodeToEnv(this.env, false, false);
    },

    async $init(args){
        let presetName = args._.pop();

        let preset = await Preset.getByName(this.env, presetName);

        if(!preset) {
            log("Existing preset stage not found.");
            return;
        }

        log(chalk`Found stage target to init: ${preset.chalkPrint(false)}`);

        configObject.api[this.env].stage = preset.id;
        configObject["ownerName"] = await askInput("What is your name");

        await saveConfig(configObject, {print: false});
    },

    async $info(args){
        await this.downloadStage();

        if(args.raw) return this.stageData;

        log(chalk`Currently Staged Branches: ${this.stageData.stagedBranches.length}`);
        for(let [branch, commit] of zip(this.stageData.stagedBranches, this.stageData.stagedCommits)){
            log(chalk`    ${branch} {gray ${commit}}`);
        }

        log(chalk`Currently Claimed Presets: ${this.stageData.claimedPresets.length}`);
        for(let preset of this.stageData.claimedPresets){
            log(chalk`    {blue ${preset.name}} {gray ${preset.owner}}`);
        }
    },

    async $claim(args){
        await Promise.all([this.downloadStage(), addAutoCompletePrompt()]);
        let q;

        let opts = [
            {name: "Chaim a preset", value: "add"},
            {name: "Remove a claimed preset", value: "rem"},
            {name: "Apply", value: "done"},
            {name: "Quit", value: "quit"},
        ];

        //slice to copy
        let newClaimed = [];
        let ownerName = configObject["ownerName"]

        for(;;) {
            q = await inquirer.prompt([{
                type: "autocomplete",
                name: "type",
                message: `What do you want to do?`,
                source: this.filterwith(opts)
            }]);

            if(q.type === "add") {
                let p = await selectPreset({});

                if(!p) continue;

                newClaimed.push(p);
            }else if(q.type === "rem") {
                let objsMap = newClaimed.map(x => ({
                    name: x.chalkPrint(true),
                    value: x,
                }));

                for(let obj of this.stageData.claimedPresets) {
                    objsMap.push({
                        name: obj.name,
                        value: obj.name,
                    });
                }

                let p = await selectLocalMenu(objsMap, "preset", true);

                if(!p) continue;
                if(typeof(p) == "string") {
                    this.stageData.claimedPresets = this.stageData.claimedPresets.filter(x => x.name != p && x.owner === ownerName);
                }else{
                    newClaimed = newClaimed.filter(x => x !== p);
                }
            }else if(q.type === "done") {
                break;
            }else if(q.type === "quit") {
                return
            }
        }

        for(let newClaim of newClaimed) {
            this.stageData.claimedPresets.push({
                name: newClaim.name,
                owner: ownerName,
            });
        }

        await this.uploadStage();
    },

    async getBranches(){
        let branches = await spawn({noecho: true}, "git", ["branch", "-la", "--color=never"]);
        if(branches.exitCode !== 0) {
            log("Error in loading branches", branches);
        }

        let branchList = branches.stdout
            .split("\n")
            .map(x => x.trim())
            .filter(x => x.startsWith("remotes/origin"))
            .map(x => {
                let lastSlash = x.lastIndexOf("/");
                if(lastSlash !== -1){
                    x = x.slice(lastSlash + 1);
                }

                return x;
            });

        if(!await this.checkCurrentBranch()) {
            log("Not currently on staging");
            return;
        }

        log("Finished retreiving branches.");

        return branchList;
    },

    async runGit(oks, ...args) {
        if(typeof(oks) === "number") {
            oks = [oks];
        }else if(typeof(oks) === "undefined") {
            oks = [0];
        }

        let g = await spawn({noecho: true}, "git", args);
        log(`git ${args.join(" ")}`)
        if(!oks.includes(g.exitCode)) {
            throw Error(`Failed to run git ${args}`);
        }

        return [g.stdout, g.stderr]
    },

    filterwith(list) {
        return async (sofar, input) => {
            return list.filter(x => input ? (x.name || x).toLowerCase().includes(input.toLowerCase()) : true);
        }
    },

    async $edit(args){
        let [branches, _] = await Promise.all([this.getBranches(), this.downloadStage(), addAutoCompletePrompt()]);

        if(!branches) return;

        //copy the branches we started with
        let newStagedBranches = new Set();
        let oldStagedBranches = new Set();
        for(let branch of this.stageData.stagedBranches){
            newStagedBranches.add(branch);
            oldStagedBranches.add(branch);
        }


        let q;

        let opts = [
            {name: "Add a branch to the stage", value: "add"},
            {name: "Remove a branch from the stage", value: "rem"},
            {name: "Finalize stage", value: "done"},
            {name: "Quit", value: "quit"},
        ];

        for(;;) {
            q = await inquirer.prompt([{
                type: "autocomplete",
                name: "type",
                message: `What do you want to do?`,
                source: this.filterwith(opts)
            }]);

            if(q.type === "add") {
                let qqs = branches.slice(0); //copy the branches
                qqs.push("None");
                q = await inquirer.prompt([{
                    type: "autocomplete",
                    name: "branch",
                    message: `What branch do you want to add?`,
                    source: this.filterwith(qqs)
                }]);

                if(q.branch !== "None") {
                    newStagedBranches.add(q.branch);
                }
            }else if(q.type === "rem") {
                let qqs = Array.from(newStagedBranches);
                qqs.push("None");
                q = await inquirer.prompt([{
                    type: "autocomplete",
                    name: "branch",
                    message: `What branch do you want to remove?`,
                    source: this.filterwith(qqs)
                }]);

                if(q.branch !== "None") {
                    newStagedBranches.delete(q.branch);
                }
            }else if(q.type === "done") {
                break;
            }else if(q.type === "quit") {
                return
            }
        }

        const difference = (s1, s2) => new Set([...s1].filter(x => !s2.has(x)));
        const intersect = (s1, s2) => new Set([...s1].filter(x => s2.has(x)));

        log("proposed changes");
        for(let branch of intersect(newStagedBranches, oldStagedBranches)){
            log(chalk`   ${branch}`);
        }
        for(let branch of difference(newStagedBranches, oldStagedBranches)){
            log(chalk`  {green +${branch}}`);
        }
        for(let branch of difference(oldStagedBranches, newStagedBranches)){
            log(chalk`  {red -${branch}}`);
        }

        let ok = await askQuestion("Prepare these branches for deployment?");
        if(!ok) return;

        //just to make sure commits/branches don't get out of order
        newStagedBranches = Array.from(newStagedBranches);

        let [diffText, newStagedCommits] = await this.doGit(newStagedBranches, this.stageData.stagedCommits);

        await this.runRally(diffText);

        this.stageData.stagedBranches = newStagedBranches;
        this.stageData.stagedCommits = newStagedCommits;

        await this.uploadStage();
    },

    async $pull() {
        await this.downloadStage();
        await this.makeOldStage(this.stageData.stagedCommits, `rallystage-${this.env}`);
    },


    async makeNewStage(newStagedBranches) {
        let newStagedCommits = [];

        await this.runGit([0, 1], "branch", "-D", "RALLYNEWSTAGE");
        await this.runGit([0], "checkout", "-b", "RALLYNEWSTAGE");
        for(let branch of newStagedBranches) {
            let [_, merge] = await this.runGit([0, 1], "merge", "--squash", `origin/${branch}`);
            await this.runGit([0], "commit", "-m", `autostaging: commit ${branch}`);
            let hash = await spawn({noecho: true}, "git", ["log", "--format=oneline", "--color=never", "-n", "1", branch]);
            newStagedCommits.push(hash.stdout.split(" ")[0]);
        }

        return newStagedCommits;
    },

    async makeOldStage(oldStagedCommits, name) {
        await this.runGit([0], "checkout", "staging");
        await this.runGit([0, 1], "branch", "-D", name);
        await this.runGit([0], "checkout", "-b", name);
        for(let branch of oldStagedCommits) {
            await this.runGit([0], "merge", branch);
        }
    },

    async checkCurrentBranch() {
        let expected = `On branch staging
Your branch is up to date with 'origin/staging'.

nothing to commit, working tree clean`;

        let status = await spawn({noecho: true}, "git", ["status"]);
        return status.stdout.trim() === expected;
    },

    async doGit(newStagedBranches, oldStagedCommits) {
        if(!await this.checkCurrentBranch()) {
            log("Not currently on staging");
            return;
        }

        let newStagedCommits = await this.makeNewStage(newStagedBranches);
        await this.makeOldStage(oldStagedCommits, "RALLYOLDSTAGE");

        await this.runGit([0], "checkout", "RALLYNEWSTAGE");
        let diff = await spawn({noecho: true}, "git", ["diff", "RALLYOLDSTAGE..HEAD", "--name-only"]);
        if(diff.exitCode !== 0) { 
            log(diff);
            throw Error("diff failed");
        }

        let diffText = diff.stdout;

        return [diffText, newStagedCommits];
    },

    async runRally(diffText) {
        let rto = await spawn({
            stdin(s) {
                s.write(diffText);
                s.end()
            }
        }, "rally", ["@"]);

        let ok = await askQuestion("Deploy now?");
        if(!ok) return;

        rtd = await spawn({
            stdin(s) {
                s.write(diffText);
                s.end()
            }
        }, "rally", ["@", "--to", this.env]);

        await this.runGit([0], "checkout", "staging");
    },

    async unknown(arg, args){
        log(chalk`Unknown action {red ${arg}} try '{white rally help stage}'`);
    },
}

export default Stage;
