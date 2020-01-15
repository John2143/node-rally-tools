let rt = require("./bundle.js");

async function main(){
    let x = await rt.lib.indexPathFast({
        path: "/jobs", env: "PROD",
        qs: {
            filter: `presetName=Machine_Learning_Amazon_QCEventClassifier_Labels,completedBefore=${Date.now() - 1000 * 60 * 60 * 24 * 30},completedSince=${Date.now() - 1000 * 60 * 60 * 24 * 120}`,
        },
    });
    log(JSON.stringify(x));
}

main()
