/**
 * This file defines the Editor component.
 * It is used to display the text editor and handle text input, formatting, and other features.
 */
import React, {Component} from 'react';
import {TextArea} from 'semantic-ui-react';


import ConvertedText from './ConvertedText';
import {BuildValidatedFormatChange} from './EditContext';
import {GetUndoTransition, GetRedoTransition, PushUndoEntry, UpdateLastUndoEntry} from './EditHistory';
import SpaceInfo from './SpaceInfo';
import {GetTextAreaId, NO_SELECTION_DIRECTION, ReadTextareaSelection, SetTextareaCursorPos} from './TextareaUtils';
import {SEMI_LINE_WIDTH, FULL_LINE_WIDTH, GetDisplayColour, GetStringWidth, FindIndexOfLineEnd, FindIndexOfLineStart,
        DoesLineHaveScrollAfterIt, FormatStringForDisplay, FormatStringForDisplayWithSelection, TextChange, DetermineTextChangeType,
        ParseColouredTextToHtml} from "./TextUtils";

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
            cursorPosition: 0,
            selectionEnd: 0,
            selectionDirection: NO_SELECTION_DIRECTION,
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
        this.scheduleMirrorSync = this.scheduleMirrorSync.bind(this);
        this.editorPage = null;
        this.mirrorResizeObserver = null;
        this.mirrorSyncFrame = null; //Pending frame to synchronize the mirror after layout
        this.mounted = false; //Prevent mirror updates after the editor is removed
        this.mirrorHtmlCache = null; //Keep only the latest derived content for this editor
        this.measurementCache = null; //Latest measurement nodes; CSS still controls their font metrics
        this.selectionSnapshot = {selectionStart: 0, selectionEnd: 0, selectionDirection: NO_SELECTION_DIRECTION}; //Last committed selection
        this.pendingEdit = null; //Pre-input text and selection captured by beforeinput
        this.compositionContext = null; //Pre-composition text and selection while an IME is composing
        this.completedComposition = null; //Composed value whose trailing input event should be skipped
        this.captureBeforeInput = this.captureBeforeInput.bind(this);
    }

    /**
     * Runs after the component is created.
     */
    componentDidMount()
    {
        this.mounted = true;
        this.editorPage = this.mirrorRef.current?.closest('#editor-page');

        //Adjust the width of the textarea in case longer text was autosaved
        const textareaWidth = this.hiddenDivRef.current.offsetWidth;
        if (textareaWidth !== this.state.textareaWidth)
            this.setState({textareaWidth});
        this.synchronizeMirror();

        //Track scrolling and layout changes without polling
        this.textAreaRef.current.ref.current.addEventListener("beforeinput", this.captureBeforeInput);
        window.addEventListener("resize", this.scheduleMirrorSync);
        this.editorPage?.addEventListener("scroll", this.scheduleMirrorSync);

        if (typeof window.ResizeObserver === "function")
        {
            this.mirrorResizeObserver = new window.ResizeObserver(this.scheduleMirrorSync);
            this.mirrorResizeObserver.observe(this.textAreaRef.current.ref.current);
            this.mirrorResizeObserver.observe(this.mirrorRef.current.closest('.editor-grid'));
            if (this.editorPage)
                this.mirrorResizeObserver.observe(this.editorPage);
        }
    }

    /**
     * Synchronizes the mirror after the editor's content or layout changes.
     */
    componentDidUpdate()
    {
        this.synchronizeMirror();
    }

    /**
     * Synchronizes the mirror immediately and again on the next frame to account for browser scrolling after layout.
     */
    synchronizeMirror()
    {
        if (!this.mounted)
            return;

        //Synchronize with the current layout
        this.updateMirrorRefPosition();

        this.scheduleMirrorSync();
    }

    /**
     * Coalesces layout events into one frame using the latest textarea geometry and scroll offsets.
     */
    scheduleMirrorSync()
    {
        if (!this.mounted || this.mirrorSyncFrame != null)
            return;

        this.mirrorSyncFrame = window.requestAnimationFrame(() =>
        {
            this.mirrorSyncFrame = null;
            this.updateMirrorRefPosition();
        });
    }

    /**
     * Runs when the component is removed from the DOM.
     */
    componentWillUnmount()
    {
        this.mounted = false;
        this.textAreaRef.current?.ref.current?.removeEventListener("beforeinput", this.captureBeforeInput);

        //Cancel the pending mirror synchronization
        if (this.mirrorSyncFrame != null)
            window.cancelAnimationFrame(this.mirrorSyncFrame);
        this.mirrorSyncFrame = null;

        //Release the original listener target and layout observations
        window.removeEventListener("resize", this.scheduleMirrorSync);
        this.editorPage?.removeEventListener("scroll", this.scheduleMirrorSync);
        this.mirrorResizeObserver?.disconnect();
        this.editorPage = null;
    }

    /**
     * Reads textarea geometry before updating changed mirror dimensions, position, and scroll offsets.
     */
    updateMirrorRefPosition()
    {
        //Find the textarea and mirror before updating their layout
        const editorPage = this.editorPage;
        const textarea = this.textAreaRef.current?.ref.current;
        const mirror = this.mirrorRef.current;
        if (!this.mounted || !textarea || !mirror)
            return;

        //Update the mirror ref's position to match the textarea's position
        const height = `${textarea.offsetHeight}px`;
        const width = `${textarea.offsetWidth}px`;
        const top = `${textarea.offsetTop - (editorPage?.scrollTop || 0)}px`;
        const left = `${textarea.offsetLeft - (editorPage?.scrollLeft || 0)}px`;
        const scrollTop = textarea.scrollTop;
        const scrollLeft = textarea.scrollLeft;

        if (mirror.style.height !== height) mirror.style.height = height;
        if (mirror.style.width !== width) mirror.style.width = width;
        if (mirror.style.top !== top) mirror.style.top = top;
        if (mirror.style.left !== left) mirror.style.left = left;

        //Synchronize scrolling after resizing, which can clamp the mirror's scroll offsets
        if (mirror.scrollTop !== scrollTop) mirror.scrollTop = scrollTop;
        if (mirror.scrollLeft !== scrollLeft) mirror.scrollLeft = scrollLeft;
    }

    /**
     * HaNdles the key down event for the textarea.
     * @param {Object} event - The key down event.
     */
    onKeyDown(event)
    {
        if (this.compositionContext || event.nativeEvent?.isComposing)
            return; //Let the IME handle its own keys

        //Handle shortcuts
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
     * @param {string} [selectionDirection=NO_SELECTION_DIRECTION] - Native selection direction to restore.
     */
    setTextState(newText, selectionStart, selectionEnd, autoAdjustScroll, selectionDirection=NO_SELECTION_DIRECTION)
    {
        //Clamp the selection to the new text
        selectionStart = Math.max(0, Math.min(selectionStart, newText.length));
        selectionEnd = Math.max(selectionStart, Math.min(selectionEnd, newText.length));
        this.selectionSnapshot = {selectionStart, selectionEnd, selectionDirection};

        //Commit the text and selection together
        this.setState
        ({
            text: newText,
            cursorPosition: selectionStart,
            selectionEnd,
            selectionDirection,
        }, () =>
        {
            //Save the text
            if (!this.props.isTranslation //Don't save the translated text
            && !this.props.test) //Don't auto save in the test environment
                AutoSaveText(newText); //Auto save the text for future visits

            //Restore the caret and mirror after the final text/width commit
            const synchronizeSelection = () =>
            {
                if (selectionStart >= 0)
                    SetTextareaCursorPos(selectionStart, selectionEnd, autoAdjustScroll, this.props.isTranslation, selectionDirection);

                this.synchronizeMirror();
            };

            //Resize the textarea before restoring the selection
            const textareaWidth = this.hiddenDivRef.current.offsetWidth;
            if (textareaWidth !== this.state.textareaWidth)
                this.setState({textareaWidth}, synchronizeSelection);
            else
                synchronizeSelection();
        });
    }

    /**
     * Sets the new text in the editor and formats it.
     * @param {string} newText - The new text to be set.
     * @param {boolean} autoAdjustScroll - Whether to automatically adjust the scroll position after the text change.
     * @param {Object|null} [context=null] - Immutable old text, prior selection, and raw post-edit selection.
     * @returns {string} The formatted text.
     */
    setNewText(newText, autoAdjustScroll, context=null)
    {
        //Determine what was edited
        context = context || {...this.getEditContext(), selectionStart: this.state.cursorPosition,
            selectionEnd: this.state.selectionEnd, selectionDirection: this.state.selectionDirection};
        const oldText = context.text;
        const prior = context.priorSelection;
        const typeOfTextChange = DetermineTextChangeType(oldText, newText);
        const range = context.editRange || {start: prior.selectionStart, end: prior.selectionEnd};
        const formatChange = BuildValidatedFormatChange(typeOfTextChange, oldText, newText, range);

        //Format the new text and map the selection through it
        const lockFinalLine = this.state.lockFinalLine;
        let result = FormatStringForDisplayWithSelection(newText, lockFinalLine, context.selectionStart, context.selectionEnd, formatChange);
        if (result.text !== newText)
            result = FormatStringForDisplayWithSelection(result.text, lockFinalLine, result.selectionStart, result.selectionEnd);
        const formattedText = result.text;

        //If formatting undid the edit, keep the mapped selection so typing ] before ] moves past it
        if (oldText === formattedText)
        {
            const selection = newText === oldText ? context : {...result, selectionDirection: context.selectionDirection};
            this.setTextState(formattedText, selection.selectionStart, selection.selectionEnd, false, selection.selectionDirection);
            return formattedText; //No change
        }

        //Commit the formatted text
        this.setTextState(formattedText, result.selectionStart, result.selectionEnd, autoAdjustScroll, context.selectionDirection);

        //Add the old text to the undo stack, or extend the last entry while typing a word
        const shouldAddUndo = this.state.undoStack.length === 0 //No undo stack yet
        || (typeOfTextChange.type === TextChange.SINGLE_INSERT && /^\s*$/.test(typeOfTextChange.inserted)) //Only between words
        || (typeOfTextChange.type !== TextChange.SINGLE_INSERT);

        if (shouldAddUndo)
        {
            const undoEntry = {text: oldText, selectionStart: prior.selectionStart, selectionEnd: prior.selectionEnd,
                selectionStartForRedo: result.selectionStart, selectionEndForRedo: result.selectionEnd,
                selectionDirection: prior.selectionDirection, selectionDirectionForRedo: context.selectionDirection};
            this.setState({undoStack: PushUndoEntry(this.state.undoStack, undoEntry)});
        }
        else
            this.setState({undoStack: UpdateLastUndoEntry(this.state.undoStack, result.selectionStart, result.selectionEnd, context.selectionDirection)});

        this.setState({redoStack: []}); //Nothing to redo anymore
        return formattedText;
    }

    /**
     * Handles the text change event for the textarea.
     * @param {Object} event - The text change event.
     */
    handleTextChange(event)
    {
        //Ignore the same native event arriving through both onInput and onChange
        if (this.lastInputEvent === event.nativeEvent)
            return;

        this.lastInputEvent = event.nativeEvent;
        const newText = event.target.value;
        const selection = ReadTextareaSelection(event.target);

        //Keep the raw text unformatted while an IME is composing
        if (this.compositionContext)
        {
            this.selectionSnapshot = selection;
            this.setState({text: newText, cursorPosition: selection.selectionStart, selectionEnd: selection.selectionEnd,
                selectionDirection: selection.selectionDirection});
            return;
        }

        //Skip the trailing input event of a composition that was already formatted
        if (this.completedComposition != null && (this.completedComposition === newText || newText === this.state.text))
        {
            this.completedComposition = null;
            this.pendingEdit = null;
            if (newText !== this.state.text)
                this.setTextState(this.state.text, this.state.cursorPosition, this.state.selectionEnd, false, this.state.selectionDirection);
            return;
        }

        //Format the edit using the pre-input selection when available
        this.completedComposition = null;
        const context = {...(this.pendingEdit || this.getEditContext()), ...selection,
            inputType: event.nativeEvent?.inputType};
        this.pendingEdit = null;
        this.setNewText(newText, false, context);
    }

    /**
     * Captures immutable text and prior selection for a raw edit.
     * @returns {Object} The edit's original text and selection.
     */
    getEditContext()
    {
        return {text: this.state.text, priorSelection: {...this.selectionSnapshot}};
    }

    /**
     * Captures the native pre-input range before the browser mutates the value.
     * @param {InputEvent} event - The native beforeinput event.
     */
    captureBeforeInput(event)
    {
        if (!this.compositionContext)
            this.pendingEdit = {text: this.state.text, priorSelection: ReadTextareaSelection(event.target), inputType: event.inputType};
    }

    /**
     * Begins an IME transaction without formatting its intermediate values.
     * @param {Object} event - The composition event.
     */
    handleCompositionStart(event)
    {
        this.compositionContext = {text: this.state.text, priorSelection: ReadTextareaSelection(event.target)};
        this.pendingEdit = null;
        this.completedComposition = null;
    }

    /**
     * Formats a completed IME transaction once and records its original selection.
     * @param {Object} event - The composition event.
     */
    handleCompositionEnd(event)
    {
        if (!this.compositionContext)
            return;

        //Format the composed text once
        const context = {...this.compositionContext, ...ReadTextareaSelection(event.target)};
        this.compositionContext = null;
        this.completedComposition = event.target.value;
        this.setNewText(event.target.value, false, context);
    }

    /**
     * Handles the cursor change event for the textarea.
     * @param {Object} event - The cursor change event.
     */
    handleCursorChange(event)
    {
        if (event.target.value !== this.state.text)
            return; //Text is mid-edit, so handleTextChange will commit the selection

        //Store the new selection
        const selection = ReadTextareaSelection(event.target);
        this.selectionSnapshot = selection;
        this.setState({cursorPosition: selection.selectionStart, selectionEnd: selection.selectionEnd,
            selectionDirection: selection.selectionDirection});
    }

    /**
     * Schedules mirror synchronization after textarea scrolling.
     */
    handleScroll()
    {
        this.scheduleMirrorSync();
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
        const priorSelection = ReadTextareaSelection(textarea);
        const textBefore = oldText.substring(0, textarea.selectionStart);
        const textAfter = oldText.substring(textarea.selectionStart, oldText.length);
        let newText = textBefore + textToAdd + textAfter;

        //Determine the new cursor position
        let newCursorPos = textarea.selectionStart + textToAdd.length; //String length so unicode characters are treated properly
        if (textToAdd.endsWith("[]"))
            newCursorPos -= 1; //Start inside square brackets    

        //Format the text with the cursor after the inserted text
        this.setNewText(newText, true, {text: oldText, priorSelection,
            editRange: {start: priorSelection.selectionStart, end: priorSelection.selectionStart},
            selectionStart: newCursorPos, selectionEnd: newCursorPos, selectionDirection: NO_SELECTION_DIRECTION});
    }

    /**
     * Sets the prettified text in the editor.
     * @param {string} finalText - The final text to be set afteR using the prettifier.
     */
    setPrettifiedText(finalText)
    {
        //Place the cursor at the end of the prettified text
        const textarea = this.textAreaRef.current.ref.current;
        const context = {text: this.state.text, priorSelection: ReadTextareaSelection(textarea),
            selectionStart: finalText.length, selectionEnd: finalText.length, selectionDirection: NO_SELECTION_DIRECTION};

        //Format and set the prettified text
        this.setState({lockFinalLine: false}, () => //So it doesn't interfere with the prettifer
        {
            let newText = FormatStringForDisplay(finalText, this.state.lockFinalLine).trim();
            newText = newText.replace("\n… ", "\n…"); //Remove whitespace after line start ellipses
            newText = newText.replace("\n… ", "\n…"); //Remove whitespace after line start ellipses - intentional duplicate
            this.setNewText(newText, false, context);
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
     * Undoes the last change made in the editor.
     */
    undoLastChange()
    {
        const transition = GetUndoTransition(this.state, this.state.text);
        if (transition == null)
            return; //Nothing to undo

        //Update the history
        this.setState(transition.history);

        //Restore the previous text and selection
        const {text, selectionStart, selectionEnd, selectionDirection} = transition.restore;
        this.setTextState(text, selectionStart, selectionEnd, true, selectionDirection);
    }

    /**
     * Redoes the last change undone in the editor.
     */
    redoLastChange()
    {
        const transition = GetRedoTransition(this.state);
        if (transition == null)
            return; //Nothing to redo

        //Update the history
        this.setState(transition.history);

        //Restore the redone text and selection
        const {text, selectionStart, selectionEnd, selectionDirection} = transition.restore;
        this.setTextState(text, selectionStart, selectionEnd, true, selectionDirection);
    }

    /**
     * Gets the latest highlighting result, rebuilding only when text or theme changes.
     * @returns {{__html: string}} The HTML wrapper shared by unchanged renders.
     */
    getMirrorHtml()
    {
        const {text} = this.state;
        const {darkMode} = this.props;
        if (!this.mirrorHtmlCache || this.mirrorHtmlCache.text !== text || this.mirrorHtmlCache.darkMode !== darkMode)
            this.mirrorHtmlCache = {text, darkMode, html: {__html: ParseColouredTextToHtml(text, darkMode)}};

        return this.mirrorHtmlCache.html;
    }

    /**
     * Gets measurement nodes for the latest text; inherited CSS font changes still apply.
     * @returns {Array} The array of div elements with the text to be displayed.
     */
    createDivText()
    {
        if (this.measurementCache && this.measurementCache.text === this.state.text)
            return this.measurementCache.elements;

        let result = [];
        let lines = this.state.text.split("\n");
        let key = 0;

        for (let line of lines)
            result.push(<span key={key++}><p>{line}</p><br/></span>);

        this.measurementCache = {text: this.state.text, elements: result};
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
        const textareaHeight = this.textAreaRef.current?.ref.current?.offsetHeight || 0;

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
                        dangerouslySetInnerHTML={this.getMirrorHtml()}
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
                        onInput={(e) => this.handleTextChange(e)}
                        onSelect={(e) => this.handleCursorChange(e)}
                        onCompositionStart={(e) => this.handleCompositionStart(e)}
                        onCompositionEnd={(e) => this.handleCompositionEnd(e)}
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

export default Editor;
