/**
 * This file defines the SpaceInfo component.
 * It is used to display how much space is used on the current line.
 */
import React, {Component} from "react";

import {GetDisplayColour, FULL_LINE_WIDTH, SEMI_LINE_WIDTH} from "./TextUtils";

import "./styles/SpaceInfo.css";

const AVERAGE_CHAR_WIDTH = 5.6;
const FULL_LINE_CHAR_COUNT = 36;


export class SpaceInfo extends Component
{
    /**
     * Represents the SpaceInfo component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {number} props.lineWidth - The width of the current characters on the line.
     * @param {number} props.totalWidth - The total width allowed on the line.
     * @param {boolean} [props.darkMode=false] - Whether dark mode is enabled, which brightens the success colour.
     */
    constructor(props)
    {
        super(props);
        this.state = {};
    }

    /**
     * Renders the SpaceInfo component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const {lineWidth, totalWidth, darkMode = false} = this.props;
        let charCount = Math.floor(lineWidth / AVERAGE_CHAR_WIDTH); //Approximate character count based on average character width
        let maxCharCount = (totalWidth === SEMI_LINE_WIDTH) ? Math.floor(totalWidth / AVERAGE_CHAR_WIDTH) : Math.floor(totalWidth / (FULL_LINE_WIDTH / FULL_LINE_CHAR_COUNT));
        let overflowErrorStyle = (lineWidth > totalWidth) ? {color: "red"} : {color: GetDisplayColour("green", darkMode)};

        return (
            <div className="space-info" role="group" aria-label="Line width and approximate character count">
                {/* Line Width */}
                <span className="cell cur-num" style={overflowErrorStyle}>{lineWidth}</span>
                <span className="cell slash">/</span>
                <span className="cell tot-num">{totalWidth}</span>

                {/* Separator */}
                <span className="cell tilde">~</span>

                {/* Approximate Chracter Count */}
                <span className="cell cur-num" style={overflowErrorStyle}>{charCount}</span>
                <span className="cell slash">/</span>
                <span className="cell tot-num">{maxCharCount}</span>
            </div>
        )
    }
}

export default SpaceInfo;
