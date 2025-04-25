import axios from 'axios';
import React, {Component} from 'react';
import {Navbar, Container, Nav, NavDropdown} from "react-bootstrap";
import Swal from 'sweetalert2';

import {CreateIngameText} from "../ConvertedText";

const TRANSLATION_CHAR_LIMIT = 250; //Imposed by the API
const SUPPORTED_LANGUAGES =
{
    "Spanish": "es",
    "French": "fr",
    "German": "de",
    "Italian": "it",
};


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

    setTranslationLanguage(language)
    {
        this.setState({translateToLanguage: language});
    }

    async translateText()
    {
        if (!(this.state.translateToLanguage in SUPPORTED_LANGUAGES))
        {
            Swal.fire("Please choose a language first.", "", "error");
            return;
        }
        else if (this.props.text === "")
        {
            Swal.fire("Please add some text to translate first.", "", "error");
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

        Swal.fire
        ({
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
                let data =
                {
                    q: text,
                    source: "en",
                    format: "html",
                    target: SUPPORTED_LANGUAGES[this.state.translateToLanguage],
                };

                let response = await axios.post(`https://libretranslate.com/translate`, data);
                text = response.data.translatedText;
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
            Swal.fire("Translation site was overwhelmed!\nPlease wait 1 minute before trying again.", "", "error");
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
                <Navbar variant="dark" bg="dark" expand="lg" className="translate-button">
                    <Container fluid className="translated-text-navbar-container">
                        <Navbar.Brand>Translated Text</Navbar.Brand>
                        <Navbar.Toggle aria-controls="navbar-dark-example" />
                    </Container>
                </Navbar>
            );
        }

        return (
            <Navbar variant="dark" bg="dark" expand="lg" className="translate-button">
                <Container fluid>
                    <Navbar.Brand onClick={this.translateText.bind(this)}>
                        Translate
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="navbar-dark-example" />
                    <Navbar.Collapse>
                    <Nav>
                        <NavDropdown
                            title={this.state.translateToLanguage}
                            menuVariant="dark"
                        >
                            {languages}
                        </NavDropdown>
                    </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
        );
    }
}

export default TranslationButton;
