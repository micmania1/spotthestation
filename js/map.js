var tracker = {
	
	api_endpoint: "http://api.open-notify.org/iss-now.json?callback=?",
	api_flyby_endpoint: "http://api.open-notify.org/iss-pass.json",
	api_interval: 2000,
	api_response: true,
	
	iss_previous_coords: 0,
	iss_velocity: {lon: 0, lat: 0},
	iss_distance: 0, // Distance (Kilometers) between API calls
	iss_last_call_time: 0,
	iss_speeds: [], // Store the last 5 speeds recorded so that we can work out an average.
	iss_path: false, // Stores google map Polyline

	map_container: false,
	map: false,
	map_marker: false,
	map_zoom: 4,

	user_lon: 0,
	user_lat: 0,
	user_marker: false,

	init: function()
	{
		tracker.map_container = document.getElementById("map");
		tracker.resize();
		tracker.mapInit();
		
		// Switch to running interface
		$("body").removeClass("start").addClass("running");

		// Set time interval for updates
		setInterval(function() {
			if(tracker.api_response)
				tracker.loadMarker();

		},  tracker.api_interval);

		// Bind window resize
		$(window).resize(function() {
			tracker.resize();
		});

		// Get the users location
		tracker.getLocation();
	},

	mapInit: function()
	{
		tracker.map = new google.maps.Map(tracker.map_container, {
			zoom: tracker.map_zoom,
			mapTypeId: google.maps.MapTypeId.TERRAIN
		});
	},

	loadMarker: function()
	{
		tracker.api_response = false;
		$.getJSON(tracker.api_endpoint, function(data) {
			tracker.api_response = true;

			// get new coords
			var coords = new google.maps.LatLng(data.iss_position.latitude, data.iss_position.longitude);
			$("#latitude").html(data.iss_position.latitude);
			$("#longitude").html(data.iss_position.longitude);

			// Store the current time
			var current_time = new Date().getTime();

			if(tracker.iss_previous_coords)
			{
				tracker.iss_velocity.lon = data.iss_position.longitude - tracker.iss_previous_coords.lng();
				tracker.iss_velocity.lat = data.iss_position.latitude - tracker.iss_previous_coords.lat();

				// Calculate the distance the iss has travelled.
				tracker.iss_distance = google.maps.geometry.spherical.computeDistanceBetween(tracker.iss_previous_coords,coords) / 1000;

				if(tracker.iss_last_call_time > 0)
				{
					var time_since = current_time - tracker.iss_last_call_time;
					var speed = tracker.iss_distance / ((time_since / 1000) / 60 / 60);

					// Add the speed to our tracker.
					tracker.iss_speeds.push(speed);
					if(tracker.iss_speeds.length > 20)
						tracker.iss_speeds.shift();

					var avgSpeed = 0;
					if(tracker.iss_speeds.length > 0)
					{
						var totalSpeed = 0;
						for(var key in tracker.iss_speeds)
							totalSpeed += tracker.iss_speeds[key];
						avgSpeed = Math.floor(totalSpeed / tracker.iss_speeds.length);
					}
					if(avgSpeed > 0) {
						$("#speed").html(avgSpeed);
						$('.position.hide').removeClass('hide');
					}
				}
			}

			tracker.iss_last_call_time = current_time;

			// push new coords to iss route array for tracking line
			tracker.drawRoute(coords);
			tracker.iss_previous_coords = coords;

			if(!tracker.map_marker)
			{
				tracker.map_marker =  new google.maps.Marker({
					position: coords,
					map: tracker.map,
					title: "ISS",
					icon: "http://www.n2yo.com/inc/saticon.php?t=0&s=25544&c="
				});
				tracker.map.panTo(coords);
			}
			else
			{
				tracker.map_marker.setPosition(coords);
			}
		});
	},
	
	// resize window
	resize: function()
	{
		// Set the map to fullsize
		tracker.map_container.style.height = $(window).height() + "px";
		
		// Pan to ISS
		if(tracker.map && tracker.map_marker) {
			tracker.map.panTo(tracker.map_marker.getPosition());
		}
	},

	// Get users location and add them on the map maybe??
	getLocation: function() 
	{
		navigator.geolocation.getCurrentPosition(function(position)
		{
			tracker.user_lat = position.coords.latitude;
			tracker.user_lon = position.coords.longitude;

			var coords = new google.maps.LatLng(tracker.user_lat, tracker.user_lon);
			
			tracker.user_marker =  new google.maps.Marker({
				position: coords,
				map: tracker.map,
				title: "You are here!"
			});

			// Display the next flyby for the users location
			tracker.getNextFlyby();
		});
	},

	getNextFlyby: function()
	{
		$.getJSON('http://api.open-notify.org/iss-pass.json?lat=' + tracker.user_lat + '&lon=' + tracker.user_lon + '&alt=20&n=1&callback=?', function(data) {
			data['response'].forEach(function (d) {
				var date = new Date(d['risetime']*1000);
				var duration = Math.round(d['duration'] / 60);

				$(".flyby").removeClass('hide');
				$("#flybydate").html(date.toLocaleTimeString()+', '+date.getDate()+'/'+(date.getMonth()+1)+'/'+date.getFullYear());
				$("#flybyduration").html(duration);
			});
		});
	},

	// Draw a route line
	drawRoute: function(coords)
	{
		if(!tracker.iss_path)
		{
			tracker.iss_path = new google.maps.Polyline({
				path: [coords],
				strokeColor: "#FF0000",
				strokeOpacity: 1.0,
				strokeWeight: 2
			});
			tracker.iss_path.setMap(tracker.map);
		}
		tracker.iss_path.getPath().push(coords);
	}
}


$(document).ready(function()
{
	tracker.init()
});
