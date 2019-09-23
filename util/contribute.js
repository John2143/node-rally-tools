const {Asset} = require("../bundle.js");
const rp = require("request-promise");

async function contribute(id){
    let a = await Asset.getById("PROD", id);
    let files = await a.getFiles();
    let labels;

    labels = files.findByName("ClassifiedAmazonLabelsEvents_Txt");
    if(labels){
        log("Contributing amz label " + a.name);
        let content = JSON.parse(await labels.getContent());
        let res = await rp.post({
            method: "POST",
            uri: `http://localhost:8080/addData`,
            body: content,
            qs: {
                movieId: a.id,
                provider: "amazon",
                type: "label",
                movieName: a.name,
            },
            resolveWithFullResponse: true,
            json: true,
        });
        labels = null;
    }

    labels = files.findByName("ClassifiedGoogleLabelsEvents_Txt");
    if(labels){
        log("Contributing google label " + a.name);
        let content = JSON.parse(await labels.getContent());
        let res = await rp.post({
            method: "POST",
            uri: `http://localhost:8080/addData`,
            body: content,
            qs: {
                movieId: a.id,
                provider: "google",
                type: "label",
                movieName: a.name,
            },
            resolveWithFullResponse: true,
            json: true,
        });
        labels = null;
    }
};

contribute(479466);
contribute(462286);
