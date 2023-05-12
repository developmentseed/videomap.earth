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
from rasterio.enums import Resampling

# pip install opencv-python morecantile numpy pystac_client stackstac xarray rasterio click ffmpeg-python

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

catalog = pystac_client.Client.open("https://earth-search.aws.element84.com/v0/")

COLLECTION = "sentinel-s2-l2a-cogs"

tms = morecantile.tms.get("WebMercatorQuad")


def fetch_composites(
    tile: morecantile.commons.Tile, start: str, end: str, interval: str = "14D"
) -> xarray.DataArray:
    search = catalog.search(
        collections=[COLLECTION],
        bbox=tms.bounds(tile),
        datetime=f"{start}/{end}",
    )

    items = search.get_all_items()

    print(f"Found {len(items)} items")

    stack = stackstac.stack(
        items,
        bounds=tms.xy_bounds(tile),
        snap_bounds=False,
        epsg=tms.crs.to_epsg(),
        resolution=tms._resolution(tms.matrix(zoom=tile.z)),
        dtype="uint16",
        fill_value=0,
        resampling=Resampling.bilinear,
        assets=[
            "B02",
            "B03",
            "B04",
            "SCL",
        ],
    )

    data = stack.compute()

    # Cloud mask
    scl = data.sel(band="SCL").astype("uint8")

    cloud_mask = scl.isin(CLOUDY_OR_NODATA)

    # Create composites with cloud mask
    composites_using_cloud_mask = (
        data.where(~cloud_mask)
        .resample(time=interval, skipna=True, origin=start, closed="right")
        .median("time")
    )

    # Create composites without cloud mask
    composites_using_all_pixels = data.resample(
        time=interval, skipna=True, origin=start, closed="right"
    ).median("time")

    # Fill pixels in cloud masked composites with pixels from full composite
    return xarray.where(
        numpy.isnan(composites_using_cloud_mask),
        composites_using_all_pixels,
        composites_using_cloud_mask,
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
):
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
        "zoom": zoom - 1,
        "frames": {},
        "features": [],
    }

    for tile in tiles:
        composites = fetch_composites(tile, start, end, interval)

        filepath = dst / f"videomap-{tile.z}-{tile.x}-{tile.y}.mp4"
        filepathwebm = dst / f"videomap-{tile.z}-{tile.x}-{tile.y}.webm"

        # Create mp4 video
        out = cv2.VideoWriter(
            str(filepath),
            fourcc=cv2.VideoWriter_fourcc(*"mp4v"),
            fps=4,
            frameSize=composites.shape[-2:],
        )
        for img in composites:
            bgr = img.data[:3].transpose(1, 2, 0)
            bgr = 255 * bgr / 3000
            bgr = numpy.clip(bgr, 0, 255).astype("uint8")
            out.write(bgr)
        out.release()

        # Convert mp4 to webm
        ffmpeg.input(str(filepath)).output(str(filepathwebm)).run(overwrite_output=True)

        # Delete mp4 video
        filepath.unlink()

        # Add tms tile feature to videos geojson object
        feat = tms.feature(tile)
        feat["properties"]["url"] = f"videomap-{tile.z}-{tile.x}-{tile.y}.webm"

        videos["features"].append(feat)

    # Add date information per frame
    for index, date in enumerate(composites.time.data):
        videos["frames"][str(index)] = {
            "title": str(date)[:10],
            "description": f"Sentinel-2 composite of images from the two weeks prior to {str(date)[:10]}.",
        }

    with open(dst / f"videos.geojson", "w") as f:
        json.dump(videos, f)


if __name__ == "__main__":
    stac_tile()
