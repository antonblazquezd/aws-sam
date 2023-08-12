const { DocumentClient } = require('aws-sdk/clients/dynamodb');

const { v4: uuidv4 } = require('uuid');

const UserTableName = "User";

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

exports.getUserById = async (event, context) => {
    if (!isValidRequest(event)) {
        return response(400, { message: "Error: Invalid request" });
    }
    try {
        const user = await getUser(event.pathParameters.userId).promise();
        return response(200, { data: user.Item });
    } catch (error) {
        return response(500, JSON.stringify(error));
    }
}


//---------------
//     GET
// ---------------

exports.getUsers = async (event, context) => {
    try {
        const users = await docClient.scan({ TableName: UserTableName }).promise();
        return response(200, { data: users.Items });

    } catch (error) {
        return response(500, { message: "Internal server error" });
    }
}


//---------------
//     POST
// ---------------

exports.postUser = async (event, context) => {

    if (!isValidBody(event)) {
        return response(400, { message: "Error: Invalid body fields" });
    }

    const uuid = uuidv4();
    const bodyParsed = JSON.parse(event.body);
    const params = {
        TableName: UserTableName,
        Item: {
            id: uuid,
            idNumber: bodyParsed.idNumber,
            firstName: bodyParsed.firstName,
            lastName: bodyParsed.lastName,
            email: bodyParsed.email,
            phone: bodyParsed.phone,
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
        body.idNumber &&
        body.firstName &&
        body.lastName &&
        body.email &&
        body.phone
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