/**
 * This file defines the Editor component.
 * It is used to display the text editor and handle text input, formatting, and other features.
 */
import React, {Component} from 'react';
import {TextArea} from 'semantic-ui-react';


import ConvertedText from './ConvertedText';
import SpaceInfo from './SpaceInfo';
import {SEMI_LINE_WIDTH, FULL_LINE_WIDTH, GetDisplayColour, GetStringWidth, FindIndexOfLineEnd, FindIndexOfLineStart,
        DoesLineHaveScrollAfterIt, FormatStringForDisplay, TextChange, DetermineTextChangeType,
        IsInsertTextChange, ParseColouredTextToHtml} from "./TextUtils";

import {AutoSaveText} from './subcomponents/AutoSaveButton';
import {CurrentTextColourButton, GetPreviouslyUsedTextColour} from './subcomponents/CurrentTextColourButton';
import LockFinalLineButton from './subcomponents/LockFinalLineButton';
import PrettifyButton from "./subcomponents/PrettifyButton";
import QuickButtons from "./subcomponents/QuickButtons";
import TranslationButton from "./subcomponents/TranslationButton";
import UndoRedoButtons from './subcomponents/UndoRedoButtons';

import "./styles/Editor.css";


export class Editor extends Component
{
    /**
     * Represents the Editor component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {string} props.text - The initial text to be displayed in the editor.
     * @param {boolean} props.darkMode - Whether dark mode is enabled.
     * @param {boolean} props.isTranslation - Whether the editor is for translated text.
     * @param {boolean} props.test - Whether the component is being tested.
     * @param {Function} props.showTranslationBox - Function to show the translation box.
     */
    constructor(props)
    {
        super(props);

        this.state =
        {
            text: props.text || "",
            textColour: GetPreviouslyUsedTextColour() || "black",
            firstLineWidth: 0,
            cursorPosition: 0,
            selectionEnd: 0,
            prevCursorPosition: 0,
            prevSelectionEnd: 0,
            textareaWidth: 100,
            undoStack: [],
            appliedUndoStack: [],
            redoStack: [],
            lockFinalLine: false,
        };

        this.hiddenDivRef = React.createRef(); //Ref for hidden div to match the textarea width
        this.textAreaRef = React.createRef(); //Ref for textarea
        this.mirrorRef  = React.createRef(); //Ref for textarea overlay

        this.showTranslationBox = (translatedText) =>
        {
            this.props.showTranslationBox(FormatStringForDisplay(FormatStringForDisplay(translatedText, this.state.lockFinalLine), this.state.lockFinalLine));
        }
        this.updateMirrorRefPosition = this.updateMirrorRefPosition.bind(this);
        this.updateMirrorRefPositionInterval = null; //Interval to update the mirror ref's position
    }

    /**
     * Runs after the component is created.
     */
    async componentDidMount()
    {
        //Update the mirror ref's position to match the textarea's position
        this.updateMirrorRefPositionInterval = setInterval(() => this.updateMirrorRefPosition(), 1); //Wait for the textarea to be created

        //Add event listeners to update the mirror ref's position on scroll and resize
        window.addEventListener("resize", this.updateMirrorRefPosition);
        
        if (!this.props.test || document.getElementById("editor-page") != null) //The editor page doesn't exist in the test environment
        {
            while (document.getElementById("editor-page") == null)
                await new Promise(resolve => setTimeout(resolve, 100)); //Wait for the editor page to be created
            document.getElementById("editor-page").addEventListener("scroll", this.updateMirrorRefPosition); //Update the mirror ref's position on scroll
        }
    }

    /**
     * Runs when the component is removed from the DOM.
     */
    componentWillUnmount()
    {
        //Clear the interval to update the mirror ref's position
        clearInterval(this.updateMirrorRefPositionInterval);

        //Remove the event listener from the textarea to update the mirror ref's position on scroll and resize
        window.removeEventListener("resize", this.updateMirrorRefPosition);
        if (!this.props.test || document.getElementById("editor-page") != null) //The editor page doesn't exist in the test environment
            document.getElementById("editor-page").removeEventListener("scroll", this.updateMirrorRefPosition);
    }

    /**
     * Updates the position of the mirror ref to match the textarea's position.
     */
    async updateMirrorRefPosition()
    {
        //Wait for the editor page to be created
        let editorPage = document.getElementById("editor-page");
        if (!this.props.test || document.getElementById("editor-page") != null) //The editor page doesn't exist in the test environment
        {
            while (editorPage == null)
            {
                await new Promise(resolve => setTimeout(resolve, 100));
                editorPage = document.getElementById("editor-page"); //Wait for the editor page to be created
            }
        }

        //Update the mirror ref's position to match the textarea's position
        let scrollTop = (editorPage) ? editorPage.scrollTop : 0;
        let scrollLeft = (editorPage) ? editorPage.scrollLeft : 0;
        this.mirrorRef.current.style.height = `${this.textAreaRef.current.ref.current.clientHeight}px`; //Set the mirror ref's height to start at the same height as the textarea
        this.mirrorRef.current.style.top = `${this.textAreaRef.current.ref.current.offsetTop - scrollTop}px`;
        this.mirrorRef.current.style.left = `${this.textAreaRef.current.ref.current.offsetLeft - scrollLeft}px`;
    }

    /**
     * HaNdles the key down event for the textarea.
     * @param {Object} event - The key down event.
     */
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

    /**
     * Gets the current line of text where the cursor is located.
     * @returns {string} The current line of text.
     */
    getCursorLine()
    {
        let text = this.state.text;
        let lineEndIndex = FindIndexOfLineEnd(this.state.text, this.state.cursorPosition);
        let lineStartIndex = FindIndexOfLineStart(this.state.text, lineEndIndex);
        return text.substring(lineStartIndex, lineEndIndex);
    }

    /**
     * Gets the width of the current line of text where the cursor is located.
     * @returns {number} The width of the current line of text.
     */
    getCursorLineWidth()
    {
        return GetStringWidth(this.getCursorLine());
    }

    /**
     * Checks if the current line of text would have a scroll after it ingame.
     * @returns 
     */
    doesCursorLineHaveScrollAfterIt()
    {
        let lineEndIndex = FindIndexOfLineEnd(this.state.text, this.state.cursorPosition);
        let lineStartIndex = FindIndexOfLineStart(this.state.text, lineEndIndex);

        return DoesLineHaveScrollAfterIt(this.state.text, lineStartIndex, lineEndIndex, this.state.lockFinalLine);
    }

    /**
     * Sets the text state of the editor.
     * @param {string} newText - The new text to be set.
     * @param {number} selectionStart - The starting position of the selection/cursor position.
     * @param {number} selectionEnd - The ending position of the selection.
     * @param {boolean} autoAdjustScroll - Whether to automatically adjust the scroll position after the text change.
     */
    setTextState(newText, selectionStart, selectionEnd, autoAdjustScroll)
    {
        this.setState
        ({
            text: newText,
        }, () =>
        {
            if (!this.props.isTranslation //Don't save the translated text
            && !this.props.test) //Don't auto save in the test environment
                AutoSaveText(newText); //Auto save the text for future visits

            this.setState
            ({
                textareaWidth: this.hiddenDivRef.current.offsetWidth,
            }, () =>
            {   
                this.updateMirrorRefPosition();
            });

            if (selectionStart >= 0)
                SetTextareaCursorPos(selectionStart, selectionEnd, autoAdjustScroll, this.props.isTranslation);
        });
    }

    /**
     * Sets the new text in the editor and formats it.
     * @param {string} newText - The new text to be set.
     * @param {boolean} autoAdjustScroll - Whether to automatically adjust the scroll position after the text change.
     * @returns {string} The formatted text.
     */
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
            SetTextareaCursorPos(this.state.prevCursorPosition, this.state.prevSelectionEnd, false, this.props.isTranslation);
            return formattedText; //No change
        }
    
        //Add the old text to the undo stack
        let undoToAdd = null;
        if (this.state.undoStack.length === 0 //No undo stack yet
        || (typeOfTextChange.type === TextChange.SINGLE_INSERT && typeOfTextChange.inserted.match(/^\s*$/)) //Only between words
        || (typeOfTextChange.type !== TextChange.SINGLE_INSERT))
            undoToAdd = {text: oldText, selectionStart: this.state.prevCursorPosition, selectionEnd: this.state.prevSelectionEnd};

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

                    //Update the undo stack
                    if (undoToAdd == null) //Not adding new text this change (optimization)
                        this.updateLastUndoObject(cursorPos, cursorPos); //Update the last undo object with the new cursor positions so the redo will work properly
                    else
                        this.addTextToUndo(undoToAdd.text, undoToAdd.selectionStart, undoToAdd.selectionEnd, cursorPos, cursorPos); //Add the old text to the undo stack
                },
                newText, //Set the new text first so the cursor position is correct
            );
        }
        else
        {
            //Change the cursor position
            cursorPos = this.getNewCursorPosition(formattedText, typeOfTextChangeAfterFormat);
            this.setTextState(formattedText, cursorPos, cursorPos, autoAdjustScroll);

            //Update the undo stack
            if (undoToAdd == null) //Not adding new text this change (optimization)
                this.updateLastUndoObject(cursorPos, cursorPos); //Update the last undo object with the new cursor positions so the redo will work properly
            else
                this.addTextToUndo(undoToAdd.text, undoToAdd.selectionStart, undoToAdd.selectionEnd, cursorPos, cursorPos); //Add the old text to the undo stack
        }

        this.setState({redoStack: []}); //Nothing to redo anymore
        return formattedText;
    }

    /**
     * Handles the text change event for the textarea.
     * @param {Object} event - The text change event.
     */
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

    /**
     * Sets the new cursor position in the textarea and calls a function if provided.
     * @param {number} selectionStart - The new starting position of the selection/cursor position.
     * @param {number} selectionEnd - The new ending position of the selection.
     * @param {Function} func - The function to be called after setting the cursor position (optional).
     * @param {string} text - The new text to be set (optional).
     */
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

    /**
     * Handles the cursor change event for the textarea.
     * @param {Object} event - The cursor change event.
     */
    handleCursorChange(event)
    {
        this.setNewCursorPosThenCallFunc(event.target.selectionStart, event.target.selectionEnd);
    }

    /**
     * Handles the scroll event for the textarea.
     * @param {Object} event - The scroll event.
     */
    handleScroll(e)
    {
        //Keep mirror in sync
        this.mirrorRef.current.scrollTop = e.target.scrollTop;
        this.mirrorRef.current.scrollLeft = e.target.scrollLeft;
    }

    /**
     * Adds text at the start of the selection in the textarea.
     * @param {string} textToAdd - The text to be added at the start of the selection.
     */
    addTextAtSelectionStart(textToAdd)
    {
        const textarea = document.getElementById(GetTextAreaId(this.props.isTranslation));
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

    /**
     * Sets the prettified text in the editor.
     * @param {string} finalText - The final text to be set afteR using the prettifier.
     */
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

    /**
     * Toggles the last line to be locked or unlocked.
     * @param {boolean} lockLine - Whether to lock the last line or not.
     */
    lockFinalLine(lockLine)
    {
        this.setState({lockFinalLine: lockLine});
    }

    /**
     * Gets the new cursor position based on the text change.
     * @param {string} newText - The new text after the change.
     * @param {Object} typeOfTextChange - The type of text change that occurred.
     * @param {Object} prevTypeOfTextChange - The previous type of text change before the formatting (optional).
     * @returns {number} The new cursor position.
     */
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
                if (this.state.cursorPosition > typeOfTextChange.start //The new character was inserted behind the cursor
                && this.state.prevCursorPosition === this.state.cursorPosition) //Cursor wasn't moved yet because of this change
                {
                    //So move the cursor one right to account for the new character
                    cursorPos = this.state.cursorPosition + 1;
                    break;
                }
                //Fallthrough
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

    /**
     * Adds text to the undo stack.
     * @param {string} text - The text to revert to after undoing.
     * @param {number} selectionStart - The starting position of the selection/cursor position to revert to.
     * @param {number} selectionEnd - The ending position of the selection to revert to.
     * @param {number} selectionStartForRedo - The starting position of the selection/cursor position when redoing this undo.
     * @param {number} selectionEndForRedo - The ending position of the selection when redoing this undo.
     */
    addTextToUndo(text, selectionStart, selectionEnd, selectionStartForRedo, selectionEndForRedo)
    {
        let undoStack = this.state.undoStack.slice(); //Copy to avoid mutating state directly
        undoStack.push({text, selectionStart, selectionEnd, selectionStartForRedo, selectionEndForRedo});
        this.setState({undoStack: undoStack});
    }

    /**
     * Updates the last undo object in the undo stack with the new selection start and end for redo.
     * @param {number} selectionStartForRedo - The starting position of the selection/cursor position when redoing this undo.
     * @param {number} selectionEndForRedo - The ending position of the selection when redoing this undo.
     */
    updateLastUndoObject(selectionStartForRedo, selectionEndForRedo)
    {
        let undoStack = this.state.undoStack.slice(); //Copy to avoid mutating state directly
        let lastUndoApplied = undoStack[undoStack.length - 1]; //Get the last undo object
        lastUndoApplied.selectionStartForRedo = selectionStartForRedo; //Update the selection start for redo
        lastUndoApplied.selectionEndForRedo = selectionEndForRedo; //Update the selection end for redo
        this.setState({undoStack: undoStack});
    }

    /**
     * Adds text to the redo stack.
     * @param {string} text - The text to revert to after redoing.
     * @param {number} selectionStart - The starting position of the selection/cursor position to revert to.
     * @param {number} selectionEnd - The ending position of the selection to revert to.
     */
    addTextToRedo(text, selectionStart, selectionEnd)
    {
        let redoStack = this.state.redoStack.slice(); //Copy to avoid mutating state directly
        redoStack.push({text, selectionStart, selectionEnd});
        this.setState({redoStack: redoStack});
    }

    /**
     * Undoes the last change made in the editor.
     */
    undoLastChange()
    {
        let undoStack = this.state.undoStack.slice(); //Copy to avoid mutating state directly

        if (undoStack.length > 0)
        {
            let appliedUndoStack = this.state.appliedUndoStack.slice(); //Copy to avoid mutating state directly
            let undoApplied = undoStack.pop(); //Remove the last change from the undo stack
            appliedUndoStack.push(undoApplied); //Save the undone change in case a redo there is an undo after a redo

            //Update Redo State
            this.addTextToRedo(this.state.text, undoApplied.selectionStartForRedo, undoApplied.selectionEndForRedo);

            //Actually perform undo
            this.setState({undoStack: undoStack, appliedUndoStack: appliedUndoStack});
            this.setTextState(undoApplied.text, undoApplied.selectionStart, undoApplied.selectionEnd, true);
        }
    }

    /**
     * Redoes the last change undone in the editor.
     */
    redoLastChange()
    {
        let redoStack = this.state.redoStack.slice(); //Copy to avoid mutating state directly

        if (redoStack.length > 0)
        {
            let redoApplied = redoStack.pop(); //Remove the last change from the redo stack

            //Update Undo State
            let appliedUndoStack = this.state.appliedUndoStack.slice(); //Copy to avoid mutating state directly
            let lastUndoApplied = appliedUndoStack.pop(); //Remove the last change from the previous undo stack
            this.addTextToUndo(lastUndoApplied.text, lastUndoApplied.selectionStart, lastUndoApplied.selectionEnd, //Add the previous undo back to the undo stack
                               lastUndoApplied.selectionStartForRedo, lastUndoApplied.selectionEndForRedo);

            //Actually perform redo
            this.setState({redoStack: redoStack, appliedUndoStack: appliedUndoStack});
            this.setTextState(redoApplied.text, redoApplied.selectionStart, redoApplied.selectionEnd, true);
        }
    }

    /**
     * Creates a div with the text to be displayed in the hidden div.
     * @returns {Array} The array of div elements with the text to be displayed.
     */
    createDivText()
    {
        let result = [];
        let lines = this.state.text.split("\n");
        let key = 0;

        for (let line of lines)
            result.push(<span key={key++}><p>{line}</p><br/></span>);

        return result;
    }

    /**
     * Renders the Editor component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const {text, textareaWidth} = this.state;
        const {darkMode, isTranslation} = this.props;
        const textAreaStyle = {width: `calc(${textareaWidth}px + 2em)`, minWidth: "calc(340px + 2em)", maxWidth: "99vw", whiteSpace: "pre"};
        const textareaHeight = (this.textAreaRef.current) ? this.textAreaRef.current.ref.current.clientHeight : 0; //Get the height of the textarea to set the height of the mirror div

        return (
            <div className="editor-grid" id={(!isTranslation) ? "editor-grid" : "editor-grid-translate"}>
                {/*Toolbar*/}
                <QuickButtons textareaWidth={textareaWidth}
                              addTextAtSelectionStart={this.addTextAtSelectionStart.bind(this)}/>

                {/*Text Input*/}
                <div className="main-textarea-container">
                    {/*Mirror div where the coloured text is displayed*/}
                    <div
                        className="fr-text mirror-textarea"
                        ref={this.mirrorRef}
                        style={{...textAreaStyle, height: textareaHeight, color: GetDisplayColour(this.state.textColour, darkMode)}} //Force the height to be the same as the textarea
                        dangerouslySetInnerHTML={{ __html: ParseColouredTextToHtml(text, darkMode)}}
                    />

                    {/*Actual textarea where the user types*/}
                    <TextArea
                        className="fr-text main-textarea top-textarea"
                        id={GetTextAreaId(isTranslation)}
                        data-testid={GetTextAreaId(isTranslation)}
                        ref={this.textAreaRef}
                        rows={5}
                        style={textAreaStyle}
                        value={text}
                        onChange={(e) => this.handleTextChange(e)}
                        onClick={(e) => this.handleCursorChange(e)}
                        onKeyDown={(e) => this.onKeyDown(e)}
                        onKeyUp={(e) => this.handleCursorChange(e)}
                        onScroll={(e) => this.handleScroll(e)}
                    />
                </div>

                {/*Converted Text*/}
                <ConvertedText text={text} textAreaStyle={textAreaStyle} darkMode={darkMode} />

                {/*Prettifier*/}
                <PrettifyButton text={text} setPrettifiedText={this.setPrettifiedText.bind(this)}/>

                {/*Space Details*/}
                <SpaceInfo lineWidth={this.getCursorLineWidth()}
                           totalWidth={(this.doesCursorLineHaveScrollAfterIt()) ? SEMI_LINE_WIDTH: FULL_LINE_WIDTH} />

                {/*Translation*/}
                <TranslationButton text={text} isForTranslationBox={isTranslation} showTranslationBox={this.showTranslationBox}/>

                {/* Current Text Colour Button */}
                <CurrentTextColourButton currentColour={this.state.textColour}
                                         setParentCurrentColour={(textColour) => this.setState({textColour})} />

                {/*Lock Final Line Button*/}
                <LockFinalLineButton isFinalLineLocked={this.state.lockFinalLine}
                                     lockFinalLine={this.lockFinalLine.bind(this)} />

                {/*Undo & Redo Buttons*/}
                <UndoRedoButtons undoStack={this.state.undoStack}
                                 redoStack={this.state.redoStack}
                                 undo={this.undoLastChange.bind(this)}
                                 redo={this.redoLastChange.bind(this)} />

                {/*Hidden div for matching the width of the textarea to*/}
                <div className="fr-text hidden-div" ref={this.hiddenDivRef}>{this.createDivText()}</div>
            </div>
        )
    }
}

/**
 * Gets the ID of the textarea based on whether it is a translation box or not.
 * @param {boolean} isTranslationBox - Whether the textarea is for translated text.
 * @returns {string} The ID of the textarea.
 */
function GetTextAreaId(isTranslationBox)
{
    if (isTranslationBox)
        return "translated-textarea";
    else
        return "main-textarea";
}

/**
 * Updates the cursor position in the textarea and adjusts the scroll if needed.
 * @param {number} selectionStart - The starting position of the selection/cursor position.
 * @param {number} selectionEnd - The ending position of the selection.
 * @param {boolean} autoAdjustScroll - Whether to automatically adjust the scroll position after the text change.
 * @param {boolean} isTranslationBox - Whether the textarea is for translated text.
 */
function SetTextareaCursorPos(selectionStart, selectionEnd, autoAdjustScroll, isTranslationBox)
{
    //Find the textarea element
    const textArea = document.getElementById(GetTextAreaId(isTranslationBox));
    const viewTop = textArea.scrollTop;
    if (!textArea)
        return;

    //Set the cursor position
    textArea.setSelectionRange(selectionStart, selectionEnd);
    textArea.focus(); //Focus only after setting the selection range to avoid scroll jump

    //Adjust scroll if needed
    if (!autoAdjustScroll)
        return;

    //Count how many actual lines (\n) precede the cursor
    const lineHeight = parseInt(window.getComputedStyle(textArea).lineHeight, 10);
    const beforeCursor = textArea.value.slice(0, selectionStart);
    const cursorLine = beforeCursor.split('\n').length;

    //Compute pixel offset of that line
    const cursorOffsetPx = cursorLine * lineHeight;

    //Current visible window in px
    const viewBottom = viewTop + textArea.clientHeight;

    //If already fully in view, do nothing
    if (cursorOffsetPx >= viewTop && (cursorOffsetPx + lineHeight) <= viewBottom)
        return;

    //Otherwise, center the cursor line and clamp it to the scrollable area
    let newScrollTop = cursorOffsetPx - (textArea.clientHeight / 2) + (lineHeight / 2);
    const maxScroll = textArea.scrollHeight - textArea.clientHeight;
    newScrollTop = Math.max(0, Math.min(newScrollTop, maxScroll));
    textArea.scrollTop = newScrollTop;
}

export default Editor;
