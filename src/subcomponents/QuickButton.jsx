/**
 * This file defines the QuickButton component.
 * It is used to insert preset text into the text area.
 */

import React, {Component} from 'react';
import {Button, Tooltip} from '@mui/material';


export class QuickButton extends Component
{
    /**
     * Represents the QuickButton component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {string} props.text - The text to be inserted when the button is clicked.
     * @param {string} [props.label] - The text shown on the button. Defaults to the inserted text without empty brackets.
     * @param {string} [props.ariaLabel] - The accessible name, used when the shown text is only a symbol.
     * @param {string} [props.className] - Extra class names added to the button.
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
        const label = this.props.label ?? this.props.text.replaceAll("[]", "").replaceAll("{}", "");
        const className = ["quick-button", this.props.className].filter(Boolean).join(" ");

        return (
            <Tooltip title={this.props.tooltip} placement="top" arrow enterTouchDelay={0} describeChild>
                <Button variant="outlined" size="small" className={className} aria-label={this.props.ariaLabel}
                        onClick={() => this.props.func(this.props.text)}>
                    {label}
                </Button>
            </Tooltip>
        )
    }
}

export default QuickButton;
