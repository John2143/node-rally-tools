import {cached, defineAssoc} from "./decorators.js";
import {lib, Collection} from "./rally-tools.js";

class Provider{
    constructor(data, env){
        this.data = data;
        this.remote = env;
    }
    async getEditorConfig(env, provider){
        if(this.editorConfig) return this.editorConfig;

        return this.editorConfig = await lib.makeAPIRequest({
            env: this.remote,
            path_full: this.data.links.editorConfig
        });
    }
    @cached static async getProviders(env){
        let providers = await lib.indexPath(env, "/providerTypes?page=1p50");
        providers = providers.sort((a, b) => {
            return a.attributes.category.localeCompare(b.attributes.category) ||
                   a.attributes.name    .localeCompare(b.attributes.name);
        });
        return new Collection(providers.map(x => new Provider(x, env)));
    }

    chalkPrint(pad=true){
        let id = String(this.id)
        if(pad) id = id.padStart(4);
        return chalk`{green ${id}}: {blue ${this.category}} - {green ${this.name}}`;
    }
}

defineAssoc(Provider, "id", "id");
defineAssoc(Provider, "name", "attributes.name");
defineAssoc(Provider, "category", "attributes.category");

export default Provider;
