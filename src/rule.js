import {cached, defineAssoc} from "./decorators.js";
import {RallyBase, lib, Collection} from  "./rally-tools.js";
import {configObject} from "./config.js";
import Preset from "./preset.js";
import Provider from "./providers.js";
import Notification from "./notification.js";

import fs from "fs";
import path from "path";

class Rule extends RallyBase{
    constructor(data, remote){
        super();
        this.data = data;
        this.remote = remote;
        this.isGeneric = !this.remote;
    }
    async save(){
        if(!this.isGeneric){
            await this.resolve();
        }

        this.cleanup();
        fs.writeFileSync(this.localpath, JSON.stringify(this.data, null, 4));
    }

    get localpath(){
        return path.join(configObject.repodir, "silo-rules", this.name + ".json");
    }

    async resolve(){
        let presets = await Preset.getPresets(this.remote);
        let rules = await Rule.getRules(this.remote);
        let providers = await Provider.getProviders(this.remote);
        let notifications = await Notification.getNotifications(this.remote);

        let preset  = this.resolveField(presets, "preset");
        let pNext   = this.resolveField(rules, "passNext");
        let eNext   = this.resolveField(rules, "errorNext");
        let proType = this.resolveField(providers, "providerType");

        let enterNotif = this.resolveField(notifications, "enterNotifications");
        let errorNotif = this.resolveField(notifications, "errorNotifications");
        let passNotif  = this.resolveField(notifications, "passNotifications");

        this.isGeneric = true;

        return {
            preset, proType,
            pNext, eNext,
            errorNotif, enterNotif, passNotif,
        };
    }

    chalkPrint(pad=true){
        let id = String("R-" + this.remote + "-" + this.id)
        if(pad) id = id.padStart(10);
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
