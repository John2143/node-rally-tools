
export let testCases = [
    ["one segment good", {
        "userMetaData": {
            "segments": {
                "segments": [
                    {
                        "endTime": "00:02:37:20",
                        "startTime": "00:01:38:10",
                        "woo": [
                            {
                                "inPoint": "00:01:39:00",
                                "outPoint": "00:02:19:00"
                            }
                        ]
                    }
                ],
            }
        }
    }],
    ["out of order segment 1-2", {
        "userMetaData": {
            "segments": {
                "segments": [
                    {
                        "startTime": "00:59:40;00",
                        "endTime": "00:59:59;24",
                        "woo": [ ]
                    },
                    {
                        "startTime": "01:35:00;00",
                        "endTime": "01:40:37;20",
                        "woo": [ ]
                    },
                    {
                        "startTime": "01:00:00;00",
                        "endTime": "01:30:37;20",
                        "woo": [ ]
                    },
                    {
                        "startTime": "01:50:00;00",
                        "endTime": "01:59:00;00",
                        "woo": [ ]
                    },
                ],
            }
        }
    }],
    ["bad 0 hour timecodes", {
        "userMetaData": {
            "segments": {
                "segments": [
                    {
                        "startTime": "00:01:00;00",
                        "endTime": "00:02:37;20",
                        "woo": [ ]
                    },
                    {
                        "startTime": "00:03:00;00",
                        "endTime": "00:04:37;20",
                        "woo": [ ]
                    },
                    {
                        "startTime": "00:05:00;00",
                        "endTime": "00:06:00;00",
                        "woo": [ ]
                    },
                ],
            }
        }
    }],
    ["bad ovelapping segments", {
        "userMetaData": {
            "segments": {
                "segments": [
                    {
                        "startTime": "00:59:40;00",
                        "endTime": "00:59:59;24",
                        "woo": [ ]
                    },
                    {
                        "startTime": "01:00:00;00",
                        "endTime": "01:30:37;20",
                        "woo": [ ]
                    },
                    {
                        "startTime": "01:20:00;00",
                        "endTime": "01:40:37;20",
                        "woo": [ ]
                    },
                    {
                        "startTime": "01:50:00;00",
                        "endTime": "01:59:00;00",
                        "woo": [ ]
                    },
                ],
            }
        }
    }],
    ["good segments", {
        "userMetaData": {
            "segments": {
                "segments": [
                    {
                        "startTime": "00:59:40;00",
                        "endTime": "00:59:59;24",
                        "woo": [ ]
                    },
                    {
                        "startTime": "01:00:00;00",
                        "endTime": "01:30:37;20",
                        "woo": [ ]
                    },
                    {
                        "startTime": "01:35:00;00",
                        "endTime": "01:40:37;20",
                        "woo": [ ]
                    },
                    {
                        "startTime": "01:50:00;00",
                        "endTime": "01:59:00;00",
                        "woo": [ ]
                    },
                ],
            }
        }
    }],
    ["good segments w/ good woos", {
        "userMetaData": {
            "segments": {
                "segments": [
                    {
                        "startTime": "00:59:40;00",
                        "endTime": "00:59:59;24",
                        "woo": [ ]
                    },
                    {
                        "startTime": "01:00:00;00",
                        "endTime": "01:30:37;20",
                        "woo": [
                            {
                                "inPoint": "01:20:39;00",
                                "outPoint": "01:21:49;00"
                            }
                        ]
                    },
                    {
                        "startTime": "01:35:00;00",
                        "endTime": "01:40:37;20",
                        "woo": [
                            {
                                "inPoint": "01:36:39;00",
                                "outPoint": "01:37:49;00"
                            }
                        ]
                    },
                    {
                        "startTime": "01:50:00;00",
                        "endTime": "01:59:00;00",
                        "woo": [ ]
                    },
                ],
            }
        }
    }],
    ["good segments w/ good woos (multiple woos]", {
        "userMetaData": {
            "segments": {
                "segments": [
                    {
                        "startTime": "00:59:40;00",
                        "endTime": "00:59:59;24",
                        "woo": [ ]
                    },
                    {
                        "startTime": "01:00:00;00",
                        "endTime": "01:30:37;20",
                        "woo": [
                            {
                                "inPoint": "01:20:39;00",
                                "outPoint": "01:21:49;00"
                            },
                            {
                                "inPoint": "01:22:39;00",
                                "outPoint": "01:23:49;00"
                            }
                        ]
                    },
                    {
                        "startTime": "01:35:00;00",
                        "endTime": "01:40:37;20",
                        "woo": [
                            {
                                "inPoint": "01:36:39;00",
                                "outPoint": "01:37:49;00"
                            },
                            {
                                "inPoint": "01:38:39;00",
                                "outPoint": "01:40:37;20"
                            }
                        ]
                    },
                    {
                        "startTime": "01:50:00;00",
                        "endTime": "01:59:00;00",
                        "woo": [ ]
                    },
                ],
            }
        }
    }],
    ["good segments w/ bad woos (fully outside segment]", {
        "userMetaData": {
            "segments": {
                "segments": [
                    {
                        "startTime": "00:59:40;00",
                        "endTime": "00:59:59;24",
                        "woo": [ ]
                    },
                    {
                        "startTime": "01:00:00;00",
                        "endTime": "01:30:37;20",
                        "woo": [
                            {
                                "inPoint": "01:33:39;00",
                                "outPoint": "01:35:49;00"
                            },
                        ]
                    },
                    {
                        "startTime": "01:35:00;00",
                        "endTime": "01:40:37;20",
                        "woo": [
                            {
                                "inPoint": "01:36:39;00",
                                "outPoint": "01:37:49;00"
                            },
                            {
                                "inPoint": "01:38:39;00",
                                "outPoint": "01:40:37;20"
                            }
                        ]
                    },
                    {
                        "startTime": "01:50:00;00",
                        "endTime": "01:59:00;00",
                        "woo": [ ]
                    },
                ],
            }
        }
    }],
    ["good segments w/ bad woos (go past segment out time]", {
        "userMetaData": {
            "segments": {
                "segments": [
                    {
                        "startTime": "00:59:40;00",
                        "endTime": "00:59:59;24",
                        "woo": [ ]
                    },
                    {
                        "startTime": "01:00:00;00",
                        "endTime": "01:30:37;20",
                        "woo": [
                            {
                                "inPoint": "01:20:39;00",
                                "outPoint": "01:31:49;00"
                            },
                        ]
                    },
                    {
                        "startTime": "01:35:00;00",
                        "endTime": "01:40:37;20",
                        "woo": [
                            {
                                "inPoint": "01:36:39;00",
                                "outPoint": "01:37:49;00"
                            },
                            {
                                "inPoint": "01:38:39;00",
                                "outPoint": "01:40:37;20"
                            }
                        ]
                    },
                    {
                        "startTime": "01:50:00;00",
                        "endTime": "01:59:00;00",
                        "woo": [ ]
                    },
                ],
            }
        }
    }],
];

import Asset from "./asset.js";

function recursivePatch(target, patch){
    if(typeof patch !== "object" || Array.isArray(patch)) return patch;
    for(let [key, value] of Object.entries(patch)){
        if(typeof value === "object"){
            target[key] = recursivePatch(target[key], value);
        }else{
            target[key] = value;
        }
    }
    return target;
}

export async function testFunction(args){
    function uuid(args){
        const digits = 16;
        return String(Math.floor(Math.random() * Math.pow(10, digits))).padStart(digits, "0");
    }

    let json = JSON.parse(require("fs").readFileSync("recontribution_init.json"));

    for(let [name, patch] of testCases){
        let base = JSON.parse(JSON.stringify(json));
        base["Metadata"] = recursivePatch(base["Metadata"], patch);

        let asset = await Asset.createNew("USKN_R_" + uuid(), "UAT");
        log(name);
        log(asset.data.links.self.replace("/api/v2/assets/", "/content/"));
        await asset.addFile("SdviMovieFileMaster", "s3://discovery.com.uat.onramp.archive.us-east-1/DKNOXR_Master2.mxf");
        await asset.startWorkflow("External Logging", {
            version: 1,
            message: `Test: ${name}`,
        });
        await asset.startWorkflow("AS302 Test DKNOX Recontribution", base);
    }
}
