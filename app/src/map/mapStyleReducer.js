import BASEMAP from 'map/gl-styles/basemap.json';
import POLYGONS from 'map/gl-styles/staticLayers.json';
import { POLYGON_LAYERS } from 'config';
import { fromJS } from 'immutable';
import {
  SET_BASEMAP,
  UPDATE_MAP_STYLE
} from 'map/mapStyleActions';

const SATELLITE_ID = 'mapbox-satellite';
const COMPOSITE_SOURCE_ID = 'composite';
const COMPOSITE_POLYGONS_SOURCE_ID = 'composite-polygons';

// merges basemap style JSON and polygon layers JSON into a single style JSON
// checks for duplicate sources named 'composite'
const mergeBasemapAndPolygonStyles = (basemap, polygons) => {
  Object.keys(polygons.sources).forEach((sourceKey) => {
    basemap.sources[(sourceKey === COMPOSITE_SOURCE_ID) ? COMPOSITE_POLYGONS_SOURCE_ID : sourceKey] = polygons.sources[sourceKey];
  });
  polygons.layers.forEach((layer) => {
    if (layer.source === COMPOSITE_SOURCE_ID) {
      layer.source = COMPOSITE_POLYGONS_SOURCE_ID;
    }

    // check if layer is interactive, set manually on style
    const allGlLayers = Object.keys(POLYGON_LAYERS).reduce((acc, val) => acc.concat(POLYGON_LAYERS[val].glLayers), []);
    const glLayerDef = allGlLayers.find(glLayer => glLayer.id);
    layer.interactive = glLayerDef.interactive;

    basemap.layers.push(layer);
  });
  return fromJS(basemap);
};

const initialState = {
  mapStyle: mergeBasemapAndPolygonStyles(BASEMAP, POLYGONS),
  activeBasemap: 'North Star',
  basemaps: [
    {
      title: 'hybrid',
      label: 'Satellite',
      description: 'The default satellite image view',
      satellite: true
    },
    {
      title: 'North Star',
      label: 'North Star',
      description: 'Custom basemap showing bathymetry, parallels and ports',
      satellite: false
    }
  ]
};


export default function (state = initialState, action) {
  switch (action.type) {
    case SET_BASEMAP : {
      const satellite = state.basemaps.find(basemap => basemap.title === action.payload).satellite;
      const satelliteLayerIndex = state.mapStyle.toJS().layers.findIndex(layer => layer.id === SATELLITE_ID);
      const visibility = (satellite === true) ? 'visible' : 'none';
      const mapStyle = state.mapStyle.setIn(['layers', satelliteLayerIndex, 'layout', 'visibility'], visibility);
      return { ...state, mapStyle, activeBasemap: action.payload };
    }
    case UPDATE_MAP_STYLE : {
      return { ...state, mapStyle: action.payload };
    }
    default:
      return state;
  }
}