/**
 * This file defines the SpaceInfo component.
 * It is used to display how much space is used on the current line.
 */
import React, {Component} from "react";

import {SEMI_LINE_WIDTH} from "./TextUtils";

import "./styles/SpaceInfo.css";


export class SpaceInfo extends Component
{
    /**
     * Represents the SpaceInfo component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {number} props.lineWidth - The width of the current characters on the line.
     * @param {number} props.totalWidth - The total width allowed on the line.
     */
    constructor(props)
    {
        super(props);
        this.state = {};
    }

    /**
     * Renders the SpaceInfo component.
     * @returns {JSX.Element} The rendered SpaceInfo component.
     */
    render()
    {
        const {lineWidth, totalWidth} = this.props;
        let charCount = Math.floor(lineWidth / 5.6); //Approximate character count based on average character width
        let maxCharCount = (totalWidth === SEMI_LINE_WIDTH) ? Math.floor(totalWidth / 5.6) : Math.floor(totalWidth / (206 / 36));
        let overflowErrorStyle = (lineWidth > totalWidth) ? {color: "red"} : {color: "green"};

        return (
            <div className="space-info">
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
