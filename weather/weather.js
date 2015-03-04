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

//array of OverlayMapType definition objects
var overlayMaps = [];

//which overlays refer to which data type? mapLayers["Rainfall"]=[0,1,2,3,4,5]; etc
var mapLayers = [];

//change depending on what the overlay is.
var layerOpacity = 0.8;

//global to store reference to timeout.
var cycleTimeout = null;

var map;

var Geo = {
    map: null,
    mdl: null,
    trafficLayer: null,
    gmeLayerCount: 0,
    initialise: function(){
      var myLatlng = new google.maps.LatLng(55.5,-1.582667);
         var myOptions = {
           zoom: 6,
           center: myLatlng,
           mapTypeId: google.maps.MapTypeId.TERRAIN
         };
         this.map = new google.maps.Map(document.getElementById("map_canvas"),
             myOptions);
    }
};
window.datapointCallback = function(data){
  moData = data;
  parseMoData();
};

function init(){

  initMap();
  getData();
  //getMoData();

  //$("#addLightning").bind('click', animateLightning);
  addListener("addLightning", animateLightning);

  //$("#addRainfall").bind('click', animateRainfall);
  addListener("addRainfall", animateRainfall);

  //$("#addSatelliteIR").bind('click', animateIR);
  addListener("addSatelliteIR", animateIR);

  //$("#addSatelliteVis").bind('click', animateSat);
  addListener("addSatelliteVis", animateSat);

  //$("#stopRainfall").bind('click', function(){animate=false;});
  addListener("stopRainfall", function(){animate=false;});

  //$("#clearMap").bind('click', clearLayers);
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
  document.body.appendChild(scriptElement);
}

// function getMoData(){
//   $.ajax({
//     url: 'https://boilerwadding.appspot.com/',
//     dataType: "jsonp",
//     success: loadMoData,
//     error: moDataError
//   });
// }

function loadMoData(response){
  //$("#message").html('Met Office data loaded.');
  console.log("Met Office data loaded.");
  moData = response;
  parseMoData();
}

function parseMoData(){
  var olIndex = 0;
  var baseUrl = moData.Layers.BaseUrl.$
  for(var l = 0;l< moData.Layers.Layer.length;l++){
    var layer = moData.Layers.Layer[l];
    var displayName = layer["@displayName"]; //.toUpperCase();
    var service = layer.Service;
    var times = service.Times.Time;
    var opts = null;

    for(var t = 0;t<times.length;t++){
      opts = getMoMapOptions(service["@name"], service.LayerName, times[t], layer["@displayName"] + "_" + t);

      overlayMaps[olIndex] = times[t];

      //store lookup between layer type and overlay indices
      //each layer type has multiple timestamped versions
      if(mapLayers[displayName]==null){
        mapLayers[displayName] = [olIndex];
      } else {
        mapLayers[displayName].push(olIndex);
      }
      //this causes 44 layers to each request tiles for the current map extent.
      //TO DO - refactor to store ImageMapType objects until needed.
      map.overlayMapTypes.insertAt(olIndex, new google.maps.ImageMapType(opts));
      olIndex++;
    }

  }
}

function moDataError(){
  console.log("Failed to load Met Office data.")
}



function animateRainfall(){
  clearTimeout(cycleTimeout);
  animate=false;
  clearLayers();
  currentLayer = 0;
  animate = true;
  setStyle("justplaces");
  layerOpacity = 0.7;
  cycleLayers("Rainfall");
}

function animateLightning(){
  clearTimeout(cycleTimeout);
  animate=false;
  clearLayers();
  currentLayer = 0;
  animate = true;
  layerOpacity = 1;
  setStyle("justplaces");
  cycleLayers("Lightning");
}

function animateIR(){
  clearTimeout(cycleTimeout);
  animate=false;
  clearLayers();
  if(map.getZoom()>7){
    map.setZoom(7);
  }
  setStyle("justplaces");
  layerOpacity = 0.5;
  currentLayer = 0;
  animate = true;
  cycleLayers("SatelliteIR");
}

function animateSat(){
  clearTimeout(cycleTimeout);
  animate=false;
  clearLayers();
  if(map.getZoom()>7){
    map.setZoom(7);
  }
  setStyle("justplaces");
  currentLayer = 0;
  layerOpacity = 0.5;
  animate = true;
  cycleLayers("SatelliteVis");
}

function cycleLayers(name){
  if(animate){
    var indices = mapLayers[name];
    if(indices!=null && indices.length>0){
      if(currentLayer>=indices.length){
        currentLayer = 0;
      }
      var overlayId = indices.length -1 - currentLayer;
      showLayer(indices[overlayId]);
      currentLayer++
      cycleTimeout = setTimeout(cycleLayers, 1000, [name]);
    }
  }
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
  for (var i = 0; i < map.overlayMapTypes.getLength(); i++){
    map.overlayMapTypes.getAt(i).setOpacity(0);
  }
}

function showLayer(index){
  console.log('Showing layer ' + index);
  clearLayers();
  setTimestamp(index);
  var olm = map.overlayMapTypes.getAt(index);
  if(olm!=null){
    olm.setOpacity(layerOpacity);
  }
}

function setTimestamp(index){
  var timestamp = overlayMaps[index];
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


//});

//http://snazzymaps.com/style/106/dark-grey-on-light-grey
var lightGreyStyle = [{"featureType":"administrative","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"administrative.country","elementType":"geometry.stroke","stylers":[{"color":"#DCE7EB"}]},{"featureType":"administrative.province","elementType":"geometry.stroke","stylers":[{"color":"#DCE7EB"}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"visibility":"off"}]},{"featureType":"landscape.natural","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"transit","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"transit.line","elementType":"geometry","stylers":[{"visibility":"off"}]},{"featureType":"transit.line","elementType":"labels.text","stylers":[{"visibility":"off"}]},{"featureType":"transit.station.airport","elementType":"geometry","stylers":[{"visibility":"off"}]},{"featureType":"transit.station.airport","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"geometry","stylers":[{"color":"#83888B"}]},{"featureType":"water","elementType":"labels","stylers":[{"visibility":"off"}]}];

//http://snazzymaps.com/style/151/ultra-light-with-labels
var ultraLight = [{"featureType":"water","elementType":"geometry","stylers":[{"color":"#e9e9e9"},{"lightness":17}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#f5f5f5"},{"lightness":20}]},{"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"color":"#ffffff"},{"lightness":17}]},{"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#ffffff"},{"lightness":29},{"weight":0.2}]},{"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#ffffff"},{"lightness":18}]},{"featureType":"road.local","elementType":"geometry","stylers":[{"color":"#ffffff"},{"lightness":16}]},{"featureType":"poi","elementType":"geometry","stylers":[{"color":"#f5f5f5"},{"lightness":21}]},{"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#dedede"},{"lightness":21}]},{"elementType":"labels.text.stroke","stylers":[{"visibility":"on"},{"color":"#ffffff"},{"lightness":16}]},{"elementType":"labels.text.fill","stylers":[{"saturation":36},{"color":"#333333"},{"lightness":40}]},{"elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"transit","elementType":"geometry","stylers":[{"color":"#f2f2f2"},{"lightness":19}]},{"featureType":"administrative","elementType":"geometry.fill","stylers":[{"color":"#fefefe"},{"lightness":20}]},{"featureType":"administrative","elementType":"geometry.stroke","stylers":[{"color":"#fefefe"},{"lightness":17},{"weight":1.2}]}];

//http://snazzymaps.com/style/65/just-places
var justPlaces = [{"featureType":"road","elementType":"geometry","stylers":[{"visibility":"off"}]},{"featureType":"poi","elementType":"geometry","stylers":[{"visibility":"off"}]},{"featureType":"landscape","elementType":"geometry","stylers":[{"color":"#fffffa"}]},{"featureType":"water","stylers":[{"lightness":50}]},{"featureType":"road","elementType":"labels","stylers":[{"visibility":"off"}]},{"featureType":"transit","stylers":[{"visibility":"off"}]},{"featureType":"administrative","elementType":"geometry","stylers":[{"lightness":40}]}];
