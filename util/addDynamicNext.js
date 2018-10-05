let read = require("get-stdin");
async function main(){
    let j = JSON.parse(await read());
    let rels = j.relationships;

    let cookieCutter = {
        meta: {transition: "step key"},
        type: "workflowRules",
        name: "Rule Name",
    }

    if(!rels.dynamicNexts) rels.dynamicNexts = {data: []};

    rels.dynamicNexts.data.push(cookieCutter);

    console.log(JSON.stringify(j, null, 4));
}

main()
