### Videomap.earth

Experiments with overlaying time-series satellite imagery as video over maps.

**TODO**: Add instructions on generating video files using `stac2video`.

### Frontend Setup

The frontend fetches a GeoJSON FeatureCollection representing the video files that need to be displayed alongwith their bounding boxes.

The default location for the video file is in [videos/videos.geojson](videos/videos.geojson). If you want to fetch from somewhere else, edit the value for `DATA_URL` in [js/index.js](js/index.js).

The GeoJSON feature collection MUST HAVE the following top-level properties:

 - `base_url`: The Base URL for the video files. You can omit this or leave as empty string if specifying absolute URLs for videos.
 - `center`: The point the map should be centered on when loading
 - `zoom`: The zoom level of the map when loading

The FeatureCollection must also contain a property called `features` which is an array of GeoJSON features. Each feature MUST:

 - Be of the type `Polygon`
 - The coordinates of the Polygon must be an array, with a single array inside it, which has 5 members, each of which is an array of [lng, lat]. See the example GeoJSON file.
 - Each feature must have a property called `url` which is the path to the video file. This can be a path relative to the `base_url` or an absolute URL. If it is an absolute URL coming from another domain, it will need to be served with CORS headers.

See [videos/videos.geojson](videos/videos.geojson) for an example.

If you are running this yourself, use your own Mapbox token by editing the `mapboxgl.accessToken` value in [index.js](js/index.js).

To run, use your favourite method to serve a local web-server in this folder. With `python3` this is:

```
    python3 -m http.server 9000
```

Then, go to http://localhost:9000 in your browser.