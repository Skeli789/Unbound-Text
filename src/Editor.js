import React, {Component} from 'react';
import {OverlayTrigger, Tooltip} from "react-bootstrap";
import {TextArea} from 'semantic-ui-react';

import {FaUndo, FaRedo, FaLock, FaUnlock} from "react-icons/fa";

import ConvertedText from './ConvertedText';
import {SEMI_LINE_WIDTH, FULL_LINE_WIDTH, GetStringWidth, FindIndexOfLineEnd,
        FindIndexOfLineStart, DoesLineHaveScrollAfterIt, FormatStringForDisplay,
        TextChange, DetermineTextChangeType, IsInsertTextChange} from "./TextUtils";
import PrettifyButton from "./subcomponents/PrettifyButton";
import QuickButtons from "./subcomponents/QuickButtons";
import TranslationButton from "./subcomponents/TranslationButton";

import "./styles/Editor.css";

//TODO: Don't scroll after undo if the cursor is still in view
//TODO: Fix cursor position after undo

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
            selectionEnd: 0,
            prevCursorPosition: 0,
            prevSelectionEnd: 0,
            textareaWidth: 100,
            undoStack: [],
            redoStack: [],
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

    setTextState(newText, selectionStart, selectionEnd, autoAdjustScroll)
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

            if (selectionStart >= 0)
                SetTextareaCursorPos(selectionStart, selectionEnd, autoAdjustScroll, !this.state.showTranslate);
        });
    }

    setNewText(newText, autoAdjustScroll)
    {
        //Format the new text
        const oldText = this.state.text;
        const lockFinalLine = this.state.lockFinalLine;
        const typeOfTextChange = DetermineTextChangeType(oldText, newText);
        let cursorPos = this.getNewCursorPosition(newText, typeOfTextChange);
        let formattedText = FormatStringForDisplay(newText, lockFinalLine, typeOfTextChange);
        if (formattedText !== newText) //Format again if the first format changed the text
            formattedText = FormatStringForDisplay(formattedText, lockFinalLine); //Format twice to fix copy-paste errors

        //If nothing changed, prevent the cursor from moving
        const typeOfTextChangeAfterFormat = DetermineTextChangeType(oldText, formattedText);
        if (typeOfTextChangeAfterFormat.type === TextChange.NO_CHANGE)
        {
            SetTextareaCursorPos(this.state.prevCursorPosition, this.state.prevSelectionEnd, false, !this.state.showTranslate);
            return formattedText; //No change
        }
    
        //Add the old text to the undo stack
        if (this.state.undoStack.length === 0 //No undo stack yet
        || (typeOfTextChange.type === TextChange.SINGLE_INSERT && typeOfTextChange.inserted.match(/^\s*$/)) //Only between words
        || (typeOfTextChange.type !== TextChange.SINGLE_INSERT))
            this.addTextToUndo(oldText, this.state.prevCursorPosition, this.state.prevSelectionEnd); //Add the old text to the undo stack

        //If the formatted text is different from the new text, update the cursor position twice
        if (formattedText !== newText
        && !(typeOfTextChange.type === TextChange.SINGLE_INSERT
            && typeOfTextChange.inserted === "["
            && typeOfTextChangeAfterFormat.type === TextChange.MULTI_INSERT
            && typeOfTextChangeAfterFormat.inserted === "[]"
        )) //Unless the user opened a bracket, don't update the cursor position so they stay inside the brackets
        {
            this.setNewCursorPosThenCallFunc(
                cursorPos, cursorPos, //Set the cursor position after just making the text change
                () =>
                {
                    //Change the cursor position after formatting the text
                    cursorPos = this.getNewCursorPosition(formattedText, DetermineTextChangeType(newText, formattedText), typeOfTextChange); //Diff of formatting new text
                    this.setTextState(formattedText, cursorPos, cursorPos, autoAdjustScroll);
                },
                newText, //Set the new text first so the cursor position is correct
            );
        }
        else
        {
            //Change the cursor position
            cursorPos = this.getNewCursorPosition(formattedText, typeOfTextChangeAfterFormat);
            this.setTextState(formattedText, cursorPos, cursorPos, autoAdjustScroll);
        }

        this.setState({redoStack: []}); //Nothing to redo anymore
        return formattedText;
    }

    handleTextChange(event)
    {
        const newText = event.target.value;
        if (newText === this.state.text)
            return; //No change

        this.setNewCursorPosThenCallFunc(
            event.target.selectionStart,
            event.target.selectionEnd,
            () => {this.setNewText(newText, false)}
        );
    }

    setNewCursorPosThenCallFunc(selectionStart, selectionEnd, func=null, text=null)
    {
        if (func == null)
            func = () => {}; //Do nothing after if no function is passed

        let stateUpdate =
        {
            cursorPosition: selectionStart,
            selectionEnd: selectionEnd,
            prevCursorPosition: this.state.cursorPosition,
            prevSelectionEnd: this.state.selectionEnd,
        };

        if (text != null)
            stateUpdate.text = text;

        this.setState(stateUpdate, func);
    }

    handleCursorChange(event)
    {
        this.setNewCursorPosThenCallFunc(event.target.selectionStart, event.target.selectionEnd);
    }

    addTextAtSelectionStart(textToAdd)
    {
        const textarea = document.getElementById(GetTextAreaId(!this.state.showTranslate));
        if (textarea == null)
            return; //Textarea doesn't exist

        //Create the new text
        const oldText = this.state.text;
        const textBefore = oldText.substring(0, textarea.selectionStart);
        const textAfter = oldText.substring(textarea.selectionStart, oldText.length);
        let newText = textBefore + textToAdd + textAfter;

        //Determine the new cursor position
        let newCursorPos = textarea.selectionStart + textToAdd.length; //String length so unicode characters are treated properly
        if (textToAdd.endsWith("[]"))
            newCursorPos -= 1; //Start inside square brackets    

        //Set the new cursor position and then format the text
        this.setNewCursorPosThenCallFunc(
            newCursorPos, newCursorPos,
            () =>
            {
                this.setNewText(newText, true); //Set the new text and move the cursor to the end of the new text
            }
        );
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

    getNewCursorPosition(newText, typeOfTextChange, prevTypeOfTextChange=null)
    {
        let cursorPos;
        let oldText = this.state.text;
        oldText = oldText.replaceAll("\n", " ");
        newText = newText.replaceAll("\n", " ");

        //console.log("Type of text change: ", typeOfTextChange.type);
        cursorPos = this.state.cursorPosition; //Where cursor moved to natureally
        switch (typeOfTextChange.type)
        {
            case TextChange.NO_CHANGE:
                cursorPos = this.state.prevCursorPosition; //No change, keep cursor in place
                break;
            case TextChange.SINGLE_INSERT:
            case TextChange.SINGLE_DELETE:
            case TextChange.MULTI_INSERT:
            case TextChange.SINGLE_REPLACE:
                //Move cursor to where it naturally would have moved to
                break;
            case TextChange.MULTI_DELETE:
                //Move cursor back the number of characters deleted
                cursorPos = this.state.prevSelectionEnd - typeOfTextChange.deleted.length; //Move cursor to the left of the deleted character
                break;
            case TextChange.MULTI_REPLACE_SINGLE:
            case TextChange.SINGLE_REPLACE_MULTI:
            case TextChange.MULTI_REPLACE_MULTI:
                //Replacement text
                let newTypeOfTextChange = DetermineTextChangeType(oldText, newText); //Single the \n's are ignored, this will determine which actual changes were made if text was shoved to a new line
                let {start, end, oldEnd} = newTypeOfTextChange;

                //console.log("New type of text change: ", newTypeOfTextChange.type);
                //Check if the only replacements were changing whitespace/newlines
                if (newTypeOfTextChange.type !== TextChange.MULTI_REPLACE_SINGLE
                && newTypeOfTextChange.type !== TextChange.SINGLE_REPLACE_MULTI
                && newTypeOfTextChange.type !== TextChange.MULTI_REPLACE_MULTI)
                {
                    if (prevTypeOfTextChange != null //E.g. inserting a new character at the end of the line caused text to move over so the single insert is the previous one
                    && IsInsertTextChange(prevTypeOfTextChange.type))
                    {
                        //Basically check if a whitespace got deleted and adjust the cursor position accordingly
                        if (newTypeOfTextChange.type === TextChange.SINGLE_DELETE && start < this.state.cursorPosition)
                            cursorPos = this.state.prevCursorPosition - 1; //Move cursor to the left of the deleted character
                        else //Otherwise, just move the cursor manually if need be
                            cursorPos = this.getNewCursorPosition(newText, newTypeOfTextChange, typeOfTextChange);
                    }

                    return cursorPos;
                }

                //Check if the cursor is inside the replacement text
                //console.log("Cursor position: ", this.state.cursorPosition, "Start: ", start, "End: ", end);
                if (this.state.cursorPosition < start || this.state.cursorPosition > oldEnd) //Cursor outside the replacement zone
                    return this.state.cursorPosition; //Text that was replaced was after where the cursor was
                else //Cursor is inside or after the replacement zone
                    cursorPos = end; //Move cursor to the end of the replacement text
                break;
            default:
                console.warn("Unknown type of text change: ", typeOfTextChange.type);
        }

        return cursorPos;
    }

    addTextToUndo(text, selectionStart, selectionEnd)
    {
        let undoStack = this.state.undoStack.slice(); //Copy to avoid mutating state directly
        undoStack.push({text, selectionStart, selectionEnd});
        this.setState({undoStack: undoStack});
    }

    undoLastChange()
    {
        if (this.state.undoStack.length > 0)
        {
            //Update Redo State
            let redoStack = this.state.redoStack.slice(); //Copy to avoid mutating state directly
            redoStack.push({text: this.state.text, selectionStart: this.state.cursorPosition, selectionEnd: this.state.selectionEnd});
            this.setState({redoStack: redoStack});

            //Actually perform undo
            let undoStack = this.state.undoStack.slice(); //Copy to avoid mutating state directly
            let lastState = undoStack.pop(); //Remove the last change from the undo stack
            this.setState({undoStack: undoStack});
            this.setTextState(lastState.text, lastState.selectionStart, lastState.selectionEnd, true);
        }
    }

    redoLastChange()
    {
        if (this.state.redoStack.length > 0)
        {
            //Update Undo State
            this.addTextToUndo(this.state.text, this.state.cursorPosition, this.state.selectionEnd);

            //Actually perform redo
            let redoStack = this.state.redoStack.slice(); //Copy to avoid mutating state directly
            let lastState = redoStack.pop(); //Remove the last change from the redo stack
            this.setState({redoStack: redoStack});
            this.setTextState(lastState.text, lastState.selectionStart, lastState.selectionEnd, true);
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
        const text = this.state.text;

        const cursorLineWidth = this.getCursorLineWidth();
        const totalWidth = (this.doesCursorLineHaveScrollAfterIt()) ? SEMI_LINE_WIDTH: FULL_LINE_WIDTH;
        const cursorLineCount = Math.floor(cursorLineWidth / 5.6);
        const maxCharCount = (totalWidth === SEMI_LINE_WIDTH) ? Math.floor(totalWidth / 5.6) : Math.floor(totalWidth / (206 / 36));

        const textAreaStyle = {width: `calc(${this.state.textareaWidth}px + 2em)`, minWidth: "calc(340px + 2em)", maxWidth: "99vw", whiteSpace: "pre"};
        const buttonsContainerStyle = {width: `calc(${this.state.textareaWidth}px + 3em)`, minWidth: "calc(340px + 3em)", maxWidth: "99vw",};
        const overflowErrorStyle = (cursorLineWidth > totalWidth) ? {color: "red"} : {color: "green"};
        const whichLockTooltip = !this.state.lockFinalLine ? unlockTooltip : lockTooltip;

        return (
            <div className="editor-grid">
                {/*Toolbar*/}
                <QuickButtons buttonsContainerStyle={buttonsContainerStyle}
                              addTextAtSelectionStart={this.addTextAtSelectionStart.bind(this)}/>

                {/*Text Input*/}
                <TextArea
                    className="fr-text main-textarea"
                    id={GetTextAreaId(!this.state.showTranslate)}
                    data-testid={GetTextAreaId(!this.state.showTranslate)}
                    rows={5}
                    style={textAreaStyle}
                    value={text}
                    onChange={(e) => this.handleTextChange(e)}
                    onClick={(e) => this.handleCursorChange(e)}
                    onKeyDown={(e) => this.onKeyDown(e)}
                    onKeyUp={(e) => this.handleCursorChange(e)}
                />

                {/*Converted Text*/}
                <ConvertedText
                    text={text}
                    textAreaStyle={textAreaStyle}
                    showTranslate={this.state.showTranslate}
                />

                {/*Space Details & Prettifier*/}
                <PrettifyButton text={text} setPrettifiedText={this.setPrettifiedText.bind(this)}/>
                <div className="space-info"><span style={overflowErrorStyle}>{cursorLineWidth}</span> / {totalWidth} ~ <span style={overflowErrorStyle}>{cursorLineCount}</span> / {maxCharCount}</div>

                {/*Translation*/}
                <TranslationButton text={text} showTranslate={this.state.showTranslate} showTranslationBox={this.showTranslationBox}/>

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
                                className={"undo-redo-button " + (this.state.undoStack.length === 0 ? "disabled-undo-redo-button" : "active-undo-redo-button")}/></span>
                    </OverlayTrigger>
                    <OverlayTrigger placement="right" overlay={redoTooltip}>
                        <span><FaRedo onClick={this.redoLastChange.bind(this)} size={30}
                                className={"undo-redo-button " + (this.state.redoStack.length === 0 ? "disabled-undo-redo-button" : "active-undo-redo-button")}/></span>
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

function SetTextareaCursorPos(selectionStart, selectionEnd, autoAdjustScroll, isTranslationBox)
{
    var textArea = document.getElementById(GetTextAreaId(isTranslationBox));
    if (textArea == null)
        return; //Textarea doesn't exist

    textArea.focus();
    textArea.setSelectionRange(selectionStart, selectionEnd);

    if (autoAdjustScroll)
    {
        let charsPerRow = textArea.cols; //Number of chars in a row
        let selectionRow = (selectionStart - (selectionStart % charsPerRow)) / charsPerRow; //Which row selection starts
        let lineHeight = textArea.clientHeight / textArea.rows; //Row's height, in pixels
        let newScrollTop = lineHeight * selectionRow;
        textArea.scrollTop = newScrollTop; //Set scroll
    }
}

export default Editor;
