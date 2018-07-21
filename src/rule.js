import {cached, defineAssoc} from "./decorators.js";
import {lib, Collection} from  "./rally-tools.js";
import {configObject} from "./config.js";
import Preset from "./preset.js";

class Rule{
    constructor(data, remote){
        this.data = data;
        this.remote = remote;
        this.isGeneric = !this.remote;
        //this.cleanup();
    }
    async cleanup(){
        for(let [key, val] of Object.entries(this.relationships)){
            delete val.links;
        }
    }
    resolveField(datum, name){
        let field = this.relationships[name];
        if(!field) return;
        if(!field.data) return;

        return datum.findById(field.data.id);
    }
    async resolve(){
        let presets = await Preset.getPresets(this.remote);
        let rules = await Rule.getRules(this.remote);
        let preset = this.resolveField(presets, "preset");
        let pNext  = this.resolveField(rules, "passNext");
        let eNext  = this.resolveField(rules, "errorNext");

        return {preset, pNext, eNext};
    }

    chalkPrint(pad=true){
        let id = String(this.remote + "-" + this.id)
        if(pad) id = id.padStart(8);
        return chalk`{green ${id}}: {blue ${this.name}}`;
    }

    @cached static async getRules(env){
        let rules = await lib.indexPathFast(env, "/workflowRules?page=1p20");
        return new Collection(rules.map(data => new Rule(data, env)));
    }
}

defineAssoc(Rule, "name", "attributes.name");
defineAssoc(Rule, "id", "id");
defineAssoc(Rule, "relationships", "relationships");

export default Rule;
