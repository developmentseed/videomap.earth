// TO MAKE THE MAP APPEAR YOU MUST
// ADD YOUR ACCESS TOKEN FROM
// https://account.mapbox.com
mapboxgl.accessToken = 'pk.eyJ1IjoiZ2VvaGFja2VyIiwiYSI6ImFIN0hENW8ifQ.GGpH9gLyEg0PZf3NPQ7Vrg';
const DATA_URL = "videos/videos.geojson";

fetch("videos/videos.geojson")
    .then(response => response.json())
    .then(geojson => {
        console.log('geojson', geojson);
        initializeVideoMap(geojson);
    });

function getNW(coords) {
    const lng = Math.min(...coords.map(c => c[0]));
    const lat = Math.max(...coords.map(c => c[1]));
    return [lng, lat];
}

/**
 * 
 * @param {Array} polygonCoords - coordinates of a polygon feature
 * @returns {Array} - Array of 4 points with lng, lat, ordered by NW, NE, SE, SW 
 */
function getVideoCoords(polygonCoords) {
    const firstCoord = getNW(polygonCoords);
    const secondCoord = polygonCoords.find(coord => {
        return coord[0] !== firstCoord[0] && coord[1] === firstCoord[1];
    });
    const thirdCoord = polygonCoords.find(coord => {
        return coord[0] === secondCoord[0] && coord[1] !== secondCoord[1];
    });
    const fourthCoord = [
        firstCoord[0],
        thirdCoord[1]
    ];
    return [
        firstCoord,
        secondCoord,
        thirdCoord,
        fourthCoord
    ];
}

function initializeVideoMap(data) {
    const baseUrl = data.base_url || '';
    const videoSources = data.features.reduce((acc, val, index) => {
        console.log(acc, val, index);
        const sourceId = `video${index}`;
        const coords = getVideoCoords(val.geometry.coordinates[0]);
        acc[sourceId] = {
            'type': 'video',
            'urls': [
                `${baseUrl}${val.properties.url}`
            ],
            'coordinates': coords
        };
        return acc;
    }, {});
    const videoLayers = data.features.map((val, index) => {
        return {
            'id': `video${index}`,
            'type': 'raster',
            'source': `video${index}`
        };
    });
    console.log('sources', videoSources);
    const videoStyle = {
        'version': 8,
        'sources': {
            'satellite': {
                'type': 'raster',
                'url': 'mapbox://mapbox.satellite',
                'tileSize': 256
            }, ...videoSources
        },
        'layers': [
            {
                'id': 'background',
                'type': 'background',
                'paint': {
                    'background-color': 'rgb(4,7,14)'
                }
            },
            {
                'id': 'satellite',
                'type': 'raster',
                'source': 'satellite'
            },
            ...videoLayers
        ]
    };
    
    const map = new mapboxgl.Map({
        container: 'map',
        minZoom: 1,
        zoom: data.zoom,
        center: data.center,
        style: videoStyle
    });
    
    map.on('load', function() {
        const videoElements = videoLayers.map(layer => layer.id).map(sourceId => {
            return map.getSource(sourceId).getVideo();
        });
        videoElements.forEach(videoElement => {
            videoElement.pause();
        });
        let playingVideo = false;
        map.on('click', () => {
            const currentTime = videoElements[0].currentTime;
            if (playingVideo) {
                videoElements.forEach(vid => {
                    vid.pause();
                });
            } else {
                videoElements.forEach(vid => {
                    vid.currentTime = currentTime;
                    vid.play();
                });
            }
            playingVideo = !playingVideo;
        });
    });

    document.getElementById('opacity').addEventListener('input', function() {
        const newOpacity = parseFloat(this.value);
        console.log(newOpacity);
        videoLayers.forEach(layer => {
            map.setPaintProperty(
                layer.id,
                'raster-opacity',
                newOpacity
            )
        });
    });
}

