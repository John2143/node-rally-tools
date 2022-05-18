import Rule from "./rule.js";
import Preset from "./preset.js";
import Provider from "./providers.js";
import Notification from "./notification.js";
import {Collection, lib} from "./rally-tools.js";
import {configObject} from "./config.js";


//TODO
//Move project into silo metadata
//move autotest into silo metadata
//

export default class SupplyChain{
    constructor(startingRule, stopRule){
        if(startingRule){
            this.startingRule = startingRule;
            this.stopRule = stopRule
            this.remote = startingRule.remote;
        }
    }
    async downloadPresetCode(objs = this.allPresets){
        log("Downloading code... ");
        await lib.keepalive(objs.arr.map(x => () => x.downloadCode()));
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

        if(!this.startingRule){
            this.rules = this.allRules;
            this.presets = this.allPresets;
            this.notifications = new Collection([]);

            await this.downloadPresetCode();
            return
        }else{
            await this.downloadPresetCode();
        }

        log("Done!");

        //Now we have everything we need to find a whole supply chain

        write("Calculating Supply chain... ");
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
        if(this.notifications.arr.length > 0){
            log("Required notifications: ");
            this.notifications.log();
        }

        if(this.rules.arr.length > 0){
            write("Required rules: ");
            log(this.rules.arr.length);
            this.rules.log();
        }

        if(this.presets.arr.length > 0){
            write("Required presets: ");
            log(this.presets.arr.length);
            this.presets.log();
        }

        if(configObject.rawOutput){
            return {presets: this.presets.arr, rules: this.rules.arr, notifications: this.notifications.arr};
        }
    }
    async deleteTo(env){
         for(let preset of this.presets){
            try{
                await preset.deleteRemoteVersion(env);
            }catch(e){log(e);}
         }
    }
    async syncTo(env){
        let fails = [];
        for(let preset of this.presets){
            try{
                fails.push([preset, await preset.save(env), "preset"]);
            }catch(e){
                log(chalk`{red Error}`);
                fails.push([preset, e]);
            }
        }

        if(this.rules.arr[0]){
            log("Starting create phase for rules")
            for(let rule of this.rules){
                try{
                    fails.push([rule, await rule.saveA(env), "rule create"]);
                }catch(e){
                    log(chalk`{red Error}`);
                    fails.push([rule, e, "rule create"]);
                }
            }

            log("OK")
            log("Starting link phase for rules");
            Rule.removeCache(env);

            for(let rule of this.rules){
                try{
                    fails.push([rule, await rule.saveB(env), "rule link"]);
                }catch(e){
                    log(chalk`{red Error}`);
                    fails.push([rule, e, "rule link"]);
                }
            }
        }

        let finalErrors = [];
        for(let [item, error, stage] of fails){
            if(!error) continue;
            log(chalk`Error during {blue ${stage}}: ${item.chalkPrint(false)} {red ${error}}`);
            finalErrors.push([item, error, stage]);
        }

        return finalErrors;
    }
    async lint(linter){
        let things = [...this.rules.arr, ...this.presets.arr];
        await linter.printLint(things);
    }
}
