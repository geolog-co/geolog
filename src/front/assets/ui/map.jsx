'use strict';

const React = require('react');
const ReactDOM = require('react-dom');

const styles = require('./map.css');

class Map extends React.Component {

  initMap(mapDomElement) {
    const map = new google.maps.Map(mapDomElement, {
      zoom: 10,
      center: {lat: 38.4939616798033, lng: 20.655142999999953},
      zoomControl: true,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: true,
      styles: [{"featureType":"administrative","elementType":"all","stylers":[{"visibility":"on"},{"saturation":-100},{"lightness":20}]},{"featureType":"road","elementType":"all","stylers":[{"visibility":"on"},{"saturation":-100},{"lightness":40}]},{"featureType":"water","elementType":"all","stylers":[{"visibility":"on"},{"saturation":-10},{"lightness":30}]},{"featureType":"landscape.man_made","elementType":"all","stylers":[{"visibility":"simplified"},{"saturation":-60},{"lightness":10}]},{"featureType":"landscape.natural","elementType":"all","stylers":[{"visibility":"simplified"},{"saturation":-60},{"lightness":60}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"},{"saturation":-100},{"lightness":60}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"},{"saturation":-100},{"lightness":60}]}]
    });

    const element = document.createElement('div');
    const AddTrackButton = require('./add_track_button');
    ReactDOM.render(<AddTrackButton api={this.props.api} />, element);
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(element);

    // Google Maps fetches the kml from their servers,
    // so it must be on a publically accessible URL
    // Also for some reason couldn't get http://greece2016.charemza.name/ working
    const host = 'http://s3-eu-west-1.amazonaws.com/greece2016.charemza.name/'

    const layer1 = new google.maps.KmlLayer({
      url: host + 'track-1.kmz?v4',
      preserveViewport: true,
      map: map
    });
    const layer2 = new google.maps.KmlLayer({
      url: host + 'track-2.kmz?v4',
      preserveViewport: true,
      map: map
    });
    const layer3 = new google.maps.KmlLayer({
      url: host + 'track-3.kmz?v4',
      preserveViewport: true,
      map: map
    });
  }

  render() {
    return (
      <div className={styles.map} ref={(mapDomElement) => { this.initMap(mapDomElement) }} />
    );
  }
}

module.exports = Map
