const React = require('react');

const FileButton = require('./file_button');
const FileList = require('./file_list')

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
      <div>
        <h1>GeoLog</h1>
        <FileButton onFileSelect={this.handleFileSelect} />
        <FileList files={this.state.files} />
      </div>
    );
  }
}

module.exports = GeoLog
