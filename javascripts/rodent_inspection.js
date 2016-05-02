$(window).load(function() {
    // Construct the query string
    url = 'https://data.ct.gov/resource/a2h9-9z38.json'
          + 'RESULT=Active%20Rat%20Signs'
//          + '&$$app_token=CGxaHQoQlgQSev4zyUh5aR5J3';
    
    // Intialize our map
    var center = new google.maps.LatLng(40.70621148,-73.90430466);
    var mapOptions = {
      zoom: 4,
      center: center
    }
    var map = new google.maps.Map(document.getElementById("map"), mapOptions);
    
    // Retrieve our data and plot it
    $.getJSON(url, function(data, textstatus) {
          $.each(data, function(i, entry) {
              var marker = new google.maps.Marker({
                  position: new google.maps.LatLng(entry.location_1.latitude, 
                                                   entry.location_1.longitude),
                  map: map,
                  title: location.name
              });
          });
    });
});
