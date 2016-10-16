'use strict';

exports.handler = (event, context, callback) => {

  const done = (err, res) => callback(null, {
    statusCode: err ? '400' : '200',
    body: err ? err.message : JSON.stringify(res),
    headers: {
        'Content-Type': 'application/json',
    },
  });

  switch (event.httpMethod) {
    case 'DELETE':
      done(null, 'done4!');
      break;  
    case 'GET':
      done(null, 'done4!');
      break;
    case 'POST':
      done(null, 'done4!');
      break;
    case 'PUT':
      done(null, 'done4!');
      break;
    default:
      done(new Error(`Unsupported method "${event.httpMethod}"`));
  }
};
