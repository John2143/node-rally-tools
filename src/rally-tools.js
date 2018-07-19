import rp from "request-promise";
import chalk from "chalk";
import {configObject} from "./config.js";

global.chalk = chalk;
global.log = text => console.log(text);
global.write = text => process.stdout.write(text);
global.errorLog = text => log(chalk.red(text));

export class lib{
    static async makeAPIRequest({env, path, path_full, payload, body, json = true, method = "GET", qs, headers = {}, fullResponse = false}){
        //Keys are defined in enviornment variables
        let config = configObject.api[env];
        if(!config) {
            return false;
        };

        let rally_api_key = config.key;
        let rally_api = config.url;


        path = path_full || rally_api + path;
        body = body || payload && JSON.stringify(payload);

        if(global.logAPI){
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
            auth: {bearer: rally_api_key},
            headers: {
                Accept: "application/vnd.api+json",
                ...headers,
            },
            simple: false, resolveWithFullResponse: true,
        };
        let response = await rp(requestOptions);

        if(!fullResponse && ![200, 201, 204].includes(response.statusCode)){
            throw new APIError(response, requestOptions);
        }
        if(fullResponse){
            return response;
        }else if(json){
            return JSON.parse(response.body);
        }else{
            return response.body;
        }
    }
    //Index a json endpoint that returns a {links} field.
    static async indexPath(env, path){
        let all = [];

        let json = await this.makeAPIRequest({env, path});

        let [numPages, pageSize] = this.numPages(json.links.last);
        //log(`num pages: ${numPages} * ${pageSize}`);

        all = [...json.data];
        while(json.links.next){
            json = await this.makeAPIRequest({env, path_full: json.links.next});
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

        let json = await this.makeAPIRequest({env, path});
        let baselink = json.links.first;
        const linkToPage = page => baselink.replace("page=1p", `page=${page}p`);

        let [numPages, pageSize] = this.numPages(json.links.last);
        //log(`num pages: ${numPages} * ${pageSize}`);

        //Construct an array of all the requests that are done simultanously.
        //Assume that the content from the inital request is the first page.
        let promises = [Promise.resolve(json),];
        for(let i = 2; i <= numPages; i++){
            let req = this.makeAPIRequest({env, path_full: linkToPage(i)});
            promises.push(req);
        }

        for(let promise of promises){
            all = [...all, ...(await promise).data];
        }

        return all;
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
    constructor(response, opts){
        super(chalk`
{reset Request returned} {yellow ${response.statusCode}}
{green ${JSON.stringify(opts)}}
{reset ${response.body}}
        `);
        Error.captureStackTrace(this, this.constructor);
        this.name = "ApiError";
    }
}
