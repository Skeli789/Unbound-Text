/**
 * This file defines helpers for reading and restoring the native textarea selection.
 * It is used by the Editor component to keep the DOM textarea and the editor state in sync.
 */

export const NO_SELECTION_DIRECTION = "none"; //Native value for a selection without a direction


/**
 * Gets the ID of the textarea based on whether it is a translation box or not.
 * @param {boolean} isTranslationBox - Whether the textarea is for translated text.
 * @returns {string} The ID of the textarea.
 */
export function GetTextAreaId(isTranslationBox)
{
    if (isTranslationBox)
        return "translated-textarea";
    else
        return "main-textarea";
}

/**
 * Reads native textarea selection in UTF-16 coordinates.
 * @param {HTMLTextAreaElement} textarea - The input element.
 * @returns {Object} A detached selection snapshot.
 */
export function ReadTextareaSelection(textarea)
{
    return {
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd,
        selectionDirection: textarea.selectionDirection || NO_SELECTION_DIRECTION
    };
}

/**
 * Updates the cursor position in the textarea and adjusts the scroll if needed.
 * @param {number} selectionStart - The starting position of the selection/cursor position.
 * @param {number} selectionEnd - The ending position of the selection.
 * @param {boolean} autoAdjustScroll - Whether to automatically adjust the scroll position after the text change.
 * @param {boolean} isTranslationBox - Whether the textarea is for translated text.
 * @param {string} [selectionDirection=NO_SELECTION_DIRECTION] - Native selection direction.
 */
export function SetTextareaCursorPos(selectionStart, selectionEnd, autoAdjustScroll, isTranslationBox, selectionDirection=NO_SELECTION_DIRECTION)
{
    //Find the textarea element
    const textArea = document.getElementById(GetTextAreaId(isTranslationBox));
    if (!textArea)
        return;
    const viewTop = textArea.scrollTop;

    //Set the cursor position
    textArea.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
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
