import {cached, defineAssoc} from "./decorators.js";
import {RallyBase, lib, Collection, AbortError, orderedObjectKeys} from  "./rally-tools.js";
import {configObject} from "./config.js";
import Preset from "./preset.js";
import Provider from "./providers.js";
import Notification from "./notification.js";
import Tag from "./tag.js";

import {writeFileSync, readFileSync} from "./fswrap.js";
import {join, resolve as pathResolve} from "path";

class Rule extends RallyBase{
    constructor({path, data, remote, subProject} = {}){
        super();
        if(path){
            path = pathResolve(path);
            try{
                let f = readFileSync(path, "utf-8")
                data = JSON.parse(readFileSync(path, "utf-8"));
            }catch(e){
                if(e.code === "ENOENT"){
                    if(configObject.ignoreMissing){
                        this.missing = true;
                        return undefined;
                    }else{
                        throw new AbortError("Could not load code of local file");
                    }
                }else{
                    throw new AbortError(`Unreadable JSON in ${path}. ${e}`);
                }
            }
        }
        this.meta = {};
        this.subproject = subProject;
        if(!data){
            data = Rule.newShell();
        }
        this.data = data;
        this.remote = remote;
        delete this.data.relationships.transitions;
        delete this.data.meta;
        delete this.data.attributes.updatedAt;
        delete this.data.attributes.createdAt;
        this.isGeneric = !this.remote;
    }

    static newShell(){
        return {
            "attributes": {
                "description": "-",
                "priority": "PriorityNorm",
                "starred": false,
            },
            "relationships": {},
            "type": "workflowRules",
        };
    }

    async acclimatize(env){
        this.remote = env;

        let proTag  = await this.resolveField(Tag, "providerFilterTag", false, "specific");
        if(proTag){
            this.data.attributes.providerFilter = proTag.id;
        }else{
            this.data.attributes.providerFilter = null;
        }
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
            log(chalk`Saving rule {green ${this.name}} to {blue ${lib.envName(env)}}.`)

            writeFileSync(this.localpath, JSON.stringify(orderedObjectKeys(this.data), null, 4));
        }else{
            return await this.uploadRemote(env);
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

        this.nexts = this.data.relationships.dynamicNexts;
        delete this.data.relationships.dynamicNexts;

        // TEMP FIX FOR BUG IN SDVI
        if(this.relationships.passMetadata && this.relationships.passMetadata[0]){
            log("HAS PASS");
            log(this.name);
            log("HAS PASS");
        }
        delete this.relationships.passMetadata;

        if(this.relationships.errorMetadata && this.relationships.errorMetadata[0]){
            log("HAS PASS");
            log(this.name);
            log("HAS PASS");
        }
        delete this.relationships.errorMetadata;

        // This is commented out because it was fixed.
        //for(let key in this.relationships){
            //let relationship = this.relationships[key];
            //if(!relationship.data || relationship.data instanceof Array && !relationship.data[0]){
                //delete this.relationships[key];
            //}
        //}
    }

    async uploadRemote(env){
        write(chalk`Uploading rule {green ${this.name}} to {green ${env}}: `);

        if(this.immutable){
            log(chalk`{magenta IMMUTABLE}. Nothing to do.`);
            return;
        }

        await this.acclimatize(env);

        //First query the api to see if this already exists.
        let remote = await Rule.getByName(env, this.name);

        this.idMap = this.idMap || {};

        if(remote) {
            this.idMap[env] = remote.id;

            this.remote = env;

            await this.patchStrip();
            this.data.id = this.idMap[env];

            this.relationships.transitions = {
                data: await this.constructWorkflowTransitions(),
            };

            //If it exists we can replace it
            write("replace, ");
            let res = await lib.makeAPIRequest({
                env, path: `/workflowRules/${this.idMap[env]}`, method: "PUT",
                payload: {data: this.data}, fullResponse: true,
            });

            log(chalk`response {yellow ${res.statusCode}}`);
            if(res.statusCode > 210){
                return `Failed to upload: ${res.body}`;
            }

        } else {
            await this.createIfNotExist(env);
        }
    }

    async deleteRemoteVersion(env, id=null){
        if(lib.isLocalEnv(env)) return false;
        if(!id){
            let remote = await Rule.getByName(env, this.name);
            id = remote.id;
        }

        return await lib.makeAPIRequest({
            env, path: `/workflowRules/${id}`,
            method: "DELETE",
        });
    }

    async delete(){
        if(lib.isLocalEnv(this.remote)) return false;

        return await this.deleteRemoteVersion(this.remote, this.id);
    }

    get localpath(){
        return this._localpath || join(configObject.repodir, this.subproject || "", "silo-rules", this.name + ".json");
    }

    async resolve(){
        let preset  = await this.resolveField(Preset, "preset", false);
        //log(preset);
        let pNext   = await this.resolveField(Rule, "passNext", false);
        let eNext   = await this.resolveField(Rule, "errorNext", false);
        let proType = await this.resolveField(Provider, "providerType", false);
        let proTag  = await this.resolveField(Tag, "providerFilterTag", false);
        if(proTag && this.data.attributes.providerFilter) {
            delete this.data.attributes.providerFilter
        }

        //log("Dynamic nexts")
        let dynamicNexts = await this.resolveField(Rule, "dynamicNexts", true);
        //log(dynamicNexts);

        let enterNotif = await this.resolveField(Notification, "enterNotifications", true);
        let errorNotif = await this.resolveField(Notification, "errorNotifications", true);
        let passNotif  = await this.resolveField(Notification, "passNotifications", true);

        //TODO Unsupported
        delete this.relationships["enterMetadata"]
        delete this.relationships["errorMetadata"]

        this.isGeneric = true;

        return {
            preset, proType, proTag,
            pNext, eNext,
            dynamicNexts,
            errorNotif, enterNotif, passNotif,
        };
    }

    chalkPrint(pad=true){
        let id = String("R-" + (this.remote && this.remote + "-" + this.id || "LOCAL"))
        let sub = "";
        if(this.subproject){
            sub = chalk`{yellow ${this.subproject}}`;
        }
        if(pad) id = id.padStart(13);
        try{
            return chalk`{green ${id}}: ${sub}{blue ${this.name}}`;
        }catch(e){
            return this.data;
        }
    }

    async constructWorkflowTransitions() {
        let transitions = [];
        let dynamicNexts = this.nexts?.data || [];
        if(dynamicNexts.length == 0) return [];

        write(chalk`transition mapping: `);

        for(let transition of dynamicNexts) {
            write(chalk`{green ${transition.meta.transition}}:`);
            let filters = {
                toWorkflowRuleId: transition.id,
                name: transition.meta.transition,
                fromWorkflowRuleId: this.id
            };

            let res = await lib.makeAPIRequest({
                env: this.remote, path: `/workflowTransitions`, method: "GET",
                qs: {
                    filter: JSON.stringify(filters),
                },
            });

            let newTransitionId = 0;
            if(res.data.length > 0){
                write(chalk`{blue found} `);
                let firstTransition = res.data[0];

                newTransitionId = firstTransition.id;
            }else{
                write(chalk`{magenta create} `);
                let newTransitionPayload = {
                    "attributes": {
                        "name": filters.name,
                    },
                    "relationships": {
                        "fromWorkflowRule": {
                            "data": {
                                "id": filters.fromWorkflowRuleId,
                                "type": "workflowRules"
                            }
                        },
                        "toWorkflowRule": {
                            "data": {
                                "id": filters.toWorkflowRuleId,
                                "type": "workflowRules"
                            }
                        }
                    },
                    "type": "workflowTransitions",
                };

                let newTransition = await lib.makeAPIRequest({
                    env: this.remote, path: `/workflowTransitions`, method: "POST",
                    payload: {
                        data: newTransitionPayload,
                    }
                });

                newTransitionId = newTransition.data.id;
            }

            transitions.push({
                "id": newTransitionId,
                "type": "workflowTransitions",
            });

            write(chalk`{yellow ${newTransitionId}}, `);
        }

        write(chalk`t. done, `);

        return transitions;
    }
}

defineAssoc(Rule, "name", "data.attributes.name");
defineAssoc(Rule, "description", "data.attributes.description");
defineAssoc(Rule, "id", "data.id");
defineAssoc(Rule, "relationships", "data.relationships");
defineAssoc(Rule, "isGeneric", "meta.isGeneric");
defineAssoc(Rule, "remote", "meta.remote");
defineAssoc(Rule, "subproject", "meta.project");
defineAssoc(Rule, "idMap", "meta.idMap");
defineAssoc(Rule, "nexts", "meta.nexts");
Rule.endpoint = "workflowRules";

export default Rule;
