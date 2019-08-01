import { cached, defineAssoc } from "./decorators.js";
import { RallyBase, lib, Collection, AbortError } from "./rally-tools.js";
import { configObject, getPrefix } from "./config.js";
import Preset from "./preset.js";
import Provider from "./providers.js";
import Notification from "./notification.js";

import { writeFileSync, readFileSync } from "./fswrap.js";
import { join, resolve as pathResolve } from "path";
import argparse from "minimist";

let argv = argparse(process.argv.slice(2), {
    string: ["file", "env"],
    //boolean: ["no-protect"],
    boolean: ["prefixmode"],
    default: { protect: true, prefixmode: true },
    alias: {
        f: "file",
        e: "env",
        p: "prefixmode"
    }
});


class Rule extends RallyBase {
    constructor({ path, data, remote, subProject } = {}) {
        super();
        if (path) {
            path = pathResolve(path);
            try {
                let f = readFileSync(path, "utf-8");
                data = JSON.parse(readFileSync(path, "utf-8"));
            } catch (e) {
                if (e.code === "ENOENT") {
                    if (configObject.ignoreMissing) {
                        this.missing = true;
                        return undefined;
                    } else {
                        throw new AbortError("Could not load code of local file");
                    }
                } else {
                    throw new AbortError(`Unreadable JSON in ${path}. ${e}`);
                }
            }
        }
        this.meta = {};
        this.subproject = subProject;
        if (!data) {
            data = Rule.newShell();
        }
        this.data = data;
        this.remote = remote;
        this.isGeneric = !this.remote;
    }


    static newShell() {
        return {
            attributes: {
                description: "-",
                priority: "PriorityNorm",
                starred: false
            },
            relationships: {},
            type: "workflowRules"
        };
    }

    async acclimatize(env) {
        this.remote = env;

        let preset = await this.resolveField(Preset, "preset", false, "specific");
        let pNext = await this.resolveField(Rule, "passNext", false, "specific");
        let eNext = await this.resolveField(Rule, "errorNext", false, "specific");
        let proType = await this.resolveField(
            Provider,
            "providerType",
            false,
            "specific"
        );

        let dynamicNexts = await this.resolveField(
            Rule,
            "dynamicNexts",
            true,
            "specific"
        );

        let enterNotif = await this.resolveField(
            Notification,
            "enterNotifications",
            true,
            "specific"
        );
        let errorNotif = await this.resolveField(
            Notification,
            "errorNotifications",
            true,
            "specific"
        );
        let passNotif = await this.resolveField(
            Notification,
            "passNotifications",
            true,
            "specific"
        );
    }
    async saveA(env) {
        if (lib.isLocalEnv(env)) return;
        return await this.createIfNotExist(env);
    }
    async saveB(env) {
        if (!this.isGeneric) {
            await this.resolve();
        }
        this.cleanup();
        if (lib.isLocalEnv(env)) {
            log(
                chalk`Saving rule {green ${this.name}} to {blue ${lib.envName(env)}}.`
            );
            writeFileSync(this.localpath, JSON.stringify(this.data, null, 4));
        } else {
            await this.acclimatize(env);
            await this.uploadRemote(env);
        }
    }
    get immutable() {
        return false;
    }
    async createIfNotExist(env) {
        write(chalk`First pass rule {green ${this.name}} to {green ${env}}: `);

        if (this.immutable) {
            log(chalk`{magenta IMMUTABLE}. Nothing to do.`);
            return;
        }

        //First query the api to see if this already exists.
        if (configObject.prefixmode == true) {
            var remote = await Rule.getByName(env, getPrefix() + this.name);
        } else {
            var remote = await Rule.getByName(env, this.name);
        }

        this.idMap = this.idMap || {};

        if (remote) {
            this.idMap[env] = remote.id;
            log(chalk`exists ${remote.chalkPrint(false)}`);
            return;
        }

        //If it exists we can replace it.
        write("create, ");

        if (configObject.prefixmode == true) {
            var res = await lib.makeAPIRequest({
                env,
                path: `/workflowRules`,
                method: "POST",
                payload: {
                    data: {
                        attributes: { name: getPrefix() + this.name },
                        type: "workflowRules"
                    }
                }
            });
        } else {
            var res = await lib.makeAPIRequest({
                env,
                path: `/workflowRules`,
                method: "POST",
                payload: {
                    data: { attributes: { name: this.name }, type: "workflowRules" }
                }
            });
        }

        this.idMap = this.idMap || {};
        this.idMap[env] = res.data.id;
        write("id ");
        log(this.idMap[env]);
    }

    async patchStrip() {
        delete this.data.attributes.createdAt;
        delete this.data.attributes.starred;
        delete this.data.attributes.updatedAt;

        // TEMP FIX FOR BUG IN SDVI
        if (this.relationships.passMetadata && this.relationships.passMetadata[0]) {
            log("HAS PASS");
            log(this.name);
            log("HAS PASS");
        }
        delete this.relationships.passMetadata;

        if (
            this.relationships.errorMetadata &&
      this.relationships.errorMetadata[0]
        ) {
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

    async uploadRemote(env) {
        write(chalk`Uploading rule {green ${this.name}} to {green ${env}}: `);

        if (this.immutable) {
            log(chalk`{magenta IMMUTABLE}. Nothing to do.`);
            return;
        }

        if (this.idMap[env]) {
            this.remote = env;

            await this.patchStrip();
            this.data.id = this.idMap[env];
            //If it exists we can replace it
            write("replace, ");
            // let metadata = { data: this.data };
            //
            // //checking for prefix mode for attribute name and then relationships name
            // if (argv.prefixmode == true) {
            //   // metadata.data.attributes.name = getPrefix() + this.name;
            //   // metadata.data.relationships.preset.data.name = this.name;
            //
            //   log(chalk.yellow`PREFIX MODE IS ON`);
            // } else {
            //   // metadata.data.attributes.name = this.name;
            //   // metadata.data.relationships.preset.data.name = this.name;
            //   log(chalk.yellow`PREFIX MODE IS OFF`);
            //
            // }

            let res = await lib.makeAPIRequest({
                env,
                path: `/workflowRules/${this.idMap[env]}`,
                method: "PATCH",
                payload: { data: this.name },
                fullResponse: true
            });

            log(chalk`response {yellow ${res.statusCode}}`);
            if (res.statusCode !== 200) {
                log(res.body);
                log(JSON.stringify(this.data, null, 4));
            }
        } else {
            throw Error("Bad idmap!");
        }
    }

    get localpath() {
        return join(configObject.repodir, "silo-rules", this.name + ".json");
    }

    async resolve() {
        let preset = await this.resolveField(Preset, "preset", false);
        //log(preset);
        let pNext = await this.resolveField(Rule, "passNext", false);
        let eNext = await this.resolveField(Rule, "errorNext", false);
        let proType = await this.resolveField(Provider, "providerType", false);

        //log("Dynamic nexts")
        let dynamicNexts = await this.resolveField(Rule, "dynamicNexts", true);
        //log(dynamicNexts);

        let enterNotif = await this.resolveField(
            Notification,
            "enterNotifications",
            true
        );
        let errorNotif = await this.resolveField(
            Notification,
            "errorNotifications",
            true
        );
        let passNotif = await this.resolveField(
            Notification,
            "passNotifications",
            true
        );

        //TODO Unsupported
        delete this.relationships["enterMetadata"];
        delete this.relationships["errorMetadata"];

        this.isGeneric = true;

        return {
            preset,
            proType,
            pNext,
            eNext,
            dynamicNexts,
            errorNotif,
            enterNotif,
            passNotif
        };
    }

    chalkPrint(pad = true) {
        let id = String(
            "R-" + ((this.remote && this.remote + "-" + this.id) || "LOCAL")
        );
        let sub = "";
        if (this.subproject) {
            sub = chalk`{yellow ${this.subproject}}`;
        }
        if (pad) id = id.padStart(10);
        try {
            return chalk`{green ${id}}: ${sub}{blue ${this.name}}`;
        } catch (e) {
            return this.data;
        }
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
Rule.endpoint = "workflowRules";

export default Rule;
