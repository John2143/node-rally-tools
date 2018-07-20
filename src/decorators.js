
export let helpEntries = {};
let helpEntry = name => helpEntries[name] ? helpEntries[name] : (helpEntries[name] = {name});

export function helpText(text){
    return function(func, name){
        helpEntry(name).text = text;
        return func;
    }
}
export function arg(long, short, desc){
    return function(func, name){
        let args = helpEntry(name).args = helpEntry(name).args || [];
        args.unshift({long, short, desc});
        return func;
    }
}
export function param(param, desc){
    return function(func, name){
        let params = helpEntry(name).params = helpEntry(name).params || [];
        params.unshift({param, desc});
        return func;
    }
}
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
            if(args[i] === argsKey[i]){
                return {found: true, value};
            }
        }
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
            value = oldFunc(...args);
            cachedValues.push([args, value]);
        }
        return value;
    }
    newFunc.clearCache = function(){
        cachedValues = [];
    }

    return {
        ...desc,
        value: newFunc,
    };
}
