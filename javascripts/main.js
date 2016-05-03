// Initialize base map and set origin on center of distribution.
var map, heatMap, origin = {lat: 40.70621148, lng: -73.90430466},
    mapWrapper = document.getElementById("gmap");

map = new google.maps.Map(mapWrapper, {
    center: origin,
    zoom: 12,
    minZoom: 10,
    maxZoom: 17,
    streetViewControl: false,
    mapTypeControl: false,
    zoomControlOptions: {
    	position: google.maps.ControlPosition.LEFT_CENTER,
    	style: google.maps.ZoomControlStyle.LARGE
    }
});

//var originMarker = new google.maps.Marker({
//	position: origin, 
//	title: "Hack Reactor"
//});
//
//originMarker.setMap(map);

/*
The JSON data received from the AJAX call is fed to this function for further
processing. The intention here is to take the string values representing 
coordinates and convert them to numbers in order to use them as data points
for the heat map layer. The heat map object is constructed, configured and applied 
to the base map. Also, a particular location is excluded because it appears to be 
irrelevant and unrelated to the other coordinates. 
*/
function initHeatOverlay(data) {
	var heatMapData = [];

    data.forEach(function(element) {
    	if (element.y != "40.70621148" && element.x != "-73.90430466") {
    		var lat = parseFloat(element.y), 
    			lng = parseFloat(element.x),
    			coor = new google.maps.LatLng(lat, lng);

    		heatMapData.push(coor); // coordinates from api data
    	}
    });
	
	if (heatMap)
		heatMap.setMap(null);

	heatMap = new google.maps.visualization.HeatmapLayer({
        data: heatMapData,
        radius: 35,
        maxIntensity: 5,
        gradient: [
        	"rgba(251, 206, 17, 0)",
        	"rgba(231, 79, 22, 1)",
        	"rgba(180, 5, 149, 1)",
        	"rgba(118, 2, 138, 0.9)",
        	"rgba(24, 3, 112, 0.95)"
        ]
    });

    heatMap.setMap(map);
}

/*
Considering that this map strictly revolves around San Francisco, it would be a good
idea to limit the map boundaries to cover the city only. The objective here is to prevent 
users from panning the map too far and moving the view out of the scope of the city.
The "panTo" method provides the best results because it doesn't yank the map back to
the center position upon going past the boundaries. Other methods resulted in 
rubber banding. 
*/ 
var mapBounds = new google.maps.LatLngBounds(
     new google.maps.LatLng(-86.991, -153.157), // SW Point
     new google.maps.LatLng(40.9105, 56.335) // NE Point
);
google.maps.event.addListener(map, "center_changed", function() {
    if (mapBounds.contains(map.getCenter())) {return;}

    var center = map.getCenter(),
        centerX = center.lng(),
        centerY = center.lat(),
        upperX = mapBounds.getNorthEast().lng(),
        upperY = mapBounds.getNorthEast().lat(),
        lowerX = mapBounds.getSouthWest().lng(),
        lowerY = mapBounds.getSouthWest().lat();

    if (centerX < lowerX) {centerX = lowerX;}
    if (centerX > upperX) {centerX = upperX;}
    if (centerY < lowerY) {centerY = lowerY;}
    if (centerY > upperY) {centerY = upperY;}

    map.panTo(new google.maps.LatLng(centerY, centerX));
});

/* 
The goal here is to adjust gmap height dynamically when DOM is loaded and when 
the viewport is resized. This is done by offsetting the height of the map container to 
avoid overlapping from the footer element. Changing the Z-index property did not help, so
the only solution was to create a fix with JS.
*/
function setMapHeight() {
    var windowHeight = document.getElementsByTagName("body")[0].offsetHeight,
        mapHeight = windowHeight - 55; // height of footer is 55px
    mapWrapper.style.height = mapHeight + "px";
}

window.addEventListener("load", setMapHeight);
window.addEventListener("resize", setMapHeight);

/*
Active dropdown menus should close when a user clicks on anything in the document
that's not associated with a dropdown element.
*/
var dropWrapper = document.getElementsByClassName("dropdown-wrapper"),
    button = document.getElementById("apply-button");

document.addEventListener("click", function(event) {
	if ((event.target.classList.contains("dropdown-wrapper") === false) ||
		(event.target.classList.contains("dropdown-content") === false) ||
		(event.target.classList.contains("drop-arrow") === false)) {
		Array.prototype.forEach.call(dropWrapper, function(element) {
			if (element.classList.contains("active"))
				element.classList.remove("active");
		});
	}
}, true);

/*
The goal is to attach an event to the dropdown menu container that will display
the dropdown content when clicked; otherwise, it remains hidden. Each item of the
dropdown will also react when clicked and set the value of its corresponding filter.
*/
Array.prototype.forEach.call(dropWrapper, function(element) {
    var label = element.children[1],
    	options = element.getElementsByTagName("a"),
        id = element.id,
        optionName;

    element.addEventListener("click", function() {
        element.classList.add("active");
    });

    for (var i = 0, len = options.length; i < len; i++) {
        optionName = options[i].textContent;
		(function(optionName) {
            options[i].addEventListener("click", function() {
                label.textContent = ": " + optionName;
                id === "year" ? (year = optionName) : id === "month" ?
                (month = optionName) : (crimeType = optionName);
                validateButton();
            });
        })(optionName);
    }
});

// Button validation when filters are selected.
function validateButton() {
	if (year && borough) {
        button.disabled = false;
        button.classList.add("btn-enabled")
    } else if (button.disabled == false) {
        button.disabled = true;
        button.classList.remove("btn-enabled");
    }
}

// Check and application of filters and fetching data when click event is triggered.
/*
button.addEventListener("click", function() {
    if (year === "2016" && !(month === "Jan" || month === "Feb" || month === "Mar" || month === "Apr" || month === "May")) { 
        alert("The data for " + month + " " + year + " is not available yet.");
        document.getElementById("month").children[1].textContent = "";
        month = 0;
        button.disabled = true;
        button.classList.remove("btn-enabled");
    } else {
    	getData();
    }
});
*/

// Request for data from OpenData servers via AJAX.
var year, borough, inspectionResult, appToken = "$$app_token=NjLaTRuCVEDTTBjtsa9ph6Ygx",
    baseURL = "https://data.sfgov.org/resource/a2h9-9z38.json?";

function getData() {
	var fullURL = constructQueryString(),
    	ajax = new XMLHttpRequest();

	ajax.open("GET", fullURL);
	ajax.timeout = 15000;

	ajax.ontimeout = function() {
		alert("The request for data from the server has timed out.");
	}

	ajax.onload = function() {
		if (ajax.readyState == 4 && ajax.status == 200) {
			console.log("API call successful with status code " + ajax.status);
			initHeatOverlay(JSON.parse(ajax.response)); //Parsing the JSON Array received
		}
	}

	ajax.send();
}

// Create query string based on filter selection.
function constructQueryString() {
/*
	var monthNum, days, borough = "", dateQuery = "";

	if (month === "Jan") {monthNum = "01";}
	if (month === "Feb") {monthNum = "02";}
	if (month === "Mar") {monthNum = "03";}
	if (month === "Apr") {monthNum = "04";}
	if (month === "May") {monthNum = "05";}
	if (month === "Jun") {monthNum = "06";}
	if (month === "Jul") {monthNum = "07";}
	if (month === "Aug") {monthNum = "08";}
	if (month === "Sep") {monthNum = "09";}
	if (month === "Oct") {monthNum = "10";}
	if (month === "Nov") {monthNum = "11";}
	if (month === "Dec") {monthNum = "12";}

	days = new Date(year, monthNum, 1, -1).getDate().toString();
	dateQuery = "date between '" + year + "-" + monthNum + "-01' and '"
	+ year + "-" + monthNum + "-" + days + "'";
*/

  var year = "", borough = "";

	if (borough === "All") {
		boroughQuery = "'BRONX' OR borough='BROOKLYN' OR borough='MANHATTAN' " 
		+ "OR borough='QUEENS' OR borough='STATEN ISLAND' ";
	}
	if (borough === "Bronx") {boroughQuery = "'BRONX'";}
	if (borough === "Brooklyn") {boroughQuery = "'BROOKLYN'";}	
	if (borough === "Manhattan") {boroughQuery = "'MANHATTAN'";}
	if (borough === "Queens") {boroughQuery = "'QUEENS'";}
	if (borough === "Staten Island") {crimeQuery = "'STATEN ISLAND'";}

	return baseURL + appToken + "&$select=x,y&$where=borough=" + boroughQuery + " AND " 
			+ dateQuery + "&$limit=50000";
}
