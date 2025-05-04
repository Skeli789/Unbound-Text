/**
 * This file defines the LockFinalLineButton component.
 * It is used to lock the final line so the maximum width can be used.
 */

import React, {Component} from 'react';
import {OverlayTrigger, Tooltip} from "react-bootstrap";

import {FaLock, FaUnlock} from "react-icons/fa";


export class LockFinalLineButton extends Component
{
    /**
     * Represents the LockFinalLineButton component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {boolean} props.isFinalLineLocked - Indicates if the final line is locked.
     * @param {Function} props.lockFinalLine - Function to lock the final line.
     */
    constructor(props)
    {
        super(props);
        this.state = {};

        this.lockFinalLine = props.lockFinalLine;
    }

    /**
     * Renders the LockFinalLineButton component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const size = 30;
        const isFinalLineLocked = this.props.isFinalLineLocked;
        const tooltipText = (isFinalLineLocked) ? "Final Line Locked" : "Final Line Unlocked";
        const tooltip = props => (<Tooltip {...props}>{tooltipText}</Tooltip>);

        return (
            <div className="lock-buttons">
                <OverlayTrigger placement="left" overlay={tooltip}>
                    <span> 
                    { //Span is necessary for the tooltip to work here
                        !isFinalLineLocked ?
                            <FaUnlock onClick={() => this.lockFinalLine(true)} size={size} //Lock final line on click
                                className="lock-button text-locked"/>
                        :
                            <FaLock onClick={() => this.lockFinalLine(false)} size={size} //Unlock final line on click
                                className="lock-button text-unlocked"/>
                    }
                    </span>
                </OverlayTrigger>
            </div>
        );
    }
}

export default LockFinalLineButton;
