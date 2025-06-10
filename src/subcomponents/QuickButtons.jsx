/**
 * This file defines the QuickButtons component.
 * It is used to display a set of buttons that insert preset text into the text area.
 */

import React, {Component} from 'react';

import {QuickButton} from "./QuickButton";


export class QuickButtons extends Component
{
    /**
     * Represents the QuickButtons component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {Function} props.addTextAtSelectionStart - Function to set the text in the parent component.
     * @param {number} props.textareaWidth - The width of the textarea to place the buttons above.
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
        const style =
        {
            width: `calc(${this.props.textareaWidth}px + 3em)`,
            minWidth: "calc(340px + 3em)",
            maxWidth: "99vw",
        };

        return (
            <div className="quick-buttons" style={style}>
                <QuickButton text="⚫" tooltip="Black" func={this.addTextAtSelectionStart}/>
                <QuickButton text="🔵" tooltip="Blue" func={this.addTextAtSelectionStart}/>
                <QuickButton text="🔴" tooltip="Red" func={this.addTextAtSelectionStart}/>
                <QuickButton text="🟢" tooltip="Green" func={this.addTextAtSelectionStart}/>
                {/* <QuickButton text="🟠" tooltip="Orange" func={this.addTextAtSelectionStart}/> */}
                <QuickButton text="{PLAYER}" tooltip="Player's Name" func={this.addTextAtSelectionStart}/>
                <QuickButton text="{RIVAL}" tooltip="Rival's Name" func={this.addTextAtSelectionStart}/>
                <QuickButton text="{PAUSE}{}" tooltip="Pause XX Frames (Hex)" func={this.addTextAtSelectionStart}/>
            </div>
        )
    }
}

export default QuickButtons;
