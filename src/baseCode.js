export default {
    SdviContentMover:`{
    "tasks": [
        {
            "operation": "copy" | "move" | "delete",

            "source": {
                "optional": true | false,

                # must specify either inventory OR externalStorage
                "inventory": {
                    "labels": ["<label>" | "*", ],
                    "tags": ["<tag>", ],
                    "storageSet": ["<storage location name>" | "*", ],    # only valid for move & delete tasks
                    "expandCollections": true | false
                },
                "externalStorage": {
                    "uri": "<protocol>://<host>/<path>/<file>",
                    "credentials": {
                        "key": "<parameter store key>",
                        "roleArn": "<role to assume to access the parameter store>",
                        "roleId": "<external ID to be used in role assumption>",
                        "region": "<AWS region of the parameter store>"
                    }
                }
            },

            "destination": {
                "name": "<path within the storage location>/<filename>",
                "overwrite": "never" | "notInAnyAsset" | "notInOtherAsset" | "always",
                "storageMetadata": {"<key>": "<value>",...} | "<sourceStorageMetadata>",

                # must specify either inventory OR externalStorage
                "inventory": {
                    "storage": "<storage location name>",
                    "newLabel": "<fileLabel>",
                    "newTags": ["<tag>", "<tag>"],
                },
                "externalStorage": {
                    "uri": "<protocol>://<host>",
                    "credentials": {
                        "key": "<parameter store key>",
                        "roleArn": "<role to assume to access the parameter store>",
                        "roleId": "<external ID to be used in role assumption>",
                        "region": "<AWS region of the parameter store>"
                    }
                }
            }
        },

        {
            <another task>
        },

        {
            <another task>
        },

        ...

    ]
}`, SdviEvaluate: `'''
name: {name}
'''

# code here

if ({{DYNAMIC_PRESET_DATA}}).get("uploadPresetName") == "{name}":
    # Unit test code here: This will run every time this preset is uploaded.

    print("Unit tests for {name}")

`, SdviEvalPro: `'''
name: {name}
'''

from e2_lib import traced, t, setup1, ContextData

@setup1
def eval_main(context: ContextData):
    pass`,
};
