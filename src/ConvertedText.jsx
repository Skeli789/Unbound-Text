/**
 * This file defines the ConvertedText component.
 * It is used to display the text converted to the format needed for the game compiler.
 */

import React, {Component} from 'react';
import {IconButton, InputAdornment, InputBase, Tooltip} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import {NotificationContext} from "./NotificationContext";
import {COLOURS, OTHER_REPLACEMENT_MACROS, ReplaceWithMacros} from "./TextUtils"; 

import "./styles/Editor.css";

const COPY_BUTTON_SIZE = "2.25rem"; //Width reserved at the end of the field for the copy button


//Converted text helper
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

export class ConvertedText extends Component
{
    static contextType = NotificationContext; //Provides notify for copy feedback

    /**
     * Represents the ConvertedText component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {string} props.text - The text to be converted.
     * @param {Object} props.textAreaStyle - The style for the text area.
     * @param {string} [props.id="converted-text"] - The id for the converted text area, unique per editor.
     */
    constructor(props)
    {
        super(props);
        this.state = {};
        this.conversionCache = null; //Share only the latest conversion between rendering and copying
    }

    /**
     * Gets compiler output for the current text, reusing only the latest conversion.
     * @returns {string} The converted text for the latest props.
     */
    getConvertedText()
    {
        const {text} = this.props;
        if (!this.conversionCache || this.conversionCache.text !== text)
            this.conversionCache = {text, convertedText: CreateIngameText(text)};

        return this.conversionCache.convertedText;
    }

    //Clipboard
    /**
     * Copies the converted text to the clipboard.
     */
    copyConvertedText()
    {
        const {notify} = this.context;
        const ingameText = this.getConvertedText();
        const notifyFailure = () => notify({message: "Couldn't copy text to clipboard!", severity: "error"});

        if (ingameText === "") //Don't copy empty text
        {
            notify({message: "No text to copy!", severity: "error"});
            return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText)
        {
            navigator.clipboard.writeText(ingameText).then(() => //Copy to clipboard
            {
                notify({message: "Copied text to clipboard!", severity: "success"});
            }).catch((err) => //In case the copy fails on mobile browsers
            {
                console.error(`Couldn't copy text to clipboard: ${err}`);
                notifyFailure();
            });
        }
        else
        {
            console.error("Clipboard API not supported");
            notifyFailure();
        }
    }

    //Render
    /**
     * Renders the ConvertedText component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const copyText = this.copyConvertedText.bind(this);
        const id = this.props.id ?? "converted-text";

        //Shrink the field by the copy button so the frame keeps the same width as the main field
        const {textAreaStyle} = this.props;
        const width = textAreaStyle?.width;
        const fieldStyle = {...textAreaStyle, ...(width && {width: `calc(${width} - ${COPY_BUTTON_SIZE})`})};

        return (
            <div className="converted-text-container">
                <label className="visually-hidden" htmlFor={id}>Converted text</label>
                <InputBase
                    className="text-field converted-text-field"
                    id={id}
                    inputComponent="textarea" //Plain textarea keeps the fixed rows and skips the measuring textarea
                    multiline
                    readOnly
                    rows={1}
                    value={this.getConvertedText()}
                    endAdornment={
                        <InputAdornment position="end" sx={{marginLeft: 0}}>
                            <Tooltip title="Copy converted text" placement="top" arrow describeChild>
                                <IconButton className="converted-text-copy-button" sx={{color: 'var(--muted)', width: COPY_BUTTON_SIZE, height: COPY_BUTTON_SIZE}} aria-label="Copy converted text" size="small" onClick={copyText}>
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </InputAdornment>
                    }
                    slotProps={{
                        input: {
                            className: "fr-text text-field-input converted-text",
                            type: undefined,
                            style: fieldStyle,
                            onClick: copyText,
                        },
                    }}
                />
            </div>
        );
    }
}

export default ConvertedText;
