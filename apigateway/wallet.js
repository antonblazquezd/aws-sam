const { DocumentClient } = require('aws-sdk/clients/dynamodb');

const { v4: uuidv4 } = require('uuid');

const INVALID_WALLET_ID = "Wallet ID is invalid";
const INVALID_USER_ID = "User ID is invalid";
const WalletTableName = "Wallet";
const UserTableName = "User";

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
        if (!user) {
            return response(400, { message: `Error: ${INVALID_WALLET_ID}` });
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
    console.log(event.pathParameters.userId)
    if (!isValidRequest(event)) {
        return response(400, { message: "Error: Invalid request" });
    }
    const user = await getUser(event.pathParameters.userId).promise();
    if (!user.Item) {
        return response(400, { message: `Error: ${INVALID_USER_ID}` });
    }

    const uuid = uuidv4();
    const body = JSON.parse(event.body)

    const params = {
        TableName: WalletTableName,
        // For more information about data types,
        // see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes and
        // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.LowLevelAPI.html#Programming.LowLevelAPI.DataTypeDescriptors
        Item: {
            id: uuid,
            address: body.address,
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


function getUser(userId) {
    let params = {
        TableName: UserTableName,
        Key: {
            id: userId,
        },
        AttributesToGet: ["id", "name", "dni"]
    };

    return docClient.get(params);
}

function getWallet(walletId) {
    let params = {
        TableName: WalletTableName,
        Key: {
            id: walletId,
        },
        AttributesToGet: ["id", "address", "balance", "userId", "assetId"]
    };

    return docClient.get(params);
}
