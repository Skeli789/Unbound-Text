/**
 * This file defines the PrettifyButton component.
 * It is used to format the text to make it optimal for reading in textboxes.
 */

import React, {Component} from 'react';
import {Button} from "react-bootstrap";
import Swal from 'sweetalert2';

import {IsColour, IsPause, IsPunctuation, GetNextLetterIndex, FormatStringForDisplay} from "../TextUtils";


export class PrettifyButton extends Component
{
    /**
     * Represents the PrettifyButton component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {string} props.text - The text to be prettified.
     * @param {Function} props.setPrettifiedText - Function to set the prettified text in the parent component.
     */
    constructor(props)
    {
        super(props);

        this.setParentPrettifiedText = this.props.setPrettifiedText;
    }

    /**
     * Formats the text to make it optimal for reading.
     * @returns {string} The prettified text.
     */
    prettifyText()
    {
        let finalText = "";
        let inMacro = false;
        let skipNextChar = false;
        let skipNextCharIfWhitespace = false;
        let text = this.props.text;

        text = text.replaceAll("\n", " "); //First, remove all of the new lines
        text = text.replaceAll("  ", " "); //Then, remove all of the duplicate white spaces created above
        text = text.replaceAll("  ", " "); //Then, remove all of the duplicate white spaces created above
        text = Array.from(text); //Convert to an array for easier manipulation

        for (let [i, letter] of text.entries())
        {
            if (skipNextChar)
            {
                skipNextChar = false;
                continue;
            }

            if (!skipNextCharIfWhitespace || letter !== " ")
                finalText += letter;

            if (!IsColour(letter)) //Not a real character, so continue trying to skip
                skipNextCharIfWhitespace = false;

            if (letter === "[")
                inMacro = true;
            else if (letter === "]")
                inMacro = false;
            else if (!inMacro)
            {
                if (IsPunctuation(letter)) //Sentence punctuation (not including ellipses)
                {
                    if (i + 1 < text.length)
                    {
                        if (text[i + 1] === '"')
                        {
                            finalText += '"'; //Place the quote before moving to the next textbox
                            skipNextChar = true;
                        }
                        else if (IsPunctuation(text[i + 1])) //Eg. !?
                            continue; //Don't add the new line yet
                    }

                    finalText += "\n\n"; //Move to new textbox
                    skipNextCharIfWhitespace = true;
                }
                else if (letter === "…") //Handle ellipses
                {
                    if (i + 1 < text.length)
                    {
                        let doesntLeadLine = i - 1 > 0 && i - 1 !== " " //Didn't lead the line
                        let nextLetterIndex = GetNextLetterIndex(text, i + 1);
                        let nextLetter = text[nextLetterIndex];

                        if (!doesntLeadLine) //Leads line
                        {
                            if (nextLetter === "…")
                                doesntLeadLine = true; //Should always be space between ... and ...
                        }

                        if (doesntLeadLine)
                        {
                            if (nextLetter !== " " && !IsPunctuation(nextLetter)) //And sandwiched between two words (eg. Hi...there)
                                finalText += " "; //Add a whitespace after the ellipses
                            else //Whitespace after the ellipses
                            {
                                let secondNextLetterIndex = GetNextLetterIndex(text, nextLetterIndex + 1);
                                if (secondNextLetterIndex < text.length)
                                {
                                    if (/^[A-Z]*$/.test(text[secondNextLetterIndex])) //And next character is an uppercase letter
                                    {
                                        let nextIndex = i + 1;
                                        while (text[nextIndex] === " ") ++nextIndex; //Fixes problems like "... [PAUSE][20]I hate it!"

                                        if (!IsPause(text, nextIndex)) //Pause between ... and capital letter clearly indicates it should be in the same textbox
                                        {
                                            finalText += "\n\n"; //Move to new textbox
                                            skipNextCharIfWhitespace = true;
                                        }
                                    }
                                    else if (IsPunctuation(text[secondNextLetterIndex]))
                                        skipNextCharIfWhitespace = true; //Shouldn't be space between ellipses and punctuation
                                }
                            }
                        }
                        else
                            skipNextCharIfWhitespace = true; //Shouldn't be space between and first word of line    
                    }
                }
            }
        }

        //Format each text box individually so the first line of each can be max length
        let lines = finalText.split("\n\n"); //Split the text by textboxes
        for (let i = 0; i < lines.length; ++i)
        {
            let line = FormatStringForDisplay(lines[i], false); //Format the line for display
            lines[i] = line; //Replace the line with the formatted line
        }

        finalText = lines.join("\n\n"); //Join the lines back together
        this.setParentPrettifiedText(finalText.trim()); //Remove the last new lines
    }

    /**
     * Confirms with the user if they want to prettify the text.
     */
    tryPrettifyText()
    {
        Swal.fire(
        {
            icon: "warning",
            title: "Make your text pretty?\nThis will reformat your text!",
            showCancelButton: true,
            confirmButtonText: 'Do It',
            scrollbarPadding: false,
        }).then((result) =>
        {
            if (result.isConfirmed)
            {
                this.prettifyText();
                Swal.fire(
                {
                    icon: "success",
                    title: "Prettified!",
                    scrollbarPadding: false,
                });
            }
        });
    }

    /**
     * Renders the PrettifyButton component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const id = "prettify-button";

        return (
            <Button variant="danger" className={id} id={id} data-testid={id}
                    onClick={this.tryPrettifyText.bind(this)}>
                Prettify
            </Button>
        );
    }
}

export default PrettifyButton;
