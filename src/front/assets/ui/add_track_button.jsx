'use strict';

const React = require('react');
const Portal = require('react-portal');

const FileUploader = require('./file_uploader');
const Modal = require('./modal');

const styles = require('./add_track_button.css')

class AddTrackButton extends React.Component {
  render() {
    const button = (
      <div className={styles.button} role="button">
        Add track
      </div>
    );

    return (
      <div>
        <Portal closeOnEsc closeOnOutsideClick openByClickOn={button}>
          <Modal>
            <FileUploader api={this.props.api} />
          </Modal>
        </Portal>
      </div>
    );
  }
}

module.exports = AddTrackButton
