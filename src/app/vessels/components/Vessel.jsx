import PropTypes from 'prop-types'
import React, { Component } from 'react'
import classnames from 'classnames'
import Toggle from 'app/components/Shared/Toggle'
import ExpandableIconButton from 'app/components/Shared/ExpandableIconButton'
import ExpandItem from 'app/components/Shared/ExpandItem'
import ColorPicker from 'app/components/Shared/ColorPicker'
import VesselStyles from 'app/vessels/components/Vessel.module.scss'
import IconButton from 'app/components/Shared/IconButton'
import TooltipStyles from 'styles/components/shared/react-tooltip.module.scss'
import ReactTooltip from 'react-tooltip'

class Vessel extends Component {
  constructor() {
    super()
    this.state = { expanded: false }
  }

  toggleExpand() {
    this.setState({ expanded: !this.state.expanded })
  }

  onTintChange = (color) => {
    const { vessel } = this.props
    if (!vessel.visible) {
      this.props.toggle(vessel.id)
    }
    this.props.setColor(vessel.id, color)
  }

  render() {
    const {
      vessel,
      currentlyShownVessel,
      editable,
      tall,
      highlightTrack,
      warningLiteral,
    } = this.props
    const isEditable = editable !== false
    const hasWarning = vessel.comment !== undefined
    const isTall = tall !== false
    const detailsCurrentlyShown =
      currentlyShownVessel !== null &&
      currentlyShownVessel !== undefined &&
      currentlyShownVessel.id === vessel.id

    const tooltip = this.props.vessel.title.length > 15 ? vessel.title : null

    return (
      <div>
        <div
          onMouseEnter={() => highlightTrack(vessel.id)}
          onMouseLeave={() => highlightTrack(null)}
          className={classnames(VesselStyles.vessel, {
            [VesselStyles._tall]: isTall,
          })}
        >
          <ReactTooltip />
          <div className={VesselStyles.toggle}>
            {isEditable && (
              <Toggle
                on={vessel.visible}
                color={vessel.color}
                onToggled={() => this.props.toggle(vessel.id)}
              />
            )}
          </div>
          <div
            className={VesselStyles.title}
            onClick={() => this.props.togglePinnedVesselDetails(vessel.id)}
            data-tip={tooltip}
            data-place="left"
            data-class={TooltipStyles.tooltip}
          >
            {vessel.title}
          </div>
          {hasWarning && (
            <div onClick={() => this.props.showWarning(vessel.comment)}>
              <IconButton icon="alert" title={warningLiteral} />
            </div>
          )}
          {isEditable && (
            <div onClick={() => this.props.delete(vessel.id)}>
              <IconButton icon="unpin" />
            </div>
          )}
          <div onClick={() => this.props.targetVessel(vessel.id)}>
            <IconButton icon="target" /* disabled={vessel.track === undefined} */ />
          </div>
          {isEditable && (
            <div onClick={() => this.toggleExpand()} style={{ position: 'relative' }}>
              <ExpandableIconButton activated={this.state.expanded === true}>
                <IconButton icon="paint" activated={this.state.expanded === true} />
              </ExpandableIconButton>
            </div>
          )}
          <div onClick={() => this.props.togglePinnedVesselDetails(vessel.id)}>
            <IconButton icon="info" activated={detailsCurrentlyShown} />
          </div>
        </div>
        <ExpandItem active={this.state.expanded === true}>
          <ColorPicker
            color={vessel.color}
            onTintChange={this.onTintChange}
            id={vessel.id.toString()}
            extendedPalette
          />
        </ExpandItem>
      </div>
    )
  }
}

Vessel.propTypes = {
  vessel: PropTypes.object,
  warningLiteral: PropTypes.string,
  currentlyShownVessel: PropTypes.object,
  editable: PropTypes.bool,
  tall: PropTypes.bool,
  toggle: PropTypes.func,
  togglePinnedVesselDetails: PropTypes.func,
  showWarning: PropTypes.func.isRequired,
  delete: PropTypes.func,
  setColor: PropTypes.func,
  targetVessel: PropTypes.func,
  highlightTrack: PropTypes.func,
}

export default Vessel
