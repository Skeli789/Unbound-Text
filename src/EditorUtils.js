
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
        return "R";
    else if (text.slice(nextLetterIndex, nextLetterIndex + 8).join("") === "[PLAYER]")
        return "P";
    else if (text.slice(nextLetterIndex, nextLetterIndex + 7).join("") === "[BUFFER")
        return "B";
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
