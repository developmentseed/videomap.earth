// TO MAKE THE MAP APPEAR YOU MUST
// ADD YOUR ACCESS TOKEN FROM
// https://account.mapbox.com
mapboxgl.accessToken = 'pk.eyJ1IjoiZ2VvaGFja2VyIiwiYSI6ImFIN0hENW8ifQ.GGpH9gLyEg0PZf3NPQ7Vrg';
const DATA_URL = getUrlFromUrl() || "videos/videos.geojson";
const PLAY = '▶';
const PAUSE = '⏸';

fetch(DATA_URL)
    .then(response => response.json())
    .then(geojson => {
        console.log('geojson', geojson);
        initializeVideoMap(geojson);
    })
    .catch(err => {
        alert(`
            Failed to fetch URL.
            If you passed a custom url parameter in the query string,
            check if the URL is valid and serves valid CORS headers
        `);
    });

function getUrlFromUrl() {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('url');
}

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

function getFrameText(frames, currentTime) {
    let frameText = false;
    for (const prop in frames) {
        const frameTimecode = parseFloat(prop);
        if (currentTime > frameTimecode) {
            frameText = frames[prop];
        }
    }
    return frameText;
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
            videoElement.addEventListener('seeked', function() {
                console.log('current time', this.currentTime);
                if (this.paused) {
                    console.log('is paused');
                    this.play();
                    setTimeout(() => {
                        this.pause();
                    }, 10);
                }
            });

        });
        videoElements[0].addEventListener('play', function() {
            document.getElementById('playButton').innerHTML = PAUSE;
            hideFrameText();
        });
        videoElements[0].addEventListener('pause', function() {
            document.getElementById('playButton').innerHTML = PLAY;
            showFrameText();
        });
        videoElements[0].addEventListener('timeupdate', function() {
            const currentTime = this.currentTime;
            const percent = (currentTime / this.duration) * 100;
            document.getElementById('timeSlider').value = parseInt(percent);
        });
        
        map.on('click', () => {
            togglePlay();
        });

        function togglePlay() {
            const currentTime = videoElements[0].currentTime;
            const playingVideo = !videoElements[0].paused;
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
        }

        function showFrameText() {
            if (!data.frames) return;
            const currentTime = videoElements[0].currentTime;
            const frameText = getFrameText(data.frames, currentTime);
            document.getElementById('frameTextTitle').innerText = frameText.title;
            document.getElementById('frameTextDescription').innerText = frameText.description;
            document.getElementById('frameTextOverlay').classList.remove('hide');
        }

        function hideFrameText() {
            if (!data.frames) return;
            document.getElementById('frameTextOverlay').classList.add('hide');
        }

        document.getElementById('playButton').addEventListener('click', function() {
            togglePlay();
        });

        document.getElementById('timeSlider').addEventListener('change', function() {
            console.log(this.value);
            const timeCode = (this.value / 100) * videoElements[0].duration;
            videoElements.forEach(vid => {
                vid.pause();
                vid.currentTime = timeCode;
            });
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

