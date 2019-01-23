import chalk from "chalk";
import {configObject} from "./config.js";
import {cached} from "./decorators.js";
const rp = importLazy("request-promise")

global.chalk = chalk;
global.log      = (...text) => console.log(...text);
global.write    = (...text) => process.stdout.write(...text);
global.elog     = (...text) => console.log(...text);
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
        env, path, path_full,
        payload, body, method = "GET",
        qs, headers = {},
        fullResponse = false, timeout = configObject.timeout || 20000
    }){
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

        path = path_full || rally_api + path;
        if(payload){
            body = JSON.stringify(payload, null, 4);
        }

        if(configObject.vverbose || configObject.vvverbose){
            log(chalk`${method} @ ${path}`);
            if(qs){
                log(qs)
            }
        }
        if(configObject.vvverbose){
            if(payload || body){
                log(payload || body);
            }
        }

        if(payload){
            headers["Content-Type"] = "application/vnd.api+json";
        }

        let requestOptions = {
            method, body, qs, uri: path,
            timeout,
            auth: {bearer: rally_api_key},
            headers: {
                //SDVI ignores this header sometimes.
                Accept: "application/vnd.api+json",
                ...headers,
            },
            simple: false, resolveWithFullResponse: true,
        };

        let response;
        try{
            response = await rp(requestOptions);
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
        let all = [];

        let opts = typeof env === "string" ? {env, path} : env;
        let json = await this.makeAPIRequest(opts);

        let [numPages, pageSize] = this.numPages(json.links.last);
        //log(`num pages: ${numPages} * ${pageSize}`);

        all = [...json.data];
        while(json.links.next){
            json = await this.makeAPIRequest({...opts, path_full: json.links.next});
            if(opts.observe) opts.observe(json.data);
            all = [...all, ...json.data];
        }

        return all;
    }

    //Returns number of pages and pagination size
    static numPages(str){
        return /page=(\d+)p(\d+)/.exec(str).slice(1);
    }

    static arrayChunk(array, chunkSize){
        let newArr = [];
        for (let i = 0; i < array.length; i += chunkSize){
            newArr.push(array.slice(i, i + chunkSize));
        }
        return newArr;
    }

    static async doPromises(promises, result = [], cb){
        for(let promise of promises){
            let res = await promise;
            result.push(res);
            if(cb){
                cb(res.data);
            }
        }
        return result
    }

    static clearProgress(size = 30){
        process.stderr.write(`\r${" ".repeat(size + 8)}\r`);
    }

    static async drawProgress(i, max, size = 30){
        let pct = Number(i) / Number(max);
        //clamp between 0 and 1
        pct = pct < 0 ? 0 : pct > 1 ? 1 : pct;
        let numFilled = Math.floor(pct * size);
        let numEmpty = size - numFilled;

        this.clearProgress();
        process.stderr.write(`[${"*".repeat(numFilled)}${" ".repeat(numEmpty)}] ${i} / ${max}`);
    }

    //TODO implelement
    //static async processPromises({
        //promiseGenerator, chunksize, startingPromises = [],
        //observe,
    //}){
        //let promises = startingPromises
        //for(let promise of promiseGenerator()){
        //}
    //}


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
        let json = await this.makeAPIRequest(opts);

        let baselink = json.links.first;
        const linkToPage = page => baselink.replace("page=1p", `page=${page}p`);

        let [numPages, pageSize] = this.numPages(json.links.last);
        //log(`num pages: ${numPages} * ${pageSize}`);

        //Construct an array of all the requests that are done simultanously.
        //Assume that the content from the inital request is the first page.
        let allResults = []
        let promises = [Promise.resolve(json)];

        opts.chunksize = opts.chunksize || 10
        for(let i = 2; i <= (opts.limit ? opts.limit : numPages); i++){
            this.drawProgress(i, opts.limit || numPages);
            if(promises.length === opts.chunksize){
                await this.doPromises(promises, allResults, opts.observe);
                promises = []
            }

            let req = this.makeAPIRequest({...opts, path_full: linkToPage(i)});
            promises.push(req);
        }
        await this.doPromises(promises, allResults, opts.observe);
        this.clearProgress();

        let all = [];
        for(let result of allResults){
            for(let item of result.data){
                all.push(item);
            }
        }

        return all;
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
    static isLoaded(env){
        if(!this.hasLoadedAll) return;
        return this.hasLoadedAll[env];
    }
    static async getById(env, id, qs){
        if(this.isLoaded(env)){
            return (await this.getAll(env)).findById(id);
        }else{
            let data = await lib.makeAPIRequest({
                env, path: `/${this.endpoint}/${id}`,
                qs
            });
            if(data.data) return new this({data: data.data, remote: env, included: data.included});
        }
    }

    static async getByName(env, name, qs){
        if(this.isLoaded(env)){
            return (await this.getAll(env)).findByName(name);
        }else{
            let data = await lib.makeAPIRequest({
                env, path: `/${this.endpoint}`,
                qs: {...qs, filter: `name=${name}` + (qs ? qs.filter : "")},
            });
            //TODO included might not wokr correctly here
            if(data.data[0]) return new this({data: data.data[0], remote: env, included: data.included});
        }
    }

    static async getAllPreCollect(d){return d;}
    static async getAll(env){
        this.hasLoadedAll = this.hasLoadedAll || {};
        if(this.isLoaded(env)) return this.hasLoadedAll[env];

        let datas = await lib.indexPathFast(env, `/${this.endpoint}?page=1p10`);
        datas = await this.getAllPreCollect(datas);
        let all = new Collection(datas.map(data => new this({data, remote: env})));
        this.hasLoadedAll[env] = all;
        return all;
    }
    static async removeCache(env){
        this.hasLoadedAll = this.hasLoadedAll || {};
        if(this.isLoaded(env)){
            this.hasLoadedAll[env] = undefined;
        }
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
        delete this.data.id;
        // links too
        delete this.data.links;
    }
}
