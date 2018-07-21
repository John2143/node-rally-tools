import Rule from "./rule.js";
import Preset from "./preset.js";

import fs from "fs";

export default class SupplyChain{
    constructor(startingRule){
        this.startingRule = startingRule;
        this.remote = startingRule.remote;
    }
    async calculate(){
        write("Getting rules... ");
        this.allRules = await Rule.getRules(this.remote);
        log(this.allRules.length);

        write("Getting presets... ");
        this.allPresets = await Preset.getPresets(this.remote);
        log(this.allPresets.length);

        write("Downloading code... ");
        await Promise.all(this.allPresets.arr.map(obj => obj.downloadCode()));
        log("Done!");

        fs.writeFileSync("test.json", JSON.stringify(this, null, 4))

        //Now we have everything we need to find a whole supply chain

        let ruleQueue = [this.startingRule];
        let presetQueue = [];
        for(let currentRule of ruleQueue){
            log(await currentRule.resolve());
        }
    }
}
