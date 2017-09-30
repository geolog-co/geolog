'use strict';

const AWS = require('aws-sdk');
const Api = require('./api/api')

const config = require('./config');
const api = new Api(
  AWS,
  config,
);

// For testing
api.getJob()

document.addEventListener('DOMContentLoaded', () => {
  const ReactDOM = require('react-dom');
  const React = require('react');
  const GeoLog = require('./ui/geolog');

  const rootDomElement = document.getElementById('app-root');
  const render = (mapsLoaded) => {
    ReactDOM.render(<GeoLog api={api} mapsLoaded={mapsLoaded} />, rootDomElement);
  }

  render(false);
  window[config.onMapsLoaded] = () => {
    render(true);
  };
});
