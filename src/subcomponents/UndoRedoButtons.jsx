/**
 * This file defines the UndoRedoButtons component.
 * It is used to render undo and redo buttons for the editor.
 */

import React, {Component} from 'react';
import {IconButton, Tooltip} from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";

import {ACTIVE_CONTROL_SX, CONTROL_BUTTON_SX} from "../AppTheme";


export class UndoRedoButtons extends Component
{
    /**
     * Represents the UndoRedoButtons component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {Array} props.undoStack - The undo stack array.
     * @param {Array} props.redoStack - The redo stack array.
     * @param {Function} props.undo - The function to call when the undo button is clicked.
     * @param {Function} props.redo - The function to call when the redo button is clicked.
     */
    constructor(props)
    {
        super(props);
        this.state = {};
    }

    /**
     * Renders an undo or redo button with its tooltip.
     * @param {string} label - The accessible name and tooltip of the button.
     * @param {React.ReactNode} icon - The icon shown in the button.
     * @param {boolean} enabled - Whether the action is available.
     * @param {Function} onClick - Called when the button is clicked.
     * @returns {JSX.Element} The rendered button.
     */
    renderButton(label, icon, enabled, onClick)
    {
        return (
            <Tooltip title={label} placement="right" arrow enterTouchDelay={0} describeChild>
                <span> {/* Span is necessary for the tooltip to work on a disabled button */}
                    <IconButton aria-label={label} disabled={!enabled} onClick={onClick}
                                sx={[CONTROL_BUTTON_SX, enabled && ACTIVE_CONTROL_SX]}>
                        {icon}
                    </IconButton>
                </span>
            </Tooltip>
        );
    }

    /**
     * Renders the UndoRedoButtons component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const canUndo = this.props.undoStack.length > 0;
        const canRedo = this.props.redoStack.length > 0;

        return (
            <div className="undo-redo-buttons">
                {this.renderButton("Undo", <UndoIcon fontSize="small" />, canUndo, () => this.props.undo())}
                {this.renderButton("Redo", <RedoIcon fontSize="small" />, canRedo, () => this.props.redo())}
            </div>
        );
    }
}

export default UndoRedoButtons;
