/**
 * This file defines the QuickButtons component.
 * It is used to display a set of buttons that insert preset text into the text area.
 */

import React, {Component} from 'react';
import {Box} from '@mui/material';

import {QuickButton} from "./QuickButton";


export class QuickButtons extends Component
{
    /**
     * Represents the QuickButtons component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {Function} props.addTextAtSelectionStart - Function to set the text in the parent component.
     */
    constructor(props)
    {
        super(props);

        this.addTextAtSelectionStart = props.addTextAtSelectionStart;
    }

    /**
     * Renders the QuickButtons component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        return (
            <Box className="quick-buttons" role="toolbar" aria-label="Insert text">
                <QuickButton text="⚫" ariaLabel="Black" tooltip="Black" className="quick-button-symbol" func={this.addTextAtSelectionStart}/>
                <QuickButton text="🔵" ariaLabel="Blue" tooltip="Blue" className="quick-button-symbol" func={this.addTextAtSelectionStart}/>
                <QuickButton text="🔴" ariaLabel="Red" tooltip="Red" className="quick-button-symbol" func={this.addTextAtSelectionStart}/>
                <QuickButton text="🟢" ariaLabel="Green" tooltip="Green" className="quick-button-symbol" func={this.addTextAtSelectionStart}/>
                {/* <QuickButton text="🟠" ariaLabel="Orange" tooltip="Orange" className="quick-button-symbol" func={this.addTextAtSelectionStart}/> */}
                <Box className="quick-button-tags">
                    <QuickButton text="{PLAYER}" tooltip="Player's Name" func={this.addTextAtSelectionStart}/>
                    <QuickButton text="{RIVAL}" tooltip="Rival's Name" func={this.addTextAtSelectionStart}/>
                    <QuickButton text="{PAUSE}{}" tooltip="Pause XX Frames (Hex)" func={this.addTextAtSelectionStart}/>
                </Box>
            </Box>
        )
    }
}

export default QuickButtons;
