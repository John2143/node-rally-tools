import rp from "request-promise";

global.log = console.log;
global.errorLog = (...args) => console.log("===ERR===", ...args);

export default class RallyTools{
    static greet() {
        return 'hello';
    }
    static async makeAPIRequest(env, {path, path_full, payload, body, never_json, method = "GET", qs, headers = {}}){
        let rally_api_key = process.env[`rally_api_key_${env}`];
        let rally_api = process.env[`rally_api_url_${env}`];

        if(!rally_api && !path_full) return errorLog(`Unsupported env ${env}`);

        path = path_full || rally_api + path;
        body = body || payload && JSON.stringify(payload);

        let response = await rp({
            method, body, qs, uri: path,
            auth: {bearer: rally_api_key},
            headers: {
                Accept: "application/vnd.api+json",
                ...headers,
            },
            //simple: false, resolveWithFullResponse: true,
        });

        if(![200, 201, 204].includes(response.statusCode)){
            errorLog(response);
            throw new Error("Api result error");
        }
        return response.body;
    }
};
