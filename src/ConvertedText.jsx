/**
 * This file defines the ConvertedText component.
 * It is used to display the text converted to the format needed for the game compiler.
 */

import React, {Component} from 'react';
import {toast} from "react-toastify";
import {TextArea} from 'semantic-ui-react';

import {COLOURS, OTHER_REPLACEMENT_MACROS, ReplaceWithMacros} from "./TextUtils"; 

import "./styles/Editor.css";

/** Options for the toast notifications */
const BASE_TOAST_OPTIONS =
{
    position: "bottom-right",
    autoClose: 3000,
    hideProgressBar: true, //Don't show the user how much time is left
    closeOnClick: true,
    pauseOnHover: false, //Always decrease the timer
    pauseOnFocusLoss: false, //Always decrease the timer
    draggable: false,
    // transition: "slide", //Broken
};


export class ConvertedText extends Component
{
    /**
     * Represents the ConvertedText component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {string} props.text - The text to be converted.
     * @param {boolean} props.darkMode - Whether the dark mode is enabled.
     * @param {Object} props.textAreaStyle - The style for the text area.
     */
    constructor(props)
    {
        super(props);
        this.state = {};
    }

    /**
     * Copies the converted text to the clipboard.
     */
    copyConvertedText()
    {
        let toastTheme = this.props.darkMode ? "dark" : "colored";
        const toastOptions = {...BASE_TOAST_OPTIONS, theme: toastTheme};

        if (this.props.text === "") //Don't copy empty text
        {
            toast.error("No text to copy!", toastOptions);
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText)
        {
            navigator.clipboard.writeText(this.props.text).then((text) => //Copy to clipboard
            {
                //console.log(`Copied text to clipboard: ${text}`);
                toast.success("Copied text to clipboard!", toastOptions);
            }).catch((err) => //In case the copy fails on mobile browsers
            {
                console.error(`Couldn't copy text to clipboard: ${err}`);
                toast.error("Couldn't copy text to clipboard!", toastOptions);
            });
        }
        else
        {
            console.error("Clipboard API not supported");
            toast.error("Couldn't copy text to clipboard!", toastOptions);
        }
    }

    /**
     * Renders the ConvertedText component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        return (
            <TextArea
                readOnly={true}
                className="fr-text converted-text"
                id="converted-text"
                rows={1}
                style={this.props.textAreaStyle}
                value={CreateIngameText(this.props.text)}
                onClick={this.copyConvertedText.bind(this)}
            />
        );
    }
}

/**
 * Converts the given text to the format needed for the game compiler.
 * @param {string} text - The text to be converted. 
 * @returns {string} The converted text.
 */
export function CreateIngameText(text)
{
    let finalText = "";
    let newTextbox = true;
    let inQuote = false;

    text = text.trim();
    text = text.replaceAll("Pokemon", "Pok\\emon");
    text = text.replaceAll("é", "\\e");
    text = text.replaceAll("–", "-");
    text = text.replaceAll("“", '"');
    text = text.replaceAll("”", '"');
    text = ReplaceWithMacros(text, COLOURS);
    text = ReplaceWithMacros(text, OTHER_REPLACEMENT_MACROS);

    for (let i = 0; i < text.length; ++i)
    {
        let letter = text[i];

        if (letter === " ")
        {
            if (i + 1 < text.length)
            {
                if (text[i + 1] === " " || text[i + 1] === "\n") //Disallow trailing whitespace
                    continue;
            }
        }

        if (letter === "\n") //Intentionally not else if
        {
            if (i + 1 < text.length)
            {
                if (text[i + 1] === "\n")
                {
                    finalText += "\\p";
                    newTextbox = true;

                    while (i < text.length && text[i + 1] === "\n")
                        ++i; //Skip to the next textbox
                }
                else
                {
                    if (newTextbox) //First \n in textbox
                    {
                        finalText += "\\n";
                        newTextbox = false;
                    }
                    else
                        finalText += "\\l";
                }
            }
        }
        else if (letter === '"')
        {
            if (inQuote)
            {
                if (i - 1 >= 0 && text[i - 1] === "\\")
                    finalText += '"'; //Don't add an extra backslash
                else
                    finalText += '\\"';

                inQuote = false;
            }
            else
            {
                finalText += '"';
                inQuote = true;
            }
        }
        else if (letter === "$")
        {
            if (i - 1 >= 0 && text[i - 1] === "\\")
                finalText += '$'; //Don't add an extra backslash
            else
                finalText += '\\$';
        }
        else
            finalText += letter;
    }

    return finalText;
}

export default ConvertedText;
