import {RallyBase, lib, AbortError, Collection} from  "./rally-tools.js";
import {cached, defineAssoc} from "./decorators.js";

class Tag extends RallyBase{
    constructor({data, remote} = {}){
        super();

        this.meta = {};
        this.remote = remote
        this.data = data;

        //this.data.attributes.rallyConfiguration = undefined;
        //this.data.attributes.systemManaged = undefined;
    }
    chalkPrint(pad=true){
        let id = String("T-" + this.remote + "-" + this.id)
        if(pad) id = id.padStart(10);

        let prefix = this.curated ? "blue +" : "red -";

        return chalk`{green ${id}}: {${prefix}${this.name}}`;
    }
    static async create(env, name, {notCurated} = {}){
        return new Tag({data: await lib.makeAPIRequest({
            env, path: `/${this.endpoint}`, method: "POST",
            payload: {
                data: {
                    attributes: {
                        name,
                        curated: notCurated ? false : true,
                    },
                    type: "tagNames",
                }
            }
        }), remote: env});
    }
}

defineAssoc(Tag, "id", "data.id");
defineAssoc(Tag, "attributes", "data.attributes");
defineAssoc(Tag, "relationships", "data.relationships");
defineAssoc(Tag, "name", "data.attributes.name");
defineAssoc(Tag, "curated", "data.attributes.curated");
defineAssoc(Tag, "remote", "meta.remote");
Tag.endpoint = "tagNames";

export default Tag;
