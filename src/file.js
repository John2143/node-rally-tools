import {cached, defineAssoc} from "./decorators.js";
import {lib, Collection, RallyBase, FileTooLargeError} from "./rally-tools.js";

class File extends RallyBase{
    constructor({data, remote, included, parent}){
        super();
        this.data = data;
        this.meta = {};
        this.remote = remote;
        this.parentAsset = parent;
    }

    chalkPrint(pad=false){
        let id = String("F-" + (this.remote && this.remote + "-" + this.id || "LOCAL"))
        if(pad) id = id.padStart(15);
        return chalk`{green ${id}}: {blue ${this.data.attributes ? this.name : "(lite file)"}} {red ${this.sizeHR}}`;
    }

    canBeDownloaded(){
        return this.sizeGB <= .2;
    }

    async getContent(force = false, noRedirect = false, timeout = undefined){
        if(!this.canBeDownloaded() && !force && !noRedirect){
            throw new FileTooLargeError(this);
        }

        let d = lib.makeAPIRequest({
            env: this.remote, fullPath: this.contentLink,
            qs: {
                "no-redirect": noRedirect,
                timeout: timeout,
            }
        });

        if(noRedirect){
            return (await d).links.content;
        }else{
            return d;
        }
    }
    async delete(remove = true){
        return lib.makeAPIRequest({
            env: this.remote, fullPath: this.selfLink,
            method: "DELETE",
        });
    }
    get size(){
        return Object.values(this.data.attributes.instances)[0].size
    }

    get sizeGB(){
        return Math.round(this.size / 1024 / 1024 / 1024 * 10) / 10;
    }

    get sizeHR(){
        let units = ["B", "K", "M", "G", "T"];

        let unitIdx = 0;

        let size = this.size;
        while(size > 1000){
            size /= 1024;
            unitIdx++;
        }

        if(size > 100){
            size = Math.round(size);
        }else{
            size = Math.round(size * 10) / 10;
        }

        return size + units[unitIdx];
    }

    get instancesList() {
        let instances = [];
        for(let [key, val] of Object.entries(this.instances)){
            let n = {id: key};
            Object.assign(n, val);
            instances.push(n);
        }
        return instances;
    }

    static rslURL(instance){
        return `rsl://${instance.storageLocationName}/${instance.name}`;
    }
}

defineAssoc(File, "id", "data.id");
defineAssoc(File, "name", "data.attributes.label");
defineAssoc(File, "contentLink", "data.links.content");
defineAssoc(File, "selfLink", "data.links.self");
defineAssoc(File, "label", "data.attributes.label");
defineAssoc(File, "md5", "data.attributes.md5");
defineAssoc(File, "sha512", "data.attributes.sha512");
defineAssoc(File, "tags", "data.attributes.tagList");
defineAssoc(File, "instances", "data.attributes.instances");
File.endpoint = null

export default File;
