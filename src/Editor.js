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
        //Format the new text
        const oldText = this.state.text;
        const lockFinalLine = this.state.lockFinalLine;
        const typeOfTextChange = DetermineTextChangeType(oldText, newText);
        let cursorPos = this.getNewCursorPosition(newText, typeOfTextChange);
        const formattedText = FormatStringForDisplay(FormatStringForDisplay(newText, lockFinalLine, typeOfTextChange), lockFinalLine); //Format twice to fix copy-paste errors

        //If nothing changed, prevent the cursor from moving
        const typeOfTextChangeAfterFormat = DetermineTextChangeType(oldText, formattedText);
        if (typeOfTextChangeAfterFormat.type === TextChange.NO_CHANGE)
        {
            SetTextareaCursorPos(this.state.prevCursorPosition, false, !this.state.showTranslate);
            return formattedText; //No change
        }
    
        //Add the old text to the undo stack
        if ((typeOfTextChange.type === TextChange.SINGLE_INSERT && typeOfTextChange.inserted.match(/^\s*$/)) //Only between words
        || (typeOfTextChange.type !== TextChange.SINGLE_INSERT))
            this.addTextToUndo(oldText, this.state.cursorPosition); //Add the old text to the undo stack

        //If the formatted text is different from the new text, update the cursor position twice
        if (formattedText !== newText)
        {
            this.setState
            ({
                text: newText, //Set the new text first so the cursor position is correct
                cursorPosition: cursorPos, //Set the cursor position after just making the text change
                prevCursorPosition: this.state.cursorPosition,
            }, () =>
            {
                //Change the cursor position after formatting the text
                cursorPos = this.getNewCursorPosition(formattedText, DetermineTextChangeType(newText, formattedText), typeOfTextChange); //Diff of formatting new text
                this.setTextState(formattedText, cursorPos, autoAdjustScroll);
            });
        }
        else
        {
            //Change the cursor position
            cursorPos = this.getNewCursorPosition(formattedText, typeOfTextChangeAfterFormat);
            this.setTextState(formattedText, cursorPos, autoAdjustScroll);
        }

        this.setState({redoTextStack: [], redoCursorStack: []}); //Nothing to redo anymore
        return formattedText;
    }

    handleTextChange(event)
    {
        const newText = event.target.value;
        if (newText === this.state.text)
            return; //No change

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
        this.setState
        ({
            cursorPosition: newCursorPos,
            prevCursorPosition: this.state.cursorPosition,
        }, () =>
        {
            this.setNewText(newText, true); //Set the new text and move the cursor to the end of the new text
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
                cursorPos = this.state.prevCursorPosition + 1; //Move cursor to the right of the new character
                break;
            case TextChange.SINGLE_DELETE:
            case TextChange.MULTI_INSERT:
            case TextChange.SINGLE_REPLACE:
                //Move cursor to where it naturally would have moved to
                break;
            case TextChange.MULTI_DELETE:
                //Move cursor back the number of characters deleted
                cursorPos = typeOfTextChange.start;
                break;
            case TextChange.MULTI_REPLACE_SINGLE:
            case TextChange.SINGLE_REPLACE_MULTI:
            case TextChange.MULTI_REPLACE_MULTI:
                //Replacement text
                let newTypeOfTextChange = DetermineTextChangeType(oldText, newText); //Single the \n's are ignored, this will determine which actual changes were made if text was shoved to a new line
                let {start, end} = newTypeOfTextChange;

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
                if (start >= this.state.cursorPosition || end <= this.state.cursorPosition) //Cursor is outside the replacement zone
                    return this.state.cursorPosition; //Text that was replaced was after where the cursor was
                
                //Move cursor to the end of the replacement text
                cursorPos = end;
                break;
            default:
                console.warn("Unknown type of text change: ", typeOfTextChange.type);
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
                    id = {GetTextAreaId(!this.state.showTranslate)}
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
