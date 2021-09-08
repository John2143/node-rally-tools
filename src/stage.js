import {RallyBase, lib, AbortError, Collection, sleep, zip} from  "./rally-tools.js";
import {basename, resolve as pathResolve, dirname} from "path";
import {cached, defineAssoc, spawn} from "./decorators.js";
import {configObject} from "./config.js";
import {saveConfig, loadLocals, inquirer, addAutoCompletePrompt, askQuestion} from "./config-create";
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

        await saveConfig(configObject, {print: false});
    },

    async $info(args){
        await this.downloadStage();

        if(args.raw) return this.stageData;

        log(chalk`Currently Staged Branches: ${this.stageData.stagedBranches.length}`);
        for(let [branch, commit] of zip(this.stageData.stagedBranches, this.stageData.stagedCommits)){
            log(chalk`    ${branch} {gray ${commit}}`);
        }
    },

    async $claim(args){
    },

    async getBranches(){
        let branches = await spawn({noecho: true}, "git", ["branch", "-la", "--color=never"]);
        if(branches.exitCode !== 0) {
            log("Error in loading branches", branches);
        }

        let isOnMain = false;

        let branchList = branches.stdout
            .split("\n")
            .map(x => x.trim())
            .filter(x => x)
            .map(x => {
                if(x.startsWith("* ")){
                    x = x.slice(2);
                    if(x === "staging") {
                        isOnMain = true;
                    }
                }

                let lastSlash = x.lastIndexOf("/");
                if(lastSlash !== -1){
                    x = x.slice(lastSlash + 1);
                }

                return x;
            });

        if(!isOnMain) {
            log("You are not currently on the staging branch. Please save your changes change branches.");
            return null;
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
        if(!oks.includes(g.exitCode)) {
            throw Error(`Failed to run git ${args}`);
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

        let filterwith = list => async (sofar, input) => {
            return list.filter(x => input ? (x.name || x).toLowerCase().includes(input.toLowerCase()) : true);
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
                source: filterwith(opts)
            }]);

            if(q.type === "add") {
                let qqs = branches.slice(0); //copy the branches
                qqs.push("None");
                q = await inquirer.prompt([{
                    type: "autocomplete",
                    name: "branch",
                    message: `What branch do you want to add?`,
                    source: filterwith(qqs)
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
                    source: filterwith(qqs)
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
            await this.runGit([0], "merge", "--squash", branch);
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

    async doGit(newStagedBranches, oldStagedCommits) {

        let expected = `On branch staging
Your branch is up to date with 'origin/staging'.

nothing to commit, working tree clean`;

        let status = await spawn({noecho: true}, "git", ["status"]);
        if(status.stdout.trim() !== expected) {
            log("Wrong starting branch? exiting just in case");
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
