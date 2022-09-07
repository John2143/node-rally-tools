/* Example:
* let AWS = require("aws-sdk");
* let credentials = new AWS.SharedIniFileCredentials({profile: "taskhandler"});
* AWS.config.credentials = credentials;
* 
* let sq = new AWS.SQS({
*     region: "us-east-1",
* });
* 
* for await (let m of getMessage(sq, "https://sqs.us-east-1.amazonaws.com/12345/your-queue-here")){
*     let o = JSON.parse(m.Body);
*     ...
* }
*
*/

async function getMessageList(sq, QueueUrl){
    return await new Promise((resolve, reject) => {
        sq.receiveMessage({
            QueueUrl,
            MaxNumberOfMessages: 10,
        }, function(err, data) {
            if(err) return reject(err);
            let messages = data.Messages || [];

            if(messages.length > 0){
                sq.deleteMessageBatch({
                    QueueUrl,
                    Entries: messages.map(x => ({
                        Id: x.MessageId,
                        ReceiptHandle: x.ReceiptHandle,
                    })),
                }, function(delerr, _) {
                    if(delerr){
                        return reject(delerr);
                    }

                    return resolve(messages);
                });
            }else{
                return resolve(messages);
            }
        });
    });
}


let sleep = (time = 1000) => new Promise((resolve, _) => {setTimeout(resolve, time)});

export async function* getSQSMessages(sqsClient, queueUrl, {messageBuffer = 100} = {}){
    let currMessages = [];
    let gml = getMessageList.bind(null, sqsClient, queueUrl);

    for(;;){
        if(currMessages.length === 0){
            let messagePromises = [];
            for(let i = 0; i < messageBuffer / 10; i++) {
                messagePromises.push(gml());
            }
            //get 100 messages at a time
            let currMessagesList = await Promise.all(messagePromises)

            for(let curMsgs of currMessagesList){
                currMessages = currMessages.concat(curMsgs);
            }

            currMessages = currMessages.reverse();
        }

        if(currMessages.length === 0){
            yield ["info", "No messages since last read"];
            await sleep(2000);
            continue;
        }

        yield ["message", currMessages.pop()];
    }
}


export async function getNumMessages(sqsClient, QueueUrl) {
    return await new Promise((resolve, reject) => {
        sqsClient.getQueueAttributes({ 
            QueueUrl,
            AttributeNames: ["ApproximateNumberOfMessages", "ApproximateNumberOfMessagesDelayed"],
        }, (err, data) => {
            if(err) {
                return reject(err);
            }

            return resolve(data.Attributes);
        });
    });
}
