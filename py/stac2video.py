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
    tile: morecantile.commons.Tile, start: str, end: str
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
        .resample(time="14D", skipna=True, origin=start, closed="right")
        .median("time")
    )

    # Create composites without cloud mask
    composites_using_all_pixels = data.resample(
        time="14D", skipna=True, origin=start, closed="right"
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
    help="Longitude coordinate to select TMS tile",
    type=float,
)
@click.option(
    "--coordy", required=True, help="Latitude coordinate to select TMS tile", type=float
)
@click.option("--zoom", required=True, help="Zoom level of TMS tile", type=int)
@click.option(
    "--start", required=True, help="Start date for video in YYYY-MM-DD", type=str
)
@click.option("--end", required=True, help="End date for video in YYYY-MM-DD", type=str)
@click.option(
    "--level_down",
    default=1,
    help="How many TMX zoom levels to go down from main zoom level",
    type=int,
)
def stac_tile(
    dst: Path,
    coordx: float,
    coordy: float,
    zoom: int,
    start: str,
    end: str,
    level_down: int = 1,
):
    original_tile = tms.tile(coordx, coordy, zoom)

    tiles = tms.children(original_tile, zoom=zoom + level_down)

    videos = {
        "type": "FeatureCollection",
        "name": "Videomap",
        "base_url": "videos/",
        "center": tile_center(original_tile),
        "zoom": zoom - 1,
        "frames": {},
        "features": [],
    }

    for tile in tiles:
        composites = fetch_composites(tile, start, end)

        # Create video path
        video_path = dst / "videos"
        video_path.mkdir(exist_ok=True)
        filepath = video_path / f"videomap-{tile.z}-{tile.x}-{tile.y}.mp4"
        filepathwebm = video_path / f"videomap-{tile.z}-{tile.x}-{tile.y}.webm"

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

    with open(dst / f"videos.geojson", "w") as f:
        json.dump(videos, f)


if __name__ == "__main__":
    # stac_tile()
    stac_tile(
        dst=Path("/home/tam/Desktop/videomap"),
        coordx=-9.15032,
        coordy=38.72595,
        start="2022-01-01",
        end="2022-01-12",
        zoom=11,
        level_down=2,
    )