import {RallyBase, lib, AbortError, Collection, sleep, zip} from  "./rally-tools.js";
import {configObject} from "./config.js";
import Preset from "./preset.js";

import fetch from "node-fetch";

let _defaultLinter;
export function defaultLinter(args,refresh = false) {
    if(_defaultLinter && !refresh) return _defaultLinter;

    return _defaultLinter = new Lint(args,configObject);
}

export class LintResults {
    constructor(lintResults,softFaults) {
        this.json = lintResults
        this.softFaults = softFaults
    }
    chalkPrint() {
        if (this.json)
        {
            let hard = this.json["hard-faults"]
            let soft = this.json["soft-faults"]
            if (this.softFaults)
            {
                log(chalk`{bold {red ${hard.length} Hard Fault(s)}}`);
                log(chalk.red`--------------------`);
                for (let fault of hard)
                {
                    log(chalk`{red Line ${chalk(fault.line)}: ${chalk(fault.message)}}`); 
                }
                log(chalk`{bold {yellow ${chalk(soft.length)} Soft Fault(s)}}`);
                log(chalk.yellow`--------------------`);
                for (let fault of soft)
                {
                    log(chalk`{yellow Line ${chalk(fault.line)}: ${chalk(fault.message)}}`); 
                }
            }
            else
            {
                log(chalk`{bold {red ${chalk(hard.length)} Hard Fault(s)}}`);
                log(chalk.red`--------------------`);
                for (let fault of hard)
                {
                    log(chalk`{red Line ${chalk(fault.line)}: ${chalk(fault.message)}}`); 
                }
            }
        }
    }
}

export class Lint {
    constructor({soft, env}, config){
        this.url = config.lintServiceUrl
        this.softFaults = soft ? true : false
        this.env = env
    }

    async linkRequest(url,method,headers,body) {
        let response = await fetch(url,{method,headers,body});
        if (response.status != 200) {
            log(chalk`{red Linting service error}`);
            let error = await response.json()
            console.log(error)
        }
        else{
            let lintResults = await response.json();
            return lintResults
        }
    }

    async lintPreset(preset) {
        let result
        if (this.url){
            result = await this.linkRequest(`${this.url}?silo=${this.env}`,"POST",{"Content-Type":"text/plain"},preset.code)
        }
        else{
            log(chalk`{red Lint service url not configured}`)
        }
        return new LintResults(result,this.softFaults);
    }

    async printLint(lintables) {
        for(let x of lintables) {
            if(!x.lint || !x.path.endsWith(".py")) {
                log(chalk`Skipping ${x.chalkPrint(false)}`)
                continue;
            }

            log(chalk`Linting ${x.chalkPrint(false)}`);
            let res = await x.lint(this);
            res.chalkPrint();
        }
    }
}
