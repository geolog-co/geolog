/* eslint-env mocha */

const assert = require('assert');

const index = require('./index.js');

describe('index', () => { 
  describe('GET', () => {
    it('should pass JSON with statusCode of 200', (done) => {
      index.handler({resource: '/api/jobs/{id}', httpMethod: 'GET'}, null, (err, json) => {
        assert.equal(json.statusCode, 200);
        done();
      }); 
    });
  });
});
