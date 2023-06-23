### Videomap.earth

Experiments with overlaying time-series satellite imagery as video over maps.

### Frontend Setup

The frontend fetches a GeoJSON FeatureCollection representing the video files that need to be displayed alongwith their bounding boxes.

The default location for the video file is in [videos/videos.geojson](videos/videos.geojson). If you want to fetch from somewhere else, you can pass a custom `url` parameter in the querystring for the page.

So, if you are running the site at http://localhost:9000 and have your GeoJSON served at http://example.com/myvideos.geojson, you can go to http://localhost:9000/?url=http://example.com/myvideos.geojson . You will need to ensure that your GeoJSON file as well as all videos are being served with headers to enable CORS.

The GeoJSON feature collection has the following top-level properties:

 - `base_url`: The Base URL for the video files. You can omit this or leave as empty string if specifying absolute URLs for videos.
 - `center`: REQUIRED: The point the map should be centered on when loading
 - `zoom`: REQUIRED: The zoom level of the map when loading
 - `frames`: Optional: Object containing metadata to be displayed per frame / timecode. See `videos.geojson` for an example.

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

### Video creation

The `stac2video.py` utility can be used to prepare videos from Sentinel-2 imagery. The utility also creates a `videos.geojson` file, which will be used by the frontend to place the videos on the map.

The utility will create videos from bi-weekly composites. Each frame in the video will be imagery from a two-weeks interval, where the least cloudy pixel is selected for the imagery from each two weeks.

The key input the user needs to specify is location, a date range, and the number of tiles to create at a specified zoom level. The output of the script will be written to a local folder that is also specified by the user.

The following shows a list of the input parameters

```
>>> stac2video.py --help
Usage: stac2video.py [OPTIONS]

Options:
  --dst PATH        Directory to which output will be written.  [required]
  --coordx FLOAT    Longitude coordinate to selectthe central TMS tile
                    [required]
  --coordy FLOAT    Latitude coordinate to select the central TMS tile
                    [required]
  --zoom INTEGER    Zoom level of the target TMS tiles  [required]
  --start TEXT      Start date for video in YYYY-MM-DD  [required]
  --end TEXT        End date for video in YYYY-MM-DD  [required]
  --height INTEGER  How many tiles to include in Y direction
  --width INTEGER   How many tiles to include in X direction
  --interval TEXT   Time interval to use for compositing imagery. Defaults to
                    14D. This will be passed to the `resample` function on the
                    time dimension from xarray. See https://docs.xarray.dev/en
                    /stable/generated/xarray.DataArray.resample.html
  --up INTEGER      Use higher zoom level to determine resolution of output
                    videos. The default resolution is 256x256 pixels. Up works
                    as multiplier. For instance, for up=1, the resolution of
                    the video will be 512x512 pixels, and up=2 it will be
                    1024x1024 px
  --images          Output each frame as png image as well
  --keep-mp4        Keep intermediary mp4 files
  --help            Show this message and exit.
```

And one example is the following:


```
./stac2video.py --dst=/path/to/exiting/folder/videos --coordx=-9.15032 --coordy=38.72595 --start=2023-01-01 --end=2023-05-01 --zoom=12 --width=5 --height=3
```

The required python packages can be installed using the requirements file

```
pip install -r requirements.txt
```

### Deploying the data
The only thing needed to show the videos online is to make the output of the `stac2video.py` utility accessible through the web.

Once the folder is accessible, you can point videomap.earth to the location of the automatically generated `videos.geojson` file in the folder.

https://videomap.earth/?url=https://s3.eu-west-2.amazonaws.com/videomap.earth/videos/videos.geojson
