import {RallyBase, lib, AbortError, Collection, sleep, zip} from  "./rally-tools.js";
import {basename, resolve as pathResolve, dirname} from "path";
import {cached, defineAssoc, spawn, runGit} from "./decorators.js";
import {configObject} from "./config.js";
import {saveConfig, loadLocals, inquirer, addAutoCompletePrompt, askQuestion, selectPreset, selectLocalMenu, askInput} from "./config-create.js";
import Provider from "./providers.js";
import Asset from "./asset.js";
import Preset from "./preset.js";
import Rule from "./rule.js";
import SupplyChain from "./supply-chain.js";
import {categorizeString} from "./index.js";

// pathtransform for hotfix
import {writeFileSync, readFileSync, pathTransform} from "./fswrap.js";
import path from "path";
import moment from "moment";

let exists = {};
let stagingEmsg = chalk`Not currently on a clean staging branch. Please move to staging or resolve the commits.
Try {red git status} or {red rally stage edit --verbose} for more info.`;

let Stage = {
    async before(args){
        this.env = args.env;
        this.args = args;
        if(!this.env) throw new AbortError("No env supplied");
    },

    setStageId() {
        let api = configObject.api[this.env];
        if(!api) return null;
        return this.stageid = api.stage;
    },

    // This returns true if the stage failed to load
    async downloadStage() {
        this.setStageId();

        if(!this.stageid) {
            log(chalk`No stage ID found for {green ${this.env}}. Run "{red rally stage init -e ${this.env} (stage name)}" or select a different env.`);
            return true;
        }

        let preset = await Preset.getById(this.env, this.stageid);
        await preset.downloadCode();

        this.stageData = JSON.parse(preset.code);
        this.stagePreset = preset;

        log(chalk`Stage loaded: {green ${this.env}}/{green ${this.stagePreset.name}}`);
    },

    async uploadStage() {
        if(!this.stagePreset || !this.stageData) {
            throw "Assert fail: no existing prestage (you shouldn't see this)";
        }

        this.stagePreset.code = JSON.stringify(this.stageData, null, 4);

        await this.stagePreset.uploadCodeToEnv(this.env, false, false);
    },

    async $init(){
        let presetName = this.args._.pop();

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

    async $info(){
        if(await this.downloadStage()) return;

        if(configObject.rawOutput) return this.stageData;

        log(chalk`Currently Staged Branches: ${this.stageData.stage.length}`);
        for(let {branch, commit} of this.stageData.stage){
            log(chalk`    ${branch} {gray ${commit}}`);
        }

        log(chalk`Currently Claimed Presets: ${this.stageData.claimedPresets.length}`);
        for(let preset of this.stageData.claimedPresets){
            log(chalk`    {blue ${preset.name}} {gray ${preset.owner}}`);
        }
    },

    async $claim(){
        await Promise.all([this.downloadStage(), addAutoCompletePrompt()]);
        let q;

        let opts = [
            {name: "Claim a preset", value: "add"},
            {name: "Remove a claimed preset", value: "rem"},
            {name: "Apply changes", value: "done"},
            {name: "Quit without saving", value: "quit"},
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
                    this.stageData.claimedPresets = this.stageData.claimedPresets.filter(x => x.name != p);
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
            log(stagingEmsg);
            return;
        }

        log("Finished retreiving branches.");

        return branchList;
    },

    async runGit(...args) {
        return await runGit(...args);
    },

    filterwith(list) {
        return async (sofar, input) => {
            return list.filter(x => input ? (x.name || x).toLowerCase().includes(input.toLowerCase()) : true);
        }
    },

    //finite state machine for inputting branch changes
    async editFSM(allBranches, newStagedBranches) {

        let q;

        let opts = [
            {name: "Add a branch to the stage", value: "add"},
            {name: "Remove a branch from the stage", value: "rem"},
            {name: "Finalize stage", value: "done"},
            {name: "Quit without saving", value: "quit"},
        ];

        for(;;) {
            q = await inquirer.prompt([{
                type: "autocomplete",
                name: "type",
                message: `What do you want to do?`,
                source: this.filterwith(opts)
            }]);

            if(q.type === "add") {
                let qqs = allBranches.slice(0); //copy the branches
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
                return "quit";
            }
        }
    },



    async $edit(){
        let needsInput = !this.args.a && !this.args.r && !this.args.add && !this.args.remove;
        let clean = this.args.clean;

        let [branches, stage, _] = await Promise.all([
            this.getBranches(),
            this.downloadStage(),
            !needsInput || addAutoCompletePrompt()
        ]);

        if(stage) return;

        if(!branches) return;

        //copy the branches we started with
        let newStagedBranches = new Set();
        let oldStagedBranches = new Set();
        for(let {branch} of this.stageData.stage){
            if(!clean) {
                newStagedBranches.add(branch);
            }
            oldStagedBranches.add(branch);
        }

        if(needsInput) {
            let res = await this.editFSM(branches, newStagedBranches);
            if(res == "quit"){
                return;
            }
        } else {
            let asarray = arg => {
                if(!arg) return [];
                return Array.isArray(arg) ? arg : [arg];
            }

            for(let branch of [...asarray(this.args.a), ...asarray(this.args.add)]) {
                if(!branches.includes(branch)){
                    throw new AbortError(`Invalid branch ${branch}`);
                }
                newStagedBranches.add(branch);
            }
            for(let branch of [...asarray(this.args.r), ...asarray(this.args.remove)]) {
                if(!branches.includes(branch)){
                    throw new AbortError(`Invalid branch ${branch}`);
                }
                newStagedBranches.delete(branch);
            }
        }

        const difference = (s1, s2) => new Set([...s1].filter(x => !s2.has(x)));
        const intersect = (s1, s2) => new Set([...s1].filter(x => s2.has(x)));

        log("Proposed stage changes:");
        for(let branch of intersect(newStagedBranches, oldStagedBranches)){
            log(chalk`   ${branch}`);
        }
        for(let branch of difference(newStagedBranches, oldStagedBranches)){
            log(chalk`  {green +${branch}}`);
        }
        for(let branch of difference(oldStagedBranches, newStagedBranches)){
            log(chalk`  {red -${branch}}`);
        }

        let ok = this.args.y || await askQuestion("Prepare these branches for deployment?");
        if(!ok) return;

        //just to make sure commits/branches don't get out of order
        newStagedBranches = Array.from(newStagedBranches);

        try {
            let [diffText, newStagedCommits] = await this.doGit(newStagedBranches, this.stageData.stage.map(x => x.commit));

            await this.runRally(diffText);

            this.stageData.stage = Array.from(zip(newStagedBranches, newStagedCommits)).map(([branch, commit]) => ({branch, commit}));

             await this.uploadStage();
        }catch(e){
            if(e instanceof AbortError) {
                await this.runGit([0], "reset", "--hard", "HEAD");
                await this.runGit([0], "checkout", "staging");
                throw e;
            }

            throw e; //TODO 
        }finally{
            await this.runGit([0], "checkout", "staging");
        }

    },

    async $forceRemove() {
        if(!await this.checkCurrentBranch()) {
            log(stagingEmsg);
            return;
        }

        try {
            return await this.forceRemove();
        } finally {
            await this.runGit([0], "checkout", "staging");
        }
    },

    async forceRemove() {
        let badBranches = this.args._;
        if(!badBranches || badBranches.length === 0){
            throw new AbortError(chalk`No branch given to force remove`);
        }

        if(await this.downloadStage()) return;

        //First, create new stage without broken branches to check if it's valid
        let newStage = this.stageData.stage.filter(x => !badBranches.includes(x.branch));
        if(this.stageData.stage.length - newStage.length < badBranches.length){
            throw new AbortError(chalk`Not all given branches are currently staged.`);
        }

        //Next, get all the presets of the removed branch
        let allDiffs = "";
        for(let branch of badBranches){
            let diff = await spawn({noecho: true}, "git", ["diff", `staging...origin/${branch}`, "--name-only"]);

            if(diff.exitCode !== 0) {
                log(diff);
                throw new AbortError(`Could not diff "staging..origin/${branch}"`);
            }

            allDiffs += diff.stdout;
        }

        //Finally, make a new stage and deploy all the presets from the old branches
        let newStageBranches = newStage.map(x => x.branch);
        let x = await this.makeNewStage(newStageBranches);

        //log("Current stage: ");
        //for(let branch of newStageBranches){
            //log(chalk` - ${branch}`);
        //}

        log("Force removing the following branches:");
        for(let branch of badBranches){
            log(chalk` - {red ${branch}}`)
        }

        //Deploy to env and upload changes
        await this.runRally(allDiffs);

        this.stageData.stage = newStage;

        await this.uploadStage();
    },

    async $pull() {
        if(await this.downloadStage()) return;
        await this.makeOldStage(this.stageData.stage.map(x => x.commit), `rallystage-${this.env}`);
    },

    async $gitFix() {
        await this.runGit([0], "reset", "--hard", "HEAD");
        await this.runGit([0], "checkout", "staging");
    },


    logProgress(cur, len, name, clearSpace) {
        let dots = cur + 1;
        let spaces = len - dots;
        write(chalk`\r[${".".repeat(dots)}${" ".repeat(spaces)}] {yellow ${cur + 1}} / ${len} ${name}${" ".repeat(clearSpace - name.length)}`);
    },

    async makeNewStage(newStagedBranches) {
        let newStagedCommits = [];

        let longestBranchName = newStagedBranches.reduce((longest, branch) => Math.max(branch.length, longest), 0)

        await this.runGit([0, 1], "branch", "-D", "RALLYNEWSTAGE");
        await this.runGit([0], "checkout", "-b", "RALLYNEWSTAGE");
        log(chalk`Merging {blue ${newStagedBranches.length}} branches:`);
        for(let [i, branch] of newStagedBranches.entries()) {
            this.logProgress(i, newStagedBranches.length, branch, longestBranchName);
            let originName = `origin/${branch}`
            if(configObject.verbose) log(chalk`About to merge {green ${originName}}`);
            let mergeinfo = await spawn({noecho: true}, "git", ["merge", "--squash", originName]);
            if(mergeinfo.exitCode == 1){
                log("Error", e.stdout);
                if(e.stderr.includes("resolve your current index")) {
                    log(chalk`{red Error}: Merge conflict when merging ${branch}`);
                }else{
                    log(chalk`{red Error}: Unknown error when merging ${branch}:`);
                }

                let e = new AbortError(`Failed to merge ${branch}`);
                e.branch = branch
                throw e;
            }else if(mergeinfo.exitCode != 0){
                log(chalk`{red Error}: Unknown error when merging ${branch}`);
                throw new AbortError(`Failed to merge for unknown reason ${branch}: {red ${mergeinfo}}`);
            }
            let [commit, _2] = await this.runGit([0, 1], "commit", "-m", `autostaging: commit ${branch}`);

            if(commit.includes("working tree clean")){
                log(chalk`{yellow Warning:} working tree clean after merging {green ${branch}}, please remove this from the stage`);
            }

            let hash = await spawn({noecho: true}, "git", ["log", "--format=oneline", "--color=never", "-n", "1", originName]);
            if(hash.exitCode !== 0) {
                throw new AbortError(`Failed to get commit hash for branch, ${branch}`);
            }
            newStagedCommits.push(hash.stdout.split(" ")[0]);
        }
        log("");

        return newStagedCommits;
    },

    async makeOldStage(oldStagedCommits, name) {
        await this.runGit([0], "checkout", "staging");
        await this.runGit([0, 1], "branch", "-D", name);
        await this.runGit([0], "checkout", "-b", name);
        for(let branch of oldStagedCommits) {
            let [err, _] = await this.runGit([0, 1], "merge", branch);
            if(err.includes("Automatic merge failed")){
                log(chalk`{red Error:} ${branch} failed to merge during auto-commit`)
                if(this.args.force){
                    await this.runGit([0], "merge", "--abort");
                }else{
                    try{
                        let [a] = await this.runGit([0], "branch", "-a", "--color=never", "--contains", branch);
                        a = a.trim();
                        log(chalk`{yellow Hint}: Full name of conflict branch: {green ${a}}`)
                    }catch(e){}
                    throw new AbortError("Not trying to merge other branches");
                }
            }
        }
    },

    async checkCurrentBranch() {
        let expected = `On branch staging
Your branch is up to date with 'origin/staging'.

nothing to commit, working tree clean`;

        let status = await spawn({noecho: true}, "git", ["status"]);
        let trimmed = status.stdout.trim();

        if(configObject.verbose){
            log("expected:");
            log(chalk`{green ${expected}}`);
            log("got:");
            log(chalk`{red ${trimmed}}`);
        }

        return trimmed === expected;
    },

    async findConflict(newStagedBranches, brokeBranch) {
        await this.runGit([0], "reset", "--hard", "HEAD");

        await this.runGit([0], "checkout", "staging");
        let [a, b] = await this.runGit([0, 1], "merge", "--squash", `origin/${brokeBranch}`);

        if(a.includes("merge failed")){
            return [{
                branch: chalk`{yellow !! against staging !!} {white for} ${brokeBranch}`,
                msg: a,
            }];
        }

        await this.runGit([0], "reset", "--hard", "HEAD");

        let conflicting = [];
        for(let branch of newStagedBranches) {
            if(branch == brokeBranch) continue;

            await this.runGit([0], "checkout", "staging");
            await this.runGit([0, 1], "branch", "-D", "RALLYNEWSTAGE");
            await this.runGit([0], "checkout", "-b", "RALLYNEWSTAGE");
            let originName = `origin/${branch}`
            await this.runGit([0], "merge", "--squash", originName);
            await this.runGit([0, 1], "commit", "-m", `autostaging: commit ${branch}`);

            let [a, b] = await this.runGit([0, 1], "merge", "--squash", `origin/${brokeBranch}`);
            if(a.includes("merge failed")){
                conflicting.push({
                    branch,
                    msg: a,
                });
                let [c, d] = await this.runGit([0, 1], "reset", "--hard", "HEAD");
            }else{
                let [c, d] = await this.runGit([0, 1], "commit", "-m", `asdf`);
            }
        }
        await this.runGit([0], "reset", "--hard", "HEAD");
        await this.runGit([0], "checkout", "staging");

        return conflicting;
    },

    async printConflicts(conflicts) {
        for({branch, msg} of conflicts) {
            log(chalk`Conflict found on branch {blue ${branch}}: \n {red ${msg}}`);
        }
    },

    async $tfc() {
        await this.runGit([0], "reset", "--hard", "HEAD");
        await this.runGit([0], "checkout", "staging");
        let a = await this.findConflict([
            "ASR-106_Vidchecker8.1.5", "test-too_many_markers_fix",
            "regression-fix_weird_durations", "ASXT-Video-QC-Vidcheck-USPOST",
            "GATEWAY-CSDNAPConversion-ASR-411",
            "ONRAMP-audioNormalization-ASR-69", "ASR-389_addelement",
            "TECHDEBT-addIconForGConversionLauncher", "ASR-402_DDU_metadata",
            "ASR-300-DDU-NZ-ADS-tracks", "ASR-454_PCDNAP_IBMS_Prefix",
            "ASXT-Mediator-Publisher", "ASXT-Deal-Logic",
            "uat-only-ADS-use-correct-AQC-Job", "ASXT-44-and-22", "509-rebase",
            "ASR-514-ML-QC-Proxy-oversized",
            "ONRAMP-captionProxyAudio-ASR-516", "ASXT-Rally-Panel", "ASR-513"
        ], "regression-fix_weird_durations");
        //], "ONRAMP-audioNormalization-ASR-69");

        //let a = await this.findConflict([
            //"fix-tc_adjust_planb", "test-too_many_markers_fix",
            //"audio_rectifier_updates_ASR-69", "getIbmsMediaIdFix",
            //"ASR-393_WrongTimecodesBlackSegmentDetection",
            //"ASR-390_BadWooPartNums", "ASXT-Audio-QC-Baton-DLAPost", "ASR-293",
            //"ASR-383_tiktok_rectifier"
        //], "ASR-383_tiktok_rectifier");

        await this.printConflicts(a);
    },

    async doGit(newStagedBranches, oldStagedCommits) {
        if(!await this.checkCurrentBranch()) {
            log(stagingEmsg);
            return;
        }

        let newStagedCommits;
        try {
            newStagedCommits = await this.makeNewStage(newStagedBranches);
        } catch(e) {
            if(e instanceof AbortError && e.branch) {
                log("Diagnosing conflict...");
                let conflicts = await this.findConflict(newStagedBranches, e.branch);
                this.printConflicts(conflicts);
                if(conflicts.length > 0){
                    throw new AbortError("Found conflict");
                }else{
                    throw new AbortError("Unable to find conflict... No idea what to do.");
                }
            }else{
                throw e;
            }
        }
        await this.makeOldStage(oldStagedCommits, "RALLYOLDSTAGE");

        await this.runGit([0], "checkout", "RALLYNEWSTAGE");
        let diff = await spawn({noecho: true}, "git", ["diff", "RALLYOLDSTAGE..HEAD", "--name-only"]);
        if(diff.exitCode !== 0) { 
            log(diff);
            throw new Error("diff failed");
        }

        let diffText = diff.stdout;

        return [diffText, newStagedCommits];
    },

    async $testrr() {
        let diff = `silo-presets/Super Movie Data Collector.py
        silo-presets/Super Movie Post Work Order.py
        silo-presets/Super Movie Task Handler.py`;


        await this.runRally(diff);
    },

    async $restore(args) {
        let getStdin = require("get-stdin");
        let stdin = await getStdin();
        let stagedLines = stdin.split("\n");
        if(stagedLines[stagedLines.length - 1] === "") stagedLines.pop();

        let oldStage = stagedLines.map((line, index) => {
            let s = /(\S+)\s([a-f0-9]+)/.exec(line);
            if(!s) throw new AbortError(chalk`Could not read commit+branch from line "${line}" (index ${index})`);
            return {
                branch: s[1],
                commit: s[2],
            }
        });

        this.args.a = oldStage.map(x => x.branch);
        this.args.r = args._.pop();
        this.args.y = true;

        await this.$edit();
    },

    async runRally(diffText) {
        let set = new Set();
        for(let file of diffText.trim().split("\n")){
            set.add(await categorizeString(file));
        }
        let files = [...set];
        files = files.filter(f => f && !f.missing);

        let chain = new SupplyChain();

        chain.rules = new Collection(files.filter(f => f instanceof Rule));
        chain.presets = new Collection(files.filter(f => f instanceof Preset));
        chain.notifications = new Collection([]);

        if(chain.rules.arr.length + chain.presets.arr.length === 0){
            log(chalk`{blue Info:} No changed prests, nothing to deploy`);
            return
        }

        chain.log();

        let hasClaimed = false;
        for(let preset of chain.presets) {
            for(let claim of this.stageData.claimedPresets){
                if(preset.name == claim.name) {
                    hasClaimed = true;
                    log(chalk`{yellow Claimed preset}: {blue ${claim.name}} (owner {green ${claim.owner}})`);
                }
            }
        }

        if(hasClaimed){
            throw new AbortError("Someone has a claimed preset in the deploy");
        }


        let ok = this.args.y || await askQuestion("Deploy now?");
        if(!ok) throw new AbortError("Not deploying");

        await chain.syncTo(this.env);
    },

    async unknown(arg, args){
        log(chalk`Unknown action {red ${arg}} try '{white rally help stage}'`);
    },
}

export default Stage;
