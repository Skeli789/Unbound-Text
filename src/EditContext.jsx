/**
 * This file defines helpers that validate raw textarea edits before they are formatted.
 * It is used by the Editor component when converting a native edit into a format change.
 */
import {TextChange} from './TextUtils';


/**
 * Builds the format change for a raw edit after confirming that the edit matches its range.
 * @param {Object} typeOfTextChange - The change type returned by DetermineTextChangeType.
 * @param {string} oldText - The text before the raw edit.
 * @param {string} newText - The raw text after the edit.
 * @param {{start: number, end: number}} range - The replaced range within oldText.
 * @returns {Object} The format change, or a NO_CHANGE type when the edit is inconsistent with its range.
 */
export function BuildValidatedFormatChange(typeOfTextChange, oldText, newText, range)
{
    const insertedLength = newText.length - oldText.length + range.end - range.start;
    const validRange = insertedLength >= 0
        && oldText.slice(0, range.start) === newText.slice(0, range.start)
        && oldText.slice(range.end) === newText.slice(range.start + insertedLength);
    if (!validRange)
        return {...typeOfTextChange, type: TextChange.NO_CHANGE};

    const inserted = newText.slice(range.start, range.start + insertedLength);
    return {...typeOfTextChange, start: range.start, inserted, validatedBracket: inserted === "["};
}
