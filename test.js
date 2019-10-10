let rt = require("./bundle.js");

(async _ => {
    let x = await rt.Asset.getById("UAT", 166299)
    let f = await x.getFiles();
    log((await f.findByName("192052_002_NLIN_2369416_7_AutoAQCEvents")).delete())
})()

