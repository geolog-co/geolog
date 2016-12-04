'use strict';

const React = require('react');

const FileButton = require('./file_button');
const FileList = require('./file_list')

const styles = require('./file_uploader.css');

class FileUploader extends React.Component {

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
      <div>
        <FileButton onFileSelect={this.handleFileSelect} />
        <FileList files={this.state.files} />
      </div>
    );
  }
}

module.exports = FileUploader
