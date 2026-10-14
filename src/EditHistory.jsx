/**
 * This file defines the pure undo and redo stack transitions used by the Editor component.
 * Every function returns new stacks and never mutates the stacks it receives.
 */
import {NO_SELECTION_DIRECTION} from './TextareaUtils';


/**
 * Appends an entry to an undo stack.
 * @param {Array<Object>} undoStack - The current undo stack.
 * @param {Object} entry - The undo entry to append.
 * @returns {Array<Object>} A new undo stack containing the entry.
 */
export function PushUndoEntry(undoStack, entry)
{
    return [...undoStack, entry];
}

/**
 * Updates the last undo entry with the selection to restore when that change is redone.
 * @param {Array<Object>} undoStack - The current undo stack.
 * @param {number} selectionStartForRedo - The starting position of the selection/cursor position when redoing this undo.
 * @param {number} selectionEndForRedo - The ending position of the selection when redoing this undo.
 * @param {string} [selectionDirectionForRedo=NO_SELECTION_DIRECTION] - Finalized selection direction.
 * @returns {Array<Object>} A new undo stack with the last entry updated.
 */
export function UpdateLastUndoEntry(undoStack, selectionStartForRedo, selectionEndForRedo, selectionDirectionForRedo=NO_SELECTION_DIRECTION)
{
    const updatedStack = undoStack.slice(); //Copy to avoid mutating the existing stack
    updatedStack[updatedStack.length - 1] =
    {
        ...updatedStack[updatedStack.length - 1],
        selectionStartForRedo,
        selectionEndForRedo,
        selectionDirectionForRedo
    };
    return updatedStack;
}

/**
 * Computes the history after undoing the latest change.
 * @param {Object} state - An object holding the undoStack, appliedUndoStack, and redoStack arrays.
 * @param {string} currentText - The text being replaced by the undo, recorded on the redo stack.
 * @returns {{history: Object, restore: Object}|null} The next stacks and the entry whose text and selection to restore, or null when nothing can be undone.
 */
export function GetUndoTransition(state, currentText)
{
    if (state.undoStack.length === 0)
        return null;

    const undoStack = state.undoStack.slice(); //Copy to avoid mutating state directly
    const undoApplied = undoStack.pop(); //Remove the last change from the undo stack
    const redoEntry =
    {
        text: currentText,
        selectionStart: undoApplied.selectionStartForRedo,
        selectionEnd: undoApplied.selectionEndForRedo,
        selectionDirection: undoApplied.selectionDirectionForRedo
    };

    return {
        history:
        {
            undoStack,
            appliedUndoStack: [...state.appliedUndoStack, undoApplied], //Save the undone change in case there is an undo after a redo
            redoStack: [...state.redoStack, redoEntry],
        },
        restore: undoApplied,
    };
}

/**
 * Computes the history after redoing the latest undone change.
 * @param {Object} state - An object holding the undoStack, appliedUndoStack, and redoStack arrays.
 * @returns {{history: Object, restore: Object}|null} The next stacks and the entry whose text and selection to restore, or null when nothing can be redone.
 */
export function GetRedoTransition(state)
{
    if (state.redoStack.length === 0)
        return null;

    const redoStack = state.redoStack.slice(); //Copy to avoid mutating state directly
    const redoApplied = redoStack.pop(); //Remove the last change from the redo stack
    const appliedUndoStack = state.appliedUndoStack.slice(); //Copy to avoid mutating state directly
    const lastUndoApplied = appliedUndoStack.pop(); //Remove the last change from the applied undo stack

    return {
        history:
        {
            undoStack: [...state.undoStack, lastUndoApplied], //Add the previous undo back to the undo stack
            appliedUndoStack,
            redoStack,
        },
        restore: redoApplied,
    };
}
