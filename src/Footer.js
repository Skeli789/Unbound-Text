/**
 * This file defines the Footer component.
 * It is used to display a footer at the bottom of the page.
 */

import React, {Component} from "react";

import AutoSaveButton from "./subcomponents/AutoSaveButton";
import DarkModeButton from "./subcomponents/DarkModeButton";

import "./styles/HeaderFooter.css";


export class Footer extends Component
{
    /**
     * Represents the Footer component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {boolean} props.darkMode - The current dark mode state.
     * @param {function} props.toggleParentDarkMode - The function to toggle dark mode in the parent component.
     */
    constructor(props)
    {
        super(props);
        this.state = {}
    }

    /**
     * Renders the Footer component.
     * @returns {JSX.Element} The rendered Footer component.
     */
    render()
    {
        let currentYear = new Date().getFullYear();

        return (
            <div className="footer">
                <div className="skeli-games-logo">
                    2021-{currentYear} Skeli Games
                </div>
                <div className="d-flex">
                    <AutoSaveButton />
                    <DarkModeButton darkMode={this.props.darkMode}
                                    toggleParentDarkMode={this.props.toggleParentDarkMode} />
                </div>
            </div>
        );
    }
}

export default Footer;
