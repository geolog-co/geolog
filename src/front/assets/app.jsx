'use strict';

const AWS = require('aws-sdk');
const Api = require('./api/api')
const apigClientFactory = require('./api/apigClientFactory');

const config = require('./config');
const api = new Api(
  AWS,
  apigClientFactory,
  config,
);

// For testing
api.getJob()

const ReactDOM = require('react-dom');
const GeoLog = require('./ui/geolog');
document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render((
      <GeoLog api={api} />
    ),
    document.getElementById('geolog')
  );
});
