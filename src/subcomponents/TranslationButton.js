import axios from 'axios';
import React, {Component} from 'react';
import {Navbar, NavDropdown} from "react-bootstrap";
import Swal from 'sweetalert2';

import {CreateIngameText} from "../ConvertedText";

const TRANSLATION_CHAR_LIMIT = 1000000; //Current API doesn't have a max limit so this is high enough
const SUPPORTED_LANGUAGES =
{
    "Spanish": "es",
    "French": "fr",
    "German": "de",
    "Italian": "it",
    "Vietnamese": "vi",
};
const SUPPORT_EMAIL = process.env.REACT_APP_EMAIL || ""; //Email for the translation API


export class TranslationButton extends Component
{
    constructor(props)
    {
        super(props);

        this.state =
        {
            translateToLanguage: "Language",
        };

        this.showTranslationBox = props.showTranslationBox;
    }

    isLanguageChosen()
    {
        return this.state.translateToLanguage in SUPPORTED_LANGUAGES;
    }

    setTranslationLanguage(language)
    {
        this.setState({translateToLanguage: language});
    }

    async translateText()
    {
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
                        langpair: `en|${SUPPORTED_LANGUAGES[this.state.translateToLanguage]}`,
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

    render()
    {
        var languages = [];

        for (let language of Object.keys(SUPPORTED_LANGUAGES))
            languages.push(<NavDropdown.Item key={SUPPORTED_LANGUAGES[language]} onClick={this.setTranslationLanguage.bind(this, language)}>{language}</NavDropdown.Item>);

        if (!this.props.showTranslate) //Is the translated text box
        {
            return (
                <Navbar variant="dark" bg="dark" expand="lg" className="translate-navbar translated-text-navbar">
                    <Navbar.Brand>Translated Text</Navbar.Brand>
                </Navbar>
            );
        }

        return (
            <Navbar variant="dark" bg="dark" expand="lg" className="translate-navbar">
                <Navbar.Brand className={(this.isLanguageChosen()) ? "translate-button-active" : ""} onClick={this.translateText.bind(this)}>
                    Translate
                </Navbar.Brand>
                <NavDropdown
                    title={this.state.translateToLanguage}
                    menuVariant="dark"
                >
                    {languages}
                </NavDropdown>
            </Navbar>
        );
    }
}

export default TranslationButton;
