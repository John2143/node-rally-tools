import chalk from "chalk";
import {configObject} from "./config.js";
const rp = importLazy("request-promise")

global.chalk = chalk;
global.log = text => console.log(text);
global.write = text => process.stdout.write(text);
global.errorLog = text => log(chalk.red(text));

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
        fullResponse = false, timeout = configObject.timeout || 0
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
            body = JSON.stringify(payload);
        }

        if(configObject.vverbose){
            log(chalk`${method} @ ${path}`);
            if(qs){
                log(qs)
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
            log(e?.cause.name)
            if(e.code === "ETIMEDOUT"){
                throw new APIError(response, requestOptions, body);
            }else{
                throw e;
            }
        }

        //Throw an error for any 5xx or 4xx
        if(!fullResponse && ![200, 201, 204].includes(response.statusCode)){
            throw new APIError(response, requestOptions, body);
        }
        let contentType = response.headers["content-type"];
        let isJSONResponse = contentType === "application/vnd.api+json" || contentType === "application/json";

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
    static async indexPath(env, path){
        let all = [];

        let opts = typeof env === "string" ? {env, path} : env;
        let json = await this.makeAPIRequest(opts);

        let [numPages, pageSize] = this.numPages(json.links.last);
        //log(`num pages: ${numPages} * ${pageSize}`);

        all = [...json.data];
        while(json.links.next){
            json = await this.makeAPIRequest({...opts, path_full: json.links.next});
            all = [...all, ...json.data];
        }

        return all;
    }

    //Returns number of pages and pagination size
    static numPages(str){
        return /page=(\d+)p(\d+)/.exec(str).slice(1);
    }

    //Index a json endpoint that returns a {links} field.
    //
    //This function is faster than indexPath because it can guess the pages it
    //needs to retreive so that it can request all assets at once.
    //
    //This function assumes that the content from the inital request is the
    //first page, so starting on another page may cause issues. Consider
    //indexPath for that.
    static async indexPathFast(env, path){
        let all = [];

        let opts = typeof env === "string" ? {env, path} : env;
        let json = await this.makeAPIRequest(opts);

        let baselink = json.links.first;
        const linkToPage = page => baselink.replace("page=1p", `page=${page}p`);

        let [numPages, pageSize] = this.numPages(json.links.last);
        //log(`num pages: ${numPages} * ${pageSize}`);

        //Construct an array of all the requests that are done simultanously.
        //Assume that the content from the inital request is the first page.
        let promises = [Promise.resolve(json),];
        for(let i = 2; i <= numPages; i++){
            let req = this.makeAPIRequest({...opts, path_full: linkToPage(i)});
            promises.push(req);
        }

        for(let promise of promises){
            all = [...all, ...(await promise).data];
        }

        return all;
    }
    static isLocalEnv(env){
        return !env || env === "LOCAL" || env === "LOC";
    }
    static async startJob(env, movie, preset){
        let movieObj = await this.makeAPIRequest({
            env, path: "/movies", qs: {
                filter: `name=${movie}`
            }
        });

        let id = movieObj?.data?.[0]?.id
        if(!id) return {};

        // Fire and forget.
        let data = await this.makeAPIRequest({
            env, path: "/jobs", method: "POST",
            payload: {
                data: {
                    type: "jobs",
                    relationships: {
                        movie: {
                            data: {
                                id: id,
                                type: "movies",
                            }
                        }, preset: {
                            data: {
                                id: preset,
                                type: "presets",
                            }
                        }
                    }
                }
            }
        });
        return {
            movieId: id, reqData: data,
        };
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
{reset Request returned} {yellow ${response.statusCode}}{
{green ${JSON.stringify(opts, null, 4)}}
{green ${body}}
{reset ${response.body}}
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
        for(let d of this) log(d.chalkPrint(true));
    }
    get length(){return this.arr.length;}
}


export class RallyBase{
    constructor(){}
    resolveApply(datum, dataObj, direction){
        let obj;
        if(direction == "generic"){
            obj = datum.findById(dataObj.id);
            if(obj){
                dataObj.name = obj.name
            }
        }else if(direction == "specific"){
            obj = datum.findByName(dataObj.name);
            if(obj){
                dataObj.id = obj.id
            }
        }
        return obj;
    }
    resolveField(datum, name, isArray=false, direction="generic"){
        let field = this.relationships[name];
        if(!field?.data) return;

        if(isArray){
            return field.data.map(o => this.resolveApply(datum, o, direction));
        }else{
            return this.resolveApply(datum, field.data, direction);
        }
    }
    cleanup(){
        for(let [key, val] of Object.entries(this.relationships)){
            if(val.data){
                if(val.data.id){
                    delete val.data.id;
                }else if(val.data[0]){
                    for(let x of val.data) delete x.id;
                }
            }
            delete val.links;
        }
        delete this.relationships.organization;
        delete this.data.id;
        delete this.data.links;
    }
}
