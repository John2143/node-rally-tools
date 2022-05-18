import {RallyBase, lib, AbortError, Collection, sleep, zip} from  "./rally-tools.js";
import {configObject} from "./config.js";
import Preset from "./preset.js";

import fetch from "node-fetch";

let _defaultLinter;
export function defaultLinter(refresh = false) {
    if(_defaultLinter && !refresh) return _defaultLinter;

    return _defaultLinter = new Lint(configObject);
}

export class LintResults {
    constructor(whatever) {
    }

    chalkPrint() {
        log(chalk`{green I am the lint results}`);
    }
}

export class Lint {
    constructor(config){
        //config is the full rally config .rallyconfig
        this.url = "link to rally lint url or whatever";
    }

    async linkRequest() {
        let requestOptions = {
            method: "GET",
            headers: {
                "Authorization": `asdf`,
            }
        };

        let response = await fetch("whatever url", requestOptions);
        //check response.statusCode and stuff
        let lintResults = await response.json();
    }

    async lintPreset(preset) {
        log(preset.name);
        //log(preset.code);
        log(this);
        log(configObject.verbose);
        log(configObject.vverbose);

        if(configObject.verbose) {
            log(chalk`print with {red colors}{blue !}`);
        }

        //await this.linkRequest ...
        return new LintResults();
    }

    async printLint(lintables) {
        for(let x of lintables) {
            if(!x.lint) {
                log(chalk`Skipping ${x.chalkPrint(false)}`)
                continue;
            }

            log(chalk`Linting ${x.chalkPrint(false)}`);
            let res = await x.lint(this);
            res.chalkPrint();
        }
    }
}
