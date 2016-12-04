'use strict';

const React = require('react');

const Map = require('./map');

class GeoLog extends React.Component {
  render() {
    return this.props.mapsLoaded ? <Map api={this.props.api} /> : null;
  }
}

module.exports = GeoLog
