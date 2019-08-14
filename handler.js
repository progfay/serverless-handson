const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk'); // eslint-disable-line import/no-extraneous-dependencies

// Set in `environment` of serverless.yml
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_PUBLIC_KEY = process.env.AUTH0_CLIENT_PUBLIC_KEY;

const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Policy helper function
const generatePolicy = (principalId, effect, resource) => {
  const authResponse = {};
  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = [];
    const statementOne = {};
    statementOne.Action = 'execute-api:Invoke';
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }
  return authResponse;
};

// Reusable Authorizer function, set on `authorizer` field in serverless.yml
module.exports.auth = (event, context, callback) => {
  console.log('event', event);
  if (!event.authorizationToken) {
    return callback('Unauthorized');
  }

  const tokenParts = event.authorizationToken.split(' ');
  const tokenValue = tokenParts[1];

  if (!(tokenParts[0].toLowerCase() === 'bearer' && tokenValue)) {
    // no auth token!
    return callback('Unauthorized');
  }
  const options = {
    audience: AUTH0_CLIENT_ID,
  };

  try {
    jwt.verify(tokenValue, AUTH0_CLIENT_PUBLIC_KEY, options, (verifyError, decoded) => {
      if (verifyError) {
        console.log('verifyError', verifyError);
        // 401 Unauthorized
        console.log(`Token invalid. ${verifyError}`);
        return callback('Unauthorized');
      }
      // is custom authorizer function
      console.log('valid from customAuthorizer', decoded);
      return callback(null, generatePolicy(decoded.email, 'Allow', event.methodArn));
    });
  } catch (err) {
    console.log('catch error. Invalid token', err);
    return callback('Unauthorized');
  }
};

module.exports.post = (event, context, callback) => {
  console.log('event: %j', event);
  console.log('context: %j', context);

  const email = event.requestContext.authorizer.principalId;

  const now = Date.now();
  const data = JSON.parse(event.body);
  if (!data || typeof data.text !== 'string') {
    console.error('Validation Failed');
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Couldn\'t create the todo item.',
    });
    return;
  }

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      id: email,
      timestamp: now,
      text: data.text,
    },
  };

  // write the todo to the database
  dynamoDb.put(params, (error) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
      statusCode: error.statusCode || 501,
      headers: {
        'Access-Control-Allow-Origin': event.headers.origin,
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'text/plain',
      },
      body: 'Couldn\'t create the todo item.',
      });
      return;
    }

    // create a response
    const response = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': event.headers.origin,
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(params.Item),
    };
    callback(null, response);
  });
};

module.exports.timeline = (event, context, callback) => {
  console.log('event: %j', event);
  console.log('context: %j', context);

  // 自分
  // const email = event.requestContext.authorizer.principalId;

  //const email = (event && event.queryStringParameters && event.queryStringParameters.id) ? event.queryStringParameters.id : undefined;
  const data = JSON.parse(event.body);
  const email = data.id;
  if (email === undefined) {
    callback(null, {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': event.headers.origin,
        'Access-Control-Allow-Credentials': true,
        'Content-Type': 'text/plain',
      },
      body: 'input email.',
    });
    return;
  }

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    KeyConditionExpression: "#id = :id",
    ExpressionAttributeNames: {
      "#id": "id",
    },
    ExpressionAttributeValues: {
      ":id": email,
    },
    ScanIndexForward: false,
  };

  dynamoDb.query(params, (error, data) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'text/plain',
        },
        body: 'Couldn\'t fetch posts.',
      });
      return;
    }

    // create a response
    console.log('data: %j', data.Items);
    const response = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': event.headers.origin,
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({msgs: data.Items}),
    };
    callback(null, response);
  });
};
