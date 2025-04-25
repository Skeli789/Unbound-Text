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
