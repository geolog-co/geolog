'use strict';

const React = require('react');

class FileList extends React.Component {
  render() {
    const listItems = this.props.files.map((file, i) =>
      <li key={i}>{ file.name }</li>
    );
    return (
      <ul>
        { listItems }
      </ul>
    );
  }
}

module.exports = FileList
