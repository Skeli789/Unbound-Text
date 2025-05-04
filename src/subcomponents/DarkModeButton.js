/**
 * This file defines the DarkModeButton component.
 * It is used to turn dark mode for the site on and off.
 */

import React, {Component} from 'react';
import {enable as enableDarkMode, disable as disableDarkMode} from 'darkreader';
import {IconButton, Tooltip} from '@mui/material';

import {MdSunny, MdModeNight} from 'react-icons/md';


export class DarkModeButton extends Component
{
    /**
     * Represents the DarkModeButton component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {boolean} props.darkMode - The current dark mode state.
     * @param {Function} props.toggleParentDarkMode - The function to toggle dark mode in the parent component.
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
        let darkMode = this.props.darkMode;
        if (darkMode)
            disableDarkMode();
        else
            enableDarkMode();

        this.toggleParentDarkMode(!darkMode);

        //Save in local storage
        localStorage.setItem("darkMode", !darkMode);
    }

    /**
     * Renders the DarkModeButton component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const size = 42;
        const id = "dark-mode-button";
        const tooltip = (this.props.darkMode) ? "Light Mode" : "Dark Mode";

        return (
            <Tooltip title={tooltip} placement="top" arrow enterTouchDelay={0} >
                <IconButton id={id} data-testid={id}
                            className={"footer-button " + id}
                            aria-label="Toggle Dark Mode"
                            onClick={this.toggleDarkMode.bind(this)}>
                    {this.props.darkMode ? <MdSunny size={size} /> : <MdModeNight size={size} />}
                </IconButton>
            </Tooltip>
        );
    }
}

export default DarkModeButton;
