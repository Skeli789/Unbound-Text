/**
 * This file defines the QuickButton component.
 * It is used to insert preset text into the text area.
 */

import React, {Component} from 'react';
import {Button, OverlayTrigger, Tooltip} from "react-bootstrap";


export class QuickButton extends Component
{
    /**
     * Represents the QuickButton component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {string} props.text - The text to be inserted when the button is clicked.
     * @param {string} props.tooltip - The tooltip text to be displayed when hovering over the button.
     * @param {Function} props.func - Function to set the text in the parent component.
     */
    constructor(props)
    {
        super(props);
        this.state = {};
    }

    /**
     * Renders the QuickButton component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const tooltip = props => (<Tooltip {...props}>{this.props.tooltip}</Tooltip>);

        return (
            <OverlayTrigger placement="top" overlay={tooltip}>
                <Button variant="secondary" className="quick-button" onClick={
                    () => this.props.func(this.props.text)}>{this.props.text.replaceAll("[]", "")
                }
                </Button>
            </OverlayTrigger>
        )
    }
}

export default QuickButton;
