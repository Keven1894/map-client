/* global PIXI */
import 'pixi.js';
import HeatmapSubLayer from './HeatmapSubLayer';

export default class HeatmapLayer {
  constructor(layerSettings, baseTexture, maxSprites) {
    this.id = layerSettings.id;
    this.subLayers = [];
    this.baseTexture = baseTexture;
    this.maxSprites = maxSprites;

    this.stage = new PIXI.Container();

    if (layerSettings.visible === false) {
      this.hide(false);
    }
    this.setOpacity(layerSettings.opacity, false);
  }

  show() {
    this.stage.visible = true;
  }

  hide() {
    this.stage.visible = false;
  }

  setOpacity(opacity) {
    this.stage.alpha = opacity;
  }

  setRenderingStyle(useHeatmapStyle) {
    this.subLayers.forEach((subLayer) => {
      subLayer.setRenderingStyle(useHeatmapStyle);
    });
  }

  /**
   * Adds or remove sublayers and set filters to the HeatmapLayer depending on the filters provided
   * @param {array} filters
   * @param {bool} useHeatmapStyle
   */
  setSubLayers(layerFilters, useHeatmapStyle) {
    // ??? Why subLayerDelta ???
    const subLayerDelta = layerFilters.length - this.subLayers.length;
    if (subLayerDelta === -1) {
      const subLayer = this.subLayers.pop();
      this.destroySubLayer(subLayer);
    } else if (subLayerDelta > 0) {
      for (let i = 0; i < subLayerDelta; i++) {
        const subLayer = new HeatmapSubLayer(this.baseTexture, this.maxSprites, useHeatmapStyle);
        this.subLayers.push(subLayer);
        this.stage.addChild(subLayer.stage);
      }
    }
    // is there more than one subLayer for each ???
    this.subLayers.forEach((subLayer, index) => {
      const filterData = layerFilters[index];
      subLayer.setFilters(filterData.flag, filterData.hue, filterData.gearTypeId);
    });
  }

  render(tiles, startIndex, endIndex, offsets) {
    // if (this.stage.visible === false) return;

    this.subLayers.forEach((subLayer) => {
      subLayer.render(tiles, startIndex, endIndex, offsets);
    });
  }

  destroy() {
    this.subLayers.forEach(this.destroySubLayer);
    this.stage.destroy({ children: true });
  }

  destroySubLayer(subLayer) {
    this.stage.removeChild(subLayer.stage);
    subLayer.destroy();
  }
}
