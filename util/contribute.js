const {Asset} = require("../bundle.js");
const rp = require("request-promise");

async function contribute(id){
    let a = await Asset.getById("PROD", id);
    let files = await a.getFiles();

    let labels;

    labels = files.findByName("ClassifiedAmazonLabelsEvents_Txt");
    if(labels){
        write("Downloading....");
        let content = JSON.parse(await labels.getContent());
        write("Contributing amz label " + a.name + "...");
        let res = await rp({
            method: "POST",
            uri: `http://localhost:8080/addData`,
            body: content,
            qs: {
                movieId: a.id,
                provider: "amazon",
                type: "label",
                movieName: a.name,
                fileLabel: "ClassifiedAmazonLabelsEvents_Txt",
                fileCreatedDate: Date.now(),
            },
            resolveWithFullResponse: true,
            json: true,
        });

        log(res.body);
        labels = null;
    }

    labels = files.findByName("ClassifiedGoogleLabelsEvents_Txt");
    if(labels && false){
        write("Downloading....");
        let content = JSON.parse(await labels.getContent());
        log("Contributing google label " + a.name);
        let res = await rp({
            method: "POST",
            uri: `http://localhost:8080/addData`,
            body: content,
            qs: {
                movieId: a.id,
                provider: "google",
                type: "label",
                movieName: a.name,
                fileLabel: "ClassifiedGoogleLabelsEvents_Txt",
                fileCreatedDate: Date.now(),
            },
            resolveWithFullResponse: true,
            json: true,
        });

        log(res.body);
        labels = null;
    }
};


let ids = [163569, 163541, 163552, 150417, 163511, 163522, 163531, 163613, 163619, 163624, 163627, 163560, 142542, 163572, 163578, 163588, 183150, 176889, 148896, 141512, 149026, 163282, 150424, 150594, 150655, 544133, 163233, 163243, 149003, 464160, 149396, 163249, 150336, 152509, 163239, 163246, 173129, 163265, 163269, 163270, 163275, 163287, 163279, 150316, 147735, 186497, 503668, 263623, 149399, 150366, 183107, 147666, 148450, 176908, 150314, 150322, 150344, 183158, 150381, 150406, 147545, 150418, 150425, 150647, 150651, 151235, 150873, 263816, 147712, 150361, 50724, 278532, 150459, 100531, 550551, 146109, 263626, 263631, 100288, 150642, 150654, 183327, 263630, 263582, 226763, 147591, 150790, 369266, 529530, 150786, 563382, 147558, 395624, 270671, 263637, 314391, 150788, 252746, 150794, 150799, 150769, 150784, 150837, 263664, 163406, 163335, 163395, 163389, 163471, 163405, 163414, 149120, 150797, 148919, 387016, 163359, 163402, 163456, 150644, 163893, 150705, 163336, 369352, 550610, 163386, 163391, 163397, 163432, 163612, 163682, 163472, 163488, 150843, 302876, 263718, 592128, 150796, 150810, 150830, 150841, 263896, 177078, 456237, 150787, 150795, 177021, 149348, 150807, 149966, 263638, 337431, 150823, 176832, 233679, 163793, 213186, 173187, 176879, 176923, 250516, 243541, 163729, 226785, 176915, 176893, 176895, 176911, 176916, 163410, 523216, 176925, 176953, 176992, 176957, 176969, 150932, 593198, 475468, 263831, 302945, 263647, 270937, 60719, 163458, 163506, 100536, 151006, 243653, 163448, 163508, 163549, 163634, 163728, 163459, 163740, 163750, 530002, 163481, 163483, 314082,]
for(let id of ids.slice(0, 10)){
    contribute(id);
}

//contribute(462286);
