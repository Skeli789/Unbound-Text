/**
 * This file defines the CurrentTextColourButton component.
 * It is used to select the current text colour to display the text.
 */

import React, {Component} from 'react';
import {MenuItem, Select, Tooltip} from "@mui/material";

import {COLOURS} from '../TextUtils';

const LOCAL_STORAGE_KEY = "textColour";


export class CurrentTextColourButton extends Component
{
    /**
     * Represents the CurrentTextColourButton component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {boolean} props.currentColour - The current colour of the text.
     * @param {Function} props.setParentCurrentColour - A function to set the current text colour in the parent component.
     */
    constructor(props)
    {
        super(props);
        this.state = {}
        this.setParentCurrentColour = props.setParentCurrentColour;
    }

    /**
     * Sets the current text colour and saves the choice for future visits.
     * @param {Object} e - The dropdown selection event.
     */
    setCurrentColour(e)
    {
        let colour = e.target.value;
        this.setParentCurrentColour(colour);

        //Save in local storage
        localStorage.setItem(LOCAL_STORAGE_KEY, colour);
    }

    /**
     * Renders the CurrentTextColourButton component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const id = "text-colour-dropdown";
        return (
            <Tooltip title="Display Colour" placement="left" arrow enterTouchDelay={0}>
                <Select
                    className={id} //For div itself
                    id={id} //For button inside div
                    value={this.props.currentColour}
                    onChange={this.setCurrentColour.bind(this)}
                    autoWidth
                    renderValue={(selected) => (
                        <span>
                            {COLOURS[selected.toUpperCase()]} {/* Show only the colour corresponding to the selected value */}
                        </span>
                    )}
                    IconComponent={() => null} //Hide the dropdown arrow icon
                >
                    {Object.entries(COLOURS).map(([key, icon]) => (
                        <MenuItem  key={key} value={key.toLowerCase()}>
                            {icon} {key.substring(0, 1) + key.substring(1).toLowerCase()} {/*Capitalise first letter only*/}
                        </MenuItem >
                    ))}
                </Select>
            </Tooltip>
        );
    }
}

/**
 * Gets the previously selected text colour if one exists.
 * @returns The previously selected text colour.
 */
export function GetPreviouslyUsedTextColour()
{
    return localStorage.getItem(LOCAL_STORAGE_KEY);
}

export default CurrentTextColourButton;
