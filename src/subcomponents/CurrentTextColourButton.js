/**
 * This file defines the CurrentTextColourButton component.
 * It is used to select the current text colour to display the text.
 */

import React, {Component} from 'react';
import {OverlayTrigger, Tooltip, Dropdown, DropdownButton} from "react-bootstrap";

import {COLOURS} from '../TextUtils';

const LOCAL_STORAGE_KEY = "textColour";


export class CurrentTextColourButton extends Component
{
    /**
     * Represents the CurrentTextColourButton component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {boolean} props.currentColour - The current colour of the text.
     * @param {Function} props.setParentCurrentColour - A function to set the current text colour in the parent component.
     */
    constructor(props)
    {
        super(props);
        this.state = {}
        this.setParentCurrentColour = props.setParentCurrentColour;
    }

    /**
     * Sets the current text colour and saves the choice for future visits.
     * @param {string} colour - The chosen colour. 
     */
    setCurrentColour(colour)
    {
        this.setParentCurrentColour(colour);

        //Save in local storage
        localStorage.setItem(LOCAL_STORAGE_KEY, colour);
    }

    /**
     * Renders the CurrentTextColourButton component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const currentColour = this.props.currentColour.toUpperCase();
        const icon = (currentColour in COLOURS) ? COLOURS[currentColour] : COLOURS["BLACK"];
        const tooltip = props => (<Tooltip {...props}>Display Colour</Tooltip>);

        return (
            <OverlayTrigger placement="left" overlay={tooltip}>
                <DropdownButton
                    className="text-colour-dropdown" //For div itself
                    id="text-colour-dropdown" //For button inside div
                    drop="left"
                    variant="light"
                    title={icon}
                    onSelect={this.setCurrentColour.bind(this)}
                >
                    {Object.entries(COLOURS).map(([key, icon]) => (
                        <Dropdown.Item key={key} eventKey={key.toLowerCase()}>
                            {icon} {key.substring(0, 1) + key.substring(1).toLowerCase()} {/*Capitalise first letter only*/}
                        </Dropdown.Item>
                    ))}
                </DropdownButton>
            </OverlayTrigger>
        );
    }
}

/**
 * Gets the previously selected text colour if one exists.
 * @returns The previously selected text colour.
 */
export function GetPreviouslyUsedTextColour()
{
    return localStorage.getItem(LOCAL_STORAGE_KEY);
}

export default CurrentTextColourButton;
