/**
 * This file defines the CurrentTextColourButton component.
 * It is used to select the current text colour to display the text.
 */

import React, {Component} from 'react';
import {FormControl, InputLabel, MenuItem, Select, Tooltip} from "@mui/material";

import {COLOURS} from '../TextUtils';

const LOCAL_STORAGE_KEY = "textColour";
const COLOUR_SIZE = "28px";
const COLOUR_TOP_OFFSET = "calc(1px + 4px + 0.78571429 * 2rem)"; //Aligns the symbol with the first text line: 1px border, 4px field padding and 22px textarea padding-top

/**
 * Replaces the dropdown arrow, since the colour symbol is the whole control.
 * @returns {null} Nothing is rendered.
 */
const NoIcon = () => null;


export class CurrentTextColourButton extends Component
{
    /**
     * Represents the CurrentTextColourButton component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {boolean} props.currentColour - The current colour of the text.
     * @param {Function} props.setParentCurrentColour - A function to set the current text colour in the parent component.
     * @param {string} [props.idPrefix=""] - Prefix for the element ids, unique per editor.
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
        const idPrefix = this.props.idPrefix || "";
        const id = idPrefix + "text-colour-dropdown";
        const labelId = idPrefix + "text-colour-label";
        return (
            <Tooltip title="Text colour" placement="left" arrow enterTouchDelay={0} describeChild>
                <FormControl size="small" className="text-colour-dropdown" sx={{
                    width: COLOUR_SIZE,
                    height: COLOUR_SIZE,
                    boxSizing: "border-box", //Keeps the 28px outer size with the border included
                    backgroundColor: "background.paper", //Opaque so the text underneath does not show through
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    overflow: "hidden",
                    marginTop: COLOUR_TOP_OFFSET,
                }}>
                    <InputLabel id={labelId} className="visually-hidden">Text colour</InputLabel>
                    <Select
                        variant="standard"
                        disableUnderline
                        IconComponent={NoIcon}
                        labelId={labelId}
                        id={id}
                        value={this.props.currentColour}
                        onChange={this.setCurrentColour.bind(this)}
                        sx={{
                            height: "100%",
                            '&&': {marginTop: 0}, //Removes the 16px MUI offset left by the hidden label
                            '&& .MuiSelect-select': {
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxSizing: "border-box",
                                width: "100%",
                                height: "100%",
                                minHeight: "100%",
                                padding: 0,
                                paddingRight: "0 !important", //Overrides MUI's arrow padding so the symbol stays centred
                                overflow: "visible", //MUI clips overflow, which cut off the symbol when it is centred
                            },
                        }}
                        renderValue={(selected) => (
                            //Show only the colour corresponding to the selected value
                            <span>{COLOURS[selected.toUpperCase()]}</span>
                        )}
                    >
                        {Object.entries(COLOURS).map(([key, icon]) => (
                            <MenuItem  key={key} value={key.toLowerCase()}>
                                {icon} {key.substring(0, 1) + key.substring(1).toLowerCase()} {/*Capitalise first letter only*/}
                            </MenuItem >
                        ))}
                    </Select>
                </FormControl>
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
