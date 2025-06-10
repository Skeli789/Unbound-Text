/**
 * This file defines the QuickButton component.
 * It is used to insert preset text into the text area.
 */

import React, {Component} from 'react';
import {Button} from 'react-bootstrap';
import {Tooltip} from '@mui/material';


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
        return (
            <Tooltip title={this.props.tooltip} placement="top" arrow enterTouchDelay={0}>
                <Button variant="secondary" className="quick-button"
                        onClick={() => this.props.func(this.props.text)}>
                    {this.props.text.replaceAll("{}", "")}
                </Button>
            </Tooltip>
        )
    }
}

export default QuickButton;
