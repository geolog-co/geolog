'use strict';

const React = require('react');

class FileButton extends React.Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }   

  handleChange(e) {
    this.props.onFileSelect(this.input.files[0]);
  }

  render() {
    return (
      <div>
        <input
          onChange={this.handleChange}
          type="file"
          ref={(input) => { this.input = input; }}
        />
      </div>
    );
  }
}

module.exports = FileButton
