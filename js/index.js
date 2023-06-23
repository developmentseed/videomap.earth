var DateTime = luxon.DateTime;

// TO MAKE THE MAP APPEAR YOU MUST
// ADD YOUR ACCESS TOKEN FROM
// https://account.mapbox.com
mapboxgl.accessToken =
  "pk.eyJ1IjoiZ2VvaGFja2VyIiwiYSI6ImNsajN4ZnA0MDFpYWczZ3A5MWxnZHBkdG8ifQ.Sot_30eI1tfJ6sfNNxPHtQ";

const PLAY = "▶";
const PAUSE = "⏸";

const SPEEDS = [0.1, 0.5, 1, 2, 4];
let currentSpeed = 2;
const ALPHAS = [0, 0.25, 0.5, 0.75, 1];
let currentAlpha = 4;

const SCENES = [
  {
    title: "Lisbon, Portugal",
    url: "videos/videos.geojson",
    center: [-9.140621920671814, 38.68550735632379],
    zoom: 11,
  },
  {
    title: "Mountains around Interlaken, Switzerland",
    url: "https://s3.eu-west-2.amazonaws.com/videomap.earth/videos-interlaken/videos.geojson",
    center: [7.888183593749985, 46.634348599760884],
    zoom: 12,
  },
  {
    title: "Atacama desert",
    url: "https://s3.eu-west-2.amazonaws.com/videomap.earth/videos-atacama/videos.geojson",
    center: [-68.4228515625, -26.863273833375],
    zoom: 12,
  },
  {
    title: "Alentejo Portugal",
    url: "https://videomap.earth/?url=https://s3.eu-west-2.amazonaws.com/videomap.earth/videos-alentejo/videos.geojson",
    center: [-8.107910156250014, 37.77071269861352],
    zoom: 13,
  },
  {
    title: "Agricultural fields in India",
    url: "https://videomap.earth/?url=https://s3.eu-west-2.amazonaws.com/videomap.earth/videos-india-agriculture/videos.geojson",
    center: [78.211669921875, 17.256236015763818],
    zoom: 13,
  },

];

const hasUrl = getUrlFromUrl() !== null;
const dataUrl = getUrlFromUrl() || SCENES[0].url;
const scene = SCENES.find((s) => s.url === dataUrl);

const ui = {
  main: document.getElementById("main"),
  about: document.getElementById("about"),
  explorePlaces: document.getElementById("explorePlaces"),
  togglePlay: document.getElementById("togglePlay"),
  speed: document.getElementById("speed"),
  alpha: document.getElementById("alpha"),
  dates: document.getElementById("dates"),
  progressFill: document.getElementById("progressFill"),
  title: document.getElementById("title"),
  currentFrameDate: document.getElementById("currentFrameDate"),
  currentFrameTitle: document.getElementById("currentFrameTitle"),
  aboutOverlay: document.getElementById("aboutOverlay"),
  dismissIntro: document.getElementById("dismissIntro"),
};

const BASE_STYLE = {
  version: 8,
  fog: {
    range: [1, 10],
    color: [
      "interpolate",
      ["exponential", 1.2],
      ["zoom"],
      5.5,
      "hsl(240, 12%, 70%)",
      6,
      "hsl(0, 0%, 100%)",
    ],
    "high-color": [
      "interpolate",
      ["exponential", 1.2],
      ["zoom"],
      5.5,
      "hsl(240, 12%, 7%)",
      6,
      "hsl(38, 63%, 84%)",
    ],
    "space-color": [
      "interpolate",
      ["exponential", 1.2],
      ["zoom"],
      5.5,
      "hsl(240, 12%, 9%)",
      6,
      "hsl(199, 61%, 80%)",
    ],
    "horizon-blend": [
      "interpolate",
      ["exponential", 1.2],
      ["zoom"],
      5.5,
      0.008,
      6,
      0.15,
    ],
    "star-intensity": [
      "interpolate",
      ["exponential", 1.2],
      ["zoom"],
      5.5,
      0.1,
      6,
      0,
    ],
  },
  sources: {
    "mapbox://mapbox.satellite": {
      url: "mapbox://mapbox.satellite",
      type: "raster",
      tileSize: 256,
    },
    composite: {
      url: "mapbox://mapbox.mapbox-streets-v8",
      type: "vector",
    },
  },
  sprite:
    "mapbox://sprites/nerik8000/cliyas0pw008m01pbdu02a20y/1kpa8iifzp41g67iup212yv0b",
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  layers: [
    {
      id: "background",
      type: "background",
      metadata: {
        "mapbox:featureComponent": "satellite",
        "mapbox:group": "Satellite imagery, land",
      },
      layout: {},
      paint: {
        "background-color": "hsl(222, 56%, 4%)",
        "background-opacity": 0.9,
      },
    },
    {
      id: "satellite",
      type: "raster",
      metadata: {
        "mapbox:featureComponent": "satellite",
        "mapbox:group": "Satellite imagery, land",
      },
      source: "mapbox://mapbox.satellite",
      layout: {},
      paint: {},
    },
    {
      id: "admin-1-boundary-bg",
      type: "line",
      metadata: {
        "mapbox:featureComponent": "admin-boundaries",
        "mapbox:group": "Administrative boundaries, admin",
      },
      source: "composite",
      "source-layer": "admin",
      minzoom: 7,
      filter: [
        "all",
        ["==", ["get", "admin_level"], 1],
        ["==", ["get", "maritime"], "false"],
        ["match", ["get", "worldview"], ["all", "US"], true, false],
      ],
      paint: {
        "line-color": "hsl(260, 45%, 0%)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3, 12, 6],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0, 8, 0.5],
        "line-dasharray": [1, 0],
        "line-blur": ["interpolate", ["linear"], ["zoom"], 3, 0, 12, 3],
      },
    },
    {
      id: "admin-0-boundary-bg",
      type: "line",
      metadata: {
        "mapbox:featureComponent": "admin-boundaries",
        "mapbox:group": "Administrative boundaries, admin",
      },
      source: "composite",
      "source-layer": "admin",
      minzoom: 1,
      filter: [
        "all",
        ["==", ["get", "admin_level"], 0],
        ["==", ["get", "maritime"], "false"],
        ["match", ["get", "worldview"], ["all", "US"], true, false],
      ],
      paint: {
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 4, 12, 8],
        "line-color": "hsl(260, 45%, 0%)",
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0, 4, 0.5],
        "line-blur": ["interpolate", ["linear"], ["zoom"], 3, 0, 12, 2],
      },
    },
    {
      id: "admin-1-boundary",
      type: "line",
      metadata: {
        "mapbox:featureComponent": "admin-boundaries",
        "mapbox:group": "Administrative boundaries, admin",
      },
      source: "composite",
      "source-layer": "admin",
      minzoom: 2,
      filter: [
        "all",
        ["==", ["get", "admin_level"], 1],
        ["==", ["get", "maritime"], "false"],
        ["match", ["get", "worldview"], ["all", "US"], true, false],
      ],
      layout: {},
      paint: {
        "line-dasharray": [
          "step",
          ["zoom"],
          ["literal", [2, 0]],
          7,
          ["literal", [2, 2, 6, 2]],
        ],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.3, 12, 1.5],
        "line-opacity": ["interpolate", ["linear"], ["zoom"], 2, 0, 3, 1],
        "line-color": "hsl(260, 15%, 85%)",
      },
    },
    {
      id: "admin-0-boundary",
      type: "line",
      metadata: {
        "mapbox:featureComponent": "admin-boundaries",
        "mapbox:group": "Administrative boundaries, admin",
      },
      source: "composite",
      "source-layer": "admin",
      minzoom: 1,
      filter: [
        "all",
        ["==", ["get", "admin_level"], 0],
        ["==", ["get", "disputed"], "false"],
        ["==", ["get", "maritime"], "false"],
        ["match", ["get", "worldview"], ["all", "US"], true, false],
      ],
      layout: {},
      paint: {
        "line-color": "hsl(260, 15%, 80%)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 12, 2],
        "line-dasharray": [
          "step",
          ["zoom"],
          ["literal", [2, 0]],
          7,
          ["literal", [2, 2, 6, 2]],
        ],
      },
    },
    {
      id: "admin-0-boundary-disputed",
      type: "line",
      metadata: {
        "mapbox:featureComponent": "admin-boundaries",
        "mapbox:group": "Administrative boundaries, admin",
      },
      source: "composite",
      "source-layer": "admin",
      minzoom: 1,
      filter: [
        "all",
        ["==", ["get", "disputed"], "true"],
        ["==", ["get", "admin_level"], 0],
        ["==", ["get", "maritime"], "false"],
        ["match", ["get", "worldview"], ["all", "US"], true, false],
      ],
      paint: {
        "line-color": "hsl(260, 15%, 80%)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 12, 2],
        "line-dasharray": [
          "step",
          ["zoom"],
          ["literal", [3, 2, 5]],
          7,
          ["literal", [2, 1.5]],
        ],
      },
    },
    {
      id: "waterway-label",
      type: "symbol",
      metadata: {
        "mapbox:featureComponent": "natural-features",
        "mapbox:group": "Natural features, natural-labels",
      },
      source: "composite",
      "source-layer": "natural_label",
      minzoom: 13,
      filter: [
        "all",
        [
          "match",
          ["get", "class"],
          [
            "canal",
            "river",
            "stream",
            "disputed_canal",
            "disputed_river",
            "disputed_stream",
          ],
          ["match", ["get", "worldview"], ["all", "US"], true, false],
          false,
        ],
        ["==", ["geometry-type"], "LineString"],
      ],
      layout: {
        "text-font": ["Open Sans Light Italic", "Arial Unicode MS Regular"],
        "text-max-angle": 30,
        "symbol-spacing": [
          "interpolate",
          ["linear", 1],
          ["zoom"],
          15,
          250,
          17,
          400,
        ],
        "text-size": ["interpolate", ["linear"], ["zoom"], 13, 12, 18, 18],
        "symbol-placement": "line",
        "text-pitch-alignment": "viewport",
        "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
      },
      paint: {
        "text-color": "hsl(240, 68%, 90%)",
        "text-halo-color": "hsla(0, 0%, 0%, 0.5)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
      },
    },
    {
      id: "natural-line-label",
      type: "symbol",
      metadata: {
        "mapbox:featureComponent": "natural-features",
        "mapbox:group": "Natural features, natural-labels",
      },
      source: "composite",
      "source-layer": "natural_label",
      minzoom: 4,
      filter: [
        "all",
        [
          "match",
          ["get", "class"],
          ["glacier", "landform", "disputed_glacier", "disputed_landform"],
          ["match", ["get", "worldview"], ["all", "US"], true, false],
          false,
        ],
        ["<=", ["get", "filterrank"], 2],
        ["==", ["geometry-type"], "LineString"],
      ],
      layout: {
        "text-size": [
          "step",
          ["zoom"],
          ["step", ["get", "sizerank"], 18, 5, 12],
          17,
          ["step", ["get", "sizerank"], 18, 13, 12],
        ],
        "text-max-angle": 30,
        "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
        "text-font": ["Open Sans SemiBold", "Arial Unicode MS Bold"],
        "symbol-placement": "line-center",
        "text-pitch-alignment": "viewport",
      },
      paint: {
        "text-halo-width": 0.5,
        "text-halo-color": "hsl(0, 0%, 0%)",
        "text-halo-blur": 0.5,
        "text-color": "hsl(0, 0%, 100%)",
      },
    },
    {
      id: "natural-point-label",
      type: "symbol",
      metadata: {
        "mapbox:featureComponent": "natural-features",
        "mapbox:group": "Natural features, natural-labels",
      },
      source: "composite",
      "source-layer": "natural_label",
      minzoom: 4,
      filter: [
        "all",
        [
          "match",
          ["get", "class"],
          [
            "dock",
            "glacier",
            "landform",
            "water_feature",
            "wetland",
            "disputed_dock",
            "disputed_glacier",
            "disputed_landform",
            "disputed_water_feature",
            "disputed_wetland",
          ],
          ["match", ["get", "worldview"], ["all", "US"], true, false],
          false,
        ],
        ["<=", ["get", "filterrank"], 2],
        ["==", ["geometry-type"], "Point"],
      ],
      layout: {
        "text-size": [
          "step",
          ["zoom"],
          ["step", ["get", "sizerank"], 18, 5, 12],
          17,
          ["step", ["get", "sizerank"], 18, 13, 12],
        ],
        "icon-image": [
          "case",
          ["has", "maki_beta"],
          [
            "coalesce",
            ["image", ["get", "maki_beta"]],
            ["image", ["get", "maki"]],
          ],
          ["image", ["get", "maki"]],
        ],
        "text-font": ["Open Sans SemiBold", "Arial Unicode MS Bold"],
        "text-offset": [
          "step",
          ["zoom"],
          [
            "step",
            ["get", "sizerank"],
            ["literal", [0, 0]],
            5,
            ["literal", [0, 0.55]],
          ],
          17,
          [
            "step",
            ["get", "sizerank"],
            ["literal", [0, 0]],
            13,
            ["literal", [0, 0.6000000000000001]],
          ],
        ],
        "text-anchor": [
          "step",
          ["zoom"],
          ["step", ["get", "sizerank"], "center", 5, "top"],
          17,
          ["step", ["get", "sizerank"], "center", 13, "top"],
        ],
        "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
      },
      paint: {
        "icon-opacity": [
          "step",
          ["zoom"],
          ["step", ["get", "sizerank"], 0, 5, 1],
          17,
          ["step", ["get", "sizerank"], 0, 13, 1],
        ],
        "text-halo-color": "hsl(0, 0%, 0%)",
        "text-halo-width": 0.5,
        "text-halo-blur": 0.5,
        "text-color": "hsl(0, 0%, 100%)",
      },
    },
    {
      id: "water-line-label",
      type: "symbol",
      metadata: {
        "mapbox:featureComponent": "natural-features",
        "mapbox:group": "Natural features, natural-labels",
      },
      source: "composite",
      "source-layer": "natural_label",
      minzoom: 1,
      filter: [
        "all",
        [
          "match",
          ["get", "class"],
          [
            "bay",
            "ocean",
            "reservoir",
            "sea",
            "water",
            "disputed_bay",
            "disputed_ocean",
            "disputed_reservoir",
            "disputed_sea",
            "disputed_water",
          ],
          ["match", ["get", "worldview"], ["all", "US"], true, false],
          false,
        ],
        ["==", ["geometry-type"], "LineString"],
      ],
      layout: {
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          ["*", ["-", 16, ["sqrt", ["get", "sizerank"]]], 1],
          22,
          ["*", ["-", 22, ["sqrt", ["get", "sizerank"]]], 1],
        ],
        "text-max-angle": 30,
        "text-letter-spacing": [
          "match",
          ["get", "class"],
          "ocean",
          0.25,
          ["sea", "bay"],
          0.15,
          0,
        ],
        "text-font": ["Open Sans Light Italic", "Arial Unicode MS Regular"],
        "symbol-placement": "line-center",
        "text-pitch-alignment": "viewport",
        "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
      },
      paint: {
        "text-color": [
          "match",
          ["get", "class"],
          ["bay", "ocean", "sea"],
          "hsl(240, 96%, 82%)",
          "hsl(240, 68%, 90%)",
        ],
        "text-halo-color": "hsla(0, 0%, 0%, 0.5)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
      },
    },
    {
      id: "water-point-label",
      type: "symbol",
      metadata: {
        "mapbox:featureComponent": "natural-features",
        "mapbox:group": "Natural features, natural-labels",
      },
      source: "composite",
      "source-layer": "natural_label",
      minzoom: 1,
      filter: [
        "all",
        [
          "match",
          ["get", "class"],
          [
            "bay",
            "ocean",
            "reservoir",
            "sea",
            "water",
            "disputed_bay",
            "disputed_ocean",
            "disputed_reservoir",
            "disputed_sea",
            "disputed_water",
          ],
          ["match", ["get", "worldview"], ["all", "US"], true, false],
          false,
        ],
        ["==", ["geometry-type"], "Point"],
      ],
      layout: {
        "text-line-height": 1.3,
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          ["*", ["-", 16, ["sqrt", ["get", "sizerank"]]], 1],
          22,
          ["*", ["-", 22, ["sqrt", ["get", "sizerank"]]], 1],
        ],
        "text-font": ["Open Sans Light Italic", "Arial Unicode MS Regular"],
        "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
        "text-letter-spacing": [
          "match",
          ["get", "class"],
          "ocean",
          0.25,
          ["bay", "sea"],
          0.15,
          0.01,
        ],
        "text-max-width": [
          "match",
          ["get", "class"],
          "ocean",
          4,
          "sea",
          5,
          ["bay", "water"],
          7,
          10,
        ],
      },
      paint: {
        "text-color": [
          "match",
          ["get", "class"],
          ["bay", "ocean", "sea"],
          "hsl(240, 96%, 82%)",
          "hsl(240, 68%, 90%)",
        ],
        "text-halo-color": "hsla(0, 0%, 0%, 0.5)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
      },
    },
    {
      id: "poi-label",
      type: "symbol",
      metadata: {
        "mapbox:featureComponent": "point-of-interest-labels",
        "mapbox:group": "Point of interest labels, poi-labels",
      },
      source: "composite",
      "source-layer": "poi_label",
      minzoom: 6,
      filter: [
        "<=",
        ["get", "filterrank"],
        ["+", ["step", ["zoom"], 0, 16, 1, 17, 2], 0],
      ],
      layout: {
        "text-size": [
          "step",
          ["zoom"],
          ["step", ["get", "sizerank"], 18, 5, 12],
          17,
          ["step", ["get", "sizerank"], 18, 13, 12],
        ],
        "icon-image": [
          "case",
          ["has", "maki_beta"],
          [
            "coalesce",
            ["image", ["get", "maki_beta"]],
            ["image", ["get", "maki"]],
          ],
          ["image", ["get", "maki"]],
        ],
        "text-font": ["Open Sans SemiBold", "Arial Unicode MS Bold"],
        "text-offset": [
          "step",
          ["zoom"],
          [
            "step",
            ["get", "sizerank"],
            ["literal", [0, 0]],
            5,
            ["literal", [0, 0.8]],
          ],
          17,
          [
            "step",
            ["get", "sizerank"],
            ["literal", [0, 0]],
            13,
            ["literal", [0, 0.8]],
          ],
        ],
        "text-anchor": [
          "step",
          ["zoom"],
          ["step", ["get", "sizerank"], "center", 5, "top"],
          17,
          ["step", ["get", "sizerank"], "center", 13, "top"],
        ],
        "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
      },
      paint: {
        "icon-opacity": [
          "step",
          ["zoom"],
          ["step", ["get", "sizerank"], 0, 5, 1],
          17,
          ["step", ["get", "sizerank"], 0, 13, 1],
        ],
        "text-halo-color": "hsl(0, 0%, 0%)",
        "text-halo-width": 0.5,
        "text-halo-blur": 0.5,
        "text-color": [
          "match",
          ["get", "class"],
          "park_like",
          "hsl(110, 100%, 85%)",
          "education",
          "hsl(30, 100%, 85%)",
          "medical",
          "hsl(0, 100%, 85%)",
          "hsl(0, 0%, 100%)",
        ],
      },
    },
    {
      id: "settlement-subdivision-label",
      type: "symbol",
      metadata: {
        "mapbox:featureComponent": "place-labels",
        "mapbox:group": "Place labels, place-labels",
      },
      source: "composite",
      "source-layer": "place_label",
      minzoom: 10,
      maxzoom: 15,
      filter: [
        "all",
        [
          "match",
          ["get", "class"],
          ["settlement_subdivision", "disputed_settlement_subdivision"],
          ["match", ["get", "worldview"], ["all", "US"], true, false],
          false,
        ],
        ["<=", ["get", "filterrank"], 1],
      ],
      layout: {
        "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
        "text-transform": "uppercase",
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        "text-letter-spacing": ["match", ["get", "type"], "suburb", 0.15, 0.05],
        "text-max-width": 7,
        "text-padding": 3,
        "text-size": [
          "interpolate",
          ["cubic-bezier", 0.5, 0, 1, 1],
          ["zoom"],
          11,
          ["match", ["get", "type"], "suburb", 12.100000000000001, 11.55],
          15,
          ["match", ["get", "type"], "suburb", 16.5, 15.400000000000002],
        ],
      },
      paint: {
        "text-halo-color": "hsla(0, 5%, 0%, 0.75)",
        "text-halo-width": 1,
        "text-color": "hsl(0, 0%, 100%)",
        "text-halo-blur": 0.5,
      },
    },
    {
      id: "settlement-minor-label",
      type: "symbol",
      metadata: {
        "mapbox:featureComponent": "place-labels",
        "mapbox:group": "Place labels, place-labels",
      },
      source: "composite",
      "source-layer": "place_label",
      minzoom: 2,
      maxzoom: 13,
      filter: [
        "all",
        ["<=", ["get", "filterrank"], 1],
        [
          "match",
          ["get", "class"],
          ["settlement", "disputed_settlement"],
          ["match", ["get", "worldview"], ["all", "US"], true, false],
          false,
        ],
        [
          "step",
          ["zoom"],
          [">", ["get", "symbolrank"], 6],
          4,
          [">=", ["get", "symbolrank"], 7],
          6,
          [">=", ["get", "symbolrank"], 8],
          7,
          [">=", ["get", "symbolrank"], 10],
          10,
          [">=", ["get", "symbolrank"], 11],
          11,
          [">=", ["get", "symbolrank"], 13],
          12,
          [">=", ["get", "symbolrank"], 15],
        ],
      ],
      layout: {
        "text-line-height": 1.1,
        "text-size": [
          "interpolate",
          ["cubic-bezier", 0.2, 0, 0.9, 1],
          ["zoom"],
          3,
          ["step", ["get", "symbolrank"], 12.100000000000001, 9, 11],
          6,
          [
            "step",
            ["get", "symbolrank"],
            15.400000000000002,
            9,
            13.200000000000001,
            12,
            11,
          ],
          8,
          [
            "step",
            ["get", "symbolrank"],
            17.6,
            9,
            15.400000000000002,
            12,
            13.200000000000001,
            15,
            11,
          ],
          13,
          [
            "step",
            ["get", "symbolrank"],
            24.200000000000003,
            9,
            22,
            12,
            17.6,
            15,
            15.400000000000002,
          ],
        ],
        "text-radial-offset": [
          "step",
          ["zoom"],
          ["match", ["get", "capital"], 2, 0.6, 0.55],
          8,
          0,
        ],
        "symbol-sort-key": ["get", "symbolrank"],
        "icon-image": [
          "step",
          ["zoom"],
          [
            "case",
            ["==", ["get", "capital"], 2],
            "border-dot-13",
            ["step", ["get", "symbolrank"], "dot-11", 9, "dot-10", 11, "dot-9"],
          ],
          8,
          "",
        ],
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        "text-justify": "auto",
        "text-anchor": ["step", ["zoom"], ["get", "text_anchor"], 8, "center"],
        "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
        "text-max-width": 7,
      },
      paint: {
        "text-color": "hsl(0, 0%, 95%)",
        "text-halo-color": "hsl(0, 5%, 0%)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
      },
    },
    {
      id: "settlement-major-label",
      type: "symbol",
      metadata: {
        "mapbox:featureComponent": "place-labels",
        "mapbox:group": "Place labels, place-labels",
      },
      source: "composite",
      "source-layer": "place_label",
      minzoom: 2,
      maxzoom: 15,
      filter: [
        "all",
        ["<=", ["get", "filterrank"], 1],
        [
          "match",
          ["get", "class"],
          ["settlement", "disputed_settlement"],
          ["match", ["get", "worldview"], ["all", "US"], true, false],
          false,
        ],
        [
          "step",
          ["zoom"],
          false,
          2,
          ["<=", ["get", "symbolrank"], 6],
          4,
          ["<", ["get", "symbolrank"], 7],
          6,
          ["<", ["get", "symbolrank"], 8],
          7,
          ["<", ["get", "symbolrank"], 10],
          10,
          ["<", ["get", "symbolrank"], 11],
          11,
          ["<", ["get", "symbolrank"], 13],
          12,
          ["<", ["get", "symbolrank"], 15],
          13,
          [">=", ["get", "symbolrank"], 11],
          14,
          [">=", ["get", "symbolrank"], 15],
        ],
      ],
      layout: {
        "text-line-height": 1.1,
        "text-size": [
          "interpolate",
          ["cubic-bezier", 0.2, 0, 0.9, 1],
          ["zoom"],
          3,
          ["step", ["get", "symbolrank"], 14.3, 6, 12.100000000000001],
          6,
          ["step", ["get", "symbolrank"], 19.8, 6, 17.6, 7, 15.400000000000002],
          8,
          ["step", ["get", "symbolrank"], 22, 9, 17.6, 10, 15.400000000000002],
          15,
          [
            "step",
            ["get", "symbolrank"],
            26.400000000000002,
            9,
            22,
            12,
            17.6,
            15,
            15.400000000000002,
          ],
        ],
        "text-radial-offset": [
          "step",
          ["zoom"],
          ["match", ["get", "capital"], 2, 0.6, 0.55],
          8,
          0,
        ],
        "symbol-sort-key": ["get", "symbolrank"],
        "icon-image": [
          "step",
          ["zoom"],
          [
            "case",
            ["==", ["get", "capital"], 2],
            "border-dot-13",
            ["step", ["get", "symbolrank"], "dot-11", 9, "dot-10", 11, "dot-9"],
          ],
          8,
          "",
        ],
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        "text-justify": [
          "step",
          ["zoom"],
          [
            "match",
            ["get", "text_anchor"],
            ["left", "bottom-left", "top-left"],
            "left",
            ["right", "bottom-right", "top-right"],
            "right",
            "center",
          ],
          8,
          "center",
        ],
        "text-anchor": ["step", ["zoom"], ["get", "text_anchor"], 8, "center"],
        "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
        "text-max-width": 7,
      },
      paint: {
        "text-color": "hsl(0, 0%, 95%)",
        "text-halo-color": "hsl(0, 5%, 0%)",
        "text-halo-width": 1,
        "text-halo-blur": 1,
      },
    },
    {
      id: "state-label",
      type: "symbol",
      metadata: {
        "mapbox:featureComponent": "place-labels",
        "mapbox:group": "Place labels, place-labels",
      },
      source: "composite",
      "source-layer": "place_label",
      minzoom: 3,
      maxzoom: 9,
      filter: [
        "match",
        ["get", "class"],
        ["state", "disputed_state"],
        ["match", ["get", "worldview"], ["all", "US"], true, false],
        false,
      ],
      layout: {
        "text-size": [
          "interpolate",
          ["cubic-bezier", 0.85, 0.7, 0.65, 1],
          ["zoom"],
          4,
          ["step", ["get", "symbolrank"], 9.9, 6, 8.8, 7, 7.700000000000001],
          9,
          ["step", ["get", "symbolrank"], 23.1, 6, 17.6, 7, 15.400000000000002],
        ],
        "text-transform": "uppercase",
        "text-font": ["Open Sans SemiBold", "Arial Unicode MS Bold"],
        "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
        "text-letter-spacing": 0.15,
        "text-max-width": 6,
      },
      paint: {
        "text-color": "hsl(0, 0%, 95%)",
        "text-halo-color": "hsl(0, 5%, 0%)",
        "text-halo-width": 1,
        "text-opacity": 0.5,
      },
    },
    {
      id: "country-label",
      type: "symbol",
      metadata: {
        "mapbox:featureComponent": "place-labels",
        "mapbox:group": "Place labels, place-labels",
      },
      source: "composite",
      "source-layer": "place_label",
      minzoom: 1,
      maxzoom: 10,
      filter: [
        "match",
        ["get", "class"],
        ["country", "disputed_country"],
        ["match", ["get", "worldview"], ["all", "US"], true, false],
        false,
      ],
      layout: {
        "icon-image": "",
        "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
        "text-line-height": 1.1,
        "text-max-width": 6,
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        "text-radial-offset": ["step", ["zoom"], 0.6, 8, 0],
        "text-justify": [
          "step",
          ["zoom"],
          [
            "match",
            ["get", "text_anchor"],
            ["left", "bottom-left", "top-left"],
            "left",
            ["right", "bottom-right", "top-right"],
            "right",
            "center",
          ],
          7,
          "auto",
        ],
        "text-size": [
          "interpolate",
          ["cubic-bezier", 0.2, 0, 0.7, 1],
          ["zoom"],
          1,
          ["step", ["get", "symbolrank"], 12.100000000000001, 4, 9.9, 5, 8.8],
          9,
          [
            "step",
            ["get", "symbolrank"],
            24.200000000000003,
            4,
            20.900000000000002,
            5,
            18.700000000000003,
          ],
        ],
      },
      paint: {
        "icon-opacity": [
          "step",
          ["zoom"],
          ["case", ["has", "text_anchor"], 1, 0],
          7,
          0,
        ],
        "text-color": "hsl(0, 0%, 95%)",
        "text-halo-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          "hsla(0, 5%, 0%, 0.75)",
          3,
          "hsl(0, 5%, 0%)",
        ],
        "text-halo-width": 1.25,
      },
    },
    {
      id: "continent-label",
      type: "symbol",
      metadata: {
        "mapbox:featureComponent": "place-labels",
        "mapbox:group": "Place labels, place-labels",
      },
      source: "composite",
      "source-layer": "natural_label",
      minzoom: 0.75,
      maxzoom: 3,
      filter: ["==", ["get", "class"], "continent"],
      layout: {
        "text-field": ["coalesce", ["get", "name_en"], ["get", "name"]],
        "text-line-height": 1.1,
        "text-max-width": 6,
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
        "text-size": [
          "interpolate",
          ["exponential", 0.5],
          ["zoom"],
          0,
          11,
          2.5,
          16.5,
        ],
        "text-transform": "uppercase",
        "text-letter-spacing": 0.05,
      },
      paint: {
        "text-color": "hsl(0, 0%, 95%)",
        "text-halo-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          "hsla(0, 5%, 0%, 0.75)",
          3,
          "hsl(0, 5%, 0%)",
        ],
        "text-halo-width": 1.5,
        "text-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          0.8,
          1.5,
          0.5,
          2.5,
          0,
        ],
      },
    },
    {
      id: "markers",
      type: "symbol",
      source: "markers",
      layout: { "icon-image": "marker" },
      paint: {},
    },
  ],
};

BASE_STYLE.sources.markers = {
  type: "geojson",
  data: {
    type: "FeatureCollection",
    features: SCENES.map((scene) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: scene.center,
      },
      properties: {
        title: scene.title,
        url: scene.url,
      },
    })),
  },
};

let map;

function initializeMap() {
  // create map
  map = new mapboxgl.Map({
    container: "map",
    minZoom: 9,
    zoom: scene ? scene.zoom : SCENES[0].zoom,
    center: scene ? scene.center : SCENE[0].center,
    style: BASE_STYLE,
    projection: "globe",
  });
  map.loadImage("css/marker.png", (error, image) => {
    if (error) throw error;
    if (!map.hasImage("marker")) map.addImage("marker", image);
  });
  map.on("click", "markers", (e) => {
    const { url } = e.features[0].properties;
    const zoom = SCENES.find((scene) => scene.url === url).zoom || 10;
    map.setMaxZoom(22);
    map.flyTo({
      center: e.features[0].geometry.coordinates,
      zoom,
      speed: 4,
    });
    map.once("moveend", () => {
      const { origin, pathname } = window.location;
      window.location.href = `${origin}${pathname}?url=${url}`;
    });
  });
  map.on("mouseenter", "markers", (e) => {
    const { title } = e.features[0].properties;
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "markers", () => {
    map.getCanvas().style.cursor = "";
  });
}



function initializeUi() {
  if (scene) {
    ui.title.innerHTML = scene.title;
  }
  ui.explorePlaces.addEventListener("click", () => {
    map.setMinZoom(0);
    map.flyTo({
      center: [0, 0],
      zoom: 1.5,
      speed: 3,
    });
    map.once("moveend", () => {
      map.setMaxZoom(2.5);
    });
    // TODO keep h2 for hover
    ui.main.style.display = "none";
  });

  ui.about.addEventListener("click", () => {
    ui.aboutOverlay.style.opacity = 1;
    ui.aboutOverlay.style.display = "block";
  });
  
  if (!hasUrl) {
    // Do a quick intro
    ui.main.style.opacity = 0;
    ui.aboutOverlay.style.opacity = 0;
    setInterval(() => {
      ui.aboutOverlay.style.opacity = 1;
    }, 2000);
  } else {
    ui.main.style.opacity = 1;
    ui.aboutOverlay.style.display = "none";
  }

  ui.dismissIntro.addEventListener("click", () => {
    ui.aboutOverlay.style.display = "none";
    ui.main.style.opacity = 1;
  })
}



fetch(dataUrl)
  .then((response) => response.json())
  .then((geojson) => {
    initializeVideoMap(geojson);
  })
  .catch((err) => {
    alert(`
            Failed to fetch URL.
            If you passed a custom url parameter in the query string,
            check if the URL is valid and serves valid CORS headers
        `);
  });

initializeMap();
initializeUi();

function getUrlFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get("url");
}

function getNW(coords) {
  const lng = Math.min(...coords.map((c) => c[0]));
  const lat = Math.max(...coords.map((c) => c[1]));
  return [lng, lat];
}

/**
 *
 * @param {Array} polygonCoords - coordinates of a polygon feature
 * @returns {Array} - Array of 4 points with lng, lat, ordered by NW, NE, SE, SW
 */
function getVideoCoords(polygonCoords) {
  const firstCoord = getNW(polygonCoords);
  const secondCoord = polygonCoords.find((coord) => {
    return coord[0] !== firstCoord[0] && coord[1] === firstCoord[1];
  });
  const thirdCoord = polygonCoords.find((coord) => {
    return coord[0] === secondCoord[0] && coord[1] !== secondCoord[1];
  });
  const fourthCoord = [firstCoord[0], thirdCoord[1]];
  return [firstCoord, secondCoord, thirdCoord, fourthCoord];
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

function getFrameData(frames, currentTime) {
  let frameData = false;
  frames.forEach((frame) => {
    // Again, very brittle
    const frameTimecode = parseFloat(frame.id);
    if (currentTime >= frameTimecode) {
      frameData = frame;
    }
  });
  return frameData;
}

function initializeVideoMap(data) {
  const baseUrl = dataUrl.split("videos.geojson")[0];

  // This is a very weird variable, I apologize. The problem is that we have this weird hack
  // on video seeked event where we need to play the video and pause it immediately, to
  // make sure that the video frame updates. The problem is, we don't want to trigger normal
  // play / pause events in that case, because we are not "really" playing the video.
  // So we use this weird-as-hell DONT_FLICKER global-ish variable to keep track of state,
  // of whether we DONT WANT TO FLICKER. This is most likely awful.
  let DONT_FLICKER = false;

  // Populate UI
  const title = data.title || scene.title;
  if (title) {
    document.querySelector("h2").innerHTML = title;
  }

  // Assuming first frame in the dict is also the first frame in time
  let firstTimestamp;
  let lastTimestamp;
  let framesWithTimecodes = Object.entries(data.frames).map(
    ([id, frameData], i) => {
      // This is super brittle - will need the python script to produce a timecode
      const dt = DateTime.fromISO(frameData.title);
      if (i === 0) {
        firstTimestamp = +dt;
      }
      if (i === Object.entries(data.frames).length - 1) {
        lastTimestamp = +dt;
      }
      return {
        id,
        ...frameData,
        timestamp: +dt,
        humanTimestampShort: dt.toLocaleString(DateTime.DATE_MED),
        humanTimestamp: dt.toLocaleString(DateTime.DATE_FULL),
      };
    }
  );

  framesWithTimecodes.map((frame) => {
    const frameTimecode = frame.timestamp;
    const percent =
      ((frameTimecode - firstTimestamp) / (lastTimestamp - firstTimestamp)) *
      100;
    frame.percent = percent;
    return frame;
  });

  framesWithTimecodes.forEach((frame) => {
    const frameEl = document.createElement("li");
    frameEl.style.left = `${frame.percent}%`;
    // frameEl.classList.add("frame");
    frameEl.innerHTML = frame.humanTimestampShort;
    // frameEl.addEventListener("click", () => {
    //   const videoElements = document.querySelectorAll("video");
    //   videoElements.forEach((videoElement) => {
    //     videoElement.currentTime = frame.timestamp / 1000;
    //   });
    // });
    ui.dates.appendChild(frameEl);
  });

  // construct video sources to add to style
  const videoSources = data.features.reduce((acc, val, index) => {
    const sourceId = `video${index}`;
    const coords = getVideoCoords(val.geometry.coordinates[0]);
    acc[sourceId] = {
      type: "video",
      urls: [`${baseUrl}${val.properties.url}`],
      coordinates: coords,
    };
    return acc;
  }, {});

  // construct layers array to add to style
  const videoLayers = data.features.map((val, index) => {
    return {
      id: `video${index}`,
      type: "raster",
      source: `video${index}`,
    };
  });

  // construct mapbox style object
  const style = {
    ...BASE_STYLE,
    sources: {
      ...BASE_STYLE.sources,
      ...videoSources,
    },
    layers: [...BASE_STYLE.layers, ...videoLayers],
  };

  map.setStyle(style);

  map.on("load", function () {
    // on map load, when the video sources are available, we need to
    // fetch all the html video elements, and attach event handlers
    const videoElements = videoLayers
      .map((layer) => layer.id)
      .map((sourceId) => {
        return map.getSource(sourceId).getVideo();
      });

    videoElements.forEach((videoElement) => {
      // start the videos in a paused state.
      // remove this line if you want the video to autoplay
      // videoElement.pause();

      // when we seek to a time-code in the video,
      // for eg. when using the time-slider,
      // we need to make sure that the video frame at that point
      // is displayed. For this, we need to do this strange hack, where
      // we need ot play the video and pause it almost immediately,
      // to get the display frame to update correctly.
      videoElement.addEventListener("seeked", function () {
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
    videoElements[0].addEventListener("play", function () {
      if (!DONT_FLICKER) {
        ui.togglePlay.innerHTML = PAUSE;
        hideFrameText();
      } else {
        DONT_FLICKER = false;
      }
    });

    // on video pause, set button to play icon, show text for current time-code / frame.
    videoElements[0].addEventListener("pause", function () {
      ui.togglePlay.innerHTML = PLAY;
      showFrameData();
    });

    // whenever the video timecode updates, we need to update the time-slider range to the correct poing.
    videoElements[0].addEventListener("timeupdate", function () {
      const currentTime = this.currentTime;
      const percent = (currentTime / this.duration) * 100;
      // TODO use computed values from framesWithTimecodes instead?
      ui.progressFill.style.width = `${percent}%`;
      showFrameData();
    });

    map.on("click", () => {
      togglePlay();
    });

    // toggles playing / pausing of the videos
    function togglePlay() {
      const currentTime = videoElements[0].currentTime;
      const playingVideo = !videoElements[0].paused;
      if (playingVideo) {
        videoElements.forEach((vid) => {
          vid.pause();
        });
      } else {
        videoElements.forEach((vid) => {
          vid.currentTime = currentTime;
          vid.play();
        });
      }
    }

    // function to show text at the current frame
    function showFrameData() {
      if (!framesWithTimecodes) return;
      const currentTime = videoElements[0].currentTime;
      // const frameText = getFrameText(data.frames, currentTime);
      const frameData = getFrameData(framesWithTimecodes, currentTime);

      if (frameData) {
        ui.currentFrameDate.innerText = frameData.humanTimestamp;
        ui.currentFrameTitle.innerText = frameData.description
          ? frameData.description
          : "";
      }
    }

    // hide div showing frame text
    function hideFrameText() {
      if (!data.frames) return;
      document.getElementById("frameTextOverlay").classList.add("hide");
    }

    // toggle play on clicking play button
    ui.togglePlay.addEventListener("click", function () {
      DONT_FLICKER = false;
      togglePlay();
    });

    // // handle user updating time-slider range input
    // document
    //   .getElementById("timeSlider")
    //   .addEventListener("input", function () {
    //     const timeCode = (this.value / 100) * videoElements[0].duration;
    //     videoElements.forEach((vid) => {
    //       vid.pause();
    //       vid.currentTime = timeCode;
    //     });
    //   });

    ui.speed.addEventListener("click", function () {
      currentSpeed = currentSpeed === SPEEDS.length - 1 ? 0 : currentSpeed + 1;
      const playbackRate = SPEEDS[currentSpeed];
      videoElements.forEach((vid) => {
        vid.playbackRate = playbackRate;
      });
      ui.speed.querySelector("span").innerText = playbackRate;
    });

    ui.alpha.addEventListener("click", () => {
      currentAlpha = currentAlpha === ALPHAS.length - 1 ? 0 : currentAlpha + 1;
      const opacity = ALPHAS[currentAlpha];
      console.log(opacity);
      videoLayers.forEach((layer) => {
        map.setPaintProperty(layer.id, "raster-opacity", opacity);
      });
      ui.alpha.querySelector("span").innerText = opacity * 100;
    });

    function simulateClick(elem) {
      const event = new MouseEvent("click", {
        view: window,
        bubbles: false,
        cancelable: false
      });
      elem.dispatchEvent(event);
    }

    document.addEventListener("keyup", event => {
      switch (event.key) {
        case 's':
          simulateClick(ui.speed);
          break;
        case 'o':
          simulateClick(ui.alpha);
          break;
        case ' ':
          simulateClick(ui.togglePlay);
          break;
        default:
          console.log(event.key);
          break;
      }
    });
  });
}
