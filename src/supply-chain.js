import Rule from "./rule.js";
import Preset from "./preset.js";
import Provider from "./providers.js";
import Notification from "./notification.js";
import {Collection} from "./rally-tools.js";
import {configObject} from "./config.js";

export default class SupplyChain{
    constructor(startingRule, stopRule){
        if(startingRule){
            this.startingRule = startingRule;
            this.stopRule = stopRule
            this.remote = startingRule.remote;
        }
    }
    async calculate(){
        log("Getting rules... ");
        this.allRules = await Rule.getAll(this.remote);
        log(this.allRules.length);

        log("Getting presets... ");
        this.allPresets = await Preset.getAll(this.remote);
        log(this.allPresets.length);

        log("Getting providers... ");
        this.allProviders = await Provider.getAll(this.remote);
        log(this.allProviders.length);

        log("Getting notifications... ");
        this.allNotifications = await Notification.getAll(this.remote);
        log(this.allNotifications.length);

        log("Downloading code... ");
        let i = 0;
        for(let preset of this.allPresets){
            write(`\r${" ".repeat(process.env.COLUMNS || 30)}\r${i++} / ${this.allPresets.arr.length} ${preset.name}`);
            await preset.downloadCode();
        }
        log("Done!");

        //Now we have everything we need to find a whole supply chain

        write("\nCalculating Supply chain... ");
        log(this.startingRule.chalkPrint());

        let allRuleNames = this.allRules.arr.map(x => x.name).filter(x => x.length >= 4);
        let allPresetNames = this.allPresets.arr.map(x => x.name).filter(x => x.length >= 4);
        let allNotifNames = this.allNotifications.arr.map(x => x.name).filter(x => x.length >= 4);
        let requiredNotifications = new Set();

        let ruleQueue = [this.startingRule];
        let presetQueue = [];
        for(let currentRule of ruleQueue){
            if(currentRule === this.stopRule) continue;
            let {
                eNext, pNext, preset,
                passNotif, errorNotif, enterNotif
            } = await currentRule.resolve();


            passNotif .forEach(n => requiredNotifications.add(n));
            enterNotif.forEach(n => requiredNotifications.add(n));
            errorNotif.forEach(n => requiredNotifications.add(n));

            if(eNext && !ruleQueue.includes(eNext)) ruleQueue.push(eNext);
            if(pNext && !ruleQueue.includes(eNext)) ruleQueue.push(pNext);

            let neededPresets = preset.findStringsInCode(allPresetNames);
            neededPresets = neededPresets.map(x => this.allPresets.findByName(x));

            let neededRules = preset.findStringsInCode(allRuleNames);
            neededRules = neededRules.map(x => this.allRules.findByName(x));

            preset
                .findStringsInCode(allNotifNames)
                .map(str => this.allNotifications.findByName(str))
                .forEach(notif => requiredNotifications.add(notif));

            neededPresets.push(preset);

            for(let p of neededPresets) if(!presetQueue.includes(p)) presetQueue.push(p);
            for(let p of neededRules)   if(!ruleQueue  .includes(p)) ruleQueue  .push(p);

            if(configObject.verbose){
                write(currentRule.chalkPrint(false));
                log(":");
                write("  ");
                write(preset.chalkPrint(false));
                log(":");
                write("  Pass Next: "); if(pNext) write(pNext.chalkPrint(false)); else write("None");
                log("");
                write("  Err  Next: "); if(eNext) write(eNext.chalkPrint(false)); else write("None");
                log("");
                log("  Rules:");

                for(let p of neededRules) log("    " + p.chalkPrint(true));

                log("  Presets:");
                for(let p of neededPresets) log("    " + p.chalkPrint(true));

                log("\n");
            }
        }

        log("Done!")

        this.rules = new Collection(ruleQueue);
        this.presets = new Collection(presetQueue);
        requiredNotifications.delete(undefined);
        this.notifications = new Collection([...requiredNotifications]);
    }
    async log(){
        log("Required notifications: ");
        this.notifications.log();

        write("\nRequired rules: ");
        log(this.rules.arr.length);
        this.rules.log();

        write("\nRequired presets: ");
        log(this.presets.arr.length);
        this.presets.log();
    }
    async syncTo(env){
        for(let preset of this.presets){
            try{
                await preset.save(env);
            }catch(e){log(e);}
        }
        if(this.rules.arr[0]){
            log("Starting create phase for rules")
            for(let rule of this.rules){
                try{
                    await rule.saveA(env);
                }catch(e){log(e);}
            }

            log("OK")
            log("Starting link phase for rules");
            Rule.removeCache(env);

            for(let rule of this.rules){
                try{
                    await rule.saveB(env);
                }catch(e){log(e);}
            }
        }
    }
}
