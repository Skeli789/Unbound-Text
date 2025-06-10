/**
 * This file defines the TranslationButton component.
 * It is used to translate text into another language using an external API.
 */

import axios from 'axios';
import React, {Component} from 'react';
import {Navbar} from "react-bootstrap";
import Swal from 'sweetalert2';
import {FormControl, InputLabel, MenuItem, Select} from '@mui/material';

import {CreateIngameText} from "../ConvertedText";

const TRANSLATION_CHAR_LIMIT = 1000000; //Current API doesn't have a max limit so this is high enough
const SUPPORTED_LANGUAGES =
{
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "vi": "Vietnamese",
};
const SUPPORT_EMAIL = import.meta.env.VITE_TRANSLATION_EMAIL || ""; //Email for the translation API


export class TranslationButton extends Component
{
    /**
     * Represents the TranslationButton component.
     * @param {Object} props - The props object containing the component's properties.
     * @param {string} props.text - The text to be translated.
     * @param {boolean} props.isForTranslationBox - Whether the button is for the translation box.
     * @param {Function} props.showTranslationBox - Function to show the translated text in another editor.
     */
    constructor(props)
    {
        super(props);

        this.state =
        {
            translateToLanguage: "",
        };

        this.showTranslationBox = props.showTranslationBox;
    }

    /**
     * Checks if a language has been chosen for translation.
     * @return {boolean} Whether a language has been chosen.
     */
    isLanguageChosen()
    {
        return this.state.translateToLanguage in SUPPORTED_LANGUAGES;
    }

    /**
     * Sets the translation language to the selected language.
     * @param {Object} e - The event for the dropdown selection.
     */
    setTranslationLanguage(e)
    {
        let language = e.target.value;
        this.setState({translateToLanguage: language});
    }

    /**
     * Translates the text using the selected language.
     * returns {Promise<void>} - A promise that resolves when the translation is complete.
     */
    async translateText()
    {
        //Handle errors
        if (!this.isLanguageChosen())
        {
            Swal.fire(
            {
                icon: "error",
                title: "Please choose a language first.",
                scrollbarPadding: false,
            });
            return;
        }
        else if (this.props.text === "")
        {
            Swal.fire(
            {
                icon: "error",
                title: "Please add some text to translate first.",
                scrollbarPadding: false,
            });
            return;
        }

        //Create the text to be translated
        let text, textList, currText;
        let translatedTextList = [];
        let actualTextList = [];
        text = CreateIngameText(this.props.text); //Start with the ingame text as a base
        text = text.replaceAll("\\e", "é").replaceAll('\\"', '"').replaceAll("[.]", "…");
        text = text.replaceAll(/(\.)\\n/g, ".\n"); //\n's with a . before them
        text = text.replaceAll(/(!)\\n/g, "!\n"); //\n's with a ! before them
        text = text.replaceAll(/(\?)\\n/g, "?\n"); //\n's with a ? before them
        text = text.replaceAll(/(…)\\n/g, "…\n"); //\n's with a … before them
        text = text.replaceAll("\\n", " ").replaceAll("\\l", " ").replaceAll("\\p", "\n"); //
        text = text.replaceAll("[PLAYER]", "Billybobbydoe").replaceAll("[RIVAL]", "Billybobbyfoe"); //So they provide the correct context in the sentence
        text = text.replaceAll("[PAUSE][", "[PAUSE").replaceAll("[BUFFER][0", "[BUFFER0");
        text = text.replaceAll("[", "<").replaceAll("]", ">"); //Prevent buffers from being removed by turning them into HTML tags
        textList = text.split("\n");

        //Translate the text
        Swal.fire(
        {
            title: "Translating...",
            showConfirmButton: false,
            scrollbarPadding: false,
            allowOutsideClick: false,
            didOpen: () =>
            {
                Swal.showLoading();
            },
        });

        //Seperate text into groups of TRANSLATION_CHAR_LIMIT
        currText = "";
        for (text of textList)
        {
            if (currText.length + text.length + "\n".length > TRANSLATION_CHAR_LIMIT)
            {
                if (currText.length > 0)
                    actualTextList.push(currText);
                currText = text;
            }
            else
            {
                if (currText !== "")
                    currText += "\n";
                currText += text;
            }
        }

        if (currText.length > 0)
            actualTextList.push(currText);

        try
        {
            for (text of actualTextList) //Translate each paragraph at a time as to not overwhelm the server
            {
                const data =
                {
                    params:
                    {
                        q: text,
                        langpair: `en|${this.state.translateToLanguage}`,
                        de: SUPPORT_EMAIL,
                    }
                };

                let response = await axios.get(`https://api.mymemory.translated.net/get`, data);
                text = response.data.responseData.translatedText;
                text = text.replaceAll("Billybobbydoe", "[PLAYER]").replaceAll("Billybobbyfoe", "[RIVAL]"); //Give Player and Rival their buffers back
                text = text.replaceAll(/<\/.*>/g, ""); //Remove closing tags added in
                text = text.replaceAll("<pause", "<pause><").replaceAll("<buffer0", "<buffer><0"); //Restore newer buffers
                text = text.replaceAll("<", "[").replaceAll(">", "]"); //Convert all buffers back
                translatedTextList.push(text);
            }

            let translatedText = translatedTextList.join("\\p").replaceAll("\n", "\\p");
            this.showTranslationBox(translatedText); //Show the translated text in the other box
            Swal.close();
        }
        catch (e)
        {
            console.error(e);
            Swal.fire(
            {
                icon: "error",
                title: "Translation site returned an error!\nPlease wait 1 minute before trying again.",
                scrollbarPadding: false,
            });
        }
    }

    /**
     * Creates a the language list for the dropdown menu.
     * @returns {Array<JSX.Element>} The list of languages as NavDropdown.Item elements.
     */
    createLanguageList()
    {
        let languages = [];

        for (let languageId of Object.keys(SUPPORTED_LANGUAGES))
        {
            languages.push(
                <MenuItem key={languageId} value={languageId} >
                    {SUPPORTED_LANGUAGES[languageId]} {/* Language name */}
                </MenuItem>
            );
        }

        return languages;
    }

    /**
     * Renders the TranslationButton component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const languageDropdownId = "language-dropdown";

        if (this.props.isForTranslationBox) //Is the translated text box
        {
            return (
                <Navbar variant="dark" bg="dark" expand="lg" className="translate-navbar translated-text-navbar">
                    <Navbar.Brand>Translated Text</Navbar.Brand>
                </Navbar>
            );
        }

        return (
            <Navbar variant="dark" bg="dark" expand="lg" className="translate-navbar">
                {/* Dropdown for the language selection */}
                <FormControl variant="standard" sx={{ m: 0, minWidth: 160 }}>
                    <InputLabel id={languageDropdownId}>Translate to Language</InputLabel>
                    <Select
                        labelId={languageDropdownId}
                        id={languageDropdownId}
                        label="Translate to Language"
                        value={this.state.translateToLanguage}
                        onChange={this.setTranslationLanguage.bind(this)}
                    >
                        {this.createLanguageList()}
                </Select>
                </FormControl>

                {/* Translate button */}
                {
                    this.isLanguageChosen() &&
                        <Navbar.Brand className={(this.isLanguageChosen()) ? "translate-button-active" : ""} onClick={this.translateText.bind(this)}>
                            Translate
                        </Navbar.Brand>
                }
            </Navbar>
        );
    }
}

export default TranslationButton;
