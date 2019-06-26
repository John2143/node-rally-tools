export default {
  SdviContentMover: `{
    "tasks": [
        {
            "operation": "move",
            "source": {
                "labels": [ "MyLabel" ],
                "tags": [ "segmented" ]
                "storageSet": [ "*", "-OtherStorageBucket" ],

            },
            "destination": {
                "storage": "Archive",
                "newLabel": "myNewLabel",
                "overwrite": "always"
            }
        }
    ]
}`,
  SdviEvaluate: `'''
name: {name}
'''

# code here`
};
