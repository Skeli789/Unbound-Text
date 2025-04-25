import React, {Component} from 'react';
import {Button} from "react-bootstrap";
import Swal from 'sweetalert2';

import {IsColour, IsPause, IsPunctuation, GetNextLetterIndex} from "../TextUtils";


export class PrettifyButton extends Component
{
    constructor(props)
    {
        super(props);

        this.setParentPrettifiedText = this.props.setPrettifiedText;
    }

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
        text = Array.from(text)

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
                else if (letter === "…")
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

        this.setParentPrettifiedText(finalText);
    }

    tryPrettifyText()
    {
        Swal.fire(
        {
            title: "Make your text pretty?\nThis will reformat your text!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: 'Do It',
        }).then((result) =>
        {
            if (result.isConfirmed)
            {
                this.prettifyText();
                Swal.fire("Prettified!", "", "success");
            }
        });
    }

    render()
    {
        return (
            <Button onClick={this.tryPrettifyText.bind(this)} variant="danger" className="prettify-button">
                Prettify
            </Button>
        );
    }
}

export default PrettifyButton;
