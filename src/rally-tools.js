import chalk from "chalk";
import {configObject} from "./config.js";
import {cached} from "./decorators.js";
import rp from "request-promise";

global.chalk = chalk;
global.log      = (...text) => console.log(...text);
global.write    = (...text) => process.stdout.write(...text);
global.elog     = (...text) => console.error(...text);
global.ewrite   = (...text) => process.stderr.write(...text);
global.errorLog = (...text) => log(...text.map(chalk.red));

export class lib{
    //This function takes 2 required arguemnts:
    // env: the enviornment you wish to use
    // and either:
    //  'path', the short path to the resource. ex '/presets/'
    //  'path_full', the full path to the resource like 'https://discovery-dev.sdvi.com/presets'
    //
    // If the method is anything but GET, either payload or body should be set.
    // payload should be a javascript object to be turned into json as the request body
    // body should be a string that is passed as the body. for example: the python code of a preset.
    //
    // qs are the querystring parameters, in a key: value object.
    // {filter: "name=test name"} becomes something like 'filter=name=test+name'
    //
    // headers are the headers of the request. "Content-Type" is already set if
    //   payload is given as a parameter
    //
    // fullResponse should be true if you want to receive the request object,
    //  not just the returned data.
    static async makeAPIRequest({
        env, path, path_full, fullPath,
        payload, body, method = "GET",
        qs, headers = {},
        fullResponse = false, timeout = configObject.timeout || 20000
    }){
        //backwards compatability from ruby script
        if(fullPath) path_full = fullPath;
        //Keys are defined in enviornment variables
        let config = configObject?.api?.[env];
        if(!config) {
            throw new UnconfiguredEnvError(env);
        };
        //Protect PROD and UAT(?) if the --no-protect flag was not set.
        if(method !== "GET" && !configObject.dangerModify){
            if(env === "UAT" && configObject.restrictUAT || env === "PROD"){
                throw new ProtectedEnvError(env);
            }
        }

        let rally_api_key = config.key;
        let rally_api = config.url;
        if(path && path.startsWith("/v1.0/")){
            rally_api = rally_api.replace("/api/v2", "/api");
        }

        path = path_full || rally_api + path;
        if(payload){
            body = JSON.stringify(payload, null, 4);
        }

        if(payload){
            headers["Content-Type"] = "application/vnd.api+json";
        }

        let fullHeaders = {
            //SDVI ignores this header sometimes.
            Accept: "application/vnd.api+json",
            "X-SDVI-Client-Application": "Discovery-rtlib-" + (configObject.appName || "commandline"),
            ...headers,
        }

        if(configObject.vvverbose){
            log(`${method} @ ${path}`)
            log(JSON.stringify(fullHeaders, null, 4))

            if(body){
                log(body);
            }else{
                log("(No body")
            }
        }

        let requestOptions = {
            method, body, qs, uri: path,
            timeout,
            auth: {bearer: rally_api_key},
            headers: fullHeaders,
            simple: false, resolveWithFullResponse: true,
        };

        let response;
        try{
            response = await rp(requestOptions);
            if(configObject.vverbose || configObject.vvverbose){
                log(chalk`${method} @ ${response.request.uri.href}`);
            }
        }catch(e){
            if(e?.cause.code === "ESOCKETTIMEDOUT"){
                throw new APIError(response || {}, requestOptions, body);
            }else{
                throw e;
            }
        }

        //Throw an error for any 5xx or 4xx
        if(!fullResponse && ![200, 201, 202, 203, 204].includes(response.statusCode)){
            throw new APIError(response, requestOptions, body);
        }
        let contentType = response.headers["content-type"];
        let isJSONResponse = contentType === "application/vnd.api+json" || contentType === "application/json";

        if(configObject.vvverbose){
            log(response.body);
        }

        if(fullResponse){
            return response;
        }else if(isJSONResponse){
            if([200, 201, 202, 203, 204].includes(response.statusCode) && !response?.body?.trim()) return {};
            try{
                return JSON.parse(response.body);
            }catch(e){
                log(response.body);
                throw new AbortError("Body is not valid json: ");
            }
        }else{
            return response.body;
        }
    }

    //Index a json endpoint that returns a {links} field.
    //This function returns the merged data objects as an array
    //
    //Additonal options (besides makeAPIRequest options):
    // - Observe: function to be called for each set of data from the api
    static async indexPath(env, path){
        let opts = typeof env === "string" ? {env, path} : env;

        opts.maxParallelRequests = 1;

        let index = new IndexObject(opts);

        return await index.fullResults();
    }

    static clearProgress(size = 30){
        if(!configObject.globalProgress) return;
        process.stderr.write(`\r${" ".repeat(size + 15)}\r`);
    }

    static async drawProgress(i, max, size = process.stdout.columns - 15 || 15){
        if(!configObject.globalProgress) return;
        if(size > 45) size = 45;
        let pct = Number(i) / Number(max);
        //clamp between 0 and 1
        pct = pct < 0 ? 0 : pct > 1 ? 1 : pct;
        let numFilled = Math.floor(pct * size);
        let numEmpty = size - numFilled;

        this.clearProgress(size);
        process.stderr.write(`[${"*".repeat(numFilled)}${" ".repeat(numEmpty)}] ${i} / ${max}`);
    }


    //Index a json endpoint that returns a {links} field.
    //
    //This function is faster than indexPath because it can guess the pages it
    //needs to retreive so that it can request all assets at once.
    //
    //This function assumes that the content from the inital request is the
    //first page, so starting on another page may cause issues. Consider
    //indexPath for that.
    //
    //Additional opts, besides default indexPath opts:
    // - chunksize[10]: How often to break apart concurrent requests
    static async indexPathFast(env, path){
        let opts = typeof env === "string" ? {env, path} : env;

        let index = new IndexObject(opts);

        return await index.fullResults();
    }
    static isLocalEnv(env){
        return !env || env === "LOCAL" || env === "LOC";
    }
    static envName(env){
        if(this.isLocalEnv(env)) return "LOCAL";
        return env;
    }
};

export class AbortError extends Error{
    constructor(message){
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = "AbortError";
    }
}

export class APIError extends Error{
    constructor(response, opts, body){
        super(chalk`
{reset Request returned} {yellow ${response?.statusCode}}{
{green ${JSON.stringify(opts, null, 4)}}
{green ${body}}
{reset ${response.body}}
===============================
{red ${response.body ? "Request timed out" : "Bad response from API"}}
===============================
        `);
        this.response = response;
        this.opts = opts;
        this.body = body;

        Error.captureStackTrace(this, this.constructor);
        this.name = "ApiError";
    }
}

export class UnconfiguredEnvError extends AbortError{
    constructor(env){
        super("Unconfigured enviornment: " + env);
        this.name = "Unconfigured Env Error";
    }
}

export class ProtectedEnvError extends AbortError{
    constructor(env){
        super("Protected enviornment: " + env);
        this.name = "Protected Env Error";
    }
}

export class FileTooLargeError extends Error{
    constructor(file){
        super(`File ${file.parentAsset ? file.parentAsset.name : "(unknown)"}/${file.name} size is: ${file.sizeGB}g (> ~.2G)`);
        this.name = "File too large error";
    }
}

export class Collection{
    constructor(arr){
        this.arr = arr;
    }
    [Symbol.iterator](){
        return this.arr[Symbol.iterator]();
    }
    findById(id){
        return this.arr.find(x => x.id == id);
    }
    findByName(name){
        return this.arr.find(x => x.name == name);
    }
    findByNameContains(name){
        return this.arr.find(x => x.name.includes(name));
    }
    log(){
        for(let d of this){
            if(d){
                log(d.chalkPrint(true));
            }else{
                log(chalk`{red (None)}`);
            }
        }
    }
    get length(){return this.arr.length;}
}

export class RallyBase{
    static handleCaching(){
        if(!this.cache) this.cache = [];
    }
    static isLoaded(env){
        if(!this.hasLoadedAll) return;
        return this.hasLoadedAll[env];
    }
    static async getById(env, id, qs){
        this.handleCaching();
        for(let item of this.cache){
            if(item.id == id && item.remote === env || `${env}-${id}` === item.metastring) return item;
        }

        let data = await lib.makeAPIRequest({
            env, path: `/${this.endpoint}/${id}`,
            qs
        });
        if(data.data){
            let o = new this({data: data.data, remote: env, included: data.included});
            this.cache.push(o);
            return o;
        }
    }

    static async getByName(env, name, qs){
        this.handleCaching();
        for(let item of this.cache){
            if(item.name === name && item.remote === env) return item;
        }

        let data = await lib.makeAPIRequest({
            env, path: `/${this.endpoint}`,
            qs: {...qs, filter: `name=${name}` + (qs ? qs.filter : "")},
        });
        //TODO included might not wokr correctly here
        if(data.data[0]){
            let o = new this({data: data.data[0], remote: env, included: data.included});
            this.cache.push(o);
            return o;
        }
    }

    static async getAllPreCollect(d){return d;}
    static async getAll(env){
        this.handleCaching();
        let datas = await lib.indexPathFast({
            env, path: `/${this.endpoint}`,
            pageSize: "50",
            qs: {sort: "id"},
        });
        datas = await this.getAllPreCollect(datas);
        let all = new Collection(datas.map(data => new this({data, remote: env})));
        this.cache = [...this.cache, ...all.arr];
        return all;
    }
    static async removeCache(env){
        this.handleCaching();
        this.cache = this.cache.filter(x => x.remote !== env);
    }

    //Specific turns name into id based on env
    //Generic turns ids into names
    async resolveApply(type, dataObj, direction){
        let obj;
        if(direction == "generic"){
            obj = await type.getById(this.remote, dataObj.id);
            if(obj){
                dataObj.name = obj.name
            }
        }else if(direction == "specific"){
            obj = await type.getByName(this.remote, dataObj.name);
            if(obj){
                dataObj.id = obj.id
            }
        }
        return obj;
    }

    //Type is the baseclass you are looking for (should extend RallyBase)
    //name is the name of the field
    //isArray is true if it has multiple cardinailty, false if it is single
    //direction gets passed directly to resolveApply
    async resolveField(type, name, isArray=false, direction="generic"){
        // ignore empty fields
        let field = this.relationships[name];
        if(!field?.data) return;

        if(isArray){
            return await Promise.all(field.data.map(o => this.resolveApply(type, o, direction)));
        }else{
            return await this.resolveApply(type, field.data, direction);
        }
    }

    cleanup(){
        for(let [key, val] of Object.entries(this.relationships)){
            //Remove ids from data
            if(val.data){
                if(val.data.id){
                    delete val.data.id;
                }else if(val.data[0]){
                    for(let x of val.data) delete x.id;
                }
            }
            delete val.links;
        }
        // organization is unused (?)
        delete this.relationships.organization;
        // id is specific to envs
        // but save source inside meta string in case we need it
        this.metastring = this.remote + "-" + this.data.id;
        delete this.data.id;
        // links too
        delete this.data.links;
    }
}

export function sleep(time = 1000){
    return new Promise(resolve => setTimeout(resolve, time));
}

export function* zip(...items){
    let iters = items.map(x => x[Symbol.iterator]());

    for(;;){
        let r = [];
        for(let i of iters){
            let next = i.next()
            if(next.done) return;
            r.push(next.value);
        }
        yield r;
    }
}

export async function* unordered(proms){
    let encapsulatedPromises = proms.map(async (x, i) => [i, await x]);
    while(encapsulatedPromises.length > 0){
        let [ind, result] = await Promise.race(encapsulatedPromises.filter(x => x));
        yield result;

        encapsulatedPromises[ind] = undefined;
    }
}

export function* range(start, end){
    if(end === undefined){
        end = start;
        start = 0;
    }
    while(start < end) yield start++;
}

export class IndexObject {
    //normal opts from any makeAPIRequest
    //Note that full_response and pages won't work.
    //
    //if you want to start from another page, use `opts.start`
    //opts.observe: async function(jsonData) => jsonData. Transform the data from the api
    //opts.maxParallelRequests: number of max api requests to do at once
    //opts.noCollect: return [] instead of the full data
    constructor(opts){
        this.opts = opts;
    }

    linkToPage(page) {
        return this.baselink.replace(`page=1p`, `page=${page}p`);
    }

    async initializeFirstRequest(){
        //Create a copy of the options in case we need to have a special first request
        this.start = this.opts.start || 1;
        let initOpts = {...this.opts};
        if(this.opts.pageSize){
            initOpts.qs = {...this.opts.qs};
            initOpts.qs.page = `${this.start}p${this.opts.pageSize}`;
        }

        this.allResults = [];

        //we make 1 non-parallel request to the first page so we know how to
        //format the next requests
        let json = await lib.makeAPIRequest(initOpts);

        if(this.opts.observe) json = await this.opts.observe(json);
        if(!this.opts.noCollect) this.allResults.push(json);

        this.baselink = json.links.first;
        this.currentPageRequest = this.start;

        this.hasHit404 = false;
    }

    getNextRequestLink(){
        this.currentPageRequest++;
        return [this.currentPageRequest, this.linkToPage(this.currentPageRequest)];
    }

    ///promiseID is the id in `currentPromises`, so that it can be marked as
    ///done inside the promise array. promiseID is a number from 0 to
    ///maxparallel-1
    async getNextRequestPromise(promiseID){
        let [page, path_full] = this.getNextRequestLink();
        return [promiseID, page, await lib.makeAPIRequest({
            ...this.opts,
            path_full,
            fullResponse: true,
        })];
    }

    cancel(){
        this.willCancel = true;
    }

    async fullResults(){
        await this.initializeFirstRequest();
        let maxParallelRequests = this.opts.maxParallelRequests || this.opts.chunksize || 20;

        let currentPromises = [];

        //generate the first set of requests. Everything after this will re-use these i promiseIDs
        for(let i = 0; i < maxParallelRequests; i++){
            currentPromises.push(this.getNextRequestPromise(currentPromises.length));
        }

        for(;;){
            let [promiseID, page, requestResult] = await Promise.race(currentPromises.filter(x => x));

            if(this.willCancel){
                return null;
            }

            if(requestResult.statusCode === 404){
                this.hasHit404 = true;
            }else if(requestResult.statusCode === 200){
                let json = JSON.parse(requestResult.body);
                if(this.opts.observe) json = await this.opts.observe(json);
                if(!this.opts.noCollect) this.allResults.push(json);
            }else{
                throw new APIError(requestResult, `(unknown args) page ${page}`, null);
            }

            if(this.hasHit404){
                currentPromises[promiseID] = null;
            }else{
                currentPromises[promiseID] = this.getNextRequestPromise(promiseID);
            }

            if(currentPromises.filter(x => x).length === 0) break;
        }

        let all = [];
        for(let result of this.allResults){
            for(let item of result.data){
                all.push(item);
            }
        }

        return all;
    }
}
