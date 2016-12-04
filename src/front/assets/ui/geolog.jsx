'use strict';

const React = require('react');

const FileButton = require('./file_button');
const FileList = require('./file_list')
const Map = require('./map');

class GeoLog extends React.Component {

  constructor(props) {
    super(props);
    this.handleFileSelect = this.handleFileSelect.bind(this);
    this.state = {
      files: []
    }
  }

  handleFileSelect(file) {
    this.setState(prevState => {
      this.props.api.upload(file);
      return {
        files: prevState.files.concat([file])
      }
    });
  }

  render() {
    return (
      <div className="geolog">
        {this.props.mapsLoaded && <Map mapsLoaded={this.props.mapsLoaded} />}
        <div className="overlay">
          <h1>GeoLog</h1>
          <FileButton onFileSelect={this.handleFileSelect} />
          <FileList files={this.state.files} />
        </div>
      </div>
    );
  }
}

module.exports = GeoLog
