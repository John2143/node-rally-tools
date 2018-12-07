
new(){
rally asset \
    create --name "USKN-Rally_#" \
    addfile --file-label "SdviMovieFileMaster" \
            --file-uri "s3://discovery.com.uat.onramp.archive.us-east-1/DKNOXR_Master2.mxf" \
    launch --job-name "AS302 Test DKNOX Recontribution" \
           --init-data @recontribution_init.json 
}

elemn(){
    echo $1
rally asset --name $1 \
    addfile --file-label "SdviElementMaster" \
            --file-uri "s3://discovery.com.uat.onramp.archive.us-east-1/DKNOXR_Master2Ele.scc" \
    launch --job-name "AS302 Test DKNOX Recontribution Element" \
           --init-data @recontribution_init_element.json
}

elem(){
    echo $1
rally asset --id $1 \
    addfile --file-label "SdviElementMaster" \
            --file-uri "s3://discovery.com.uat.onramp.archive.us-east-1/DKNOXR_Master2Ele.scc" \
    launch --job-name "AS302 Test DKNOX Recontribution Element" \
           --init-data @recontribution_init_element.json
}

case "$1" in
    new) new;;
    elem) elem $2;;
    elemn) elemn $2;;
    *) echo "usage: new, elem [id]";;
esac
