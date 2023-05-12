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
        if (currentTime >= frameTimecode) {
            frameText = frames[prop];
        }
    }
    return frameText;
}



function initializeVideoMap(data) {
    const baseUrl = DATA_URL.split("videos.geojson")[0];

    // This is a very weird variable, I apologize. The problem is that we have this weird hack
    // on video seeked event where we need to play the video and pause it immediately, to 
    // make sure that the video frame updates. The problem is, we don't want to trigger normal
    // play / pause events in that case, because we are not "really" playing the video.
    // So we use this weird-as-hell DONT_FLICKER global-ish variable to keep track of state,
    // of whether we DONT WANT TO FLICKER. This is most likely awful.
    let DONT_FLICKER = false;

    // construct video sources to add to style
    const videoSources = data.features.reduce((acc, val, index) => {
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

    // construct layers array to add to style
    const videoLayers = data.features.map((val, index) => {
        return {
            'id': `video${index}`,
            'type': 'raster',
            'source': `video${index}`
        };
    });

    // construct mapbox style object
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
    
    // create map
    const map = new mapboxgl.Map({
        container: 'map',
        minZoom: 1,
        zoom: data.zoom,
        center: data.center,
        style: videoStyle
    });
    

    map.on('load', function() {
        // on map load, when the video sources are available, we need to
        // fetch all the html video elements, and attach event handlers
        const videoElements = videoLayers.map(layer => layer.id).map(sourceId => {
            return map.getSource(sourceId).getVideo();
        });

        videoElements.forEach(videoElement => {
            // start the videos in a paused state.
            // remove this line if you want the video to autoplay
            videoElement.pause();

            // when we seek to a time-code in the video,
            // for eg. when using the time-slider,
            // we need to make sure that the video frame at that point
            // is displayed. For this, we need to do this strange hack, where
            // we need ot play the video and pause it almost immediately,
            // to get the display frame to update correctly.
            videoElement.addEventListener('seeked', function() {
                if (this.paused) {

                    // set the DONT_FLICKER var to true
                    // which will prevent the play button toggling
                    // or the frame text display hiding and showing in a flicker
                    DONT_FLICKER = true;

                    // play the video and immediately pause it in 10ms, to show the frame.
                    this.play();
                    setTimeout(() => {
                        this.pause();
                    }, 10);
                }
            });

        });

        // For the next few, we only need to attach events to the first video element.
        // on play, show pause on the button and hide any frame text if it exists.
        // Unless DONT_FLICKER is true, then don't do anything.
        videoElements[0].addEventListener('play', function() {
            if (!DONT_FLICKER) {
                document.getElementById('playButton').innerHTML = PAUSE;
                hideFrameText();
            } else {
                DONT_FLICKER = false;
            }
        });

        // on video pause, set button to play icon, show text for current time-code / frame.
        videoElements[0].addEventListener('pause', function() {
            document.getElementById('playButton').innerHTML = PLAY;
            showFrameText();
        });

        // whenever the video timecode updates, we need to update the time-slider range to the correct poing.
        videoElements[0].addEventListener('timeupdate', function() {
            const currentTime = this.currentTime;
            const percent = (currentTime / this.duration) * 100;
            document.getElementById('timeSlider').value = parseInt(percent);
        });
        
        map.on('click', () => {
            togglePlay();
        });

        // toggles playing / pausing of the videos
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

        // function to show text at the current frame
        function showFrameText() {
            if (!data.frames) return;
            const currentTime = videoElements[0].currentTime;
            const frameText = getFrameText(data.frames, currentTime);
            if (frameText) {
                document.getElementById('frameTextTitle').innerText = frameText.title;
                document.getElementById('frameTextDescription').innerText = frameText.description;
                document.getElementById('frameTextOverlay').classList.remove('hide');
            }
        }

        // hide div showing frame text
        function hideFrameText() {
            if (!data.frames) return;
            document.getElementById('frameTextOverlay').classList.add('hide');
        }

        // toggle play on clicking play button
        document.getElementById('playButton').addEventListener('click', function() {
            DONT_FLICKER = false;
            togglePlay();
        });

        // handle user updating time-slider range input
        document.getElementById('timeSlider').addEventListener('input', function() {
            const timeCode = (this.value / 100) * videoElements[0].duration;
            videoElements.forEach(vid => {
                vid.pause();
                vid.currentTime = timeCode;
            });
        });

        document.getElementById('speedSelect').addEventListener('change', function() {
            const playbackRate = this.value;
            videoElements.forEach(vid => {
                vid.playbackRate = parseFloat(playbackRate);
            });
        });

    });

    // handle opacity slider
    document.getElementById('opacity').addEventListener('input', function() {
        const newOpacity = parseFloat(this.value);
        videoLayers.forEach(layer => {
            map.setPaintProperty(
                layer.id,
                'raster-opacity',
                newOpacity
            )
        });
    });
}

