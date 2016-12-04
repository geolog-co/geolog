'use strict';

const React = require('react');
const styles = require('./modal.css')

class Modal extends React.Component {
  render() {
    return (
      <div className={styles.overlay}>
        <div className={styles.wrapper}>
          <div className={styles.modal}>
            <div className={styles.header}>
              <button onClick={this.props.closePortal}>X</button>
            </div>
            <div className={styles.body}>
              {this.props.children}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

module.exports = Modal
