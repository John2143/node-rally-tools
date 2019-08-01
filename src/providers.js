import { cached, defineAssoc } from "./decorators.js";
import { lib, Collection, RallyBase } from "./rally-tools.js";

class Provider extends RallyBase {
    constructor({ data, remote }) {
        super();
        this.data = data;
        this.meta = {};
        this.remote = remote;
    }
    //cached
    async getEditorConfig() {
        if (this.editorConfig) return this.editorConfig;

        this.editorConfig = await lib.makeAPIRequest({
            env: this.remote,
            path_full: this.data.links.editorConfig
        });
        this.editorConfig.fileExt = await this.getFileExtension();
        return this.editorConfig;
    }
    static async getAllPreCollect(providers) {
        return providers.sort((a, b) => {
            return (
                a.attributes.category.localeCompare(b.attributes.category) ||
        a.attributes.name.localeCompare(b.attributes.name)
            );
        });
    }

    async getFileExtension() {
        let config = await this.getEditorConfig();
        let map = {
            python: "py",
            text: "txt",
            getmap(key) {
                if (this.name === "Aurora") return "zip";
                if (this[key]) return this[key];
                return key;
            }
        };
        return map.getmap(config.lang);
    }

    chalkPrint(pad = true) {
        let id = String(this.id);
        if (pad) id = id.padStart(4);
        return chalk`{green ${id}}: {blue ${this.category}} - {green ${this.name}}`;
    }
}

defineAssoc(Provider, "id", "data.id");
defineAssoc(Provider, "name", "data.attributes.name");
defineAssoc(Provider, "category", "data.attributes.category");
defineAssoc(Provider, "remote", "meta.remote");
defineAssoc(Provider, "editorConfig", "meta.editorConfig");
Provider.endpoint = "providerTypes";

export default Provider;
