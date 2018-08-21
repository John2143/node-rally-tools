let read = require("get-stdin");
async function main(){
    let j = JSON.parse(await read());
    let settings = j.attributes.providerSettings;

    settings.outputSpec = {
        ".*\\.mov$": {
            "label": settings.OutputFileLabel,
            "location": settings.OutputStorageName,
            "name": settings.outputRename
        }, ".*\\.log$": {
            "label": settings.OutputFileLabel,
            "location": settings.OutputStorageName,
            "name": settings.outputRename
        }
    }
    settings.outputRename = "--";
    settings.OutputStorageName = "--";
    settings.OutputFileLabel = "--";

    console.log(JSON.stringify(j, null, 4));
}

main()
