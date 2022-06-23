import {RallyBase, lib, AbortError, Collection, sleep, zip} from  "./rally-tools.js";
import {configObject} from "./config.js";
import Preset from "./preset.js";

import fetch from "node-fetch";

let _defaultUnitTester;
export function defaultUnitTester(args,refresh = false) {
    if(_defaultUnitTester && !refresh) return _defaultUnitTester;

    return _defaultUnitTester = new UnitTest(args,configObject);
}

export class UnitTestResults {
    constructor(unitTestResults) {
        this.results = unitTestResults
    }
    chalkPrint() {
        if (this.results)
        {
            for (let warning of this.results.warnings)
            {
                log(chalk`{yellow Warning: ${chalk(warning)}}`)
            }
            log("--------------------")
            for (let test of this.results.data)
            {
                log(chalk`{bold name: }{cyan ${chalk(test.name)}}`)
                if (test.result == "pass")
                {
                    log(chalk`{bold result: }{green pass}`);
                }
                else
                {
                    log(chalk`{bold result: }{red fail}`);
                }
                log("")
                for (let kwarg in test.kwargs)
                {
                    log(`${kwarg} = ${test.kwargs[kwarg]}`)
                }
                log("--------------------")
            }
        }
    }
}

export class UnitTest {
    constructor({testEnv,libEnv}, config){
        this.url = config.unitTestServiceUrl
        this.testEnv = testEnv || "DEV"
        this.libEnv = libEnv || "UAT"
    }

    async unitTestRequest(url,method,headers,body) {
        try{
            let response = await fetch(url,{method,headers,body});
            if (response.status != 200) {
                log(chalk`{red Unit test service error}`);
                let error = await response.json()
                for (let e of error.errors)
                {
                    log(chalk`{red Error: ${e}}`);
                }
                for (let w of error.warnings)
                {
                    log(chalk`{red Warning: ${w}}`);
                }
            }
            else{
                let unitTestResults = await response.json();
                return unitTestResults
            }
        }
        catch(e)
        {
            log(chalk`{red Unit test service error}`);
            log(e)
        }
    }

    async unitTestPreset(preset) {
        let result
        if (this.url){
            try{
                let unitTestCode = preset.getLocalUnitTestCode()
                result = await this.unitTestRequest(`${this.url}?testEnv=${this.testEnv}&libEnv=${this.libEnv}`,"POST",{"Content-Type":"text/plain"},unitTestCode)
            }
            catch(e){
                log(chalk`No unit tests for ${preset.chalkPrint(false)}`)
            }
        }
        else{
            log(chalk`{red Unit testing service url not configured}`)
        }
        return new UnitTestResults(result);
    }

    async printUnitTest(testables) {
        for(let x of testables) {
            if(!x.unitTest || !x.path.endsWith(".py")) {
                log(chalk`Skipping ${x.chalkPrint(false)}`)
                continue;
            }

            log(chalk`Testing ${x.chalkPrint(false)}`);
            let res = await x.unitTest(this);
            res.chalkPrint();
        }
    }
}
