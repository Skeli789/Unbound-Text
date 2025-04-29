import React, {Component} from 'react';
import Editor from "./Editor";

import "./styles/Editor.css";

export class EditorPage extends Component
{
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

    showTranslationBox(translatedText)
    {
        this.setState
        ({
            showingTranslationBox: true,
            translatedText: translatedText,
            translationBoxKey: this.state.translationBoxKey + 1, //Force rerender
        });
    }

    render()
    {
        return (
            <div className="editor-page" data-testid="editor-page">
                <Editor text="" showTranslate={true} showTranslationBox={this.showTranslationBox.bind(this)} key={0}/>
                {
                    this.state.showingTranslationBox &&
                        <Editor text={this.state.translatedText} showTranslate={false} showTranslationBox={null} key={this.state.translationBoxKey}/>
                }
            </div>
        );
    }
}

export default EditorPage;
