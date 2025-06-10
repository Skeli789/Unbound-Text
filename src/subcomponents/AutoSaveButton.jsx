/**
 * This file defines the AutoSaveButton component.
 * It is used to enable or disable auto-saving the text in the editor.
 */

import React, {Component} from 'react';
import {IconButton, Tooltip} from '@mui/material';

import {MdSave} from "react-icons/md";

const LOCAL_STORAGE_ENABLED_KEY = "autosaveEnabled";
const LOCAL_STORAGE_TEXT_KEY = "autoSavedText";
const LOCAL_STORAGE_TRAINER_NAME_KEY = "autoSavedTrainerName";


export class AutoSaveButton extends Component
{
    /**
     * Represents the AutoSaveButton component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     */
    constructor(props)
    {
        super(props);

        if (localStorage.getItem(LOCAL_STORAGE_ENABLED_KEY) == null)
            localStorage.setItem(LOCAL_STORAGE_ENABLED_KEY, true);

        this.state =
        {
            on: localStorage.getItem(LOCAL_STORAGE_ENABLED_KEY) === "true",
        }
    }

    /**
     * Toggles the auto save.
     */
    async toggleAutoSave()
    {
        let on = this.state.on;
        on = !on;
        this.setState({on});
        localStorage.setItem(LOCAL_STORAGE_ENABLED_KEY, on);

        //Clear the previous auto-saved text if auto-save is turned off
        if (!on)
            localStorage.removeItem(LOCAL_STORAGE_TEXT_KEY);
    }

    /**
     * Renders the AutoSaveButton component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const size = 42;
        const id = "autosave-button";
        const iconColour = (this.state.on) ? "red" : "white";
        const tooltip = (this.state.on) ? "AutoSave is On" : "AutoSave is Off";

        return (
            <Tooltip title={tooltip} placement="top" arrow>
                <IconButton id={id} data-testid={id}
                            className={"footer-button " + id}
                            aria-label="Toggle AutoSave"
                            onClick={this.toggleAutoSave.bind(this)}>
                        <MdSave size={size} color={iconColour}/>
                </IconButton>
            </Tooltip>
        );
    }
}

/**
 * Auto-saves the text to local storage.
 * @param {string} text - The text to be auto-saved.
 */
export function AutoSaveText(text, trainerName)
{
    const autoSaveEnabled = localStorage.getItem(LOCAL_STORAGE_ENABLED_KEY) === "true";
    if (autoSaveEnabled)
    {
        localStorage.setItem(LOCAL_STORAGE_TEXT_KEY, text);
        localStorage.setItem(LOCAL_STORAGE_TRAINER_NAME_KEY, trainerName);
    }
}

/**
 * Retrieves the auto-saved text from local storage.
 * @returns {string} The auto-saved text.
 */
export function GetAutoSavedText()
{
    return localStorage.getItem(LOCAL_STORAGE_TEXT_KEY) || "";
}

/**
 * Retrieves the auto-saved trainer name from local storage.
 * @returns {string} The auto-saved trainer name.
 */
export function GetAutoSavedTrainerName()
{
    return localStorage.getItem(LOCAL_STORAGE_TRAINER_NAME_KEY) || "";
}

export default AutoSaveButton;
