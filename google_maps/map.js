var map, _map, myLocation;
var infoWindow;
var pos = {lat: 22.990537, lng: 120.171127};
var currentLocation;
var planRouteMode;
var markerCluster;
// Create an array of alphabetical characters used to label the markers.
var markerLabels = "ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ";
var locations = [], placeNames = [], placeVicinitys = [], markers = [];
var ratingColor = ["gray", "darkgreen", "lightgreen", "yellow", "orange", "red"];

// 初始化地圖
function initMap() {
    planRouteMode = document.getElementById('planRouteMode');
    _map = document.getElementById('map');
    myLocation = document.getElementById("myLocation");
    infoWindow = new google.maps.InfoWindow();
    getLocation(() => {}, false);
}

// GPS定位
function getLocation(func, closeCurrentContent) {
    pos = {lat: 22.990537, lng: 120.171127};
    newMap(pos, 14);
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            currentLocation = pos;
            myLocation.innerHTML = "(" + pos.lat + ", " + pos.lng + ")";

            func();

            var marker =  new google.maps.Marker({
                map: map,
                position: pos,
                title: "現在位置",
            });

            infowindow = new google.maps.InfoWindow({
                content: placeContentString("現在位置", "")
            });

            infowindow.open(map, marker);
            map.setCenter(pos);
            if (closeCurrentContent) infowindow.close();
        }, () => handleLocationError(true, infoWindow, map.getCenter()));
    } else
        // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter());
}

// GPS定位 + 利用關鍵字和尋找半徑 搜尋景點
function nearBySearch() {
    var keyword = document.forms["searchNearBy"]["keyword"].value;
    if (keyword != "") {
        getLocation(() => {
            var radius = document.forms["searchNearBy"]["radius"].value;
            placeSearch(radius, keyword);
        }, true);
    } else alert("請輸入搜尋關鍵字");
}

// 利用關鍵字和尋找半徑 搜尋景點
function placeSearch(radius, keyword) {
    var request = {
        location: currentLocation,
        radius: radius,
        keyword: keyword
    };

    var service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, (results, status) => {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
            console.log("查詢筆數：" + results.length);

            results = results.map(place => {
                if (typeof place.rating == "undefined")
                    place.rating = 0;
                return place;
            });

            results.sort(sort_by('rating', true));
            setPlaceList(results);
            placeMarker();
        }
    });
    console.log(locations);
}

// 參考：https://stackoverflow.com/questions/979256/sorting-an-array-of-javascript-objects
// 排序
var sort_by = (field, reverse) => {
    var key = x => {return x[field]};
    reverse = !reverse ? 1 : -1;
    return (a, b) => {
        return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
    }
}

// 建立地點清單
function setPlaceList(results) {
    var str = "";
    locations = [], placeNames = [], placeVicinitys = [];

    for (var i = 0; i < results.length; i++) {
        //console.log(results[i]);
        var rating = typeof results[i].rating == "undefined" ? 0 : results[i].rating;
        // 設定評分顏色 (紅：評分越高，綠：評分越低，灰：無評分 or 低於 0.4)
        var ratingColorStr = ratingColor[Math.floor(rating)];
        rating = rating.toFixed(1);
        
        locations[i] = results[i].geometry.location;
        placeNames[i] = results[i].name;
        placeVicinitys[i] = results[i].vicinity;

        str += "<a class='list-group-item' onClick='planRoute(" + i + ")'>" + 
            "<span class='rating badge badge-" + ratingColorStr + "'>" + rating + "</span>" + 
            "<span class='placeName'>" + markerLabels[i % markerLabels.length] + " - " + placeNames[i] + "</span></a>";
    }
    document.getElementById("place-list").innerHTML = str;
}

// 參考：https://stackoverflow.com/questions/34533817/google-maps-infowindow-on-clusters
// 加上地點標記
function placeMarker() {
    // Add some markers to the map.
    // Note: The code uses the JavaScript Array.prototype.map() method to
    // create an array of markers based on a given "locations" array.
    // The map() method here has nothing to do with the Google Maps API.
    markers = locations.map((location, i) => {
        var marker =  new google.maps.Marker({
            map: map,
            position: location,
            label: {
                fontFamily: 'Microsoft JhengHei',
                text: markerLabels[i % markerLabels.length]
            },
            title: placeNames[i] + "\n" + placeVicinitys[i],
        });

        google.maps.event.addListener(marker, 'click', () => {
            infoWindow.setContent(placeContentString(placeNames[i], placeVicinitys[i]));
            infoWindow.open(map, marker);
        });
        return marker;
    });

    var mcOptions = {
        maxZoom: 18,
        zoomOnClick: false,
        imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m'
    };
    // Add a marker clusterer to manage the markers.
    markerCluster = new MarkerClusterer(map, markers, mcOptions);

    google.maps.event.addListener(markerCluster, 'clusterclick', cluster => {
        var str = "", cluster_markersLabel = "", cluster_markers = cluster.getMarkers();
        
        // for (i = 0; i < cluster_markers.length; i++) {
        //     for (var j = 0; j < markers.length; j++) {
        //         if (cluster_markers[i] == markers[j]) {
        //             cluster_markersLabel = markerLabels[j % markerLabels.length];
        //             break;
        //         }
        //     }
        //     str += '<li><b>' + cluster_markersLabel + " - " + cluster_markers[i].getTitle() + '</b></li>';
        // }
        cluster_markers.forEach((c_marker) => {
            markers.forEach((marker, j) => {
                if (c_marker == marker) {
                    cluster_markersLabel = markerLabels[j % markerLabels.length];
                    return;
                }
            });
            str += '<li><b>' + cluster_markersLabel + " - " + c_marker.getTitle() + '</b></li>';
        });
        if (map.getZoom() <= markerCluster.getMaxZoom()) {
            str = "<div id='content'><h4 id='firstHeading' class='text-center'>" + cluster_markers.length + 
            " markers</h4><div id='bodyContent'><ul>" + str + "</ul></div></div>";
            infoWindow.setContent(str);
            infoWindow.setPosition(cluster.getCenter());
            infoWindow.open(map);
        }
    });
}

// 地點說明內容
function placeContentString(placeName, placeVicinity) {
    return '<div id="content"><h4 id="firstHeading">' + placeName + '</h4>'+
        '<div id="bodyContent">'+ '<p><b>' + placeVicinity + '</b></p></div></div>';
}

// 路線規劃
function planRoute(index) {
    var place = locations[index];
    newMap(currentLocation, 14);
    infoWindow = new google.maps.InfoWindow({map: map});

    var directionsDisplay = new google.maps.DirectionsRenderer;
    var directionsService = new google.maps.DirectionsService;

    directionsDisplay.setMap(map);
    calcAndDisplayRoute(directionsService, directionsDisplay, currentLocation, place);
    planRouteMode.addEventListener('change', () => {
        calcAndDisplayRoute(directionsService, directionsDisplay, currentLocation, place);
    });
}

// 計算與顯示路線
function calcAndDisplayRoute(directionsService, directionsDisplay, origin, destination) {
    directionsService.route({
        origin: origin,
        destination: destination,
        // Note that Javascript allows us to access the constant
        // using square brackets and a string value as its
        // "property."
        travelMode: google.maps.TravelMode[planRouteMode.value]
    }, (response, status) => {
        if (status == 'OK')
            directionsDisplay.setDirections(response);
        else
            window.alert('Directions request failed due to ' + status);
    });
}

function newMap(position, zoom) {
    map = new google.maps.Map(_map, {
        mapTypeControl: false,  // 地圖左上角去除 "地圖 / 衛星檢視" 的按鈕
        center: position,
        zoom: zoom,
        minZoom: 3,
        maxZoom: 18,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });
}

// GPS 連線錯誤處理
function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ? 
        'Error: The Geolocation service failed.' : 
        'Error: Your browser doesn\'t support geolocation.');
    // switch(error.code) {
    //     case error.PERMISSION_DENIED:
    //         infoWindow.setContent("User denied the request for Geolocation.");
    //         break;
    //     case error.POSITION_UNAVAILABLE:
    //         infoWindow.setContent("Location information is unavailable.");
    //         break;
    //     case error.TIMEOUT:
    //         infoWindow.setContent("The request to get user location timed out.");
    //         break;
    //     case error.UNKNOWN_ERROR:
    //         infoWindow.setContent("An unknown error occurred.");
    //         break;
    // }
}

// Key Enter -> 利用關鍵字和尋找半徑 搜尋景點
document.onkeyup = e => {
    var keyPressed = e.keyCode || e.which;
    // Enter
    if(keyPressed == 13) nearBySearch();
}