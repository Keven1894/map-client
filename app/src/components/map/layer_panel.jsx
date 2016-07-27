import React, {Component} from "react";
import layerPanel from "../../../styles/components/c_layer_panel.scss";
import { Accordion, AccordionItem } from 'react-sanfona';

export default function (props) {
  let layers = [];
  if (props.layers) {
    for (let i = 0, length = props.layers.length; i < length; i++) {
      layers.push(
        <li key={i}>
          <label>
            <input type="checkbox" checked={props.layers[i].visible}
                   onChange={() => props.onToggle(props.layers[i])}></input>
            {props.layers[i].title}
          </label>
        </li>
      );
    }
  }

  let title_accordion = [];
  title_accordion.push(<input className={layerPanel.input_acordion} placeholder="SEARCH VESSELS"></input>);
  title_accordion.push(<span className={layerPanel.title_acordion}>Basemap</span>);
  title_accordion.push(<span className={layerPanel.title_acordion}>Layers</span>);

  return (
    <div className={layerPanel.layerPanel}>
      <Accordion allowMultiple={false} activeItems={6}>
        {[title_accordion[0], title_accordion[1], title_accordion[2]].map((item) => {
          return (
            <AccordionItem title={item} key={item} className={layerPanel.title_accordion}>
              <div className={layerPanel.content_accordion}>
                {item === title_accordion[0] ? <p>Hello</p> : null}
                {item === title_accordion[1] ? <p>Hello</p> : null}
                {item === title_accordion[2] ? <ul>{layers}</ul>: null}
              </div>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
