import {cached, defineAssoc} from "./decorators.js";
import {lib, Collection, RallyBase} from "./rally-tools.js";

export async function findLineInFile(renderedPreset, lineNumber){
    let trueFileLine = lineNumber;

    let linedRenderedPreset = renderedPreset.split("\n").slice(2,-2);
    renderedPreset = renderedPreset.split("\n").slice(2,-2).join("\n");
    let includeLocation = renderedPreset.split("\n").filter(x => x.includes("@include"));

    let endIncludeNumber = -1, addTabDepth = 2;
    let lineBeforeIncludeStatement = '';
    let withinInclude = true;

    if (lineNumber > linedRenderedPreset.indexOf(includeLocation[includeLocation.length -1])){
        addTabDepth = 0;
        withinInclude = false;
    }

    for (let index = includeLocation.length - 1; index >= 0; index--){
        let currIncludeIndex = linedRenderedPreset.indexOf(includeLocation[index]);
        let tabDepth = includeLocation[index].split("  ").length;
        if (lineNumber > currIncludeIndex) {
            if (includeLocation[index].split(" ").filter(Boolean)[1] != "ERROR:"){
                if (lineBeforeIncludeStatement.split("  ").length == tabDepth && withinInclude){
                    trueFileLine = trueFileLine - currIncludeIndex;
                    break;
                } else if ((lineBeforeIncludeStatement.split("  ").length + addTabDepth) == tabDepth && endIncludeNumber == -1){
                    endIncludeNumber = currIncludeIndex;
                } else if ((lineBeforeIncludeStatement.split("  ").length + addTabDepth) == tabDepth){
                    trueFileLine = trueFileLine - (endIncludeNumber - currIncludeIndex);
                    endIncludeNumber = -1;
                }
            }
        } else {
            lineBeforeIncludeStatement = includeLocation[index];
        }
    }

    let funcLine = ""
    for(let line of linedRenderedPreset.slice(0, lineNumber).reverse()){
        let match = /def (\w+)/.exec(line);
        if(match){
            funcLine = match[1];
            break;
        }
    }

    let includeFilename;

    if(lineBeforeIncludeStatement != ""){
        includeFilename = lineBeforeIncludeStatement.slice(1).trim().slice(14, -1)
    }else{
        includeFilename = null;
    }

    if(includeLocation.length !== 0){
        trueFileLine -= 1;
        lineNumber -= 1;
    }

    return {
        lineNumber: trueFileLine,
        includeFilename,
        line: linedRenderedPreset[lineNumber],
        funcLine,
    };

}

export function printOutLine(eLine){
    return log(chalk`{blue ${eLine.includeFilename || "Main"}}:{green ${eLine.lineNumber}} in ${eLine.funcLine}
${eLine.line}`)
}

export async function getInfo(env, jobid){
    log(env, jobid);
    let trace = lib.makeAPIRequest({
        env, path: `/jobs/${jobid}/artifacts/trace`,
    }).catch(x => null);

    let renderedPreset = lib.makeAPIRequest({
        env, path: `/jobs/${jobid}/artifacts/preset`,
    }).catch(x => null);

    let result = lib.makeAPIRequest({
        env, path: `/jobs/${jobid}/artifacts/result`,
    }).catch(x => null);

    let error = lib.makeAPIRequest({
        env, path: `/jobs/${jobid}/artifacts/error`,
    }).catch(x => null);

    let output = lib.makeAPIRequest({
        env, path: `/jobs/${jobid}/artifacts/output`,
    }).catch(x => null);

    [trace, renderedPreset, result, output, error] = await Promise.all([trace, renderedPreset, result, output, error]);

    return {trace, renderedPreset, result, output, error}
}

export async function parseTrace(env, jobid){

    let {trace, renderedPreset} = await getInfo(env, jobid);

    let fileName = '';
    let lineNumber = -1;

    let errorLines = []
    let shouldBreak = 0;
    for(let tr of trace.split("\n\n").reverse()){
        errorLines.push(tr);
        shouldBreak--;
        if(tr.includes("Exception")) shouldBreak = 1;
        if(tr.includes("raised")) shouldBreak = 1;
        if(!shouldBreak) break;
    }

    let errorList = [];
    for(let errLine of errorLines){

        lineNumber = /^[\w ]+:(\d+):/g.exec(errLine);
        if(lineNumber && lineNumber[1]){
            errorList.push(await findLineInFile(renderedPreset, lineNumber[1]));
        }else{
            errorList.push(errLine);
        }
    }

    return errorList;
}

const Trace = {parseTrace, printOutLine, getInfo, findLineInFile};
export default Trace;
