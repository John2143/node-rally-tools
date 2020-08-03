import {cached, defineAssoc} from "./decorators.js";
import {lib, Collection, RallyBase, sleep} from "./rally-tools.js";
import {configObject} from "./config.js";
import File from "./file.js";
import Provider from "./providers.js";

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
            env: this.remote, path: `/movies/${this.id}/metadata`,
        });

        return this.meta.metadata = Asset.normalizeMetadata(req.data);
    }

    async patchMetadata(metadata){
        if(metadata.Workflow && false){
            let req = await lib.makeAPIRequest({
                env: this.remote, path: `/movies/${this.id}/metadata/Workflow`,
                method: "PATCH",
                payload: {
                    "data": {
                        "type": "metadata",
                        "attributes": {
                            "metadata": metadata.Workflow
                        },
                    }
                }
            });
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

    async getFiles(){
        let req = await lib.indexPathFast({
            env: this.remote, path: `/assets/${this.id}/files`,
            method: "GET",
        });

        //return req;
        return new Collection(req.map(x => new File({data: x, remote: this.remote, parent: this})));
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

    async startEphemeralEvaluateIdeal(preset, dynamicPresetData){
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
                        providerData: Buffer.from(preset.code, "binary").toString("base64"),
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

        write(" Waiting for finish...");
        for(;;){
            res = await lib.makeAPIRequest({
                env, path_full: evalInfo.data.links.self
            });
            write(".");
            if(res.data.attributes.state == "Complete"){
                write(chalk`{green  Done}...\n`);
                break;
            }
            await sleep(300);
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

        //FIXME
        //Currently, WORKFLOW_METADATA cannot be patched via api: we need to
        //start a ephemeral eval to upload it
        log("Adding asset workflow metadata");
        let md = JSON.stringify(JSON.stringify(this.md.Workflow));
        let fakePreset = {
            code: `WORKFLOW_METADATA = json.loads(${md})`
        }
        await targetAsset.startEphemeralEvaluateIdeal(fakePreset);

        let fileCreations = [];
        for(let file of await this.getFiles()){
            //Check for any valid copy-able instances
            for(let inst of file.instancesList){
                //We need to skip internal files
                if(inst.storageLocationName === "Rally Platform Bucket") continue;

                log(`Adding file: ${file.chalkPrint()}`);
                fileCreations.push(targetAsset.addFile(file, inst));
            }
        }
        await Promise.all(fileCreations);
    }

    async addFile(file, inst, tagList = []){
        let newInst = {
            uri: File.rslURL(inst),
            name: inst.name,
            size: inst.size,
            lastModified: inst.lastModified,
            storageLocationName: inst.storageLocationName,
        };

        let request = lib.makeAPIRequest({
            env: this.remote, path: `/files`, method: "POST",

            payload: {
                data: {
                    type: "files",
                    attributes: {
                        label: file.label,
                        tagList,
                        instances: {
                            "1": newInst,
                        }
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
            log(e);
        }
    }
}

defineAssoc(Asset, "id", "data.id");
defineAssoc(Asset, "name", "data.attributes.name");
defineAssoc(Asset, "remote", "meta.remote");
defineAssoc(Asset, "md", "meta.metadata");
defineAssoc(Asset, "lite", "meta.lite");
Asset.endpoint = "movies"

export default Asset;
