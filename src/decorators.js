
//these are the help entries for each command
export let helpEntries = {};
let helpEntry = name => helpEntries[name] ? helpEntries[name] : (helpEntries[name] = {name});

//short description
export function helpText(text){
    return function(func, name){
        helpEntry(name).text = text;
        return func;
    }
}

//flag type argument like -f or --file
export function arg(long, short, desc){
    return function(func, name){
        let args = helpEntry(name).args = helpEntry(name).args || [];
        args.unshift({long, short, desc});
        return func;
    }
}

//normal argument
export function param(param, desc){
    return function(func, name){
        let params = helpEntry(name).params = helpEntry(name).params || [];
        params.unshift({param, desc});
        return func;
    }
}

//usage string
export function usage(usage){
    return function(func, name){
        usage = usage.replace(/[\[<](\w+)[\]>]/g, chalk`[{blue $1}]`);
        helpEntry(name).usage = usage;
        return func;
    }
}

export function cachedgetter(target, key, desc){
    let cachedVal;

    let oldget = desc.get;
    desc.get = function(){
        if(cachedVal) return cachedVal;
        return cachedVal = oldget.call(this);
    };
    desc.set = function(val){
        cachedVal = val;
    };
}

function findValueInCache(args, cache){
    for(let [argsKey, value] of cache){
        if(args.length !== argsKey.length) continue;
        for(let i in argsKey){
            if(args[i] !== argsKey[i]){
                continue
            }
        }
        return {found: true, value};
    }
    return {found: false};
}

//This decorator takes a function and returns a function that remembers the
//  value returned by given arguments
export function cached(target, key, desc){
    let oldFunc = desc.value;
    let cachedValues = [];
    function newFunc(...args){
        let {found, value} = findValueInCache(args, cachedValues);
        if(!found){
            //Call the old function to find the value, then store it in the cache
            value = oldFun(...args);
            cachedValues.push([args, value]);
        }
        return value;
    }
    newFunc.clearCache = function(){
        cachedValues = [];
    }
    newFunc.cachePush = function(args, value){
        cachedValues.push([args, value]);
    }
    newFunc.remove = function(...args){
        let {found, value} = findValueInCache(args, cachedValues);
        if(found){
            cachedValues = cachedValues.filter(([arg, item]) => item !== value);
        }
    }

    return {
        ...desc,
        value: newFunc,
    };
}

//Access a deep property of an object: if path is ["a", "b", "c"], then this
//function returns obj.a.b.c
function deepAccess(obj, path){
    let o = obj;
    for(let key of path){
        if(!o) return [];
        o = o[key];
    }
    return o;
}

//This takes a class as the first argument, then adds a getter/setter pair that
//corresponds to an object in this.data
export function defineAssoc(classname, shortname, path){
    path = path.split(".");
    let lastKey = path.pop();

    Object.defineProperty(classname.prototype, shortname, {
        get(){
            return deepAccess(this, path)[lastKey];
        },
        set(val){
            deepAccess(this, path)[lastKey] = val;
        },
    });
}

import {spawn as cp_spawn} from "child_process";
import {performance} from "perf_hooks";

//Spawn promise decorator, based on https://gist.github.com/Stuk/6226938
export function spawn(options, ...args){
    if(typeof options !== "object"){
        args.unshift(options);
        options = {};
    }
    //todo options
    return new Promise((resolve, reject) => {
        let start = performance.now();

        let stdout = "";
        let stderr = "";
        let cp = cp_spawn(...args);

        if(cp.stdout) cp.stdout.on("data", chunk => {stdout += chunk; write(chunk)});
        if(cp.stderr) cp.stderr.on("data", chunk => {stderr += chunk; write(chunk)});

        cp.on("error", reject);
        cp.on("close", code => {
            let end = performance.now();
            let time = end - start;
            let timestr = time > 1000 ? (time/100|0)/10 + "s" : (time|0) + "ms";
            resolve({stdout, stderr, exitCode: code, time, timestr});
        });
    });
}
