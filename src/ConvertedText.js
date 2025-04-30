import React, {Component} from 'react';
import {TextArea} from 'semantic-ui-react';

import {COLOURS, OTHER_REPLACEMENT_MACROS, ReplaceWithMacros} from "./TextUtils"; 

import "./styles/Editor.css";


export class ConvertedText extends Component
{
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
        if (navigator.clipboard && navigator.clipboard.writeText)
        {
            navigator.clipboard.writeText(this.props.text).then((text) => //Copy to clipboard
            {
                console.log("Copied text");
            }).catch((err) => //In case the copy fails on mobile browsers
            {
                console.error(`Couldn't copy text to clipboard: ${err}`);
            });
        }
        else
        {
            console.error("Clipboard API not supported");
        }
    }

    render()
    {
        return (
            <TextArea
                readOnly={true}
                className="fr-text converted-text"
                id={GetConvertedTextId(!this.props.showTranslate)}
                rows={1}
                style={this.props.textAreaStyle}
                value={CreateIngameText(this.props.text)}
                onClick={this.copyConvertedText.bind(this)}
            />
        );
    }
}

function GetConvertedTextId(isTranslationBox)
{
    if (isTranslationBox)
        return "converted-text-translated"
    else
        return "converted-text"
}

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
