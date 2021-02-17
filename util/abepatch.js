let data = `
1061813	712f2d2f-001b-456c-9d6b-ac4af65f9a05
1514159	a4e31ffa-2264-476b-afd5-400f2f8ee71c
1513923	d3b30e20-a4f1-4a1c-b783-55a2c2839ae4
1513870	de834bb7-0543-49d7-891c-e7790ef64ef7
1514111	1e2b0b94-0351-452e-a3c9-49d1154505b5
1514782	a6a8555a-9dfb-4fa9-b80f-8ee7be0954c8
1514129	2b0a3137-b7dd-4155-8cd5-d2d0d133bb1b
1514746	0621dcb7-c950-442b-b754-bcfca38e1b18
1513956	b7da55c6-d5b6-462f-ae3f-4598a314edc7
1070401	1a77df69-396b-4147-a9a2-f94fd4e916db
1514872	5ff79b70-ba7f-404a-b1d0-75a21149780b
1064682	34306120-9802-4f33-92a7-361403a9e349
1563650	cf473584-c0b4-439b-a304-5d5be3dcc5c7
1513972	bb753a48-5160-4fc6-a62a-1370fc81a09b
751078	7fed0b51-a42c-4935-83d9-fc2b087e7170
767899	f8fea635-aee7-48ce-b317-e18a1650a6dc
769162	2cccba0f-7fd9-49e6-a80a-09a682b5208a
871010	2a235211-e977-496d-b588-983cd164c49f
1018051	98b2622f-2e93-424f-a3dd-6326a1b9df4a
773386	77ffa5bd-8a4e-418b-b538-60634d124aac
776650	1385bd86-e7e9-4e99-a602-ade9d306f58d
779667	0aa99105-b69f-40d0-ad9f-cb998c676392
781927	6c45f890-b39c-4d33-a4f2-bbfff3e623c0
785640	77084d8b-98aa-4143-8b2f-5eb7b0ab0b1b
771775	a74cef21-66f6-4a0d-bfa5-14428cd0d578
775533	9399cf93-e571-48d7-bba7-cbc09f5aef67
780413	3203dae0-0c43-4ea8-ab53-c11e092de008
793722	950a0498-4987-4fa4-9fe5-d64d97b2cd33
792641	094b1369-98e6-4660-abc6-33d53a516786
824639	54b9e356-aa54-4c0c-9130-25194a5f64df
838268	b58d6555-ac5b-430f-bf28-fecdb3f7baaa
811281	733963cc-8e45-4dca-a69c-1329bb7e5fca
808621	3be173b2-f300-404d-8587-57d00c45c048
820561	89f85d48-718f-4473-836c-e3bc9a57668c
828747	112df2d6-af8b-4c74-b47a-b2bdbbb76ec4
910824	5130106b-e7e1-4d45-85cc-5e8ae4ff8b4c
886601	ea89cdbc-4910-4a90-8936-a896dc9d36d1
867531	3dbf8ca2-213a-4208-9369-1904dcddb2f6
807605	ca59ace1-4da0-4be5-95d8-fde68ee4a91e
788847	69dd6dc3-bc27-412d-b4ad-8872fda068b5
913075	3ca58b12-23f6-414a-8e1e-999d81fc8852
1219350	8532eba0-b8d5-4ec3-9cb0-09d273cf1c04
1223941	98acfcd1-3e3b-4474-a758-b243ef12154e
823755	31496d1a-fa5f-4fa8-943d-cdd0bda95649
`;

let rt = require("./bundle.js");

rt.configObject.dangerModify = true;

async function main(){
    for(let [id, uuid] of data.split("\n").map(x => x.split("\t")).slice(1)) {
        let asset = await rt.Asset.getById("PROD", id);

        log(asset);

        await asset.patchMetadata({
            Metadata: {
                caseMetaData: {
                    caseUuid: uuid,
                }
            }
        });
    }
}

main();
