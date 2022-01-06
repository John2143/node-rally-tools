import {cached, defineAssoc} from "./decorators.js";
import {lib, Collection, RallyBase, sleep} from "./rally-tools.js";
import {configObject} from "./config.js";
import File from "./file.js";
import Provider from "./providers.js";
import Preset from "./preset.js";
import Rule from "./rule.js";
import {getArtifact, parseTraceLine} from "./trace.js";
import moment from "moment"

import path from "path";
import fs from "fs";

class Asset extends RallyBase{
    constructor({data, remote, included, lite}){
        super();
        this.data = data;
        this.meta = {};
        this.remote = remote;
        if(included){
            this.meta.metadata = Asset.normalizeMetadata(included);
        }
        this.lite = !!lite;
    }
    static normalizeMetadata(payload){
        let newMetadata = {}
        for(let md of payload){
            if(md.type !== "metadata") continue;
            newMetadata[md.attributes.usage] = md.attributes.metadata;
        }
        return newMetadata;
    }

    async getMetadata(forceRefresh = false){
        if(this.meta.metadata && !forceRefresh) return this.meta.metadata;
        let req = await lib.makeAPIRequest({
            env: this.remote, path: `/movies/${this.id}/metadata?page=1p100`,
        });

        return this.meta.metadata = Asset.normalizeMetadata(req.data);
    }

    async patchMetadata(metadata){
        if(metadata.Workflow){
            //FIXME
            //Currently, WORKFLOW_METADATA cannot be patched via api: we need to
            //start a ephemeral eval to upload it
            let md = JSON.stringify(JSON.stringify(metadata.Workflow));
            let fakePreset = {
                code: `WORKFLOW_METADATA.update(json.loads(${md}))`
            }
            await this.startEphemeralEvaluateIdeal(fakePreset);
            log("WFMD Patched using ephemeralEval")
        }
        if(metadata.Metadata){
            let req = await lib.makeAPIRequest({
                env: this.remote, path: `/movies/${this.id}/metadata/Metadata`,
                method: "PATCH",
                payload: {
                    "data": {
                        "type": "metadata",
                        "attributes": {
                            "metadata": metadata.Metadata
                        },
                    }
                }
            });
            log("MD Patched")
        }
    }

    static lite(id, remote){
        return new this({data: {id}, remote, lite: true})
    }

    chalkPrint(pad=false){
        let id = String("A-" + (this.remote && this.remote + "-" + this.id || "LOCAL"))
        if(pad) id = id.padStart(15);
        return chalk`{green ${id}}: {blue ${this.data.attributes ? this.name : "(lite asset)"}}`;
    }

    static async createNew(name, env){
        let req = await lib.makeAPIRequest({
            env, path: "/assets",
            method: "POST",
            payload: {
                data: {
                    attributes: {name},
                    type: "assets"
                }
            }
        });
        return new this({data: req.data, remote: env});
    }

    async delete(){
        let req = await lib.makeAPIRequest({
            env: this.remote, path: "/assets/" + this.id,
            method: "DELETE",
        });
    }

    async getFiles(refresh = false){
        if(this._files && !refresh) return this._files;

        let req = await lib.indexPathFast({
            env: this.remote, path: `/assets/${this.id}/files`,
            method: "GET",
        });

        //return req;
        return this._files = new Collection(req.map(x => new File({data: x, remote: this.remote, parent: this})));
    }

    async addFile(label, fileuris){
        if(!Array.isArray(fileuris)) fileuris = [fileuris];

        let instances = {}
        for(let i = 0; i < fileuris.length; i++){
            instances[String(i + 1)] = {uri: fileuris[i]};
        }

        let req = await lib.makeAPIRequest({
            env: this.remote, path: "/files",
            method: "POST",
            payload: {
                "data": {
                    "attributes": {
                        label, instances,
                    },
                    "relationships": {
                        "asset": {
                            "data": {
                                id: this.id,
                                "type": "assets"
                            }
                        }
                    },
                    "type": "files"
                }

            }
        });
        return req;
    }
    async startWorkflow(jobName, {initData, priority} = {}){
        let attributes = {};
        if(initData){
            //Convert init data to string
            initData = typeof initData === "string" ? initData : JSON.stringify(initData);
            attributes.initData = initData;
        }
        if(priority){
            attributes.priority = priority
        }

        let req = await lib.makeAPIRequest({
            env: this.remote, path: "/workflows",
            method: "POST",
            payload: {
                "data": {
                    "type": "workflows",
                    attributes,
                    "relationships": {
                        "movie": {
                            "data": {
                                id: this.id,
                                "type": "movies"
                            }
                        }, "rule": {
                            "data": {
                                "attributes": {
                                    "name": jobName,
                                },
                                "type": "rules"
                            }
                        }
                    }
                }
            }
        });
        return req;
    }
    static async startAnonWorkflow(env, jobName, {initData, priority} = {}){
        let attributes = {};
        if(initData){
            //Convert init data to string
            initData = typeof initData === "string" ? initData : JSON.stringify(initData);
            attributes.initData = initData;
        }
        if(priority){
            attributes.priority = priority
        }

        let req = await lib.makeAPIRequest({
            env, path: "/workflows",
            method: "POST",
            payload: {
                "data": {
                    "type": "workflows",
                    attributes,
                    "relationships": {
                        "rule": {
                            "data": {
                                "attributes": {
                                    "name": jobName,
                                },
                                "type": "rules"
                            }
                        }
                    }
                }
            }
        });
        return req;

    }

    async startEphemeralEvaluateIdeal(preset, dynamicPresetData, isBinary=false){
        let res;
        const env = this.remote;
        let provider = await Provider.getByName(this.remote, "SdviEvaluate");

        write(chalk`Starting ephemeral evaluate on ${this.chalkPrint(false)}...`)

        // Fire and forget.
        let evalInfo = await lib.makeAPIRequest({
            env: this.remote, path: "/jobs", method: "POST",
            payload: {
                data: {
                    attributes: {
                        category: provider.category,
                        providerTypeName: provider.name,
                        rallyConfiguration: {},
                        //we need to strip invalid utf8 characters from the
                        //buffer before we encode it or the sdvi backend dies
                        providerData: Buffer.from(preset.code, isBinary && "binary" || "utf8").toString("base64"),
                        dynamicPresetData,
                    },
                    type: "jobs",
                    relationships: {
                        movie: {
                            data: {
                                id: this.id,
                                type: "movies",
                            }
                        }
                    }
                }
            }
        });

        write(" Waiting for finish...\n");
        let dots = 0;
        for(;;){
            res = await lib.makeAPIRequest({
                env, path_full: evalInfo.data.links.self
            });
            write(`\r${res.data.attributes.state}${".".repeat(dots++)}         `);
            if(dots === 5){ dots = 1; }

            if(res.data.attributes.state == "Complete"){
                write(chalk`{green  Done}...\n`);
                break;
            }
            await sleep(500);
        }

        return;
    }

    async startEvaluate(presetid, dynamicPresetData){
        // Fire and forget.
        let data = await lib.makeAPIRequest({
            env: this.remote, path: "/jobs", method: "POST",
            payload: {
                data: {
                    type: "jobs",
                    attributes: {
                        dynamicPresetData,
                    },
                    relationships: {
                        movie: {
                            data: {
                                id: this.id,
                                type: "movies",
                            }
                        }, preset: {
                            data: {
                                id: presetid,
                                type: "presets",
                            }
                        }
                    }
                }
            }
        });
        return data;
    }
    async rename(newName){
        let req = await lib.makeAPIRequest({
            env: this.remote, path: `/assets/${this.id}`,
            method: "PATCH",
            payload: {
                data: {
                    attributes: {
                        name: newName,
                    },
                    type: "assets",
                }
            }
        });

        this.name = newName;

        return req;
    }

    async migrate(targetEnv){
        configObject.globalProgress = false;
        log(`Creating paired file in ${targetEnv}`);

        //Fetch metadata in parallel, we await it later
        let _mdPromise = this.getMetadata();

        let targetAsset = await Asset.getByName(targetEnv, this.name);
        if(targetAsset){
            log(`Asset already exists ${targetAsset.chalkPrint()}`);
            //if(configObject.script) process.exit(10);
        }else{
            targetAsset = await Asset.createNew(this.name, targetEnv);
            log(`Asset created ${targetAsset.chalkPrint()}`);
        }

        //wait for metadata to be ready before patching
        await _mdPromise;
        log("Adding asset metadata");
        await targetAsset.patchMetadata(this.md);

        let fileCreations = [];
        for(let file of await this.getFiles()){

            let possibleInstances = {};
            //Check for any valid copy-able instances
            for(let inst of file.instancesList){
                //We need to skip internal files
                if(inst.storageLocationName === "Rally Platform Bucket") continue;

                log(`Adding file: ${file.chalkPrint()}`);
                possibleInstances[inst.storageLocationName] = () => targetAsset.addFileInstance(file, inst);
            }

            if(Object.values(possibleInstances).length > 1){
                //prioritize archive is possible
                if(possibleInstances["Archive"]){
                    log("Hit archive prioritizer");
                    fileCreations.push(possibleInstances["Archive"]);
                }else{
                    fileCreations.push(...Object.values(possibleInstances));
                }
            }else{
                fileCreations.push(...Object.values(possibleInstances));
            }

        }
        await Promise.all(fileCreations.map(x => x()));
    }

    async addFileInstance(file, inst, tagList = []){
        let newInst = {
            uri: File.rslURL(inst),
            name: inst.name,
            size: inst.size,
            lastModified: inst.lastModified,
            storageLocationName: inst.storageLocationName,
        };

        let instances = {};

        instances[String(Math.floor(Math.random() * 100000 + 1))] = newInst;


        let request = lib.makeAPIRequest({
            env: this.remote, path: `/files`, method: "POST",

            payload: {
                data: {
                    type: "files",
                    attributes: {
                        label: file.label,
                        tagList,
                        instances,
                    },
                    relationships: {
                        asset: {
                            data: {
                                id: this.id,
                                type: "assets"
                            },
                        },
                    },
                }
            }
        });


        try{
            let fileData = await request;
            let newFile = new File({data: fileData.data, remote: this.remote, parent: this})
            if(configObject.script) console.log(inst.uri, newFile.instancesList[0].uri);
        }catch(e){
            log(chalk`{red Failed file: ${file.chalkPrint()}}`)
        }
    }

    async downloadFile(label, destFolder){
        let files = await this.getFiles();

        let file = files.findByName(label)

        let c = await file.getContent();

        if(destFolder){
            let filePath = path.join(destFolder, file.instancesList[0].name);
            fs.writeFileSync(filePath, c);
        }else{
            console.log(c);
        }
    }
    async deleteFile(label){
        let files = await this.getFiles();
        let file = files.findByName(label);
        if(!file) return false;
        await file.delete(false);//mode=forget
        return true;
    }

    async listJobs() {
        let jobs = await lib.indexPathFast({
            env: this.remote, path: "/jobs",
            qs: {
                filter: `movieId=${this.id}`
            }
        });


        for(let e of jobs) {
            if(!e.relationships.preset.data) continue;
            let preset = await Preset.getById(this.remote, e.relationships.preset.data.id);
            let rule = await Rule.getById(this.remote, e.relationships.workflowRule.data.id);
            log("Preset", preset.name);
            log("Rule", rule.name);
        }
    }

    //get all artifacts of type `artifact` from this asset
    async *artifactsList(artifact) {
        async function* reorderPromises(p){
            ////yield in order we got it
            //yield* p[Symbol.iterator]();
            ////yield in order of first to finish
            //yield* unordered(p);

            //yield in chronological order
            let k = await Promise.all(p);
            yield* k.sort((
                [e1, _a],
                [e2, _b]
            ) => {
                return e1.attributes.completedAt - e2.attributes.completedAt;
            });
        }


        elog("Reading jobs...");
        let r = await lib.indexPathFast({
            env: this.remote, path: "/jobs",
            qs: {
                filter: `movieId=${this.id}`
            }
        });

        elog("Getting job artifacts...");


        //let evals = r.filter(x => x.attributes.providerTypeName === "SdviEvaluate");
        let evals = r;
        let zipped = evals.map(async x => [x, await getArtifact(this.remote, artifact, x.id)]);

        for await(let x of reorderPromises(zipped)) {
            yield x;
        }
    }

    async grep(text, {artifact = "trace", nameOnly = false, ordering = null}){
        function highlight(line, text){
            let parts = line.split(text);
            return parts.join(chalk`{blue ${text}}`);
        }

        function parseLine(x){
            if(artifact === "trace"){
                return parseTraceLine(x);
            }else{
                //fake the output from parseTraceLine to make it look right
                return {content: x};
            }
        }

        for await(let [e, trace] of this.artifactsList(artifact)){
            if(!trace) continue;

            let lines = trace.split("\n").map(parseLine);
            let matching = lines.filter(x => x.content.includes(text));
            if(matching.length > 0){
                let preset = await Preset.getById(this.remote, e.relationships.preset.data.id);
                if(nameOnly){
                    log(chalk`{red ${preset.name}} ${e.id} {blue ${matching.length}} matche(s) ${e.attributes.completedAt}`);
                }else if(configObject.rawOutput){
                    console.log(matching.map(x => chalk`{red ${preset.name}}:${highlight(x.content, text)}`).join("\n"));
                }else{
                    log(chalk`{red ${preset.name}} ${e.id} ${moment(e.attributes.completedAt)}`);
                    log(matching.map(x => `  ${highlight(x.content, text)}`).join("\n"));
                }
            }
        }
    }

    async replay() {

        function colorRequest(id) {
            if(id <= 299) {
                return chalk`{green ${id}}`;
            }else if(id <= 399) {
                return chalk`{blue ${id}}`;
            }else if(id <= 499) {
                return chalk`{red ${id}}`;
            }else if(id <= 599) {
                return chalk`{cyan ${id}}`;
            }else {
                throw new Error("failed to create color from id");
            }
        }
        let worstRegexEver = /^@Request (?<type>\w+) (?<url>.+)$[\n\r]+^(?<time>.+)$[\S\s]+?^(?<request>\{[\S\s]+?^\})?[\S\s]+?^@Response (?<statusCode>\d+)$[\S\s]+?^(?<response>\{[\S\s]+?^\})?[\S\s]+?={61}/gm;
        for await(let [e, trace] of this.artifactsList("output")){
            if(!trace) continue;

            let preset = await Preset.getById(this.remote, e.relationships.preset.data.id);
            log(chalk`{red ${preset.name}}`);
            for(let request of trace.matchAll(worstRegexEver)) {
                //log(request);
                if(true){
                    let r = request.groups;
                    log(chalk`Request: ${r.type} ${r.url} returned ${colorRequest(r.statusCode)}`);
                }
            }
        }
    }

    async analyze(){
        await lib.makeAPIRequest({
            env: this.remote, path: "/v1.0/analysis",
            method: "POST",
            payload: {
                "movieId": this.id,
                "latestVersion": true,
            },
        });
    }
}

defineAssoc(Asset, "id", "data.id");
defineAssoc(Asset, "name", "data.attributes.name");
defineAssoc(Asset, "remote", "meta.remote");
defineAssoc(Asset, "md", "meta.metadata");
defineAssoc(Asset, "lite", "meta.lite");
Asset.endpoint = "movies"

export default Asset;
