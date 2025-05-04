/**
 * This file defines the UndoRedoButtons component.
 * It is used to render undo and redo buttons for the editor.
 */

import React, {Component} from 'react';
import {OverlayTrigger, Tooltip} from "react-bootstrap";

import {FaUndo, FaRedo} from "react-icons/fa";


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

        this.undo = this.props.undo;
        this.redo = this.props.redo;
    }

    /**
     * Renders the UndoRedoButtons component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const iconSize = 30;
        const className = "undo-redo-button";
        const undoTooltip = props => (<Tooltip className="show" {...props}>Undo</Tooltip>);
        const redoTooltip = props => (<Tooltip className="show" {...props}>Redo</Tooltip>);

        return (
            <div className="undo-redo-buttons">
                <OverlayTrigger placement="right" overlay={undoTooltip}>
                    <span> {/* Span is necessary for the tooltip to work here */}
                        <FaUndo onClick={this.undo} size={iconSize}
                                className={"undo-redo-button " + (this.props.undoStack.length === 0 ? `disabled-${className}` : `active-${className}`)}/>
                    </span>
                </OverlayTrigger>
                <OverlayTrigger placement="right" overlay={redoTooltip}>
                    <span>
                        <FaRedo onClick={this.redo} size={iconSize}
                                className={"undo-redo-button " + (this.props.redoStack.length === 0 ? `disabled-${className}` : `active-${className}`)}/>
                    </span>
                </OverlayTrigger>
            </div>
        );
    }
}

export default UndoRedoButtons;
