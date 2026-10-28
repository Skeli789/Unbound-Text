/**
 * This file defines the Footer component.
 * It is used to display a footer at the bottom of the page.
 */

import React, {Component} from "react";
import {AppBar, Link, Toolbar, Typography} from "@mui/material";

import "./styles/HeaderFooter.css";


export class Footer extends Component
{
    /**
     * Represents the Footer component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     */
    constructor(props)
    {
        super(props);
        this.state = {}
    }

    /**
     * Renders the Footer component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        let currentYear = new Date().getFullYear();

        return (
            <AppBar position="static" component="footer" elevation={0} color="primary" enableColorOnDark className="footer">
                <Toolbar variant="dense" className="footer-toolbar">
                    <Typography variant="body2" className="skeli-games-logo">
                        &copy; 2021-{currentYear} Crown Text
                    </Typography>
                    <Typography variant="body2" className="footer-credit">
                        Created by Skeli for{" "}
                        <Link href="https://www.pokecommunity.com/threads/pok%C3%A9mon-crown.463821/"
                              target="_blank" rel="noopener noreferrer"
                              color="inherit" underline="hover">
                            Crown
                        </Link>
                    </Typography>
                </Toolbar>
            </AppBar>
        );
    }
}

export default Footer;
