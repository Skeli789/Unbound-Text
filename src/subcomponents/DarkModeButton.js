/**
 * This file defines the DarkModeButton component.
 * It is used to turn dark mode for the site on and off.
 */

import React, {Component} from 'react';
import {Button, OverlayTrigger, Tooltip} from "react-bootstrap";
import {enable as enableDarkMode, disable as disableDarkMode} from 'darkreader';

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
        const iconClass = "dark-mode-button";
        const tooltipText = (this.props.darkMode) ? "Light Mode" : "Dark Mode";
        const tooltip = props => (<Tooltip {...props}>{tooltipText}</Tooltip>);

        return (
            <Button size="lg"
                    id="dark-mode-button"
                    className="footer-button"
                    aria-label="Toggle Dark Mode"
                    onClick={this.toggleDarkMode.bind(this)}>
                <OverlayTrigger placement="top" overlay={tooltip}>
                    <div className={`footer-button-icon ${iconClass}`}>
                        {this.props.darkMode ? <MdSunny size={size} /> : <MdModeNight size={size} />}
                    </div>
                </OverlayTrigger>
            </Button>
        );
    }
}

export default DarkModeButton;
