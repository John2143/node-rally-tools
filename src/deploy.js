import {RallyBase, lib, AbortError, Collection, sleep, zip} from  "./rally-tools.js";
import {configObject} from "./config.js";
import {spawn, runGit, runCommand} from "./decorators.js";
import rp from "request-promise";
import Stage from "./stage.js";

import fetch from "node-fetch";
import {Octokit} from "@octokit/rest";
import { config } from "chai";

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


        if(configObject.vvverbose){
            log();
            log(cardLink);
            log(jiraInfo);
        }

        if(jiraInfo.errorMessages) {
            log(cardLink);
            log(jiraInfo.errorMessage);
            return issue;
        }

        let parsedInfo = {
            assignee_dev: jiraInfo.fields.assignee,
            reporter: jiraInfo.fields.reporter,
            labels: jiraInfo.fields.labels,
            creator: jiraInfo.fields.creator,
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

        let pull_request_descriptions = [];
        let pull_request_dev_comments = [];
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
            config.pull_number = issue.number;

            let pull_request = await this.octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", config);
            let pull_request_description = pull_request.data.body.replace("Description (user facing release note):","").replace(/Dev comments:[\s\S]*/,"").trim()
            let pull_request_dev_comment = pull_request.data.body.replace(/[\s\S]*Dev comments:/,"").trim()
            pull_request_descriptions.push(pull_request_description);
            pull_request_dev_comments.push(pull_request_dev_comment);

            config.merge_method = "squash";
            await this.octokit.request("PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge", config);
            log(chalk`Merged.`);
        }
        let config = this.getOctokitConfig();
        config.title = releaseBranchName.split("-").join(" ");
        config.head = releaseBranchName;
        config.base = "staging";
        config.body = "Description:\n"+pull_request_descriptions.filter(d => d.length != 0).map(d => `• ${d}`).join("\n") + "\n\nDev comments:\n" + pull_request_dev_comments.filter(d => d.length != 0).map(d => `• ${d}`).join("\n")
        await this.octokit.request("POST /repos/{owner}/{repo}/pulls", config);
        await runGit([0], "pull");
    },

    async sendSlackMsg(msgItems,slackChannel) {
        let blocks = []
        for (let item of msgItems) {
            if (Array.isArray(item.content)) {
                let characterCount = 0;
                let subMsg = [];
                for (let subItem of item.content) {
                    subMsg.push(subItem);
                    characterCount += subItem.length;
                    if (characterCount > 2000) {
                        characterCount = 0;
                        let block = {"type": "section","text": {"type": "mrkdwn","text": " "}};
                        block.text.text = item.type == "code" ? ("```"+subMsg.join("\n")+"```") : subMsg.join("\n");
                        if ((subMsg.join("\n")).length != 0) {
                            blocks.push(block)
                        }
                        subMsg = [];
                    }
                }
                if (subMsg.length != 0){
                    let block = {"type": "section","text": {"type": "mrkdwn","text": " "}};
                    block.text.text = item.type == "code" ? ("```"+subMsg.join("\n")+"```") : subMsg.join("\n");
                    if ((subMsg.join("\n")).length != 0) {
                        blocks.push(block)
                    }
                }
            }
            else {
                let block = {"type": "section","text": {"type": "mrkdwn","text": " "}};
                block.text.text = item.type == "code" ? ("```"+item.content+"```") : item.content;
                if (item.content.length != 0) {
                    blocks.push(block)
                }
            }
        }
        for (let block of blocks) {
            response = await rp({method: "POST", body: JSON.stringify({"blocks": [block]}), headers: {"Content-Type": "application/json"}, uri: slackChannel});
        }
    },

    async stageSlackMsg(args){
        Stage.env = args.env || "UAT";
        Stage.skipLoadMsg = true;
        if (!args.branch) {
            log(chalk`{red Error:} Please provide a branch`); return
        }
        await runCommand(`git checkout ${args.branch}`);
        let requiredPresetsRules = await runCommand(`git diff staging...HEAD --name-only | rally @`);
        await runCommand(`git checkout staging`);
        requiredPresetsRules = requiredPresetsRules.replace("Reading from stdin\n","");
        if(await Stage.downloadStage()){
            log(chalk`{red Error:} Could not load stage`); return
        }
        let stagedBranchesMsg = [`Currently Staged Presets: ${Stage.stageData.stage.length}`].concat(Stage.stageData.stage.map(d=>`    ${d.branch} ${d.commit}`));
        let msgItems = [
            {type: "normal", content: `@here The release branch has been staged by ${configObject.slackId ? `<@${configObject.slackId}>` : configObject.ownerName}`},
            {type: "code", content: stagedBranchesMsg},
            {type: "code", content: requiredPresetsRules.split("\n")}
        ]
        await this.sendSlackMsg(msgItems,configObject.deploy.slackWebhooks.air_supply_release_staging)
    },

    async deploySlackMessage(args){
        if (!args.pr) {
            log(chalk`{red Error:} Please provide a pr number`); return
        }
        let today = new Date();
        today = String(today.getMonth() + 1).padStart(2, '0') + '/' + String(today.getDate()).padStart(2, '0') + '/' + today.getFullYear();
        let config = this.getOctokitConfig();
        config.pull_number = args.pr;
        let pull_request = await this.octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", config);
        let branch = pull_request.data.head.ref;
        let pull_request_descriptions = pull_request.data.body.replace("Description (user facing release note):","").replace("Description:","").replace(/Dev comments:[\s\S]*/,"").trim();
        await runCommand(`git checkout ${branch}`);
        let requiredPresetsRules = await runCommand(`git diff staging...HEAD --name-only | rally @`);
        await runCommand(`git checkout staging`);
        requiredPresetsRules = requiredPresetsRules.replace("Reading from stdin\n","");
        let msgItems = [
            {type: "normal", content: `@here ${args.hotfix ? "*HOTFIX*" :`*DEPLOY ${today}*`}`},
            {type: "normal", content: `Deployer: ${configObject.slackId ? `<@${configObject.slackId}>` : configObject.ownerName}`},
            {type: "normal", content: pull_request_descriptions.split("\n")},
            {type: "code", content: requiredPresetsRules.split("\n")}
        ]
        await this.sendSlackMsg(msgItems,configObject.deploy.slackWebhooks.rally_deployments)
    }

};

export default Deploy;
