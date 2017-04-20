import _ from 'lodash';
import {
  SET_VESSEL_DETAILS,
  SET_VESSEL_TRACK,
  CLEAR_VESSEL_INFO,
  SET_TRACK_BOUNDS,
  TOGGLE_VESSEL_PIN,
  ADD_VESSEL,
  SHOW_VESSEL_DETAILS,
  HIDE_VESSELS_INFO_PANEL,
  SET_PINNED_VESSEL_HUE,
  LOAD_PINNED_VESSEL,
  SET_PINNED_VESSEL_TITLE,
  TOGGLE_PINNED_VESSEL_EDIT_MODE,
  SET_RECENT_VESSEL_HISTORY,
  LOAD_RECENT_VESSEL_HISTORY,
  SET_PINNED_VESSEL_TRACK_VISIBILITY
} from 'actions';
import { fitTimelineToTrack } from 'actions/filters';
import { trackSearchResultClicked, trackVesselPointClicked } from 'actions/analytics';
import {
  getTilePelagosPromises,
  getCleanVectorArrays,
  groupData,
  addWorldCoordinates,
  addTracksPointRadius
} from 'actions/helpers/heatmapTileData';

export function setRecentVesselHistory(seriesgroup) {
  return {
    type: SET_RECENT_VESSEL_HISTORY,
    payload: {
      seriesgroup
    }
  };
}

export function loadRecentVesselHistory() {
  return {
    type: LOAD_RECENT_VESSEL_HISTORY,
    payload: null
  };
}

function setCurrentVessel(layerId, seriesgroup, fromSearch) {
  return (dispatch, getState) => {
    const state = getState();
    const token = state.user.token;
    let request;

    if (typeof XMLHttpRequest !== 'undefined') {
      request = new XMLHttpRequest();
    } else {
      throw new Error('XMLHttpRequest is disabled');
    }
    request.open(
      'GET',
      `${state.map.tilesetUrl}/sub/seriesgroup=${seriesgroup}/info`,
      true
    );
    if (token) {
      request.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    request.setRequestHeader('Accept', 'application/json');
    request.onreadystatechange = () => {
      if (request.readyState !== 4) {
        return;
      }
      const data = JSON.parse(request.responseText);
      delete data.series;

      data.layerId = layerId;

      dispatch({
        type: SET_VESSEL_DETAILS,
        payload: data
      });
      dispatch({
        type: SHOW_VESSEL_DETAILS,
        payload: {
          seriesgroup: data.seriesgroup
        }
      });

      if (fromSearch) {
        dispatch(trackSearchResultClicked(state.map.tilesetId, seriesgroup));
      } else {
        dispatch(trackVesselPointClicked(state.map.tilesetId, seriesgroup));
      }

      dispatch(setRecentVesselHistory(data.seriesgroup));
    };
    request.send(null);
  };
}

export function setPinnedVessels(pinnedVessels) {
  return (dispatch, getState) => {
    const state = getState();
    const options = {
      Accept: '*/*'
    };

    options.headers = {
      Authorization: `Bearer ${state.user.token}`
    };

    pinnedVessels.forEach((pinnedVessel) => {
      let request;

      if (typeof XMLHttpRequest !== 'undefined') {
        request = new XMLHttpRequest();
      } else {
        throw new Error('XMLHttpRequest is disabled');
      }

      const baseURL = pinnedVessel.tilesetUrl || state.map.tilesetUrl;
      request.open(
        'GET',
        `${baseURL}/sub/seriesgroup=${pinnedVessel.seriesgroup}/info`,
        true
      );
      if (state.user.token) {
        request.setRequestHeader('Authorization', `Bearer ${state.user.token}`);
      }
      request.setRequestHeader('Accept', 'application/json');
      request.onreadystatechange = () => {
        if (request.readyState !== 4) {
          return;
        }
        if (request.responseText === 'Not Found') {
          console.warn('vessel info not found');
          return;
        }
        const data = JSON.parse(request.responseText);
        delete data.series;
        dispatch({
          type: LOAD_PINNED_VESSEL,
          payload: Object.assign({}, pinnedVessel, data)
        });

        dispatch(setRecentVesselHistory(pinnedVessel.seriesgroup));
      };
      request.send(null);
    });
  };
}

function _getTrackTimeExtent(data, series = null) {
  let start = Infinity;
  let end = 0;
  for (let i = 0, length = data.datetime.length; i < length; i++) {
    if (series !== null && series !== data.series[i]) {
      continue;
    }
    const time = data.datetime[i];
    if (time < start) {
      start = time;
    } else if (time > end) {
      end = time;
    }
  }
  return [start, end];
}

function _getVesselTrack({ layerId, seriesgroup, series, zoomToBounds, updateTimelineBounds }) {
  return (dispatch, getState) => {
    const state = getState();
    const map = state.map.googleMaps;

    let layerId_ = layerId;
    // TODO remove when layerId is passed around when using search
    if (layerId === null || layerId === undefined) {
      console.warn('layerId not sent, using default tileset');
      layerId_ = '849-tileset-tms';
    }

    const currentLayer = state.layers.workspaceLayers.find(layer => layer.id === layerId_);
    if (!currentLayer) {
      console.warn('trying to get a vessel track on a layer that doesnt exist', state.layers.workspaceLayers);
      return;
    }
    const header = currentLayer.header;
    // TODO use URL from header
    const url = currentLayer.url;
    const promises = getTilePelagosPromises(url, state.user.token, header.temporalExtents, { seriesgroup });

    Promise.all(promises.map(p => p.catch(e => e)))
      .then((rawTileData) => {
        const cleanData = getCleanVectorArrays(rawTileData);

        if (!cleanData.length) {
          return;
        }

        const groupedData = groupData(cleanData, [
          'latitude',
          'longitude',
          'datetime',
          'series',
          'weight',
          'sigma'
        ]);

        let vectorArray = addWorldCoordinates(groupedData, map);

        const zoom = state.map.zoom;
        vectorArray = addTracksPointRadius(groupedData, zoom);

        dispatch({
          type: SET_VESSEL_TRACK,
          payload: {
            seriesgroup,
            seriesGroupData: vectorArray,
            series: _.uniq(groupedData.series),
            selectedSeries: series,
            tilesetUrl: state.map.tilesetUrl
          }
        });

        if (updateTimelineBounds === true) {
          const tracksExtent = _getTrackTimeExtent(groupedData, series);
          dispatch(fitTimelineToTrack(tracksExtent));
        }

        if (zoomToBounds) {
          // should this be computed server side ?
          // this is half implemented because it doesn't take into account filtering and time span
          const trackBounds = new google.maps.LatLngBounds();
          for (let i = 0, length = groupedData.latitude.length; i < length; i++) {
            trackBounds.extend(new google.maps.LatLng({ lat: groupedData.latitude[i], lng: groupedData.longitude[i] }));
          }

          dispatch({
            type: SET_TRACK_BOUNDS,
            trackBounds
          });
        }
      });
  };
}

export function hideVesselsInfoPanel() {
  return {
    type: HIDE_VESSELS_INFO_PANEL
  };
}

export function addVessel(layerId, seriesgroup, series = null, zoomToBounds = false, fromSearch = false) {
  return (dispatch, getState) => {
    const state = getState();
    dispatch({
      type: ADD_VESSEL,
      payload: {
        seriesgroup,
        series,
        layerId
      }
    });
    if (state.user.userPermissions !== null && state.user.userPermissions.indexOf('seeVesselBasicInfo') > -1) {
      dispatch(setCurrentVessel(layerId, seriesgroup, fromSearch));
    } else {
      dispatch(hideVesselsInfoPanel());
    }
    dispatch(_getVesselTrack({
      layerId,
      seriesgroup,
      series,
      zoomToBounds,
      updateTimelineBounds: fromSearch === true
    }));
  };
}

export function clearVesselInfo() {
  return {
    type: CLEAR_VESSEL_INFO
  };
}

function _getPinAction(state, seriesgroup) {
  let vesselIndex;
  if (seriesgroup === undefined) {
    // use vessel in info panel
    vesselIndex = state.vesselInfo.vessels.findIndex(vessel => vessel.shownInInfoPanel === true);
  } else {
    // look for vessel with given seriesgoup if provided
    vesselIndex = state.vesselInfo.vessels.findIndex(vessel => vessel.seriesgroup === seriesgroup);
  }
  const vessel = state.vesselInfo.vessels[vesselIndex];
  const pinned = !vessel.pinned;

  let visible = false;

  // when pinning the vessel currently in info panel, should be initially visible
  if (seriesgroup === undefined && pinned === true) {
    visible = true;
  }
  return {
    type: TOGGLE_VESSEL_PIN,
    payload: {
      vesselIndex,
      pinned,
      visible,
      seriesgroup: vessel.seriesgroup,
      vesselname: vessel.vesselname,
      tilesetId: vessel.layerId
    }
  };
}

export function toggleActiveVesselPin() {
  return (dispatch, getState) => {
    dispatch(_getPinAction(getState()));
  };
}

export function toggleVesselPin(seriesgroup) {
  return (dispatch, getState) => {
    dispatch(_getPinAction(getState(seriesgroup)));
  };
}

export function togglePinnedVesselEditMode(forceMode = null) {
  return {
    type: TOGGLE_PINNED_VESSEL_EDIT_MODE,
    payload: {
      forceMode
    }
  };
}

export function togglePinnedVesselVisibility(seriesgroup, forceStatus = null) {
  return (dispatch, getState) => {
    const currentVessel = getState().vesselInfo.vessels.find(vessel => vessel.seriesgroup === seriesgroup);
    const visible = (forceStatus !== null) ? forceStatus : !currentVessel.visible;
    dispatch({
      type: SET_PINNED_VESSEL_TRACK_VISIBILITY,
      payload: {
        seriesgroup,
        visible
      }
    });
    if (visible === true && currentVessel.track === undefined) {
      dispatch(_getVesselTrack({
        layerId: currentVessel.tileset,
        seriesgroup,
        series: null,
        zoomToBounds: true,
        updateTimelineBounds: false
      }));
    }
  };
}

export function showPinnedVesselDetails(seriesgroup) {
  return (dispatch) => {
    dispatch(clearVesselInfo());
    dispatch({
      type: SHOW_VESSEL_DETAILS,
      payload: {
        seriesgroup
      }
    });
    dispatch(togglePinnedVesselVisibility(seriesgroup, true));
  };
}

export function setPinnedVesselHue(seriesgroup, hue) {
  return {
    type: SET_PINNED_VESSEL_HUE,
    payload: {
      seriesgroup,
      hue
    }
  };
}

export function setPinnedVesselTitle(seriesgroup, title) {
  return {
    type: SET_PINNED_VESSEL_TITLE,
    payload: {
      seriesgroup,
      title
    }
  };
}
