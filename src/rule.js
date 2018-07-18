export default class Rule{
    constructor(data, remote){
        this.rawData = data;
        this.remote = remote;
    }
    chalkPrint(){
        let D = this.rawData;
        let id = String(this.remote + "-" + D.id).padStart(8);
        return chalk`{green ${id}}: {blue ${D.attributes.name}}`;
    }
}
