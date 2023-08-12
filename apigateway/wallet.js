const { DocumentClient } = require('aws-sdk/clients/dynamodb');

const { v4: uuidv4 } = require('uuid');

const INVALID_WALLET_ID = "Wallet ID is invalid";
const INVALID_USER_ID = "User ID is invalid";
const INVALID_ASSET_ID = "Asset ID is invalid";
const WalletTableName = "Wallet";
const UserTableName = "User";
const AssetTableName = "Asset";

const docClient = true ? new DocumentClient({
    endpoint: "http://host.docker.internal:8000"
}) : new DocumentClient();

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

exports.getWalletById = async (event, context) => {
    if (!isValidRequest(event)) {
        return response(400, { message: "Error: Invalid request" });
    }
    try {
        const user = await getUser(event.pathParameters.userId).promise();
        if (!user.Item) {
            return response(400, { message: `Error: ${INVALID_USER_ID}` });
        }
        const wallet = await getWallet(event.pathParameters.walletId).promise();
        return response(200, { data: wallet.Item })
    } catch (error) {
        return response(500, JSON.stringify(error));
    }
}


//---------------
//     GET 
// ---------------

exports.getWallets = async (event, context) => {
    if (!isValidRequest(event)) {
        return response(400, { message: "Error: Invalid request" });
    }
    try {
        const user = await getUser(event.pathParameters.userId).promise();
        if (!user.Item) {
            return response(400, { message: `Error: ${INVALID_USER_ID}` });
        }
        const wallets = await docClient.scan({ TableName: WalletTableName }).promise();
        return response(200, { data: wallets.Items });
    } catch (error) {
        return response(500, JSON.stringify(error));
    }
}


//---------------
//     POST
// ---------------

exports.postWallet = async (event, context) => {
    if (!isValidRequest(event)) {
        return response(400, { message: "Error: Invalid request" });
    }
    if (!isValidBody(event)) {
        return response(400, { message: "Error: Invalid body fields" });
    }
    const bodyParsed = JSON.parse(event.body)

    const user = await getUser(event.pathParameters.userId).promise();
    if (!user.Item) {
        return response(400, { message: `Error: ${INVALID_USER_ID}` });
    }
    const asset = await getAsset(bodyParsed.assetId).promise();
    if (!asset.Item) {
        return response(400, { message: `Error: ${INVALID_ASSET_ID}` });
    }
    
    const uuid = uuidv4();

    const params = {
        TableName: WalletTableName,
        Item: {
            id: uuid,
            address: bodyParsed.address,
            balance: bodyParsed.balance,
            assetId: bodyParsed.assetId,
            userId: user.Item.id,
        },
    };

    await docClient.put(params).promise();

    return response(201, { id: uuid });
}

function isValidRequest(event) {
    return (
        event !== null &&
        event.pathParameters !== null &&
        event.pathParameters.userId !== null
    );
}

function isValidBody(event) {
    const body = JSON.parse(event.body);
    return (
        body &&
        body.address &&
        body.balance &&
        body.assetId
    );
}


function getUser(userId) {
    let params = {
        TableName: UserTableName,
        Key: {
            id: userId,
        },
        AttributesToGet: ["id", "idNumber", "firstName", "lastName", "email", "phone"]
    };

    return docClient.get(params);
}

function getWallet(walletId) {
    let params = {
        TableName: WalletTableName,
        Key: {
            id: walletId,
        },
        AttributesToGet: ["id", "address", "balance", "assetId"]
    };

    return docClient.get(params);
}

function getAsset(assetId) {
    let params = {
        TableName: AssetTableName,
        Key: {
            id: assetId,
        },
        AttributesToGet: ["id", "symbol", "blockchain"]
    };

    return docClient.get(params);
}
