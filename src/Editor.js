import React, {Component} from 'react';
import {Button, OverlayTrigger, Tooltip} from "react-bootstrap";
import {TextArea} from 'semantic-ui-react';
import Swal from 'sweetalert2';

import {FaUndo, FaRedo, FaLock, FaUnlock} from "react-icons/fa";

import QuickButton from "./QuickButton";
import FontSizes from "./FontSizes.json";

import "./styles/Editor.css";

const blackTextTooltip = props => (<Tooltip {...props}>Black</Tooltip>);
const blueTextTooltip = props => (<Tooltip {...props}>Blue</Tooltip>);
const greenTextTooltip = props => (<Tooltip {...props}>Green</Tooltip>);
const redTextTooltip = props => (<Tooltip {...props}>Red</Tooltip>);
const playerTooltip = props => (<Tooltip {...props}>Player's Name</Tooltip>);
const rivalTooltip = props => (<Tooltip {...props}>Rival's Name</Tooltip>);
const pauseTooltip = props => (<Tooltip {...props}>Pause XX Frames (Hex)</Tooltip>);
const undoTooltip = props => (<Tooltip className="show" {...props}>Undo</Tooltip>);
const redoTooltip = props => (<Tooltip className="show" {...props}>Redo</Tooltip>);
const lockTooltip = props => (<Tooltip className="show" {...props}>Final Line Locked</Tooltip>);
const unlockTooltip = props => (<Tooltip className="show" {...props}>Final Line Unlocked</Tooltip>);

const FULL_LINE_WIDTH = 206;
const SEMI_LINE_WIDTH = 196;

const COLOURS =
{
    "BLACK": "⚫",
    "GREEN": "🟢",
    "BLUE": "🔵",
    "RED": "🔴",
    "ORANGE:": "🟠",
};

const OTHER_REPLACEMENT_MACROS =
{
    ".": "…",
    "ARROW_UP": "↑",
    "ARROW_DOWN": "↓",
    "ARROW_LEFT": "←",
    "ARROW_RIGHT": "→",
    "A_BUTTON": "🅰",
    "B_BUTTON": "🅱",
};


export class Editor extends Component
{
    constructor(props)
    {
        super(props);

        this.state =
        {
            text: "",
            firstLineWidth: 0,
            cursorPosition: 0,
            prevCursorPosition: 0,
            textareaWidth: 100,
            undoTextStack: [],
            undoCursorStack: [],
            redoTextStack: [],
            redoCursorStack: [],
            lockFinalLine:  false,
        };

        this.myInput = React.createRef()
    }

    isColour(char)
    {
        return char === "🟢"
            || char === "🔵"
            || char === "🔴"
            || char === "⚫";
    }

    getCharacterWidth(char)
    {
        if (this.isColour(char))
            return 0;
        else if (char in FontSizes.charSizes)
            return FontSizes.charSizes[char];
        else
            return 6; //Assume default size is 6  
    }

    getMacroWidth(macroText)
    {
        if (macroText in FontSizes.macroSizes) //Macro has a pre-defined length like PLAYER
            return FontSizes.macroSizes[macroText];

        return 0; //Default take up no space
    }

    getStringWidth(text)
    {
        let width = 0;
        let inMacro = false;
        let macroText = "";

        text = Array.from(text);
        for (let [i, letter] of text.entries())
        {
            if (letter === "[") //Start of macro
            {
                inMacro = true;
                macroText = "";
            }
            else if (inMacro)
            {
                if (letter === "]") //End of macro
                {
                    inMacro = false;
                    width += this.getMacroWidth(macroText)
                }
                else //Build up the macro
                    macroText += letter;
            }
           else
           {
               if (letter === " " && (i + 1 >= text.length || text[i + 1] === "\n"))
                    break; //Ignore trailing whitespace

               width += this.getCharacterWidth(letter);
           }

            if (letter === "\n")
                break;
        }

        return width;
    }

    getLineTotalWidth(lines, lineIndex)
    {
        let totalWidth = SEMI_LINE_WIDTH;

        if (lineIndex + 1 >= lines.length && this.state.lockFinalLine)
            totalWidth = FULL_LINE_WIDTH; //No scroll arrow after the last line
        else if (lineIndex === 0 //First line in the msgbox
        || lines[lineIndex - 1].length === 0) //\n Before this line
        {
            if (!this.doesLineHaveScrollAfterItByLines(lines, lineIndex))
                totalWidth = FULL_LINE_WIDTH; //Slightly longer line
        }

        return totalWidth;
    }

    findIndexOfLineStart(text, lineEndIndex)
    {
        let lineStartIndex;

        if (lineEndIndex === 0)
            return 0; //Empty line
        
        if (text[lineEndIndex] === "\n")
            --lineEndIndex;

        for (lineStartIndex = lineEndIndex; lineStartIndex > 0 && text[lineStartIndex] !== "\n"; --lineStartIndex);

        if (text[lineStartIndex] === "\n")
            ++lineStartIndex; //Go to char after new line

        return lineStartIndex;
    }

    findIndexOfLineEnd(cursorIndex)
    {
        let lineEndIndex;
        let text = this.state.text;

        if (cursorIndex >= text.length) //At the end of the text
            lineEndIndex = cursorIndex;
        else
        {
            let i;
            for (i = cursorIndex; i < text.length && text[i] !== "\n"; ++i);
            lineEndIndex = i;
        }

        return lineEndIndex;
    }

    doesLineEndParagraph(text, lineStartIndex)
    {
        for (let i = lineStartIndex; i < text.length; ++i)
        {
            if (text[i] === "\n")
            {
                if (i + 1 < text.length && text[i + 1] === "\n") //Two "\n"s in a row
                    return true;
                
                return false;
            }
        }

        return false;
    }

    doesLineHaveScrollAfterIt(text, lineStartIndex, lineEndIndex)
    {
        if (this.state.lockFinalLine && lineEndIndex >= text.length)
            return false; //Last line never has a scroll arrow

        if (lineStartIndex === 0)
        {
            if (this.doesLineEndParagraph(text, lineStartIndex))
                return true; //Scroll arrow is on the first line

            return false; //First line doesn't has a scroll arrow after it
        }

        if (text[lineStartIndex - 1] === "\n")
        {
            if (this.doesLineEndParagraph(text, lineStartIndex))
                return true; //Scroll arrow is on the first line

            if (lineStartIndex === 1)
                return false; //First line in textbox doesn't has a scroll arrow after it

            if (text[lineStartIndex - 2] === "\n")
                return false; //First line of paragraph doesn't have scroll
        }

        return true;
    }

    doesLineHaveScrollAfterItByLines(lines, lineIndex)
    {
        return lineIndex + 2 < lines.length
            && lines[lineIndex + 1].length === 0; //Followed by blank line
    }

    lineHasCharAfterIndex(line, index, char)
    {
        for (let i = index; i < line.length; ++i)
        {
            if (line[i] === char)
                return true;
        }

        return false;
    }

    getCursorLine()
    {
        let text = this.state.text;
        let lineEndIndex = this.findIndexOfLineEnd(this.state.cursorPosition);
        let lineStartIndex = this.findIndexOfLineStart(this.state.text, lineEndIndex);
        return text.substring(lineStartIndex, lineEndIndex);
    }

    getCursorLineWidth()
    {
        return this.getStringWidth(this.getCursorLine());
    }

    doesCursorLineHaveScrollAfterIt()
    {
        let lineEndIndex = this.findIndexOfLineEnd(this.state.cursorPosition);
        let lineStartIndex = this.findIndexOfLineStart(this.state.text, lineEndIndex);

        return this.doesLineHaveScrollAfterIt(this.state.text, lineStartIndex, lineEndIndex);
    }

    replaceMacros(text, dict)
    {
        for (let key of Object.keys(dict))
            text = text.replaceAll(`[${key}]`, dict[key]);

        return text;
    }

    replaceWithMacros(text, dict)
    {
        for (let key of Object.keys(dict))
            text = text.replaceAll(dict[key], `[${key}]`);

        return text;
    }

    formatString(text)
    {
        let width = 0;
        let macroText = "";
        let finalLines = [];
        let inMacro = false;
        let addedLine = false;

        //Replace certain text strings
        text = text.trimStart();
        text = text.replaceAll("\\n", "\n").replaceAll("\\p", "\n\n").replaceAll("\\l", "\n"); //Enable copy-paste
        text = text.replaceAll("[.]", "…").replaceAll("...", "…");
        text = text.replaceAll("[[", "[").replaceAll("]]", "]");
        text = text.replaceAll("\\e", "é");
        text = text.replaceAll("“", '"');
        text = text.replaceAll("”", '"');

        if (this.state.lockFinalLine)
            text = text.replace(/\n*$/, "") //Remove blank line at the end

        //Go through each line
        let lines = text.split("\n");
        for (let [i, line] of lines.entries())
        {
            let finalLine = [];
            let currWord = [];
            let lastWordStartIndex = 0;
            line = line.trimStart(); //Remove leading whitespace
            line = Array.from(line);

            if (addedLine) //A new line was addded before that didn't exist in the original text
            {
                if (line.length > 0) //Not a blank line
                {
                    //Merge the two lines together
                    let prevAddedLine = finalLines.pop();
                    finalLine = finalLine.concat(prevAddedLine)

                    if (finalLine.at(-1) !== " ") //Doesn't already have an extra whitespace at the end
                        finalLine = finalLine.concat(" ");

                    width = this.getStringWidth(prevAddedLine);
                    lastWordStartIndex = 1; //Because the word won't really start at the 0 index
                }

                addedLine = false;
            }
            else
                width = 0; //On a blank new line now

            //Try skip extra blank line
            if (line.length === 0 //Blank line separating textboxes
            && (i > 2 && lines[i - 1].length === 0 && lines[i - 2].length === 0)) //Two blank lines in a row
                continue; //Skip this line

            //Get the allowed width for this line
            let totalWidth = this.getLineTotalWidth(lines, i);

            //Go through each character in the line
            for (let [j, letter] of line.entries())
            {
                if (letter === " " && line[j - 1] === " ") //Two whitespaces in a row
                    continue; //Don't allow
                else if (letter === "[") //Start of macro
                {
                    inMacro = true;
                    macroText = "";
    
                    //The beginning of a buffer always marks a new word
                    finalLine = finalLine.concat(currWord);
                    lastWordStartIndex = j;
                    currWord = []; //Reset

                    //Add a closing brace if there' isn't one on the line yet
                    if (!this.lineHasCharAfterIndex(line, j, "]"))
                        letter += "]"; //Automatically add closing brace
                }
                else if (inMacro)
                {
                    if (letter === "]") //End of macro
                    {
                        inMacro = false;
                        width += this.getMacroWidth(macroText)
                    }
                    else //Build up the macro
                    {
                        letter = letter.toUpperCase();
                        macroText += letter;
                    }
                }
                else
                {
                    if (letter === " " && j + 1 >= line.length)
                        {} //Ignore trailing whitespace
                    else
                        width += this.getCharacterWidth(letter);
                }

                if (letter === " ") //Whitespace
                {
                    finalLine = finalLine.concat(currWord).concat(" ");
                    lastWordStartIndex = j + 1;
                    currWord = []; //Reset
                }
                else if (letter === "-") //Dash
                {
                    //Allow splitting dashes onto multiple lines
                    finalLine = finalLine.concat(currWord).concat("-");
                    lastWordStartIndex = j + 1;
                    currWord = []; //Reset
                }
                else
                    currWord.push(letter);

                if (width > totalWidth) //Exceeded the space on this line
                {
                    if (i + 1 >= lines.length && this.state.lockFinalLine) //No more lines can go after this one
                    {
                        if (currWord.length > 0)
                            currWord.length -= 1; //Remove character just added
                        break; //No more lines
                    }
                    if (lastWordStartIndex === 0) //This word has taken up the entire line
                    {
                        //Split word onto multiple lines
                        currWord.length -= 1; //Remove character just added
                        finalLines.push(currWord);
                        finalLine = [letter]; //Reset the current line with letter just shoved down
                        width = 0; //Reset width entirely
                        currWord = [];
                        addedLine = true;
                    }
                    else /*if (line[lastWordStartIndex - 1] === " ")*/ //Whitespace before last word start
                    {
                        while (finalLine.at(-1) === " ")
                            finalLine.length -= 1; //Remove the trailing whitespace

                        finalLines.push(finalLine);

                        if (currWord.join("") !== " ")
                            finalLine = currWord; //Push over the word currently being worked on
                        else
                            finalLine = []; //Don't push over a trailing whitespace

                        width = this.getStringWidth(finalLine);
                        currWord = []; //Reset
                        lastWordStartIndex = 0;
                        addedLine = true;
                    }
                }
            }

            finalLine = finalLine.concat(currWord);
            finalLines.push(finalLine);
        }

        let finalText = finalLines.map((line) => line.join("")).join("\n");
        finalText = this.replaceMacros(finalText, COLOURS); //Do last to allow either capitalization
        finalText = this.replaceMacros(finalText, OTHER_REPLACEMENT_MACROS); //Do last to allow either capitalization
        return finalText;
    }

    handleCursorChange(event)
    {
        this.setState({cursorPosition: event.target.selectionStart, prevCursorPosition: this.state.cursorPosition});
    }

    onKeyDown(event)
    {
        if (event.keyCode === 90 && event.ctrlKey) //Ctrl + Z
        {
            event.preventDefault();
            this.undoButton();
        }
        else if (event.keyCode === 89 && event.ctrlKey) //Ctrl + Y
        {
            event.preventDefault();
            this.redoButton();
        }
        else
            this.handleCursorChange(event);
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
                SetTextareaCursorPos(cursorPos, autoAdjustScroll);
        });
    }

    setNewText(newText, autoAdjustScroll)
    {
        newText = this.formatString(this.formatString(newText)); //Format twice to fix copy-paste errors
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

    createDivText()
    {
        let result = [];
        let lines = this.state.text.split("\n");
        let key = 0;

        for (let line of lines)
            result.push(<span key={key++}><p>{line}</p><br/></span>);

        return result;
    }

    createIngameText()
    {
        let finalText = "";
        let newTextbox = true;
        let inQuote = false;
        let text = this.state.text;

        text = text.trim();
        text = text.replaceAll("Pokemon", "Pok\\emon");
        text = text.replaceAll("é", "\\e");
        text = this.replaceWithMacros(text, COLOURS);
        text = this.replaceWithMacros(text, OTHER_REPLACEMENT_MACROS);

        for (let i = 0; i < text.length; ++i)
        {
            let letter = text[i];

            if (letter === " ")
            {
                if (i + 1 < text.length)
                {
                    if (text[i + 1] === " " || text[i + 1] === "\n") //Disallow trailing whitespace
                        continue;
                }
            }
            else if (letter === "\n")
            {
                if (i + 1 < text.length)
                {
                    if (text[i + 1] === "\n")
                    {
                        finalText += "\\p";
                        newTextbox = true;
                        ++i; //Skip the next \n
                    }
                    else
                    {
                        if (newTextbox) //First \n in textbox
                        {
                            finalText += "\\n";
                            newTextbox = false;
                        }
                        else
                            finalText += "\\l";
                    }
                }
            }
            else if (letter == '"')
            {
                if (inQuote)
                {
                    if (i - 1 >= 0 && text[i - 1] === "\\")
                        finalText += '"'; //Don't add an extra backslash
                    else
                        finalText += '\\"';

                    inQuote = false;
                }
                else
                {
                    finalText += '"';
                    inQuote = true;
                }
            }
            else if (letter === "$")
            {
                if (i - 1 >= 0 && text[i - 1] === "\\")
                    finalText += '$'; //Don't add an extra backslash
                else
                    finalText += '\\$';
            }
            else
                finalText += letter;
        }

        return finalText;
    }

    prettifyText()
    {
        Swal.fire({
            title: "Make your text pretty?\nThis will reformat your text!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: 'Do It',
        }).then((result) =>
        {
            if (result.isConfirmed)
            {
                let finalText = "";
                let inMacro = false;
                let skipNextChar = false;
                let skipNextCharIfWhitespace = false;
                let text = this.state.text;
        
                text = text.replaceAll("\n", " "); //First, remove all of the new lines
                text = text.replaceAll("  ", " "); //Then, remove all of the duplicate white spaces created above
                text = text.replaceAll("  ", " "); //Then, remove all of the duplicate white spaces created above
                text = Array.from(text)

                for (let [i, letter] of text.entries())
                {
                    if (skipNextChar)
                    {
                        skipNextChar = false;
                        continue;
                    }

                    if (!skipNextCharIfWhitespace || letter !== " ")
                        finalText += letter;
        
                    skipNextCharIfWhitespace = false;
        
                    if (letter === "[")
                        inMacro = true;
                    else if (letter === "]")
                        inMacro = false;
                    else if (!inMacro)
                    {
                        if (letter === "." || letter === "?" || letter === "!") //Sentence punctuation (not including ellipses)
                        {
                            if (i + 1 < text.length && text[i + 1] === '"')
                            {
                                finalText += '"'; //Place the quote before moving to the next textbox
                                skipNextChar = true;
                            }

                            finalText += "\n\n"; //Move to new textbox
                            skipNextCharIfWhitespace = true;
                        }
                    }
                }

                this.setState({lockFinalLine: false}, () => //So it doesn't interfere with the prettifer
                {
                    let newText = this.formatString(finalText).trim();
                    newText = newText.replace("\n… ", "\n…"); //Remove whitespace after line start ellipses
                    newText = newText.replace("\n… ", "\n…"); //Remove whitespace after line start ellipses - intentional duplicate
                    this.setNewText(newText, false);
    
                    Swal.fire("Prettified!", "", "success");
                });
            }
        });
    }

    copyConvertedText()
    {
        var elem = document.getElementById("converted-text");
        if (elem != null)
        {
            elem.select(); //Select all text
            elem.setSelectionRange(0, 99999); //For mobile devices
            document.execCommand("copy"); //Copy the text inside the text field
        }
    }

    addTextAtSelectionStart(textToAdd)
    {
        var elem = document.getElementById("main-textarea");
        if (elem != null)
        {
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
                SetTextareaCursorPos(newCursorPos, true);
            });
        }
    }

    undoButton()
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

    addTextToUndo(text, cursorPos)
    {
        let undoTextStack = this.state.undoTextStack;
        let undoCursorStack = this.state.undoCursorStack;
        undoTextStack.push(text);
        undoCursorStack.push(cursorPos);
        this.setState({undoTextStack: undoTextStack, undoCursorStack: undoCursorStack});
    }

    redoButton()
    {
        console.log("Redoing");
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

    lockFinalLine(lockLine)
    {
        this.setState({lockFinalLine: lockLine});
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
            <div className="editor-page">
                <div className="editor-grid">
                    {/*Toolbar*/}
                    <div className="quick-buttons" style={buttonsContainerStyle}>
                        <QuickButton text="⚫" tooltip={blackTextTooltip} func={this.addTextAtSelectionStart.bind(this)}/>
                        <QuickButton text="🔵" tooltip={blueTextTooltip} func={this.addTextAtSelectionStart.bind(this)}/>
                        <QuickButton text="🔴" tooltip={redTextTooltip} func={this.addTextAtSelectionStart.bind(this)}/>
                        <QuickButton text="🟢" tooltip={greenTextTooltip} func={this.addTextAtSelectionStart.bind(this)}/>
                        <QuickButton text="[PLAYER]" tooltip={playerTooltip} func={this.addTextAtSelectionStart.bind(this)}/>
                        <QuickButton text="[RIVAL]" tooltip={rivalTooltip} func={this.addTextAtSelectionStart.bind(this)}/>
                        <QuickButton text="[PAUSE][]" tooltip={pauseTooltip} func={this.addTextAtSelectionStart.bind(this)}/>
                    </div>

                    {/*Text Input*/}
                    <TextArea
                        className="fr-text main-textarea"
                        id = "main-textarea"
                        rows={5}
                        style={textAreaStyle}
                        value={this.state.text}
                        onChange={(e) => this.handleTextChange(e)}
                        onClick={(e) => this.handleCursorChange(e)}
                        onKeyDown={(e) => this.onKeyDown(e)}
                        onKeyUp={(e) => this.handleCursorChange(e)}
                    />

                    {/*Converted Text*/}
                    <TextArea
                        readOnly={true}
                        className="fr-text converted-text"
                        id = "converted-text"
                        rows={1}
                        style={textAreaStyle}
                        value={this.createIngameText()}
                        onClick={this.copyConvertedText.bind(this)}
                    />

                    {/*Space Details & Prettifier*/}
                    <div className="editor-underneath">
                        <div><Button onClick={this.prettifyText.bind(this)} variant="danger" className="prettify-button">Prettify</Button></div>
                        <div className="space-info"><span style={overflowErrorStyle}>{cursorLineWidth}</span> / {totalWidth} ~ <span style={overflowErrorStyle}>{cursorLineCount}</span> / {maxCharCount}</div>
                    </div>

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
                            <span><FaUndo onClick={this.undoButton.bind(this)} size={30} //Span is necessary for the tooltip to work here
                                    className={"undo-redo-button " + (this.state.undoTextStack.length === 0 ? "disabled-undo-redo-button" : "active-undo-redo-button")}/></span>
                        </OverlayTrigger>
                        <OverlayTrigger placement="right" overlay={redoTooltip}>
                            <span><FaRedo onClick={this.redoButton.bind(this)} size={30}
                                    className={"undo-redo-button " + (this.state.redoTextStack.length === 0 ? "disabled-undo-redo-button" : "active-undo-redo-button")}/></span>
                        </OverlayTrigger>
                    </div>

                    {/*Hidden div for matching the width of the textarea to*/}
                    <div className="fr-text hidden-div" ref={this.myInput}>{this.createDivText()}</div>
                </div>
            </div>
        )
    }
}

function SetTextareaCursorPos(cursorPos, autoAdjustScroll)
{
    var textArea = document.getElementById("main-textarea");
    if (textArea != null)
    {
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
}

export default Editor;
