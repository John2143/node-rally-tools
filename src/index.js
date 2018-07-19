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
    async uploadPresets(env, presets, createFunc = ()=>false){
        for(let preset of presets){
            await preset.uploadCodeToEnv(env, createFunc);
        }
    },
    async getProviders(env){
        let providers = await lib.indexPath(env, "/providerTypes?page=1p50");
        providers = providers.sort((a, b) => {
            return a.attributes.category.localeCompare(b.attributes.category) ||
                   a.attributes.name    .localeCompare(b.attributes.name);
        });
        return providers;
    },
    async getEditorConfig(env, provider){
        let config = await lib.makeAPIRequest({env, path_full: provider.links.editorConfig});
        let helpText = config.helpText;
        config.helpText = () => helpText;
        return config
    },
    async getRules(env){
        let rules = await lib.indexPathFast(env, "/workflowRules?page=1p20");
        return rules;
    },
    async getPresets(env){
        let rules = await lib.indexPathFast(env, "/presets?page=1p20");
        return rules;
    },
    async testAccess(env){
        let result = await lib.makeAPIRequest({env, path: "/providers?page=1p1", fullResponse: true});
        if(!result) return 401;
        return result.statusCode;
    }
}
