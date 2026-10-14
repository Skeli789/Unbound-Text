/**
 * This file defines the LockFinalLineButton component.
 * It is used to lock the final line so the maximum width can be used.
 */

import React, {Component} from 'react';
import {ToggleButton, Tooltip} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";


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
        const isFinalLineLocked = this.props.isFinalLineLocked;
        const tooltip = (isFinalLineLocked) ? "Final Line Locked" : "Final Line Unlocked";

        return (
            <div className="lock-buttons">
                <Tooltip title={tooltip} placement="left" arrow enterTouchDelay={0} describeChild>
                    <ToggleButton value="lockFinalLine" size="small" className="lock-button"
                                  aria-label="Lock final line" selected={isFinalLineLocked}
                                  sx={{"&.Mui-selected, &.Mui-selected:hover": {backgroundColor: "transparent"}}}
                                  onChange={() => this.lockFinalLine(!isFinalLineLocked)}>
                        {isFinalLineLocked ? <LockIcon fontSize="small" color="error" /> : <LockOpenIcon fontSize="small" />}
                    </ToggleButton>
                </Tooltip>
            </div>
        );
    }
}

export default LockFinalLineButton;
