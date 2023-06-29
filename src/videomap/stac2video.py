#!/usr/bin/env python

import json
from pathlib import Path
from typing import Tuple

import click
import cv2
import ffmpeg
import morecantile
import numpy
import pystac_client
import stackstac
import xarray
from PIL import Image
from rasterio.enums import Resampling

# 0 NO_DATA
# 1 SATURATED_OR_DEFECTIVE
# 2 DARK_AREA_PIXELS
# 3 CLOUD_SHADOWS
# 4 VEGETATION
# 5 NOT_VEGETATED
# 6 WATER
# 7 UNCLASSIFIED
# 8 CLOUD_MEDIUM_PROBABILITY
# 9 CLOUD_HIGH_PROBABILITY
# 10 THIN_CIRRUS
# 11 SNOW
CLOUDY_OR_NODATA = (0, 3, 8, 9, 10)

catalog = pystac_client.Client.open("https://earth-search.aws.element84.com/v1/")

COLLECTION = "sentinel-2-l2a"

NODATA = 0

tms = morecantile.tms.get("WebMercatorQuad")


def fetch_composites(
    tile: morecantile.commons.Tile,
    start: str,
    end: str,
    interval: str = "14D",
    up: int = 0,
) -> xarray.DataArray:
    search = catalog.search(
        collections=[COLLECTION],
        bbox=tms.bounds(tile),
        datetime=f"{start}/{end}",
    )

    items = search.get_all_items()

    stack = stackstac.stack(
        items,
        bounds=tms.xy_bounds(tile),
        snap_bounds=False,
        epsg=tms.crs.to_epsg(),
        resolution=tms._resolution(tms.matrix(zoom=tile.z + up)),
        dtype="uint16",
        fill_value=0,
        resampling=Resampling.bilinear,
        assets=[
            "blue",
            "green",
            "red",
            "scl",
        ],
    )

    data = stack.compute()

    # Cloud mask
    scl = data.sel(band="scl").astype("uint8")

    cloud_mask = scl.isin(CLOUDY_OR_NODATA)

    # Create composites with cloud mask
    composites_using_cloud_mask = (
        data.where(~cloud_mask)
        .resample(
            time=interval,
            skipna=True,
        )
        .median("time")
    )

    # Frame cloud percentage
    sum_of_not_cloudy_scenes = (
        numpy.logical_not(scl.isin(CLOUDY_OR_NODATA))
        .resample(time=interval, skipna=True)
        .sum()
    )
    at_least_one_cloud_free_pixel = sum_of_not_cloudy_scenes > 0
    per_frame_cloud_percentage = numpy.round(
        1 - at_least_one_cloud_free_pixel.sum(dim=("x", "y")) / scl[0].size, decimals=2
    ).data

    # Create composites without cloud mask
    resampled = data.resample(
        time=interval,
        skipna=True,
    )
    composites_using_all_pixels = resampled.median("time")

    # Collect metadata for all scenes by frame
    meta = []
    for index, slice_key in enumerate(resampled.groups.values()):
        slice = data[slice_key]
        meta.append(
            {
                "title": str(slice.time.data[-1])[:10],
                "description": f"Sentinel-2 composite of {len(slice.time)} images between {str(slice.time.data[0])[:10]} and {str(slice.time.data[-1])[:10]}.",
                "dates": [str(x) for x in slice.time.data],
                "cloud_percentage": per_frame_cloud_percentage[index],
            }
        )

    # Fill pixels in cloud masked composites with pixels from full composite
    return (
        xarray.where(
            numpy.isnan(composites_using_cloud_mask),
            composites_using_all_pixels,
            composites_using_cloud_mask,
        ),
        meta,
    )


def tile_center(tile: morecantile.commons.Tile) -> Tuple[float]:
    bnds = tms.bounds(tile)
    return [
        bnds.left + (bnds.right - bnds.left) / 2,
        bnds.top + (bnds.bottom - bnds.top) / 2,
    ]


@click.command()
@click.option(
    "--dst", required=True, help="Directory to which output will be written.", type=Path
)
@click.option(
    "--coordx",
    required=True,
    help="Longitude coordinate to selectthe central TMS tile",
    type=float,
)
@click.option(
    "--coordy",
    required=True,
    help="Latitude coordinate to select the central TMS tile",
    type=float,
)
@click.option(
    "--zoom", required=True, help="Zoom level of the target TMS tiles", type=int
)
@click.option(
    "--start", required=True, help="Start date for video in YYYY-MM-DD", type=str
)
@click.option("--end", required=True, help="End date for video in YYYY-MM-DD", type=str)
@click.option(
    "--height", default=3, help="How many tiles to include in Y direction", type=int
)
@click.option(
    "--width", default=3, help="How many tiles to include in X direction", type=int
)
@click.option(
    "--interval",
    default="14D",
    help="Time interval to use for compositing imagery. Defaults to 14D. This will be passed to the `resample` function on the time dimension from xarray. See https://docs.xarray.dev/en/stable/generated/xarray.DataArray.resample.html",
    type=str,
)
@click.option(
    "--up",
    default=0,
    type=int,
    help="Use higher zoom level to determine resolution of output videos. The default resolution is 256x256 pixels. Up works as multiplier. For instance, for up=1, the resolution of the video will be 512x512 pixels, and up=2 it will be 1024x1024 pixels",
)
@click.option("--images", is_flag=True, help="Output each frame as png image as well")
@click.option(
    "--keep-mp4",
    is_flag=True,
    help="Keep intermediary mp4 files",
)
def stac_tile(
    dst: Path,
    coordx: float,
    coordy: float,
    zoom: int,
    start: str,
    end: str,
    width: int,
    height: int,
    interval: str,
    up: int,
    images: bool,
    keep_mp4: bool,
) -> None:
    if not dst.exists():
        raise ValueError(
            f"Target folder {dst} does not exist, please create it before running this script."
        )

    orig = tms.tile(coordx, coordy, zoom)

    tiles = []
    for i in range(-1 * int(width / 2), int(width / 2) + 1):
        for j in range(-1 * int(height / 2), int(height / 2) + 1):
            tiles.append(morecantile.Tile(orig.x + i, orig.y + j, orig.z))

    print(f"Collecting videos for {len(tiles)} tiles")

    videos = {
        "type": "FeatureCollection",
        "name": "Videomap",
        "base_url": "videos/",
        "center": tile_center(orig),
        "zoom": zoom,
        "frames": {},
        "features": [],
    }

    for tile in tiles:
        print("Tile", tile)
        composites, meta = fetch_composites(tile, start, end, interval, up)

        filepath = dst / f"videomap-{tile.z}-{tile.x}-{tile.y}.mp4"
        filepathwebm = dst / f"videomap-{tile.z}-{tile.x}-{tile.y}.webm"

        # Create mp4 video
        out = cv2.VideoWriter(
            str(filepath),
            fourcc=cv2.VideoWriter_fourcc(*"mp4v"),
            fps=4,
            frameSize=composites.shape[-2:],
        )
        print(f"Creating videos with frame size of {composites.shape[-2:]}")
        for img in composites:
            # Prepare video data
            bgr = img.data[:3].transpose(1, 2, 0)
            bgr = 255 * bgr / 2000
            bgr = numpy.clip(bgr, 0, 255).astype("uint8")
            out.write(bgr)
            if images:
                im = Image.fromarray(
                    numpy.array((bgr[:, :, 2], bgr[:, :, 1], bgr[:, :, 0])).transpose(
                        1, 2, 0
                    )
                )
                imgpath = (
                    dst
                    / f"videomap-{tile.z}-{tile.x}-{tile.y}-{str(img.time.data)[:10]}.png"
                )
                im.save(imgpath)

        out.release()

        # Convert mp4 to webm
        ffmpeg.input(str(filepath)).output(str(filepathwebm)).run(overwrite_output=True)

        # Delete mp4 video
        if not keep_mp4:
            filepath.unlink()

        # Add tms tile feature to videos geojson object
        feat = tms.feature(tile)
        feat["properties"]["url"] = f"videomap-{tile.z}-{tile.x}-{tile.y}.webm"
        feat["properties"]["metadata"] = meta

        videos["features"].append(feat)

    frame_cloud_percentage_averages = []
    frame_dates = []
    for frame in range(len(composites.time)):
        # Compute unique list of dates from all tiles for this frame
        dates = set()
        for feat in videos["features"]:
            dates |= set(feat["properties"]["metadata"][frame]["dates"])
        frame_dates.append(list(dates))
        # Compute average cloud cover from all tiles for this frame
        avg = numpy.average(
            [
                feat["properties"]["metadata"][frame]["cloud_percentage"]
                for feat in videos["features"]
            ]
        )
        frame_cloud_percentage_averages.append(avg)

    videos["frames"][str(frame)] = {
        "title": frame_dates[-1][:10],
        "description": f"Sentinel-2 composite of {len(frame_dates)} images between {frame_dates[0][:10]} and {frame_dates[-1][:10]}.",
        "frame_input_dates": frame_dates,
        "frame_average_cloud_cover": frame_cloud_percentage_averages,
    }
    with open(dst / f"videos.geojson", "w") as f:
        json.dump(videos, f)


if __name__ == "__main__":
    stac_tile()
