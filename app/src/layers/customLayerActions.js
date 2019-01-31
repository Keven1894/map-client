import { setLayerManagementModalVisibility } from 'app/appActions';
import { addCustomLayer } from 'layers/layersActions';
import { addCustomGLLayer } from 'map/mapStyleActions';
import { CUSTOM_LAYERS_SUBTYPES } from 'constants';
import isURL from 'validator/lib/isURL';
import WMSCapabilities from 'wms-capabilities';
import URI from 'urijs';

export const CUSTOM_LAYER_UPLOAD_START = 'CUSTOM_LAYER_UPLOAD_START';
export const CUSTOM_LAYER_UPLOAD_SUCCESS = 'CUSTOM_LAYER_UPLOAD_SUCCESS';
export const CUSTOM_LAYER_UPLOAD_ERROR = 'CUSTOM_LAYER_UPLOAD_ERROR';
export const CUSTOM_LAYER_RESET = 'CUSTOM_LAYER_RESET';

export const loadCustomLayer = ({ token, subtype, id, url }) => {
  const loadPromise = fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    })
    .then(json => ({
      data: json,
      subtype,
      id,
      url
    }));
  return loadPromise;
};

const loadWMSCapabilities = ({ id, url }) => {
  const urlSearch = new URI(url).search((data) => {
    data.request = 'GetCapabilities';
    data.service = 'WMS';
  });
  const promise = fetch(urlSearch)
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText);
      return res.text();
    })
    .then((xmlString) => {
      const capabilities = new WMSCapabilities(xmlString).toJSON();
      if (capabilities.Capability === undefined) {
        throw new Error('Error with WMS endpoint');
      }

      return {
        id,
        url,
        capabilities,
        subtype: CUSTOM_LAYERS_SUBTYPES.raster
      };
    });
  return promise;
};

const getWMSURLFilterdByLayers = ({ url, capabilities }, layersActives) => {
  const format = (capabilities.Capability.Request.GetMap.Format.indexOf('image/png') > -1)
    ? 'image/png'
    : 'image/jpeg';

  const layersFiltered = capabilities.Capability.Layer.Layer
    .filter(l => layersActives.includes(l.Name));

  const layersIds = layersFiltered.map(l => l.Name).join(',');
  const styles = layersFiltered.map(l => l.Style[0].Name).join(',');

  const tilesURL = new URI(url).search(() => ({
    version: '1.1.0',
    request: 'GetMap',
    srs: 'EPSG:3857',
    bbox: '{bbox-epsg-3857}',
    width: 256,
    height: 256,
    transparent: true,
    layers: layersIds,
    styles,
    format
  }));
  return decodeURIComponent(tilesURL.toString());
};

const saveToDirectory = ({ token, subtype, name, description, url }) => {
  const savePromise = fetch(`${V2_API_ENDPOINT}/directory`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ title: name, url, description })
  })
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText);
      return res.json();
    })
    .then(json => ({
      token,
      subtype,
      id: json.args.id,
      url: json.args.source.args.url
    }));

  return savePromise;
};

export const uploadCustomLayer = (subtype, url, name, description) => (dispatch, getState) => {
  const state = getState();
  const token = state.user.token;
  if (isURL(url.trim())) {
    dispatch({ type: CUSTOM_LAYER_UPLOAD_START });

    const promises = [];
    if (subtype !== CUSTOM_LAYERS_SUBTYPES.raster) {
      promises.push(saveToDirectory);
    }
    if (subtype === CUSTOM_LAYERS_SUBTYPES.wms) {
      promises.push(loadWMSCapabilities);
    }
    if (subtype === CUSTOM_LAYERS_SUBTYPES.geojson) {
      promises.push(loadCustomLayer);
    }

    promises.reduce((p, f) => p.then(f), Promise.resolve({
      token, subtype, name, url, description, id: new Date().getTime().toString()
    })).then((layer) => {
      dispatch({
        type: CUSTOM_LAYER_UPLOAD_SUCCESS,
        payload: layer
      });
    }).catch(err => dispatch({
      type: CUSTOM_LAYER_UPLOAD_ERROR,
      payload: { error: err.message }
    }));
  } else {
    dispatch({
      type: CUSTOM_LAYER_UPLOAD_ERROR,
      payload: { error: 'Please insert a valid url' }
    });
  }
};

export const confirmCustomLayer = layer => (dispatch, getState) => {
  const { previewLayer } = getState().customLayer;
  const newLayer = { ...layer, ...previewLayer };
  if (layer.subtype === 'wms') {
    newLayer.url = getWMSURLFilterdByLayers(newLayer, layer.subLayersActives);
    newLayer.subtype = CUSTOM_LAYERS_SUBTYPES.raster;
  }
  dispatch(setLayerManagementModalVisibility(false));
  dispatch(addCustomLayer(newLayer.subtype, newLayer.id, newLayer.url, newLayer.name, newLayer.description));
  dispatch(addCustomGLLayer(newLayer.subtype, newLayer.id, newLayer.url, newLayer.data));
  dispatch({ type: CUSTOM_LAYER_RESET });
};

export const resetCustomLayerForm = () => ({
  type: CUSTOM_LAYER_RESET
});
