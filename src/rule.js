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

    async acclimatize(env){
        let presets = await Preset.getPresets(env);
        let rules = await Rule.getRules(env);
        let providers = await Provider.getProviders(env);
        let notifications = await Notification.getNotifications(env);

        let preset  = this.resolveField(presets, "preset", false, "specific");
        let pNext   = this.resolveField(rules, "passNext", false, "specific");
        let eNext   = this.resolveField(rules, "errorNext", false, "specific");
        let proType = this.resolveField(providers, "providerType", false, "specific");

        let enterNotif = this.resolveField(notifications, "enterNotifications", true, "specific");
        let errorNotif = this.resolveField(notifications, "errorNotifications", true, "specific");
        let passNotif  = this.resolveField(notifications, "passNotifications", true, "specific");
    }
    async saveA(env){
        if(lib.isLocalEnv(env)) return;
        return await this.createIfNotExist(env);
    }
    async saveB(env){
        if(!this.isGeneric){
            await this.resolve();
        }
        this.cleanup();
        if(lib.isLocalEnv(env)){
            fs.writeFileSync(this.localpath, JSON.stringify(this.data, null, 4));
        }else{
            await this.acclimatize(env);
            await this.uploadRemote(env);
        }
    }
    get immutable(){
        return false;
    }
    async createIfNotExist(env){
        write(chalk`First pass rule {green ${this.name}} to {green ${env}}: `);

        if(this.immutable){
            log(chalk`{magenta IMMUTABLE}. Nothing to do.`);
            return;
        }

        //First query the api to see if this already exists.
        let remote = await Rule.getByName(env, this.name);

        this.idMap = this.idMap || {};

        if(remote){
            this.idMap[env] = remote.id;
            log(chalk`exists ${remote.chalkPrint(false)}`);
            return;
        }

        //If it exists we can replace it
        write("create, ");
        let res = await lib.makeAPIRequest({
            env, path: `/workflowRules`, method: "POST",
            payload: {data: {attributes: {name: this.name}, type: "workflowRules"}},
        });
        this.idMap = this.idMap || {};
        this.idMap[env] = res.data.id;
        write("id ");
        log(this.idMap[env]);
    }

    async patchStrip(){
        delete this.data.attributes.createdAt;
        delete this.data.attributes.starred;
        delete this.data.attributes.updatedAt;
        for(let key in this.relationships){
            let relationship = this.relationships[key];
            if(!relationship.data || relationship.data instanceof Array && !relationship.data[0]){
                delete this.relationships[key];
            }
        }
    }

    async uploadRemote(env){
        write(chalk`Uploading rules {green ${this.name}} to {green ${env}}: `);

        if(this.immutable){
            log(chalk`{magenta IMMUTABLE}. Nothing to do.`);
            return;
        }

        if(this.idMap[env]){
            await this.patchStrip();
            //If it exists we can replace it
            write("replace, ");
            let res = await lib.makeAPIRequest({
                env, path: `/workflowRules/${this.idMap[env]}`, method: "PATCH",
                payload: {data: this.data}, fullResponse: true,
            });
            log(chalk`response {yellow ${res.statusCode}}`);
            if(res.statusCode !== 200){
                log(res.body)
                log(JSON.stringify(this.data, null, 4));
            }
        }else{
            throw Error("Bad idmap!");
        }
    }

    get localpath(){
        return path.join(configObject.repodir, "silo-rules", this.name + ".json");
    }

    async resolve(){
        let presets = await Preset.getPresets(this.remote);
        let rules = await Rule.getRules(this.remote);
        let providers = await Provider.getProviders(this.remote);
        let notifications = await Notification.getNotifications(this.remote);

        let preset  = this.resolveField(presets, "preset", false);
        let pNext   = this.resolveField(rules, "passNext", false);
        let eNext   = this.resolveField(rules, "errorNext", false);
        let proType = this.resolveField(providers, "providerType", false);

        let enterNotif = this.resolveField(notifications, "enterNotifications", true);
        let errorNotif = this.resolveField(notifications, "errorNotifications", true);
        let passNotif  = this.resolveField(notifications, "passNotifications", true);

        //TODO Unsupported
        delete this.relationships["enterMetadata"]
        delete this.relationships["errorMetadata"]
        delete this.relationships["dynamicNexts"]

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
    static async getByName(env, name){
        return (await Rule.getRules(env)).findByName(name);
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
