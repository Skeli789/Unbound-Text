/**
 * This file defines the PrettifyButton component.
 * It is used to format the text to make it optimal for reading in textboxes.
 */

import React, {Component} from 'react';
import {Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle} from "@mui/material";

import {IsColour, IsPause, IsPunctuation, GetNextLetterIndex, FormatStringForDisplay} from "../TextUtils";
import {NotificationContext} from "../NotificationContext";


export class PrettifyButton extends Component
{
    static contextType = NotificationContext;

    /**
     * Represents the PrettifyButton component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {string} props.text - The text to be prettified.
     * @param {Function} props.setPrettifiedText - Function to set the prettified text in the parent component.
     * @param {string} [props.idPrefix=""] - Prefix for the element ids, unique per editor.
     */
    constructor(props)
    {
        super(props);

        this.setParentPrettifiedText = this.props.setPrettifiedText;
        this.buttonRef = React.createRef();
        this.state = {confirmOpen: false};
    }

    //Formatting
    /**
     * Formats the text to make it optimal for reading and passes the result to the parent.
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
        finalText = finalText.split("\n\n") //Split the text by textboxes
            .map((line) => FormatStringForDisplay(line, false)) //Format the line for display
            .join("\n\n"); //Join the lines back together
        this.setParentPrettifiedText(finalText.trim()); //Remove the last new lines
    }

    //Dialog
    /**
     * Opens the confirmation dialog before the text is reformatted.
     */
    openConfirm()
    {
        this.buttonRef.current?.blur(); //Chromium blocks aria-hidden on a focused opener
        this.setState({confirmOpen: true});
    }

    /**
     * Returns focus to the Prettify button once the dialog has finished closing.
     */
    restoreOpenerFocus()
    {
        this.buttonRef.current?.focus();
    }

    /**
     * Closes the confirmation dialog without changing the text.
     */
    closeConfirm()
    {
        this.setState({confirmOpen: false});
    }

    /**
     * Prettifies the text once the user confirms, then shows a success notification.
     */
    confirmPrettify()
    {
        if (!this.state.confirmOpen) //Ignore repeated clicks while the dialog is closing
            return;

        this.setState({confirmOpen: false});
        this.prettifyText();
        this.context.notify({message: "Prettified!", severity: "success"});
    }

    //Render
    /**
     * Renders the PrettifyButton component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const idPrefix = this.props.idPrefix || "";
        const id = "prettify-button";
        const dialogTitleId = idPrefix + "prettify-dialog-title";
        const dialogDescriptionId = idPrefix + "prettify-dialog-description";

        return (
            <>
                <Button variant="contained" color="error" size="small"
                        className={id} id={idPrefix + id} data-testid={idPrefix + id} ref={this.buttonRef}
                        onClick={this.openConfirm.bind(this)}>
                    Prettify
                </Button>
                <Dialog open={this.state.confirmOpen} onClose={this.closeConfirm.bind(this)}
                        slotProps={{transition: {onExited: this.restoreOpenerFocus.bind(this)}}}
                        aria-labelledby={dialogTitleId} aria-describedby={dialogDescriptionId}>
                    <DialogTitle id={dialogTitleId}>Make your text pretty?</DialogTitle>
                    <DialogContent>
                        <DialogContentText id={dialogDescriptionId}>
                            This will reformat your text!
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button color="inherit" sx={{color: "text.primary"}} onClick={this.closeConfirm.bind(this)}>Cancel</Button>
                        <Button variant="contained" onClick={this.confirmPrettify.bind(this)}>Do It</Button>
                    </DialogActions>
                </Dialog>
            </>
        );
    }
}

export default PrettifyButton;
