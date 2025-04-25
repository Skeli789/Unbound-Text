import React, {Component} from 'react';
import {OverlayTrigger, Tooltip} from "react-bootstrap";
import {TextArea} from 'semantic-ui-react';

import {FaUndo, FaRedo, FaLock, FaUnlock} from "react-icons/fa";

import ConvertedText from './ConvertedText';
import {SEMI_LINE_WIDTH, FULL_LINE_WIDTH, GetStringWidth, FindIndexOfLineEnd,
        FindIndexOfLineStart, DoesLineHaveScrollAfterIt, FormatStringForDisplay} from "./TextUtils";
import PrettifyButton from "./subcomponents/PrettifyButton";
import QuickButtons from "./subcomponents/QuickButtons";
import TranslationButton from "./subcomponents/TranslationButton";

import "./styles/Editor.css";

//TODO: Better cursor adjustment

const undoTooltip = props => (<Tooltip className="show" {...props}>Undo</Tooltip>);
const redoTooltip = props => (<Tooltip className="show" {...props}>Redo</Tooltip>);
const lockTooltip = props => (<Tooltip className="show" {...props}>Final Line Locked</Tooltip>);
const unlockTooltip = props => (<Tooltip className="show" {...props}>Final Line Unlocked</Tooltip>);


export class Editor extends Component
{
    constructor(props)
    {
        super(props);

        this.state =
        {
            text: props.text,
            firstLineWidth: 0,
            cursorPosition: 0,
            prevCursorPosition: 0,
            textareaWidth: 100,
            undoTextStack: [],
            undoCursorStack: [],
            redoTextStack: [],
            redoCursorStack: [],
            lockFinalLine: false,
            showTranslate: props.showTranslate,
        };

        this.myInput = React.createRef()
        this.showTranslationBox = (translatedText) =>
        {
            this.props.showTranslationBox(FormatStringForDisplay(FormatStringForDisplay(translatedText, this.state.lockFinalLine), this.state.lockFinalLine));
        }
    }

    onKeyDown(event)
    {
        if (event.keyCode === 90 && event.ctrlKey) //Ctrl + Z
        {
            event.preventDefault();
            this.undoLastChange();
        }
        else if (event.keyCode === 89 && event.ctrlKey) //Ctrl + Y
        {
            event.preventDefault();
            this.redoLastChange();
        }
        else
            this.handleCursorChange(event);
    }

    getCursorLine()
    {
        let text = this.state.text;
        let lineEndIndex = FindIndexOfLineEnd(this.state.text, this.state.cursorPosition);
        let lineStartIndex = FindIndexOfLineStart(this.state.text, lineEndIndex);
        return text.substring(lineStartIndex, lineEndIndex);
    }

    getCursorLineWidth()
    {
        return GetStringWidth(this.getCursorLine());
    }

    doesCursorLineHaveScrollAfterIt()
    {
        let lineEndIndex = FindIndexOfLineEnd(this.state.text, this.state.cursorPosition);
        let lineStartIndex = FindIndexOfLineStart(this.state.text, lineEndIndex);

        return DoesLineHaveScrollAfterIt(this.state.text, lineStartIndex, lineEndIndex, this.state.lockFinalLine);
    }

    setTextState(newText, cursorPos, autoAdjustScroll)
    {
        this.setState
        ({
            text: newText,
        }, () =>
        {
            this.setState
            ({
                textareaWidth: this.myInput.current.offsetWidth,
            });

            if (cursorPos >= 0)
                SetTextareaCursorPos(cursorPos, autoAdjustScroll, !this.state.showTranslate);
        });
    }

    setNewText(newText, autoAdjustScroll)
    {
        let lockFinalLine = this.state.lockFinalLine;
        newText = FormatStringForDisplay(FormatStringForDisplay(newText, lockFinalLine), lockFinalLine); //Format twice to fix copy-paste errors
        let cursorPos = this.getNewCursorPosition(newText);
        this.addTextToUndo(this.state.text, this.state.prevCursorPosition);
        this.setTextState(newText, cursorPos, autoAdjustScroll);
        this.setState({redoTextStack: [], redoCursorStack: []}); //Nothing to redo anymore
        return newText;
    }

    handleTextChange(event)
    {
        let newText = event.target.value;

        this.setState
        ({
            cursorPosition: event.target.selectionStart,
            prevCursorPosition: this.state.cursorPosition,
        }, () =>
        {
            this.setNewText(newText, false);
        });
        
    }

    handleCursorChange(event)
    {
        this.setState({cursorPosition: event.target.selectionStart, prevCursorPosition: this.state.cursorPosition});
    }

    addTextAtSelectionStart(textToAdd)
    {
        var elem = document.getElementById(GetTextAreaId(!this.state.showTranslate));
        if (elem == null)
            return; //Textarea doesn't exist

        let oldText = this.state.text;
        let textP1 = Array.from(oldText.substring(0, elem.selectionStart));
        let textP2 = Array.from(oldText.substring(elem.selectionStart, oldText.length));
        let newCursorPos = elem.selectionStart + textToAdd.length; //String length so unicode characters are treated properly

        if (textToAdd.endsWith("[]"))
            newCursorPos -= 1; //Start inside square brackets

        let newText = textP1.concat(Array.from(textToAdd)).concat(textP2).join("");

        let newFormattedText = this.setNewText(newText, true);
        newCursorPos += (newFormattedText.length - newText.length); //Adjust if text was shoved onto new line

        this.setState
        ({
            cursorPosition: newCursorPos,
            prevCursorPosition: this.state.cursorPosition,
        }, () =>
        {
            SetTextareaCursorPos(newCursorPos, true, !this.state.showTranslate);
        });
    }

    setPrettifiedText(finalText)
    {
        this.setState({lockFinalLine: false}, () => //So it doesn't interfere with the prettifer
        {
            let newText = FormatStringForDisplay(finalText, this.state.lockFinalLine).trim();
            newText = newText.replace("\n… ", "\n…"); //Remove whitespace after line start ellipses
            newText = newText.replace("\n… ", "\n…"); //Remove whitespace after line start ellipses - intentional duplicate
            this.setNewText(newText, false);
        });
    }

    lockFinalLine(lockLine)
    {
        this.setState({lockFinalLine: lockLine});
    }

    

    getNewCursorPosition(newText)
    {
        let i, j, cursorPos;
        let oldText = this.state.text;
        oldText = oldText.replaceAll("\n", " ");
        newText = newText.replaceAll("\n", " ");

        if (Math.abs(newText.length - oldText.length) <= 1)
            cursorPos = this.state.cursorPosition;
        else
        {
            //Get index of change start from front
            for (i = 0; i < Math.max(oldText.length, newText.length) && oldText[i] === newText[i]; ++i)
            {
                if (i + 1 >= oldText.length || i + 1 >= newText.length)
                {
                    ++i;
                    break;
                }
            }

            //Get index of change end from back
            for (j = 1; j < Math.min(oldText.length, newText.length) && oldText.at(-j) === newText.at(-j); ++j);
            --j;
            j = newText.length - j; //Adjust to new position in new text

            if (Math.abs(j - i) < 3  //Very close
            && newText.substring(i, i + 2) === "[]")
                cursorPos = i + 1; //Stay inside the square brackets
            else if (i >= oldText.length) //Added new character onto the end
                cursorPos = newText.length;
            else if (Math.abs(j - i) < 10) //Pretty close
            {
                cursorPos = j; //Wherever the end of the differences was found

                if (oldText.at(i) !== " " && newText.at(i) === " " && newText.at(i - 1) === " ") //Forced \n
                    cursorPos = this.state.cursorPosition + 1; //Shoved over 1
            }
            else if (i + 1 >= this.state.cursorPosition)
                cursorPos = this.state.cursorPosition; //Text that moved was after where the cursor was anyway
            else
                cursorPos = j; //Wherever the end of the differences was found
        }

        return cursorPos;
    }

    addTextToUndo(text, cursorPos)
    {
        let undoTextStack = this.state.undoTextStack;
        let undoCursorStack = this.state.undoCursorStack;
        undoTextStack.push(text);
        undoCursorStack.push(cursorPos);
        this.setState({undoTextStack: undoTextStack, undoCursorStack: undoCursorStack});
    }

    undoLastChange()
    {
        if (this.state.undoTextStack.length > 0)
        {
            //Update Redo State
            let redoTextStack = this.state.redoTextStack;
            let redoCursorStack = this.state.redoCursorStack;
            redoTextStack.push(this.state.text);
            redoCursorStack.push(this.state.cursorPosition);
            this.setState({redoTextStack: redoTextStack, redoCursorStack: redoCursorStack});
        
            //Actually perform undo
            let lastTextState = this.state.undoTextStack.pop();
            let lastCursorPosState = this.state.undoCursorStack.length > 0 ? this.state.undoCursorStack.pop() : 0;
            this.setState({undoTextStack: this.state.undoTextStack, undoCursorStack: this.state.undoCursorStack});
            this.setTextState(lastTextState, lastCursorPosState, true);
        }
    }

    redoLastChange()
    {
        if (this.state.redoTextStack.length > 0)
        {
            //Update Undo State
            this.addTextToUndo(this.state.text, this.state.cursorPosition);

            //Actually perform redo
            let lastTextState = this.state.redoTextStack.pop();
            let lastCursorPosState = this.state.redoCursorStack.length > 0 ? this.state.redoCursorStack.pop() : 0;
            this.setState({redoTextStack: this.state.redoTextStack, redoCursorStack: this.state.redoCursorStack});
            this.setTextState(lastTextState, lastCursorPosState, true);
        }
    }

    createDivText()
    {
        let result = [];
        let lines = this.state.text.split("\n");
        let key = 0;

        for (let line of lines)
            result.push(<span key={key++}><p>{line}</p><br/></span>);

        return result;
    }

    render()
    {
        let cursorLineWidth = this.getCursorLineWidth();
        let totalWidth = (this.doesCursorLineHaveScrollAfterIt()) ? SEMI_LINE_WIDTH: FULL_LINE_WIDTH;
        let cursorLineCount = Math.floor(cursorLineWidth / 5.6);
        let maxCharCount = (totalWidth === SEMI_LINE_WIDTH) ? Math.floor(totalWidth / 5.6) : Math.floor(totalWidth / (206 / 36));

        let textAreaStyle = {width: `calc(${this.state.textareaWidth}px + 2em)`, minWidth: "calc(340px + 2em)", maxWidth: "99vw", whiteSpace: "pre"};
        let buttonsContainerStyle = {width: `calc(${this.state.textareaWidth}px + 3em)`, minWidth: "calc(340px + 3em)", maxWidth: "99vw",};
        let overflowErrorStyle = (cursorLineWidth > totalWidth) ? {color: "red"} : {color: "green"};
        let whichLockTooltip = !this.state.lockFinalLine ? unlockTooltip : lockTooltip;

        return (
            <div className="editor-grid">
                {/*Toolbar*/}
                <QuickButtons buttonsContainerStyle={buttonsContainerStyle}
                              addTextAtSelectionStart={this.addTextAtSelectionStart.bind(this)}/>

                {/*Text Input*/}
                <TextArea
                    className="fr-text main-textarea"
                    id = {GetTextAreaId(!this.state.showTranslate)}
                    rows={5}
                    style={textAreaStyle}
                    value={this.state.text}
                    onChange={(e) => this.handleTextChange(e)}
                    onClick={(e) => this.handleCursorChange(e)}
                    onKeyDown={(e) => this.onKeyDown(e)}
                    onKeyUp={(e) => this.handleCursorChange(e)}
                />

                {/*Converted Text*/}
                <ConvertedText
                    text={this.state.text}
                    textAreaStyle={textAreaStyle}
                    showTranslate={this.state.showTranslate}
                />

                {/*Space Details & Prettifier*/}
                <PrettifyButton text={this.state.text} setPrettifiedText={this.setPrettifiedText.bind(this)}/>
                <div className="space-info"><span style={overflowErrorStyle}>{cursorLineWidth}</span> / {totalWidth} ~ <span style={overflowErrorStyle}>{cursorLineCount}</span> / {maxCharCount}</div>

                {/*Translation*/}
                <TranslationButton text={this.state.text} showTranslate={this.state.showTranslate} showTranslationBox={this.showTranslationBox}/>

                {/*Lock Final Line Button*/}
                <div className="lock-buttons">
                    <OverlayTrigger placement="left" overlay={whichLockTooltip}>
                        <span> 
                        { //Span is necessary for the tooltip to work here
                            !this.state.lockFinalLine ?
                                <FaUnlock onClick={this.lockFinalLine.bind(this, true)} size={30} //Lock final line on click
                                    className="lock-button text-locked"/>
                            :
                                <FaLock onClick={this.lockFinalLine.bind(this, false)} size={30} //Unlock final line on click
                                    className="lock-button text-unlocked"/>
                        }
                        </span>
                    </OverlayTrigger>
                </div>

                {/*Undo & Redo Buttons*/}
                <div className="undo-redo-buttons">
                    <OverlayTrigger placement="right" overlay={undoTooltip}>
                        <span><FaUndo onClick={this.undoLastChange.bind(this)} size={30} //Span is necessary for the tooltip to work here
                                className={"undo-redo-button " + (this.state.undoTextStack.length === 0 ? "disabled-undo-redo-button" : "active-undo-redo-button")}/></span>
                    </OverlayTrigger>
                    <OverlayTrigger placement="right" overlay={redoTooltip}>
                        <span><FaRedo onClick={this.redoLastChange.bind(this)} size={30}
                                className={"undo-redo-button " + (this.state.redoTextStack.length === 0 ? "disabled-undo-redo-button" : "active-undo-redo-button")}/></span>
                    </OverlayTrigger>
                </div>

                {/*Hidden div for matching the width of the textarea to*/}
                <div className="fr-text hidden-div" ref={this.myInput}>{this.createDivText()}</div>
            </div>
        )
    }
}

function GetTextAreaId(isTranslationBox)
{
    if (isTranslationBox)
        return "translated-textarea";
    else
        return "main-textarea";
}

function SetTextareaCursorPos(cursorPos, autoAdjustScroll, isTranslationBox)
{
    var textArea = document.getElementById(GetTextAreaId(isTranslationBox));
    if (textArea == null)
        return; //Textarea doesn't exist

    textArea.focus();
    textArea.setSelectionRange(cursorPos, cursorPos);

    if (autoAdjustScroll)
    {
        let charsPerRow = textArea.cols; //Number of chars in a row
        let selectionRow = (cursorPos - (cursorPos % charsPerRow)) / charsPerRow; //Which row selection starts
        let lineHeight = textArea.clientHeight / textArea.rows; //Row's height, in pixels
        let newScrollTop = lineHeight * selectionRow;
        textArea.scrollTop = newScrollTop; //Set scroll
    }
}

export default Editor;
