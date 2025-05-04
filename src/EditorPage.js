/**
 * This file defines the EditorPage component.
 * It contains the main editor for the text and handles the translation box display.
 */
import React, {Component} from 'react'

import Editor from "./Editor";
import {GetAutoSavedText} from './subcomponents/AutoSaveButton';

import "./styles/Editor.css";


export class EditorPage extends Component
{
    /**
     * Represents the EditorPage component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {boolean} props.darkMode - Whether dark mode is enabled.
     */
    constructor(props)
    {
        super(props);

        this.state =
        {
            showingTranslationBox: false,
            translatedText: "",
            translationBoxKey: 1,
        };
    }

    /**
     * Displays the translation box with the translated text.
     * @param {string} translatedText - The translated text to be displayed.
     */
    showTranslationBox(translatedText)
    {
        this.setState
        ({
            showingTranslationBox: true,
            translatedText: translatedText,
            translationBoxKey: this.state.translationBoxKey + 1, //Force rerender
        });
    }

    /**
     * Renders the EditorPage component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        return (
            <div className="editor-page" id="editor-page" data-testid="editor-page">
                <Editor text={GetAutoSavedText()} isTranslation={false} showTranslationBox={this.showTranslationBox.bind(this)}
                        darkMode={this.props.darkMode} key={0}/>
                {
                    this.state.showingTranslationBox &&
                        <Editor text={this.state.translatedText} isTranslation={true} showTranslationBox={null}
                                darkMode={this.props.darkMode} key={this.state.translationBoxKey}/>
                }
            </div>
        );
    }
}

export default EditorPage;
