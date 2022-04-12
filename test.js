let rt = require("./bundle.js");

rt.configObject.globalProgress = true;
rt.configObject.dangerModify = true;

async function main(){
    let jobs = await rt.lib.indexPathFast({
        path: "/jobs", env: "PROD",
        qs: {
            filter: `{"presetName": "FW Finish ML","state": "Hold"}`,
        },
    });

    for(let job of jobs) {
        let res = await rt.lib.makeAPIRequest({
            path: `/jobs/${job.id}/actions/Release`,
            env: "PROD",
            method: "POST",
        });
        log(res);
    }
    log(x);
}

main();
