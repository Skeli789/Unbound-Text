/**
 * This file defines the DarkModeButton component.
 * It is used to turn dark mode for the site on and off.
 */

import React, {Component} from 'react';

import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

import SettingToggleButton from "./SettingToggleButton";


export class DarkModeButton extends Component
{
    /**
     * Represents the DarkModeButton component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {boolean} props.darkMode - The current dark mode state.
     * @param {Function} props.toggleParentDarkMode - The function to toggle dark mode in the parent component.
     * @param {string} [props.label] - Optional row label. When set, the whole row is one full-width button.
     */
    constructor(props)
    {
        super(props);
        this.state = {}
        this.toggleParentDarkMode = this.props.toggleParentDarkMode;
    }

    /**
     * Toggles dark mode.
     */
    async toggleDarkMode()
    {
        //The parent saves the choice and applies the theme
        this.toggleParentDarkMode(!this.props.darkMode);
    }

    /**
     * Renders the DarkModeButton component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const darkMode = Boolean(this.props.darkMode);
        const tooltip = (darkMode) ? "Light Mode" : "Dark Mode";
        const icon = (darkMode) ? <LightModeIcon /> : <DarkModeIcon />;

        return (
            <SettingToggleButton id="dark-mode-button" ariaLabel="Toggle Dark Mode" pressed={darkMode}
                                 icon={icon} label={this.props.label} tooltip={tooltip}
                                 enterTouchDelay={0}
                                 onClick={this.toggleDarkMode.bind(this)} />
        );
    }
}

export default DarkModeButton;
