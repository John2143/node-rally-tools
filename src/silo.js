import {cached, defineAssoc} from "./decorators.js";
import {lib, Collection, RallyBase, sleep} from "./rally-tools.js";
import {configObject} from "./config.js";
import File from "./file.js";
import Provider from "./providers.js";
import Preset from "./preset.js";
import {getArtifact, parseTraceLine} from "./trace.js";

import path from "path";
import fs from "fs";

class Silo {
    constructor(remote){
        this.remote = remote;
    }

    async observe(k){
        log(k);
        return k;
    }

    async grep(){
        let r = await lib.indexPathFast({
            env: this.remote, path: "/jobs",
            qs: {
                filter: `providerTypeName=Aurora`,
                sort: "-completedAt"
            },
            observe: this.observe.bind(this),
        });
    }
}

export default Silo;
