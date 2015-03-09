/* functions to load and parse Met Office Data from the Datapoint API
*  4 types of data as PNG tiles: rainfall, lightning, satellite (Infra Red) & satellite (visible).
*  handle each as an OverlayMapType in the Google Maps API
*/

//Some globals

//used to stop animation of layers once started
var animate = false;

//reference the currently visible overlay
var currentLayer = 0;

//global to allow me to inspect the MetOffice data object :-/
var moData = "";

//store timestamps for each set of tiles
var timestamps = [];
var activeTimestamps = [];

//array of OverlayMapType definition objects
var overlayMaps = [];

//which overlays refer to which data type? mapLayers["Rainfall"]=[0,1,2,3,4,5]; etc
var mapLayers = [];

//change depending on what the overlay is.
var layerOpacity = 0.8;

//global to store reference to timeout.
var cycleTimeout = null;

var map;

window.datapointCallback = function(data){
  moData = data;
  console.log("Callback triggered.");
  parseMoData();
};

function init(){

  initMap();
  getData();

  addListener("addLightning", animateLightning);
  addListener("addRainfall", animateRainfall);
  addListener("addSatelliteIR", animateIR);
  addListener("addSatelliteVis", animateSat);
  addListener("stopRainfall", stopAnimation);
  addListener("clearMap", clearLayers);


}

function initMap(){
  var myLatlng = new google.maps.LatLng(55.5,-1.582667);
  var myOptions = {
    zoom: 6,
    center: myLatlng,
    mapTypeId: google.maps.MapTypeId.TERRAIN
  };
  map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
}

function getData(){
  var scriptElement = document.createElement("script");
  scriptElement.setAttribute("type", "text/javascript");
  scriptElement.setAttribute("src", "https://boilerwadding.appspot.com/?callback=datapointCallback");
  scriptElement.async=true;
  document.head.appendChild(scriptElement);
}

function loadMoData(response){
  //$("#message").html('Met Office data loaded.');
  console.log("Met Office data loaded.");
  moData = response;
  parseMoData();
}

function parseMoData(){
  var olIndex = 0;
  var baseUrl = moData.Layers.BaseUrl.$;
  console.log(baseUrl);
  var layers = moData.Layers.Layer.length;
  console.log("Found " + layers + " layers.");
  for(var l = 0;l< layers;l++){
    var layer = moData.Layers.Layer[l];
    var displayName = layer["@displayName"]; //.toUpperCase();
    var service = layer.Service;
    var times = service.Times.Time;
    var opts = null;

    for(var t = 0;t<times.length;t++){
      opts = getMoMapOptions(service["@name"], service.LayerName, times[t], layer["@displayName"] + "_" + t);
      overlayMaps[olIndex] = opts;
      timestamps[olIndex] = times[t];

      //store lookup between layer type and overlay indices
      //each layer type has multiple timestamped versions
      if(mapLayers[displayName]==null){
        mapLayers[displayName] = [olIndex];
      } else {
        mapLayers[displayName].push(olIndex);
      }
      //this causes 44 layers to each request tiles for the current map extent.
      //TO DO - refactor to store ImageMapType objects until needed.
      //map.overlayMapTypes.insertAt(olIndex, new google.maps.ImageMapType(opts));
      olIndex++;
    }

  }
}

function moDataError(){
  console.log("Failed to load Met Office data.")
}

function animateRainfall(){
  setStyle("justplaces");
  animateOverlays(mapLayers.Rainfall);
}

function animateOverlays(indices){
  clearLayers();
  activeTimestamps = [];
  for(var i=0;i<indices.length;i++){
    var ol = overlayMaps[indices[i]];
    var ts = timestamps[indices[i]];
    var olIndex = map.overlayMapTypes.push(new google.maps.ImageMapType(ol));
    console.log("added new overlay map type at index " + olIndex);
    map.overlayMapTypes.getAt(olIndex-1).setOpacity(0);
  }
  clearTimeout(cycleTimeout);
  currentLayer = 0;
  startAnimation();
}

function cycleOverlays(){
  console.log("cycleOverlays");
  if(animate){
    map.overlayMapTypes.forEach(function(el, index){
      el.setOpacity(0);
    });
    var olm = map.overlayMapTypes.getAt(currentLayer);
    if(olm){
      olm.setOpacity(layerOpacity);

    }
    currentLayer++;
    if(currentLayer==map.overlayMapTypes.getLength()){
      currentLayer = 0;
    }
    cycleTimeout = setTimeout(cycleOverlays, 1000);
  }
}

function animateLightning(){
  setStyle("justplaces");
  animateOverlays(mapLayers.Lightning);
}



function animateIR(){
  if(map.getZoom()>7){
    map.setZoom(7);
  }
  setStyle("justplaces");
  animateOverlays(mapLayers.SatelliteIR);
}

function animateSat(){
  if(map.getZoom()>7){
    map.setZoom(7);
  }
  setStyle("justplaces");
  animateOverlays(mapLayers.SatelliteVis);
}

function stopAnimation(){
  animate=false;
  var btn = document.getElementById("stopRainfall");
  btn.value = "Start";
  btn.removeEventListener('click', stopAnimation);
  addListener("stopRainfall", startAnimation);
}

function startAnimation(){
  animate=true;
  if(map.overlayMapTypes.getLength()>0){
    cycleOverlays();
  }
  var btn = document.getElementById("stopRainfall");
  btn.value = "Stop";
  btn.removeEventListener('click', startAnimation);
  addListener("stopRainfall", stopAnimation);
}

function getMoMapOptions(service, layer, timestamp, name){
  var options = {
            getTileUrl: function(coord, zoom) {
                return "http://www.metoffice.gov.uk/public/data/LayerCache/" + service + "/ItemBbox/" + layer + "/" + coord.x +"/" + coord.y +"/" + zoom + "/png?TIME=" + timestamp + "Z"; //&styles=Bitmap+1km+Blue-Pale+blue+gradient+0.01+to+32mm%2Fhr";

            },
            tileSize: new google.maps.Size(256, 256),
            maxZoom: 9,
            minZoom: 0,
            name: name,
            opacity:0
          };
  return options;
}

function clearLayers(){
  map.overlayMapTypes.clear();
}

function setTimestamp(index){
  var timestamp = times[index];
  var timeText = "";
  if(timestamp!=null){
    var tempTime = timestamp.split("T");
    timeText = "Date: " + tempTime[0] + ", time: " + tempTime[1];
  }
  document.getElementById("timestamp").innerHTML = timeText;
}


function setStyle(styleName){
  var styleToUse = null;
  switch(styleName){
    case "lightgrey":
      styleToUse = lightGreyStyle;
      break;
    case "ultralight":
      styleToUse = ultraLight;
      break;
    case "justplaces":
      styleToUse = justPlaces;
  }
  map.setOptions({ styles: styleToUse });
}

function addListener(elementId, func){
  //IE9+
  document.getElementById(elementId).addEventListener('click', func);
}


google.maps.event.addDomListener(window, 'load', init);

//http://snazzymaps.com/style/106/dark-grey-on-light-grey
var lightGreyStyle = [{"featureType":"administrative","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"administrative.country","elementType":"geometry.stroke","stylers":[{"color":"#DCE7EB"}]},{"featureType":"administrative.province","elementType":"geometry.stroke","stylers":[{"color":"#DCE7EB"}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"visibility":"off"}]},{"featureType":"landscape.natural","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"transit","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"transit.line","elementType":"geometry","stylers":[{"visibility":"off"}]},{"featureType":"transit.line","elementType":"labels.text","stylers":[{"visibility":"off"}]},{"featureType":"transit.station.airport","elementType":"geometry","stylers":[{"visibility":"off"}]},{"featureType":"transit.station.airport","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#83888B"}]},{"featureType":"water","elementType":"labels","stylers":[{"visibility":"off"}]}];

//http://snazzymaps.com/style/151/ultra-light-with-labels
var ultraLight = [{"featureType":"water","elementType":"geometry","stylers":[{"color":"#e9e9e9"},{"lightness":17}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#f5f5f5"},{"lightness":20}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#ffffff"},{"lightness":17}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#ffffff"},{"lightness":29},{"weight":0.2}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#ffffff"},{"lightness":18}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#ffffff"},{"lightness":16}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#f5f5f5"},{"lightness":21}]},{"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#dedede"},{"lightness":21}]},{"elementType":"labels.text.stroke","stylers":[{"visibility":"on"},{"color":"#ffffff"},{"lightness":16}]},{"elementType":"labels.text.fill","stylers":[{"saturation":36},{"color":"#333333"},{"lightness":40}]},{"elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"transit","elementType":"geometry","stylers":[{"color":"#f2f2f2"},{"lightness":19}]},{"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#fefefe"},{"lightness":20}]},{"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#fefefe"},{"lightness":17},{"weight":1.2}]}];

//http://snazzymaps.com/style/65/just-places
var justPlaces = [{"featureType":"road","elementType":"geometry","stylers":[{"visibility":"off"}]},{"featureType":"poi","elementType":"geometry","stylers":[{"visibility":"off"}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#fffffa"}]},{"featureType":"water","stylers":[{"lightness":50}]},{"featureType":"road","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"transit","stylers":[{"visibility":"off"}]},{"featureType":"administrative","elementType":"geometry","stylers":[{"lightness":40}]}];
