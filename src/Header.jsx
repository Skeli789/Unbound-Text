/**
 * This file defines the Header component.
 * It is used to display a header at the top of the page.
 */

import React, {Component} from "react";

import "./styles/HeaderFooter.css";


export class Header extends Component
{
    /**
     * Represents the Header component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     */
    constructor(props)
    {
        super(props);
        this.state = {}
    }

    /**
     * Renders the Header component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        return (
            <div className="header">
                <h2>Crown Text Editor</h2>
            </div>
        );
    }
}

export default Header;
