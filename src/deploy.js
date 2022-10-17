import {RallyBase, lib, AbortError, Collection, sleep, zip} from  "./rally-tools.js";
import {configObject} from "./config.js";
import {spawn, runGit, runCommand} from "./decorators.js";
import rp from "request-promise";

import fetch from "node-fetch";
import {Octokit} from "@octokit/rest";

let okit = null;

export const prodReadyLabel = "Ready For Release";
export const prodManualLabel = "Ready For Release (manual)";
export const prodMergedLabel = "Release Merged";

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
                        "text": `@here The release branch has been staged by ${configObject.slackId ? `<@${configObject.slackId}>` : configObject.ownerName}`
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "```"+currentStage.replace(/.*Stage loaded: .*\n/,"")+"```"
                    }
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": "```"+requiredPresetsRules.replace("Reading from stdin\n","")+"```"
                    }
                }
            ]
        }
        response = await rp({method: "POST", body: JSON.stringify(msgBody), headers: {"Content-Type": "application/json"}, uri: configObject.deploy.slackWebhooks.air_supply_release_staging});
    }

};

export default Deploy;
