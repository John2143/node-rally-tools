let read = require("get-stdin");
async function main(){
    let j = JSON.parse(await read());
    let settings = j.attributes.providerSettings;

    Object.assign(settings, {
        "enableMio": "{{ DYNAMIC_PRESET_DATA[\"enableMio\"] | default(false) }}",
        "inputSpec": "{{ DYNAMIC_PRESET_DATA[\"inputSpec\"] | default(null) }}",
        "outputSpec": "{{ DYNAMIC_PRESET_DATA[\"outputSpec\"] | default(null) }}"
    })

    console.log(JSON.stringify(j, null, 4));
}

main()
