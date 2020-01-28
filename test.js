let rt = require("./bundle.js");

rt.configObject.globalProgress = true;

async function main(){
    let x = await rt.lib.indexPathFast({
        path: "/jobs", env: "PROD",
        qs: {
            filter: `{"presetName": "omneon re-hash reference so replacements work","completedBefore": "${Date.now()}"}`,
        },
    });
    log(JSON.stringify(x));
}

async function getName(id){
    let x = await rt.Asset.getById("PROD", id)
    log(x.name);
}

async function main2(){
    let items = require("fs").readFileSync("nice.txt", "utf-8").trim().split("\n");

    await rt.lib.keepalive(getName, items, {chunksize: 50});
}

main2();
