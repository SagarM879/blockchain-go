var map,
    uuid,
    marker,
    route,
    markers,
    trigger,
    currentPlayer,
    dataInfo,
    infowindow,
    humidity,
    verifyValue = "No",
    verifyOwner = "No",
    temperature = "21",
    heldAccountable = false,
    count = 1, steps = 0,
    status = 'OK',
    rand = Math.floor((Math.random() * 8000) + 1),
    pack = "Asset Package " + rand,
    transactionDate = new Date().toLocaleString(),
    data = { description: pack, user: "IBM", action: "create", "temperature": temperature, lastTransaction: transactionDate };


var defaultCoordinates = [{
    "lat": -23.56996189423875,
    "lng": -46.65141653365975
}, {
    "lat": -23.57997497987705,
    "lng": -46.6491940773286
}, {
    "lat": -23.581153,
    "lng": -46.663667
}, {
    "lat": -23.581645286215887,
    "lng": -46.64944620296468
}];

var playerSet = [
    ['Industry', defaultCoordinates[0].lat, defaultCoordinates[0].lng, 2],
    ['Shipping Company', defaultCoordinates[1].lat, defaultCoordinates[1].lng, 3],
    ['Customer', defaultCoordinates[2].lat, defaultCoordinates[2].lng, 4]
];

//---------------------//----------------------------//----------------//

/*{@Object data}
 *On ready callback controls all the elements and order on tracking
**/
$(document).ready(function () {

    $('#myModal').modal('show');

    /*@{Object data} creates an asset triggering createAsset & doTransaction*/
    $('#btnCreateAsset').click(function () {
        currentPlayer = markers[0];
        createAsset(data);
    });

    $('#startDemo').click(function () {
        setupTracking();
    });
});

//------------------//-------------------------//--------------------//

/*@{Object data} - Rest functions*/
function doTransaction(action) {
    $.post('/request', action).done(function onSuccess(res) {
        data = res;
        console.log("doTransaction " + JSON.stringify(data));
        if (data.status === true) {
            heldAccountable = true;
            checkStatus();
        }
    }).fail(function onError(error) {
        console.log(`error requesting ${error}`);
    });
}

function checkStatus() {
    statsEventListenner();
    if (heldAccountable || temperature > 24) {
        status = "Verify";
        verifyValue = temperature;
        for (var i = 1; i < playerSet.length - 1; i++) {
            if (playerSet[i][0] === currentPlayer.getTitle()) {
                verifyOwner = playerSet[i][0];
            }
        }
    } else {
        heldAccountable = false;
    }
}

/*@{Function data} - starting animation(executes once - calls playTracking() => interval)*/
function setupTracking() {
    //info balloon notification
    dataInfo = currentPlayer.getTitle() + " is shipping assets";
    infowindow = new google.maps.InfoWindow({
        content: dataInfo
    });
    trigger = setInterval(playTracking, 1000);
}

/*@{Function data} this function "animates" the icons through the route*/
function playTracking() {

    //set of variables to hold current and next lat/long(comparision)
    let currentLat = currentPlayer.getPosition().lat();
    let nextLat = markers[count].getPosition().lat();
    let currentLng = currentPlayer.getPosition().lng();
    let nextLng = markers[count].getPosition().lng();

    //update stats infowindow
    statsEventListenner();

    infowindow.open(map, currentPlayer);

    checkStatus();
    currentPlayer.setPosition(route[steps + 10]);
    console.log(`steps ${steps}`);
    if (currentLat - nextLat < 0.0000113522 && currentLng - nextLng < 0.0000113522) {
        console.log(`count ${count}`);
        currentPlayer = markers[count];
        data.user = currentPlayer.getTitle();
        data.type = "transfer";
        if (verifyValue !== "No") {
            data.temperature = verifyValue
        }
        /**continuar da linha 225 */
        doTransaction(data);

        //delay to update all UI elements with the new state 
        setTimeout(function () {
            $('#currentPlayer').html(currentPlayer.getTitle());
            infowindow.setContent(`${data.user} is shipping assets`);
            infowindow.open(map, currentPlayer);
            count++;
        }, 500);
    }
    steps++;
}

//--------------------------------------------//------------------------------------------------

/*Drawing Map*/
function initMap() {
    directionsService = new google.maps.DirectionsService;
    directionsDisplay = new google.maps.DirectionsRenderer({
        draggable: true,
        suppressMarkers: true
    });
    var mapCenter = new google.maps.LatLng(defaultCoordinates[defaultCoordinates.length - 1].lat, defaultCoordinates[defaultCoordinates.length - 1].lng);
    var mapOptions = {
        zoom: 5,
        center: mapCenter,
    };
    map = new google.maps.Map(document.getElementById('map'), mapOptions);
    directionsDisplay.setMap(map);
    calculateAndDisplayRoute(directionsService, directionsDisplay);
    setMarkers(map);
}

function setMarkers(map) {
    let image, img;
    markers = [];
    for (var x = 0; x < playerSet.length; x++) {
        let actors = playerSet[x];
        img = x + 1;
        image = 'images/player' + img + '.png';
        marker = new google.maps.Marker({
            position: { lat: actors[1], lng: actors[2] },
            map: map,
            icon: image,
            animation: google.maps.Animation.DROP,
            title: actors[0],
            zIndex: actors[3],
            draggable: false
        });
        markers.push(marker);
        marker.addListener('dragend', function () {
            let player = this.getTitle();
            for (var y in playerSet) {
                if (playerSet[y][0] === player) {
                    playerSet[y][1] = this.getPosition().lat();
                    playerSet[y][2] = this.getPosition().lng();
                }
            }
            calculateAndDisplayRoute(directionsService, directionsDisplay);
        });
    }
}

function calculateAndDisplayRoute(directionsService, directionsDisplay) {
    var waypts = [];

    for (var i = 1; i < playerSet.length - 1; i++) {
        var position = { "lat": playerSet[i][1], "lng": playerSet[i][2] };
        waypts.push({
            location: position,
            stopover: true
        });
    }

    directionsService.route({
        origin: { lat: playerSet[0][1], lng: playerSet[0][2] },
        destination: { lat: playerSet[playerSet.length - 1][1], lng: playerSet[playerSet.length - 1][2] },
        waypoints: waypts,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING
    }, function (data, status) {
        if (status === google.maps.DirectionsStatus.OK) {

            directionsDisplay.setDirections(data);
            route = data.routes[0].overview_path;

        }
    });
}

/*--------------//-----------------------------------//---------------------*/

/*UI events listenner*/
function createAsset(init) {
    doTransaction(init);
    let assetContainerBody = $('.assetContainerBody');
    let assetContainer = $('.assetContainer');
    let btnCreate = $('.assetContainer button');
    let btnStart = $('.assetContainerBody button');
    setTimeout(function () {
        if (data !== null && data !== undefined) {
            console.log("createAsset " + JSON.stringify(init));
            //temporary way to append ui elements => update with react,etc;
            assetContainerBody.append('<br><img src="./images/pallete.png"><br>' +
                '<h4>Asset created</h4>' +
                '<br><b>Owner: </b>' + data.user.toUpperCase() +
                '<br><b>Description: </b>' + data.description +
                '<br><b>Registered: </b>' + data.lastTransaction +
                '<br><b>UUID: </b> ' + uuid + '\n');

            assetContainer.addClass("extendContainer");
            assetContainerBody.fadeIn("slow");
            btnCreate.fadeOut("slow");
            btnStart.fadeIn("slow");
            checkStatus();
        }
        else {
            return alert("error creating asset.please try again");
        }
    }, 4000);
}

/*@{Object data} - listenner to blockchain events*/
function statsEventListenner() {
    $("#lblTransaction").text("000");
    $("#lblTemperature").text(data.temperature + + 'ºC');
    $("#lblTime").text(data.lastTransaction);
    $("#lblDescription").text(data.description);
    $("#lblSerialNumber").text("=]");
    $("#lblOwner").text(data.user);

}

$("#btnUpTemp").click(function () {
    temperature++;
});

$("#btnDownTemp").click(function () {
    temperature--;
});