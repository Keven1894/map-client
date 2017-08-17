import {
  REWIND_TIMELINE,
  SET_FLAG_FILTERS,
  SET_INNER_TIMELINE_DATES,
  SET_INNER_TIMELINE_DATES_FROM_WORKSPACE,
  SET_OUTER_TIMELINE_DATES,
  SET_OVERALL_TIMELINE_DATES,
  SET_PLAYING_STATUS,
  SET_TIMELINE_HOVER_DATES,
  SET_FILTER_GROUP_MODAL_VISIBILITY,
  CREATE_FILTER_GROUP,
  SET_FILTER_GROUP_VISIBILITY
} from 'filters/filtersActions';
import {
  TIMELINE_DEFAULT_INNER_START_DATE,
  TIMELINE_DEFAULT_INNER_END_DATE,
  TIMELINE_DEFAULT_OUTER_START_DATE,
  TIMELINE_DEFAULT_OUTER_END_DATE,
  TIMELINE_OVERALL_START_DATE,
  TIMELINE_OVERALL_END_DATE
} from 'config';
import { getOffsetedTimeAtPrecision } from 'util/heatmapTileData';

const initialState = {
  timelineOverallExtent: [TIMELINE_OVERALL_START_DATE, TIMELINE_OVERALL_END_DATE],
  timelineOuterExtent: [TIMELINE_DEFAULT_OUTER_START_DATE, TIMELINE_DEFAULT_OUTER_END_DATE],
  timelineInnerExtent: [TIMELINE_DEFAULT_INNER_START_DATE, TIMELINE_DEFAULT_INNER_END_DATE],
  timelineInnerExtentIndexes: [
    getOffsetedTimeAtPrecision(TIMELINE_DEFAULT_INNER_START_DATE.getTime()),
    getOffsetedTimeAtPrecision(TIMELINE_DEFAULT_INNER_END_DATE.getTime())
  ],
  timelinePaused: true,
  /** @deprecated use filterGroups logic instead */
  flagsLayers: {},
  /** @deprecated use filterGroups logic instead */
  flags: [],
  filterGroups: [],
  isFilterGroupModalOpen: false
};

export default function (state = initialState, action) {
  switch (action.type) {
    case SET_INNER_TIMELINE_DATES_FROM_WORKSPACE:
    case SET_INNER_TIMELINE_DATES: {
      const timelineInnerExtent = action.payload;
      const startTimestamp = timelineInnerExtent[0].getTime();
      const endTimestamp = timelineInnerExtent[1].getTime();
      const startIndex = getOffsetedTimeAtPrecision(startTimestamp);
      const endIndex = getOffsetedTimeAtPrecision(endTimestamp);
      const timelineInnerExtentIndexes = [startIndex, endIndex];

      return Object.assign({}, state, {
        timelineInnerExtent, timelineInnerExtentIndexes
      });
    }
    case SET_OUTER_TIMELINE_DATES:
      return Object.assign({}, state, {
        timelineOuterExtent: [
          new Date(Math.max(action.payload[0], state.timelineOverallExtent[0])),
          new Date(Math.min(action.payload[1], state.timelineOverallExtent[1]))
        ]
      });
    case SET_OVERALL_TIMELINE_DATES: {
      const timelineOverallExtent = [
        new Date(Math.min(action.payload[0], state.timelineOverallExtent[0])),
        new Date(Math.max(action.payload[1], state.timelineOverallExtent[1]))
      ];
      const timelineOuterExtent = [
        new Date(Math.max(timelineOverallExtent[0], state.timelineOuterExtent[0])),
        new Date(Math.min(timelineOverallExtent[1], state.timelineOuterExtent[1]))
      ];
      return Object.assign({}, state, {
        timelineOverallExtent,
        timelineOuterExtent
      });
    }
    /** @deprecated use filterGroups logic instead */
    case SET_FLAG_FILTERS: {
      return Object.assign({}, state, {
        flags: action.payload.flagFilters, flagsLayers: action.payload.flagFiltersLayers
      });
    }

    case SET_PLAYING_STATUS:
      return Object.assign({}, state, {
        timelinePaused: action.payload
      });
    case SET_TIMELINE_HOVER_DATES: {
      const timelineOverExtent = action.payload;
      const startTimestamp = timelineOverExtent[0].getTime();
      const endTimestamp = timelineOverExtent[1].getTime();
      const startIndex = getOffsetedTimeAtPrecision(startTimestamp);
      const endIndex = getOffsetedTimeAtPrecision(endTimestamp);
      const timelineOverExtentIndexes = [startIndex, endIndex];
      return Object.assign({}, state, {
        timelineOverExtentIndexes
      });
    }
    case REWIND_TIMELINE: {
      const currentInnerDelta = state.timelineInnerExtent[1].getTime() - state.timelineInnerExtent[0].getTime();
      const newTimelineInnerEnd = new Date(state.timelineOuterExtent[0].getTime() + currentInnerDelta);
      return Object.assign({}, state, {
        timelineInnerExtent: [state.timelineOuterExtent[0], newTimelineInnerEnd]
      });
    }
    case SET_FILTER_GROUP_MODAL_VISIBILITY: {
      return Object.assign({}, state, { isFilterGroupModalOpen: action.payload });
    }
    case CREATE_FILTER_GROUP: {
      const newFilterGroup = [action.payload, ...state.filterGroups];
      return Object.assign({}, state, { filterGroups: newFilterGroup });
    }
    case SET_FILTER_GROUP_VISIBILITY: {
      const { index, forceValue } = action.payload;
      const visible = forceValue !== null ? forceValue : !state.filterGroups[index].visible;
      const newFilterGroup = Object.assign({}, state.filterGroups[index], { visible });

      return Object.assign({}, state, {
        filterGroups: [...state.filterGroups.slice(0, index), newFilterGroup, ...state.filterGroups.slice(index + 1)]
      });

    }
    default:
      return state;
  }
}
