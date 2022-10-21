import {RallyBase, lib, AbortError, Collection, sleep, zip} from  "./rally-tools.js";
import {configObject} from "./config.js";
import {spawn, runGit, runCommand} from "./decorators.js";
import rp from "request-promise";
import Preset from "./preset.js";

import fetch from "node-fetch";
import {Octokit} from "@octokit/rest";

let okit = null;

export const prodReadyLabel = "Ready For Release";
export const prodManualLabel = "Ready For Release (manual)";
export const prodMergedLabel = "Release Merged";
export const prodHotfixLabel = "hotfix";

/* The deployment process is separated into two different parts:
 * `rally deploy prep` Links jira tickets to PRs and assigns labels based on their status
 * `rally deploy merge` Takes all the labeled PRs, changes their base branch to the release, and merges them
*/
let Deploy = {
    async test() {
        //await this.makeRelease();
        await this.gh();
    },

    get octokit(){
        if(okit) return okit;
        return okit = new Octokit({
            auth: configObject.deploy.github,
            userAgent: `rally-tools deploy ${configObject.appName}`,
        });
    },

    getOctokitConfig() {
        return {
            owner: configObject.deploy.org,
            repo: configObject.deploy.repo,
        };
    },

    async getIssues(needsJira){
        let base = this.getOctokitConfig();

        let pullList = await this.octokit.paginate("GET /repos/{owner}/{repo}/issues", base);

        return await Promise.all(pullList.map(issue => this.assembleIssue(issue, needsJira)));
    },

    async gh(){
        let issues = await this.getIssues(true);
        for(let issue of issues){
            //await this.printIssue(issue);
            await this.checkStatus(issue);
        }
    },

    cardRegex: /\[(\w+)\-(\d+)\]/,
    async assembleIssue(issue, needsJira){
        let parsedTitle = issue.parsedTitle = this.cardRegex.exec(issue.title);
        if(configObject.verbose) {
            write(chalk`Found github issue: {blue ${issue.title}}... `);
        }
        if(!parsedTitle || !needsJira) {
            if(configObject.verbose) {
                log(`No jira issue found in title`);
            }
            return issue;
        }

        let cardLink = `${configObject.deploy.board}/issue/${parsedTitle[1]}-${parsedTitle[2]}`;

        let requestOptions = {
            method: "GET",
            headers: {
                "Authorization": `Basic ${(Buffer.from(configObject.deploy.jira)).toString("base64")}`,
            }
        };
        if(configObject.verbose) {
            log(chalk`Checking jira board: {green ${this.printJiraTicket(issue)}}.`);
        }

        let response = await fetch(cardLink, requestOptions);
        let jiraInfo = await response.json();
        let parsedInfo = {
            assignee_qa: jiraInfo.fields.customfield_17250,
            assignee_dev: jiraInfo.fields.assignee,
            reporter: jiraInfo.fields.reporter,
            labels: jiraInfo.fields.labels,
            creator: jiraInfo.fields.creator,
            points: jiraInfo.fields.customfield_18350,
            status: jiraInfo.fields.status
        };
        issue.jiraInfoFull = jiraInfo;
        issue.jira = parsedInfo;

        if(configObject.verbose) {
            log(chalk`Status of {green ${this.printJiraTicket(issue)}} is {red ${parsedInfo.status.name}}.`);
        }

        return issue;
    },
    name(j){
        if(!j) return "(None)";
        return j.displayName;
    },
    async printIssue(issue){
        if(!issue.jira) return;

        let j = issue.jira;
        let f = issue.jiraInfoFull;
        let format = chalk`PR #${issue.number}: ${issue.title}
    Dev: ${this.name(j.assignee_dev)}
    QA: ${this.name(j.assignee_qa)}
    Status: ${j.status.name}
    URL: ${issue.pull_request.html_url}
        `;
        log(format);
    },

    async setBase(issue, newBase) {
        let config = this.getOctokitConfig();
        config.pull_number = issue.number;
        config.base = newBase;

        return await this.octokit.request("PATCH /repos/{owner}/{repo}/pulls/{pull_number}", config);
    },

    async modifyLabel(issue, label, shouldHave){
        let labels = new Set(issue.labels.map(x => x.name));
        let oldSize = labels.size;

        let verb;
        if(shouldHave){
            verb = "Adding";
            labels.add(label);
        }else{
            verb = "Removing";
            labels.delete(label);
        }

        if(labels.size != oldSize){
            let config = this.getOctokitConfig();
            config.pull_number = issue.number;
            config.labels = Array.from(labels);

            log(chalk`${verb} label {green ${label}} on {blue PR #${issue.number}}`)
            return await this.octokit.request("PATCH /repos/{owner}/{repo}/issues/{pull_number}", config);
        }

        return [null, null];
    },

    async checkStatus(issue) {
        let labels = new Set(issue.labels.map(x => x.name));
        if(!issue.jira){
            if(labels.has(prodReadyLabel)){
                log(chalk`{yellow Warning:} PR #${issue.number} has prod label but no linked jira card`);
            }

            return;
        }

        let board = issue?.parsedTitle?.[1];
        let requiredProdStatus = configObject.deploy.boardMappings[board];
        if(requiredProdStatus){
            await this.modifyLabel(issue, prodReadyLabel, issue.jira.status.name == requiredProdStatus);
        }
    },

    printJiraTicket(issue){
        if(issue.parsedTitle){
            return `${issue.parsedTitle[1]}-${issue.parsedTitle[2]}`;
        }else{
            return `(No Jira Ticket)`;
        }
    },

    async makeRelease(args){
        let releaseBranchName = ""
        if(args.branch) {
            releaseBranchName = args.branch;
        } else {
            let dateCommand = await spawn({"noecho": true}, "date", ["+release-%y-%b-%d"]);
            releaseBranchName = dateCommand.stdout.trim();
        }

        let makeBranch = await runGit([0, 128], "checkout", "-b", releaseBranchName);
        if(makeBranch[1].includes("already exists")){
            await runGit([0], "checkout", releaseBranchName);
            await runGit([0], "pull", "origin", releaseBranchName);
        }else{
            await runGit([0], "push", "-u", "origin", "HEAD");
        }


        let issues = await this.getIssues();
        for(let issue of issues){
            let labels = new Set(issue.labels.map(x => x.name));
            if(!labels.has(prodReadyLabel) && !labels.has(prodManualLabel)) continue;

            await this.setBase(issue, releaseBranchName);
            write(chalk`Changed base of ${issue.number} (${this.printJiraTicket(issue)}) to ${releaseBranchName}... `);
            if(!issue.parsedTitle){
                log();
                write(chalk`Full title ^^: ${issue.title}...`);
            }
            let config = this.getOctokitConfig();
            config.merge_method = "squash";
            config.pull_number = issue.number;

            await this.octokit.request("PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge", config);
            log(chalk`Merged.`);
        }

        await runGit([0], "pull");
    },

    async stageSlackMsg(args){
        let requiredPresetsRules = await runCommand(`git diff staging...${args.branch} --name-only | rally @`);
        let currentStage = await runCommand("rally stage info");
        let msgBody = {
            "blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `@here The release branch has been staged by ${configObject.slackId ? `<@${configObject.slackId}>` : configObject.ownerName}`+
                                `\n${"```"+currentStage.replace(/.*Stage loaded: .*\n/,"")+"```"}`+
                                `\n${"```"+requiredPresetsRules.replace("Reading from stdin\n","")+"```"}`
                    }
                }
            ]
        }
        response = await rp({method: "POST", body: JSON.stringify(msgBody), headers: {"Content-Type": "application/json"}, uri: configObject.deploy.slackWebhooks.air_supply_release_staging});
    },

    async deploySlackMessage(args){
        let today = new Date();
        today = String(today.getMonth() + 1).padStart(2, '0') + '/' + String(today.getDate()).padStart(2, '0') + '/' + today.getFullYear();
        let pull_request_descriptions = [];
        let requiredPresetsRules = await runCommand(`git diff staging...${args.branch} --name-only | rally @`);
        let issues = await this.getIssues();
        for(let issue of issues){
            let labels = new Set(issue.labels.map(x => x.name));
            if (args.hotfix) {
                if(!labels.has(prodHotfixLabel)) continue;
            }
            else if(!labels.has(prodReadyLabel) && !labels.has(prodManualLabel)) continue;

            let config = this.getOctokitConfig();
            config.pull_number = issue.number;

            let pull_request = await this.octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", config);
            let pull_request_description = pull_request.data.body.replace("Description (user facing release note):","").replace(/Dev comments:[\s\S]*/,"").trim()
            pull_request_descriptions.push(pull_request_description)
        }
        if (pull_request_descriptions.length == 0) {
            log(chalk`{red Error:} Pull requests have not been tagged`);
        }
        else {
            pull_request_descriptions = pull_request_descriptions.filter(d => d.length != 0).map(d => `• ${d}`);
            let msgBody = {
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `@here ${args.hotfix ? "*HOTFIX*" :`*DEPLOY ${today}*`}`+
                                    `\nDeployer: ${configObject.slackId ? `<@${configObject.slackId}>` : configObject.ownerName}`+
                                    `\n${pull_request_descriptions.join("\n") || " "}`+
                                    `\n${"```"+requiredPresetsRules.replace("Reading from stdin\n","")+"```"}`
                        }
                    }
                ]
            }
            response = await rp({method: "POST", body: JSON.stringify(msgBody), headers: {"Content-Type": "application/json"}, uri: configObject.deploy.slackWebhooks.rally_deployments});
        }
    },

    async getDeploymentErrors(args){
        if (!args.branch) throw new AbortError(chalk`{red Error}: Please supply a branch name`);
        if (!args.env) throw new AbortError(chalk`{red Error}: Please specify an environment`);
        await runCommand(`git checkout ${args.branch}`);
        let changedFiles = await runCommand(`git diff staging...HEAD --name-only`);
        changedFiles = changedFiles.split("\n").filter(d=>d.length>0);
        await runCommand(`git checkout staging`);
        let presetIds = [];
        let mostRecentModifyTime = 0;
        for (f of changedFiles) {
            let preset = new Preset({ path: f, remote: false});
            preset = await Preset.getByName(args.env, preset.name);
            if(!preset) {
                log(chalk`No preset found with name {red ${preset.name}} on {blue ${args.env}}`);
                continue;
            }
            presetIds.push(preset.data.id);
            let updateTime = preset?.data?.attributes?.updatedAt || 0;
            mostRecentModifyTime = updateTime > mostRecentModifyTime ? updateTime : mostRecentModifyTime;
        }
        let jobPath = `/jobs?perPage=100&page=1&filter=%7B%22completedSince%22%3A${mostRecentModifyTime},%22state%22%3A%5B%22Error%22%5D,%22presetId%22%3A%5B${presetIds.map(d=>`%22${d}%22`).join(",")}%5D%7D&sort=-completedAt`;
        let result = await lib.makeAPIRequest({env: args.env, method: "GET", path: jobPath});
        let errorCountMsg = result.data.length == 0 ? chalk`{green 0}` : result.data.length > 100 ? chalk`{red ${result.data.length}+}` : chalk`{red ${result.data.length}}`;
        let host = ["dev","qa","uat"].includes(args.env.toLowerCase()) ? `https://discovery-${args.env.toLowerCase()}.sdvi.com` : "https://discovery.sdvi.com";
        let jobsPageLink = `${host}${jobPath}`;
        log(chalk`Errors Found: ${errorCountMsg}\n--------------------\n{blue ${jobsPageLink}}`);
    }

};

export default Deploy;
