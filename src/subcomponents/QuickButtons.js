import React, {Component} from 'react';
import {Tooltip} from "react-bootstrap";

import {QuickButton} from "./QuickButton";

const blackTextTooltip = props => (<Tooltip {...props}>Black</Tooltip>);
const blueTextTooltip = props => (<Tooltip {...props}>Blue</Tooltip>);
const greenTextTooltip = props => (<Tooltip {...props}>Green</Tooltip>);
const redTextTooltip = props => (<Tooltip {...props}>Red</Tooltip>);
const playerTooltip = props => (<Tooltip {...props}>Player's Name</Tooltip>);
const rivalTooltip = props => (<Tooltip {...props}>Rival's Name</Tooltip>);
const pauseTooltip = props => (<Tooltip {...props}>Pause XX Frames (Hex)</Tooltip>);


export class QuickButtons extends Component
{
    constructor(props)
    {
        super(props);

        this.addTextAtSelectionStart = props.addTextAtSelectionStart;
    }

    render()
    {
        return (
            <div className="quick-buttons" style={this.props.buttonsContainerStyle}>
                <QuickButton text="⚫" tooltip={blackTextTooltip} func={this.addTextAtSelectionStart}/>
                <QuickButton text="🔵" tooltip={blueTextTooltip} func={this.addTextAtSelectionStart}/>
                <QuickButton text="🔴" tooltip={redTextTooltip} func={this.addTextAtSelectionStart}/>
                <QuickButton text="🟢" tooltip={greenTextTooltip} func={this.addTextAtSelectionStart}/>
                <QuickButton text="[PLAYER]" tooltip={playerTooltip} func={this.addTextAtSelectionStart}/>
                <QuickButton text="[RIVAL]" tooltip={rivalTooltip} func={this.addTextAtSelectionStart}/>
                <QuickButton text="[PAUSE][]" tooltip={pauseTooltip} func={this.addTextAtSelectionStart}/>
            </div>
        )
    }
}

export default QuickButtons;
