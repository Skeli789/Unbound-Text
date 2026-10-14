/**
 * This file defines the AutoSaveButton component.
 * It is used to enable or disable auto-saving the text in the editor.
 */

import React, {Component} from 'react';

import SaveIcon from "@mui/icons-material/Save";

import SettingToggleButton from "./SettingToggleButton";
import {CONTROL_BUTTON_SX} from "../AppTheme";

const LOCAL_STORAGE_ENABLED_KEY = "autosaveEnabled";
const LOCAL_STORAGE_TEXT_KEY = "autoSavedText";
const ON_COLOUR = "#66bb6a"; //Readable on both the light and dark header


export class AutoSaveButton extends Component
{
    /**
     * Represents the AutoSaveButton component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {string} [props.label] - Optional row label. When set, the whole row is one full-width button.
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
        const on = this.state.on;
        const tooltip = on ? "Auto Save is On" : "Auto Save is Off";
        const icon = <SaveIcon sx={{opacity: on ? 1 : 0.5, color: on ? ON_COLOUR : "inherit"}} />;

        return (
            <SettingToggleButton id="autosave-button" ariaLabel="Toggle Auto Save" pressed={on}
                                 icon={icon} label={this.props.label} tooltip={tooltip}
                                 sx={CONTROL_BUTTON_SX}
                                 onClick={this.toggleAutoSave.bind(this)} />
        );
    }
}

/**
 * Auto-saves the text to local storage.
 * @param {string} text - The text to be auto-saved.
 */
export function AutoSaveText(text)
{
    const autoSaveEnabled = localStorage.getItem(LOCAL_STORAGE_ENABLED_KEY) === "true";
    if (autoSaveEnabled)
        localStorage.setItem(LOCAL_STORAGE_TEXT_KEY, text);
}

/**
 * Retrieves the auto-saved text from local storage.
 * @returns {string} The auto-saved text.
 */
export function GetAutoSavedText()
{
    return localStorage.getItem(LOCAL_STORAGE_TEXT_KEY) || "";
}

export default AutoSaveButton;
