let read = require("get-stdin");
async function main(){
    let j = JSON.parse(await read());
    let settings = j.attributes.providerSettings;

    settings.outputSpec = {
        ".*\\.mov$": {
            "label": "QCProxy",
            "location": settings.OutputStorageName,
            "name": settings.OutputRename
        }, ".*\\.log$": {
            "label": "QCProxy Log",
            "location": settings.OutputStorageName,
            "name": settings.OutputRename
        }
    }
    settings.outputRename = "--";
    settings.OutputStorageName = "--";
    settings.OutputFileLabel = "--";

    console.log(JSON.stringify(j, null, 4));
}

main()
