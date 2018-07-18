import {lib} from "./rally-tools.js";

export {default as Preset} from "./preset.js";
export {default as Rule} from "./rule.js";
export * from "./rally-tools.js";

export const rallyFunctions = {
    async bestPagintation(){
        global.silentAPI = true;
        for(let i = 10; i <= 30; i+=5){
            console.time("test with " + i);
            let dl = await lib.indexPathFast("DEV", `/workflowRules?page=1p${i}`);
            console.timeEnd("test with " + i);
        }
    },
    async uploadPresets(env, presets){
        for(let preset of presets){
            await preset.uploadCodeToEnv(env);
        }
    },
    async getProviders(env){
        let index = lib.indexPath(env, "/providerTypes");
        log(index);
    },
}
