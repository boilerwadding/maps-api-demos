/* Lat,Lng to Pixel conversion uses Google Maps API sample code from
*  http://gmaps-samples-v3.googlecode.com/svn/trunk/latlng-to-coord-control/latlng-to-coord-control.html 
*/
function CoordinateHelper(map) {
  /**
  * Offset the control container from the mouse by this amount.
  */
  this.ANCHOR_OFFSET_ = new google.maps.Point(8, 8);

  /**
  * Pointer to the HTML container.
  */
  this.node_ = this.createHtmlNode_();

  // Add control to the map. Position is irrelevant.
  map.controls[google.maps.ControlPosition.TOP].push(this.node_);


  // Bind this OverlayView to the map so we can access MapCanvasProjection
  // to convert LatLng to Point coordinates.
  this.setMap(map);

  // Register an MVC property to indicate whether this custom control
  // is visible or hidden. Initially hide control until mouse is over map.
  this.set('visible', false);
}

// Extend OverlayView so we can access MapCanvasProjection.
CoordinateHelper.prototype = new google.maps.OverlayView();
CoordinateHelper.prototype.draw = function() {};

/**
* @private
* Helper function creates the HTML node which is the control container.
* @return {HTMLDivElement}
*/
CoordinateHelper.prototype.createHtmlNode_ = function() {
  var divNode = document.createElement('div');
  divNode.id = 'latlng-control';
  divNode.index = 100;
  return divNode;
};

/* take a lat,long and just return the pixel position in the current view */
CoordinateHelper.prototype.getPixelPosition = function(latLng) {
  var projection = this.getProjection();
  var point = projection.fromLatLngToContainerPixel(latLng);

  return point;
};
