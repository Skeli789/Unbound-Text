import FontSizes from "./FontSizes.json";

export const FULL_LINE_WIDTH = 206;
export const SEMI_LINE_WIDTH = 196;

export const COLOURS =
{
    "BLACK": "⚫",
    "GREEN": "🟢",
    "BLUE": "🔵",
    "RED": "🔴",
    "ORANGE:": "🟠",
};

export const OTHER_REPLACEMENT_MACROS =
{
    ".": "…",
    "ARROW_UP": "↑",
    "ARROW_DOWN": "↓",
    "ARROW_LEFT": "←",
    "ARROW_RIGHT": "→",
    "A_BUTTON": "🅰",
    "B_BUTTON": "🅱",
};

export function ReplaceMacros(text, obj)
{
    for (let key of Object.keys(obj))
        text = text.replaceAll(`[${key}]`, obj[key]);

    return text;
}

export function ReplaceWithMacros(text, obj)
{
    for (let key of Object.keys(obj))
        text = text.replaceAll(obj[key], `[${key}]`);

    return text;
}

export function IsColour(char)
{
    return char === "🟢"
        || char === "🔵"
        || char === "🔴"
        || char === "⚫";
}

export function IsPunctuation(char)
{
    return char === "." || char === "!" || char === "?";
}

export function IsPause(text, nextLetterIndex)
{
    return text.slice(nextLetterIndex, nextLetterIndex + 7).join("") === "[PAUSE]";
}

export function GetNextLetterIndex(text, nextLetterIndex)
{
    if (nextLetterIndex >= text.length)
        return nextLetterIndex; //No more letters

    if (IsColour(text[nextLetterIndex]))
        return GetNextLetterIndex(text, nextLetterIndex + 1); //Skip past colour
    else if (IsPause(text, nextLetterIndex))
        return GetNextLetterIndex(text, nextLetterIndex + 7); //Skip past pause start
    else if (text.slice(nextLetterIndex, nextLetterIndex + 7).join("") === "[RIVAL]")
        return "R"; //WTF???
    else if (text.slice(nextLetterIndex, nextLetterIndex + 8).join("") === "[PLAYER]")
        return "P"; //WTF???
    else if (text.slice(nextLetterIndex, nextLetterIndex + 7).join("") === "[BUFFER")
        return "B"; //WTF???
    else if (text[nextLetterIndex] === "[")
    {
        while (nextLetterIndex < text.length && text[nextLetterIndex] !== "]")
            ++nextLetterIndex;

        ++nextLetterIndex;

        if (nextLetterIndex < text.length)
            return GetNextLetterIndex(text, nextLetterIndex); //Try after the macro

        //No more letters
    }

    return nextLetterIndex;
}

export function GetCharacterWidth(char, nextChar)
{
    if (IsColour(char))
        return 0;
    else if (nextChar === "\n" && char in FontSizes.actulCharSizes)
        return FontSizes.actulCharSizes[char]; //Get the reduced width for being at the end of the line
    else if (char in FontSizes.charSizes)
        return FontSizes.charSizes[char];
    else
        return 6; //Assume default size is 6  
}

export function GetMacroWidth(macroText)
{
    if (macroText in FontSizes.macroSizes) //Macro has a pre-defined length like PLAYER
        return FontSizes.macroSizes[macroText];

    return 0; //Default take up no space
}

export function GetStringWidth(text)
{
    let width = 0;
    let inMacro = false;
    let macroText = "";

    text = Array.from(text);
    for (let [i, letter] of text.entries())
    {
        if (letter === "\n")
            break; //End of line

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
                width += GetMacroWidth(macroText)
            }
            else //Build up the macro
                macroText += letter;
        }
        else
        {
            let nextChar = (i + 1 >= text.length) ? "\n" : text[i + 1];

            if (letter === " " && nextChar === "\n")
                break; //Ignore trailing whitespace

            width += GetCharacterWidth(letter, nextChar);
        }
    }

    return width;
}

export function GetLineTotalWidth(lines, lineIndex, finalLineLocked)
{
    let totalWidth = SEMI_LINE_WIDTH;

    if (lineIndex + 1 >= lines.length && finalLineLocked)
        totalWidth = FULL_LINE_WIDTH; //No scroll arrow after the last line
    else if (lineIndex === 0 //First line in the msgbox
    || lines[lineIndex - 1].length === 0) //\n Before this line
    {
        if (!DoesLineHaveScrollAfterItByLines(lines, lineIndex))
            totalWidth = FULL_LINE_WIDTH; //Slightly longer line
    }

    return totalWidth;
}

export function FindIndexOfLineStart(text, lineEndIndex)
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

export function FindIndexOfLineEnd(text, cursorIndex)
{
    let lineEndIndex;

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

export function DoesLineEndParagraph(text, lineStartIndex)
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

export function DoesLineHaveScrollAfterIt(text, lineStartIndex, lineEndIndex, finalLineLocked)
{
    if (finalLineLocked && lineEndIndex >= text.length)
        return false; //Last line never has a scroll arrow

    if (lineStartIndex === 0)
    {
        if (DoesLineEndParagraph(text, lineStartIndex))
            return true; //Scroll arrow is on the first line

        return false; //First line doesn't has a scroll arrow after it
    }

    if (text[lineStartIndex - 1] === "\n")
    {
        if (DoesLineEndParagraph(text, lineStartIndex))
            return true; //Scroll arrow is on the first line

        if (lineStartIndex === 1)
            return false; //First line in textbox doesn't has a scroll arrow after it

        if (text[lineStartIndex - 2] === "\n")
            return false; //First line of paragraph doesn't have scroll
    }

    return true;
}

export function DoesLineHaveScrollAfterItByLines(lines, lineIndex)
{
    return lineIndex + 2 < lines.length
        && lines[lineIndex + 1].length === 0; //Followed by blank line
}

export function LineHasCharAfterIndex(line, index, char)
{
    for (let i = index; i < line.length; ++i)
    {
        if (line[i] === char)
            return true;
    }

    return false;
}

export function LineHasCharAfterIndexBeforeOtherChar(line, index, char, otherChar)
{
    for (let i = index; i < line.length; ++i)
    {
        if (line[i] === otherChar)
            return false;
        else if (line[i] === char)
            return true;
    }

    return false;
}

export function FormatStringForDisplay(text, finalLineLocked, textChange={})
{
    let width = 0;
    let finalLines = [];
    let addedLine = false;

    //Replace certain text strings
    text = text.replaceAll("\\pn", "\n\n").replaceAll("\\n", "\n").replaceAll("\\p", "\n\n").replaceAll("\\l", "\n"); //Enable copy-paste - first is from HexManiac
    text = text.replaceAll("[.]", "…").replaceAll("...", "…").replaceAll("…]", "…"); //Remove accidental extra square bracket
    text = text.replaceAll("[[", "[").replaceAll("]]", "]");
    text = text.replaceAll("\\e", "é");
    text = text.replaceAll("_FR]", "]").replaceAll("_EM]", "]"); //XSE Colour Endings

    if (finalLineLocked)
        text = text.replace(/\n*$/, "") //Remove blank line at the end

    //Go through each line
    let charsProcessed = 0;
    let lines = text.split("\n");
    for (let [i, originalLine] of lines.entries())
    {
        let inMacro = false; //Macros can't exist over multiple lines
        let macroText = "";
        let finalLine = [];
        let currWord = [];
        let lastWordStartIndex = 0;
        let line = originalLine.trimStart(); //Remove leading whitespace
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

                width = GetStringWidth(prevAddedLine);
                lastWordStartIndex = 1; //Because the word won't really start at the 0 index
            }

            addedLine = false;
        }
        else
            width = 0; //On a blank new line now

        //Prevent more than three blank lines in a row
        if (line.length === 0 //Blank line separating textboxes
        && i > 3
        && lines[i - 1].length === 0
        && lines[i - 2].length === 0
        && lines[i - 3].length === 0) //Three blank lines in a row
           continue; //Skip this line

        //Get the allowed width for this line
        let totalWidth = GetLineTotalWidth(lines, i, finalLineLocked);

        //Go through each character in the line
        for (let [j, letter] of line.entries())
        {
            if (letter === " " && j - 2 >= 0 && line[j - 1] === " " && line[j - 2] === " ") //Three whitespaces in a row
                continue; //Don't allow
            else if (letter === "[") //Start of macro
            {
                inMacro = true;
                macroText = "";

                //The beginning of a buffer always marks a new word
                finalLine = finalLine.concat(currWord);
                lastWordStartIndex = j;
                currWord = []; //Reset

                //Add a closing brace if there isn't one on the line yet and only if the user just added the [
                if (!LineHasCharAfterIndex(line, j, "]")
                && textChange.type === TextChange.SINGLE_INSERT
                && textChange.inserted === "[" //Only add if the user just added it
                && j + charsProcessed >= textChange.start) //Only add if the user just added it
                    letter += "]"; //Automatically add closing brace
            }
            else if (inMacro)
            {
                if (letter === "]") //End of macro
                {
                    inMacro = false;
                    width += GetMacroWidth(macroText)
                }
                else //Build up the macro
                {
                    if (LineHasCharAfterIndexBeforeOtherChar(line, j, "]", "["))
                        letter = letter.toUpperCase();

                    macroText += letter;
                }
            }
            else
            {
                let nextChar = (j + 1 >= line.length) ? "\n" : line[j + 1];

                if (letter === " " && nextChar === "\n")
                    {} //Ignore trailing whitespace
                else
                    width += GetCharacterWidth(letter, nextChar);
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
                if (i + 1 >= lines.length && finalLineLocked) //No more lines can go after this one
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

                    width = GetStringWidth(finalLine);
                    currWord = []; //Reset
                    lastWordStartIndex = 0;
                    addedLine = true;
                }
            }
        }

        finalLine = finalLine.concat(currWord);
        finalLines.push(finalLine);
        charsProcessed += originalLine.length + 1; //+1 for the \n that was removed
    }

    let finalText = finalLines.map((line) => line.join("")).join("\n");
    finalText = ReplaceMacros(finalText, COLOURS); //Do last to allow either capitalization
    finalText = ReplaceMacros(finalText, OTHER_REPLACEMENT_MACROS); //Do last to allow either capitalization
    return finalText;
}

/**
 * @typedef {Object} TextChange
 * @property {string} type - The type of change made to the text.
 * @property {string} inserted - The text that was inserted.
 * @property {string} deleted - The text that was deleted.
 * @property {number} start - The starting index of the change in the new text.
 * @property {number} end - The ending index of the change in the new text.
 */
export const TextChange = Object.freeze(
{
    /** No change was made. */
    NO_CHANGE:            "NO_CHANGE",
    /** A single character was inserted. */
    SINGLE_INSERT:        "SINGLE_INSERT",
    /** A single character was deleted. */
    SINGLE_DELETE:        "SINGLE_DELETE",
    /** Multiple characters were inserted. */
    MULTI_INSERT:         "MULTI_INSERT",
    /** Multiple characters were deleted. */
    MULTI_DELETE:         "MULTI_DELETE",
    /** A single character was replaced by a single character. */
    SINGLE_REPLACE:       "SINGLE_REPLACE",
    /** Multiple characters were replaced by a single character. */
    SINGLE_REPLACE_MULTI: "SINGLE_REPLACE_MULTI",
    /** Multiple characters were replaced by multiple characters. */
    MULTI_REPLACE_MULTI:  "MULTI_REPLACE_MULTI",
    /** A single character was replaced by multiple characters. */
    MULTI_REPLACE_SINGLE: "MULTI_REPLACE_SINGLE"
});

/**
 * Determines the type of change made to the text.
 * @param {string} oldText - The original text before the change.
 * @param {string} newText - The modified text after the change.
 * @returns {TextChange} The type of change made to the text. One of the above.
 */
export function DetermineTextChangeType(oldText, newText)
{
    //Check if any text was actually changed
    if (oldText === newText)
        return {type: TextChange.NO_CHANGE, inserted: "", deleted: ""};

    //Find the start of the change
    const oldLen = oldText.length, newLen = newText.length;
    let start = 0;
    while (start < oldLen && start < newLen && oldText[start] === newText[start]) 
        ++start;

    //Find the end of the change
    let endOld = oldLen - 1, endNew = newLen - 1;
    while (endOld >= start && endNew >= start && oldText[endOld] === newText[endNew])
    {
        --endOld;
        --endNew;
    }

    //Determine the number of characters inserted and deleted
    const oldCount = endOld - start + 1;
    const newCount = endNew - start + 1;
    const inserted = newCount > 0 ? newText.substring(start, start + newCount) : "";
    const deleted = oldCount > 0 ? oldText.substring(start, start + oldCount) : "";

    if (oldCount > 0 && newCount > 0)
    {
        //Both inserted and deleted
        if (oldCount === 1 && newCount === 1) //Replace a single character with another single character
            return {type: TextChange.SINGLE_REPLACE, inserted, deleted, start, end: start + newCount};
        else if (oldCount > 1 && newCount === 1) //Replace multiple characters with a single character
            return {type: TextChange.SINGLE_REPLACE_MULTI, inserted, deleted, start, end: start + newCount};
        else if (oldCount === 1 && newCount > 1) //Replace a single character with multiple characters
            return {type: TextChange.MULTI_REPLACE_SINGLE, inserted, deleted, start, end: start + newCount};
        else //Replace multiple characters with multiple characters
            return {type: TextChange.MULTI_REPLACE_MULTI, inserted, deleted, start, end: start + newCount};
    }
    else if (oldCount > 0)
    {
        //Only deleted
        const kind = oldCount === 1
            ? TextChange.SINGLE_DELETE
            : TextChange.MULTI_DELETE;
        return {type: kind, inserted: "", deleted, start, end: start};
    }
    else
    {
        //Only inserted
        const kind = newCount === 1
            ? TextChange.SINGLE_INSERT
            : TextChange.MULTI_INSERT;
        return {type: kind, inserted, deleted: "", start, end: start + newCount};
    }
}

/**
 * Determines if the text change is an insertion.
 * @param {string} type - The type of change made to the text.
 * @returns {boolean} True if the change is an insertion, false otherwise.
 */
export function IsInsertTextChange(type)
{
    return type === TextChange.SINGLE_INSERT
        || type === TextChange.MULTI_INSERT;
}
