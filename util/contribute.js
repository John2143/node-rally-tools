const {Asset} = require("../bundle.js");
const rt = require("../bundle.js");
const rp = require("request-promise");
const fs = require("fs");
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

//const fwurl = "http://localhost:3000/addData";
const fwurl = "https://fenway.dev.discovery.com/addData";
async function contribute(id){
    write("starting " + id + "...")
    let a = await Asset.getById("PROD", id);
    let files = await a.getFiles();
    let md = await a.getMetadata();

    let labels;

    labels = files.findByName("ClassifiedAmazonLabelsEvents_Txt");
    if(labels){
        write("Downloading....");
        let content = JSON.parse(await labels.getContent());
        write("Contributing amz label " + a.name + "...");

        //fs.writeFileSync("/Users/jschmidt/fenway-2/test/samples/amazon_label.json", JSON.stringify(content, null, 4));
        //process.exit(1);
        let res = await rp({
            method: "POST",
            uri: fwurl,
            body: content,
            qs: {
                movieId: a.id,
                provider: "amazon",
                type: "label",
                movieName: a.name,
                fileLabel: "ClassifiedAmazonLabelsEvents_Txt",
                fileCreatedDate: Date.now(),
                proxyFramerate: md.Workflow.FWInfo.fps,
                proxyStartTimecode: md.Workflow.FWInfo.start,

            },
            resolveWithFullResponse: true,
            json: true,
        });

        log(res.body);
        labels = null;
    }

    labels = files.findByName("ClassifiedGoogleLabelsEvents_Txt");
    if(labels && false){
        write("Downloading....");
        let content = JSON.parse(await labels.getContent());
        log("Contributing google label " + a.name);
        let res = await rp({
            method: "POST",
            uri: fwurl,
            body: content,
            qs: {
                movieId: a.id,
                provider: "google",
                type: "label",
                movieName: a.name,
                fileLabel: "ClassifiedGoogleLabelsEvents_Txt",
                fileCreatedDate: Date.now(),
                proxyFramerate: md.Workflow.FWInfo.fps,
                proxyStartTimecode: md.Workflow.FWInfo.start,
            },
            resolveWithFullResponse: true,
            json: true,
        });

        log(res.body);
        labels = null;
    }
};



async function main(){
    let files = fs.readFileSync("mainout.txt", "utf-8")
                   .trim().split("\n")
                   .map(x => x.slice(3))
                   .slice(6265);

    await rt.lib.keepalive(async (...a) => contribute(...a).catch(e=>process.stdout.write(e)), files, {chunksize: 2});
}


main();
//contribute(462286);
