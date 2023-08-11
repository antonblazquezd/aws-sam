const { DocumentClient } = require('aws-sdk/clients/dynamodb');

const { v4: uuidv4 } = require('uuid');

const AssetTableName = "Asset";

const docClient = true ? new DocumentClient({
    endpoint: "http://host.docker.internal:8000"
}) : new DocumentClient()

const response = (statusCode, body, additionalHeaders) => ({
    statusCode,
    body: JSON.stringify(body),
    headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        ...additionalHeaders,
    },
});


//---------------
//     GET by ID
// ---------------

exports.getAssetById = async (event, context) => {
    if (!isValidRequest(event)) {
        return response(400, { message: "Error: Invalid request" });
    }
    try {
        const asset = await getAsset(event.pathParameters.assetId).promise();
        return response(200, { data: asset.Item });
    } catch (error) {
        return response(500, JSON.stringify(error));
    }
}


//---------------
//     GET
// ---------------

exports.getAssets = async (event, context) => {
    try {
        const assets = await docClient.scan({ TableName: AssetTableName }).promise();
        return response(200, { data: assets.Items });

    } catch (error) {
        return response(500, { message: "Internal server error" });
    }
}


//---------------
//     POST
// ---------------

exports.postAsset = async (event, context) => {

    const uuid = uuidv4();
    const body = JSON.parse(event.body)

    const params = {
        TableName: AssetTableName,
        Item: {
            id: uuid,
            symbol: body.symbol,
            blockchain: body.blockchain,
        },
    };

    await docClient.put(params).promise();

    return response(201, { id: uuid });
}

function isValidRequest(event) {
    return (
        event !== null &&
        event.pathParameters !== null &&
        event.pathParameters.symbol !== null &&
        event.pathParameters.blockchain !== null
    );
}


function getAsset(assetId) {
    let params = {
        TableName: AssetTableName,
        Key: {
            id: assetId,
        },
        AttributesToGet: ["id", "symbol", "blockchain"],
    };

    return docClient.get(params);
}