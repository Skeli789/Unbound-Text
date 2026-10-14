import React from 'react';
import {render, fireEvent, act} from '@testing-library/react';
import {userEvent} from '@testing-library/user-event';
import {vi} from 'vitest';

import ConvertedText, {CreateIngameText} from '../ConvertedText';
import Editor from '../Editor';
import {NO_SELECTION_DIRECTION} from '../TextareaUtils';
import * as TextUtils from '../TextUtils';


describe('Editor is rendered and can be typed in', () =>
{
    const initialText = 'Hello';
    const dummyFunc = () => {};

    test('renders with initial text', async () =>
    {
        const {getByTestId} = render(<Editor text={initialText} isTranslation={false} showTranslationBox={dummyFunc} test={true} />);
        const textarea = getByTestId('main-textarea');
        expect(textarea).toHaveValue(initialText);
    });

    test.each([false, true])('measures initial editor width before input (translation: %s)', (isTranslation) =>
    {
        const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth').get;
        const widthSpy = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function ()
        {
            return this.classList.contains('hidden-div') ? 640 : originalOffsetWidth.call(this);
        });

        try
        {
            const editorRef = React.createRef();
            const text = 'A long initial line that needs a wider editor than the default width.';
            render(<Editor ref={editorRef} text={text} isTranslation={isTranslation} showTranslationBox={dummyFunc} test={true} />);
            const textarea = editorRef.current.textAreaRef.current.ref.current;

            expect(textarea).toHaveStyle({width: 'calc(640px + 2em)'});
            expect(textarea).toHaveValue(text);
            expect(editorRef.current.state.undoStack).toEqual([]);
            expect(editorRef.current.state.redoStack).toEqual([]);
            expect(editorRef.current.state.cursorPosition).toBe(0);
            expect(editorRef.current.state.selectionEnd).toBe(0);
        }
        finally
        {
            widthSpy.mockRestore();
        }
    });

    test('updates text on user input', async () =>
    {
        const {getByTestId} = render(<Editor text={initialText} isTranslation={false} showTranslationBox={dummyFunc} test={true} />);
        const textarea = getByTestId('main-textarea');
        fireEvent.change(textarea, { target: { value: 'Hello, world' } });
        expect(textarea).toHaveValue('Hello, world');
    });

    test('undo (Ctrl+Z) reverts last change', async () =>
    {
        const {getByTestId} = render(<Editor text={initialText} isTranslation={false} showTranslationBox={dummyFunc} test={true} />);
        const textarea = getByTestId('main-textarea');

        // Make a change
        fireEvent.change(textarea, { target: { value: 'Hi' } });
        expect(textarea).toHaveValue('Hi');

        // Undo change
        fireEvent.keyDown(textarea, { keyCode: 90, ctrlKey: true });
        expect(textarea).toHaveValue(initialText);
    });

    test('redo (Ctrl+Y) reapplies undone change', async () =>
    {
        const {getByTestId} = render(<Editor text={initialText} isTranslation={false} showTranslationBox={dummyFunc} test={true} />);
        const textarea = getByTestId('main-textarea');

        // Change and undo
        fireEvent.change(textarea, { target: { value: 'Bye' } });
        fireEvent.keyDown(textarea, { keyCode: 90, ctrlKey: true });
        expect(textarea).toHaveValue(initialText);

        // Redo
        fireEvent.keyDown(textarea, { keyCode: 89, ctrlKey: true });
        expect(textarea).toHaveValue('Bye');
    });
});

describe('Typing in editor moves the cursor where expected', () =>
{
    //"|" is used to represent the cursor position
    const testData =
    [
        {
            name: "Typing when blank always keeps cursor at end",
            default: "",
            insert: "Hello[[.]] It's me, the bestest editor ever!",
            expected: "Hello… It's me, the bestest editor\never!|"
        },
        {
            name: "Typing in the middle of the line moves the last word to the next line",
            default: "Hello… It's me, the |bestest editor\never!",
            insert: "cool ",
            expected: "Hello… It's me, the cool |bestest\neditor ever!"
        },
        {
            name: "Expanding the word at the end of line moves it to the next line",
            default: "Hello… It's me, the cool bestest|\neditor ever!",
            insert: "estest",
            expected: "Hello… It's me, the cool\nbestestestest| editor ever!"
        },
        {
            name: "Skipping the second line reformats the first line",
            default: "Hello… It's me, the coolest, awesome!\n|",
            insert: "\n",
            expected: "Hello… It's me, the coolest,\nawesome!\n\n|",
        },
        {
            name: "Adding a colour stays at the end of the colour",
            default: "Hello… It's me, the |coolest,\nawesome!",
            insert: "[[GREEN", //"[[" types "["; the ] is added automatically
            expected: "Hello… It's me, the 🟢|coolest,\nawesome!"
        },
        {
            name: "Space then adding a new word at the end of the line puts it on the new line",
            default: "Hello, one two three four five sixty|\nseventy, eighty.",
            insert: " thirty",
            expected: "Hello, one two three four five sixty\nthirty| seventy, eighty.",
        },
        {
            name: "Two spaces then adding a new word at the end of the line puts it on the new line",
            default: "Hello, one two three four five sixty|\nseventy, eighty.",
            insert: "  thirty",
            expected: "Hello, one two three four five sixty\nthirty| seventy, eighty.",
        },
        {
            name: "Adding [ to .] completes the ellipsis",
            default: "Hello|.] one",
            insert: "[[]",
            expected: "Hello…| one",
        },
        {
            name: "Adding . to [] completes the ellipsis",
            default: "Hello[|] one",
            insert: ".",
            expected: "Hello…| one",
        },
        {
            name: "Adding ] to [. completes the ellipsis",
            default: "Hello[.| one",
            insert: "]",
            expected: "Hello…| one",
        },
        {
            name: "Typing ] before ] moves past it",
            default: "Hello [|] one",
            insert: "]",
            expected: "Hello []| one",
        },
        {
            name: "Typing ] before ] in a macro moves past it",
            default: "Hello [PLAYER|] one",
            insert: "]",
            expected: "Hello [PLAYER]| one",
        },
        {
            name: "Typing ] before ] completes the macro",
            default: "Hello [RED| one",
            insert: "]",
            expected: "Hello 🔴| one",
        },
        {
            name: "Deleting one character from the end of the line",
            default: "Hello, one two three four five sixty|\nseventy, eighty.",
            insert: -1,
            expected: "Hello, one two three four five sixt|\nseventy, eighty.",
        },
        {
            name: "Deleting multiple characters from the middle of the line",
            default: "Hello, one two three| four five| sixty\nseventy, eighty.",
            insert: -1,
            expected: "Hello, one two three| sixty\nseventy, eighty.",
        },
        {
            name: "Deleting multiple characters from two lines without shifting anything up",
            default: "Hello, one two three four five |sixty\nthirty,| seventy, eighty.",
            insert: -1,
            expected: "Hello, one two three four five\n|seventy, eighty.",
        },
        {
            name: "Deleting multiple characters to finish a macro",
            default: "Hello, one two [GRE|\n\n|EN] text.",
            insert: -1,
            expected: "Hello, one two 🟢| text.",
        },
        {
            name: "Replace multiple characters to finish a macro",
            default: "Hello, one two [GR|\n\nE|N] text.",
            insert: "EE",
            expected: "Hello, one two 🟢| text.",
        },
        {
            name: "Replace full macro with just [",
            default: "Hello, |[PLAYER]|",
            insert: "[[",
            expected: "Hello, [|]",
        },
        {
            name: "Replace text with the first character of the text",
            default: "|ABC|",
            insert: "A",
            expected: "A|",
        },
        {
            name: "Replace one character with another to finish a macro",
            default: "Hello [R|B|D] man",
            insert: "E",
            expected: "Hello 🔴| man",
        },
        {
            name: "Adding a character in the middle of a long line",
            default: "AAAAAAAAAAAAAAAAAAAAAA | Skeliet-Jo.",
            insert: "B",
            expected: "AAAAAAAAAAAAAAAAAAAAAA B| Skeliet-\nJo.",
        },
        {
            name: "Adding a character to a whole line word",
            default: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA|",
            insert: "A",
            expected:"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nA|",
        },
        {
            name: "Pasting a colour and other text",
            default: "",
            paste: "[RED_FR] is best!",
            expected: "🔴 is best!|",
        },
        {
            name: "Pasting over existing text when the starting letters are the same",
            default: "|Hello, one two three four five sixty\nseventy, eighty.|",
            paste: "Happy birthday!",
            expected: "Happy birthday!|",
        },
        {
            name: "Pasting to insert text in the middle",
            default: "Hello, one two three four five |sixty\nseventy, eighty.",
            paste: "six seven eight nine ten twenty thirty forty ",
            expected: "Hello, one two three four five six\nseven eight nine ten twenty thirty\nforty |sixty seventy, eighty.",
        },  
        {
            name: "Pasting a macro before a suffix preserves the native caret",
            default: "|Z",
            paste: "[RED] a",
            expected: "🔴 a|Z",
        },
        {
            name: "Pasting repeated spaces next to a wrap boundary",
            default: "A".repeat(33) + "|Z",
            paste: "   ",
            expected: "A".repeat(33) + "\n|Z",
        },
        {
            name: "Pasting repeated newlines near a wrap boundary",
            default: "A".repeat(32) + "|Z",
            paste: "\n\n",
            expected: "A".repeat(32) + "\n\n|Z",
        },
        ...["|aa", "a|a", "aa|"].flatMap((text) => ["a", "aa"].flatMap((insert) =>
        [
            {name: `Typing ${insert} into ${text}`, default: text, insert, expected: text.replace("|", insert + "|")},
            {name: `Pasting ${insert} into ${text}`, default: text, paste: insert, expected: text.replace("|", insert + "|")},
        ])),
    ];

    for (let data of testData)
    {
        test.each([false, true])(`${data.name} (translation: %s)`, async (isTranslation) =>
        {
            //Create the editor
            const editorRef = React.createRef();
            const {getByTestId} = render(<Editor ref={editorRef} text="" isTranslation={isTranslation} showTranslationBox={() => {}} test={true} />);
            const textarea = getByTestId(isTranslation ? 'translated-textarea' : 'main-textarea');
            fireEvent.focus(textarea);

            //Set the default text
            const defaultText = data.default.replaceAll("|", "");
            fireEvent.change(textarea, {target: {value: defaultText}});

            //Set the default cursor position
            let cursorStart = data.default.indexOf("|");
            if (cursorStart < 0 || isNaN(cursorStart))
                cursorStart = 0; //Start at the beginning

            //Check if there's a second cursor position
            let cursorEnd = data.default.indexOf("|", cursorStart + 1);
            if (cursorEnd < 0 || isNaN(cursorEnd))
                cursorEnd = cursorStart; //No second cursor, so set it to the first one
            else
                --cursorEnd; //The actual selection end is one character before the cursor

            textarea.setSelectionRange(cursorStart, cursorEnd);
            expect(textarea.selectionStart).toBe(cursorStart);
            expect(textarea.selectionEnd).toBe(cursorEnd);

            //Simulate the user input
            if (data.paste) //Pasting text all at once
            {
                await userEvent.click(textarea); //Click the textarea to focus it
                textarea.setSelectionRange(cursorStart, cursorEnd); //Set the selection range again in case it was lost after the focus
                await userEvent.paste(data.paste, {initialSelectionStart: cursorStart, initialSelectionEnd: cursorEnd});
            }
            else if (data.insert === -1) //Delete
                await userEvent.keyboard("{Backspace}");
            else //Simulate the user typing one key at a time
                await userEvent.type(textarea, data.insert, {initialSelectionStart: cursorStart, initialSelectionEnd: cursorEnd});

            //Confirm the expected text
            const expectedText = data.expected.replaceAll("|", "");
            expect(textarea).toHaveValue(expectedText);

            //Confirm the expected cursor position
            const expectedCursorPos = data.expected.indexOf("|");
            const expectedTextWithCursor = expectedText.substring(0, expectedCursorPos) + "|" + expectedText.substring(expectedCursorPos); //Add in the | to the expected text where the cursor is
            const actualTextWithCursor = textarea.value.substring(0, textarea.selectionStart) + "|" + textarea.value.substring(textarea.selectionStart); //Add in the | to the actual text where the cursor is

            if (expectedTextWithCursor !== actualTextWithCursor)
                console.log("Expected: " + expectedTextWithCursor + "\nActual: " + actualTextWithCursor);

            expect(textarea.selectionStart).toBe(expectedCursorPos);
            expect(textarea.selectionEnd).toBe(expectedCursorPos);
            expect(editorRef.current.state.cursorPosition).toBe(expectedCursorPos);
            expect(editorRef.current.state.selectionEnd).toBe(expectedCursorPos);
        });
    }
});

describe.each([false, true])('Editor selection transactions (translation: %s)', (isTranslation) =>
{
    /**
     * Renders an editor with access to its state and native textarea.
     * @param {string} text - Initial text.
     * @returns {Object} The editor ref, textarea, and native-input user.
     */
    function CreateEditor(text)
    {
        const editorRef = React.createRef();
        render(<Editor ref={editorRef} text={text} isTranslation={isTranslation} showTranslationBox={() => {}} test={true} />);
        return {editorRef, textarea: editorRef.current.textAreaRef.current.ref.current, user: userEvent.setup()};
    }

    /**
     * Verifies that the DOM and committed editor state share the finalized selection.
     * @param {Object} editor - The rendered editor fixture.
     * @param {number} start - Expected selection start.
     * @param {number} [end=start] - Expected selection end.
     * @param {string} [direction=NO_SELECTION_DIRECTION] - Expected selection direction.
     */
    function ExpectSelection(editor, start, end=start, direction=NO_SELECTION_DIRECTION)
    {
        expect(editor.textarea.selectionStart).toBe(start);
        expect(editor.textarea.selectionEnd).toBe(end);
        expect(editor.textarea.selectionDirection).toBe(direction);
        expect(editor.editorRef.current.state.cursorPosition).toBe(start);
        expect(editor.editorRef.current.state.selectionEnd).toBe(end);
        expect(editor.editorRef.current.state.selectionDirection).toBe(direction);
    }

    /**
     * Sets a native selection and notifies the editor just as a selection event would.
     * @param {Object} editor - The rendered editor fixture.
     * @param {number} start - Selection start.
     * @param {number} [end=start] - Selection end.
     * @param {string} [direction=NO_SELECTION_DIRECTION] - Native selection direction.
     */
    function Select(editor, start, end=start, direction=NO_SELECTION_DIRECTION)
    {
        editor.textarea.focus();
        editor.textarea.setSelectionRange(start, end, direction);
        fireEvent.select(editor.textarea);
    }

    test('finalizes macro paste and consecutive input with synchronized undo/redo snapshots', async () =>
    {
        const editor = CreateEditor('Z');
        await editor.user.click(editor.textarea);
        Select(editor, 0);
        await editor.user.paste('[RED] a');
        expect(editor.textarea).toHaveValue('🔴 aZ');
        ExpectSelection(editor, 4);
        await editor.user.keyboard('b');
        expect(editor.textarea).toHaveValue('🔴 abZ');
        ExpectSelection(editor, 5);
        act(() => editor.editorRef.current.undoLastChange());
        expect(editor.textarea).toHaveValue('Z');
        ExpectSelection(editor, 0);
        act(() => editor.editorRef.current.redoLastChange());
        expect(editor.textarea).toHaveValue('🔴 abZ');
        ExpectSelection(editor, 5);
    });

    test('preserves backward selection for undo and inserts toolbar text without replacing it', () =>
    {
        const editor = CreateEditor('ABC');
        Select(editor, 1, 3, 'backward');
        act(() => editor.editorRef.current.addTextAtSelectionStart('[]'));
        expect(editor.textarea).toHaveValue('A[]BC');
        ExpectSelection(editor, 2);
        expect(editor.textarea).toHaveFocus();
        act(() => editor.editorRef.current.undoLastChange());
        expect(editor.textarea).toHaveValue('ABC');
        ExpectSelection(editor, 1, 3, 'backward');
        act(() => editor.editorRef.current.redoLastChange());
        ExpectSelection(editor, 2);
    });

    test('retains the collapsed native selection for same-value replacement without history', async () =>
    {
        const editor = CreateEditor('aaa');
        await editor.user.click(editor.textarea);
        Select(editor, 1, 2, 'backward');
        await editor.user.paste('a');
        expect(editor.textarea).toHaveValue('aaa');
        ExpectSelection(editor, 2);
        expect(editor.editorRef.current.state.undoStack).toEqual([]);
    });

    test('rejects overflow on a locked final line without moving selection or adding history', async () =>
    {
        const editor = CreateEditor('A'.repeat(34));
        act(() => editor.editorRef.current.lockFinalLine(true));
        await editor.user.click(editor.textarea);
        Select(editor, 34);
        await editor.user.paste('AAA\n\n');
        expect(editor.textarea).toHaveValue('A'.repeat(34));
        ExpectSelection(editor, 34);
        expect(editor.editorRef.current.state.undoStack).toEqual([]);
    });

    test('truncates accepted locked-line input and stores clamped endpoints for redo', async () =>
    {
        const editor = CreateEditor('A'.repeat(32));
        act(() => editor.editorRef.current.lockFinalLine(true));
        await editor.user.click(editor.textarea);
        Select(editor, 32);
        await editor.user.paste('AAAAAA');
        expect(editor.textarea).toHaveValue('A'.repeat(34));
        ExpectSelection(editor, 34);
        act(() => editor.editorRef.current.undoLastChange());
        ExpectSelection(editor, 32);
        act(() => editor.editorRef.current.redoLastChange());
        ExpectSelection(editor, 34);
    });

    test('maps changes on both sides of a backward native selection', () =>
    {
        const editor = CreateEditor('Z');
        Select(editor, 0);
        fireEvent.input(editor.textarea, {target: {value: '  [RED] aaZ [BLUE]', selectionStart: 8, selectionEnd: 10, selectionDirection: 'backward'},
            inputType: 'insertFromPaste'});
        expect(editor.textarea).toHaveValue('🔴 aaZ 🔵');
        ExpectSelection(editor, 3, 5, 'backward');
        act(() => editor.editorRef.current.undoLastChange());
        ExpectSelection(editor, 0);
        act(() => editor.editorRef.current.redoLastChange());
        ExpectSelection(editor, 3, 5, 'backward');
    });

    test('captures beforeinput selection even without a preceding selection notification', () =>
    {
        const editor = CreateEditor('ABC');
        editor.textarea.setSelectionRange(1, 3, 'backward');
        fireEvent(editor.textarea, new InputEvent('beforeinput', {bubbles: true, inputType: 'insertText', data: '['}));
        fireEvent.input(editor.textarea, {target: {value: 'A[', selectionStart: 2, selectionEnd: 2}, inputType: 'insertText'});
        expect(editor.textarea).toHaveValue('A[]');
        ExpectSelection(editor, 2);
        act(() => editor.editorRef.current.undoLastChange());
        ExpectSelection(editor, 1, 3, 'backward');
    });

    test('restores selection after a real toolbar click and prettify undo', async () =>
    {
        const editor = CreateEditor('ABC');
        await editor.user.click(editor.textarea);
        Select(editor, 1, 3, 'backward');
        const bracketButton = Array.from(editor.textarea.closest('.editor-grid').querySelectorAll('.quick-button'))
            .find((button) => button.textContent === '[PAUSE]');
        expect(bracketButton).toBeDefined();
        await editor.user.click(bracketButton);
        expect(editor.textarea).toHaveValue('A[PAUSE][]BC');
        ExpectSelection(editor, 9);
        Select(editor, 1, 4, 'backward');
        act(() => editor.editorRef.current.setPrettifiedText('  [RED] nice  '));
        expect(editor.textarea).toHaveValue('🔴 nice');
        ExpectSelection(editor, 7);
        act(() => editor.editorRef.current.undoLastChange());
        expect(editor.textarea).toHaveValue('A[PAUSE][]BC');
        ExpectSelection(editor, 1, 4, 'backward');
    });

    test('does not commit a duplicate composition input whose value is already formatted', () =>
    {
        const editor = CreateEditor('Z');
        Select(editor, 0);
        fireEvent.compositionStart(editor.textarea);
        fireEvent.input(editor.textarea, {target: {value: '[RED] aZ', selectionStart: 7, selectionEnd: 7}, isComposing: true});
        fireEvent.compositionEnd(editor.textarea);
        const commit = vi.spyOn(editor.editorRef.current, 'setTextState');
        fireEvent.input(editor.textarea, {target: {value: '🔴 aZ', selectionStart: 4, selectionEnd: 4}});
        expect(commit).not.toHaveBeenCalled();
        ExpectSelection(editor, 4);
        expect(editor.editorRef.current.state.undoStack).toHaveLength(1);
    });

    test('keeps IME text raw until composition ends and ignores duplicate trailing input', () =>
    {
        const editor = CreateEditor('Z');
        Select(editor, 0);
        const restore = vi.spyOn(editor.textarea, 'setSelectionRange');
        fireEvent.compositionStart(editor.textarea);
        fireEvent.input(editor.textarea, {target: {value: '[RED] aZ', selectionStart: 7, selectionEnd: 7},
            inputType: 'insertCompositionText', isComposing: true});
        expect(editor.textarea).toHaveValue('[RED] aZ');
        ExpectSelection(editor, 7);
        expect(restore).not.toHaveBeenCalled();
        expect(editor.editorRef.current.state.undoStack).toEqual([]);
        fireEvent.compositionEnd(editor.textarea);
        expect(editor.textarea).toHaveValue('🔴 aZ');
        ExpectSelection(editor, 4);
        fireEvent.input(editor.textarea, {target: {value: '[RED] aZ', selectionStart: 7, selectionEnd: 7}, inputType: 'insertText'});
        expect(editor.textarea).toHaveValue('🔴 aZ');
        ExpectSelection(editor, 4);
        expect(editor.editorRef.current.state.undoStack).toHaveLength(1);
        act(() => editor.editorRef.current.undoLastChange());
        ExpectSelection(editor, 0);
        act(() => editor.editorRef.current.redoLastChange());
        ExpectSelection(editor, 4);
    });
});

describe('Editor mirror synchronization', () =>
{
    let pendingFrames;
    let nextFrame;

    beforeEach(() =>
    {
        pendingFrames = new Map();
        nextFrame = 0;
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) =>
        {
            pendingFrames.set(++nextFrame, callback);
            return nextFrame;
        });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((frame) => pendingFrames.delete(frame));
    });

    afterEach(() =>
    {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    /**
     * Runs only the currently pending frames so recurring scheduling remains visible to tests.
     */
    function FlushMirrorFrames()
    {
        const callbacks = Array.from(pendingFrames.values());
        pendingFrames.clear();
        act(() => callbacks.forEach((callback) => callback()));
    }

    test.each([false, true])('does no recurring mirror work while idle (test: %s)', (testMode) =>
    {
        vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval']});
        try
        {
            const editorRef = React.createRef();
            const {unmount} = render(<Editor ref={editorRef} text="Hello" isTranslation={false} showTranslationBox={() => {}} test={testMode} />);
            const synchronize = vi.spyOn(editorRef.current, 'updateMirrorRefPosition');
            FlushMirrorFrames();
            synchronize.mockClear();
            window.requestAnimationFrame.mockClear();

            act(() => vi.advanceTimersByTime(1000));

            expect(synchronize).not.toHaveBeenCalled();
            expect(window.requestAnimationFrame).not.toHaveBeenCalled();
            expect(pendingFrames.size).toBe(0);
            expect(vi.getTimerCount()).toBe(0);
            unmount();
        }
        finally
        {
            vi.useRealTimers();
        }
    });

    test('coalesces textarea scroll, page scroll, and window resize using the latest geometry', () =>
    {
        const editorRef = React.createRef();
        const {getByTestId, container} = render(
            <div id="editor-page">
                <Editor ref={editorRef} text="Hello" isTranslation={false} showTranslationBox={() => {}} test={true} />
            </div>
        );
        const textarea = getByTestId('main-textarea');
        const mirror = container.querySelector('.mirror-textarea');
        const editorPage = container.querySelector('#editor-page');
        Object.defineProperties(textarea, {
            offsetHeight: {value: 162},
            offsetWidth: {value: 420},
            offsetTop: {value: 100},
            offsetLeft: {value: 80},
        });
        FlushMirrorFrames();
        const synchronize = vi.spyOn(editorRef.current, 'updateMirrorRefPosition');
        window.requestAnimationFrame.mockClear();

        fireEvent.scroll(textarea);
        editorPage.scrollTop = 24;
        editorPage.scrollLeft = 12;
        fireEvent.scroll(editorPage);
        fireEvent.resize(window);
        textarea.scrollTop = 192;
        textarea.scrollLeft = 36;
        fireEvent.scroll(textarea);

        expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
        expect(synchronize).not.toHaveBeenCalled();
        FlushMirrorFrames();
        expect(synchronize).toHaveBeenCalledTimes(1);
        expect(mirror.style.height).toBe('162px');
        expect(mirror.style.width).toBe('420px');
        expect(mirror.style.top).toBe('76px');
        expect(mirror.style.left).toBe('68px');
        expect(mirror.scrollTop).toBe(192);
        expect(mirror.scrollLeft).toBe(36);
        expect(pendingFrames.size).toBe(0);
    });

    test('does not rewrite unchanged mirror geometry or scroll offsets', () =>
    {
        const editorRef = React.createRef();
        const {container} = render(<Editor ref={editorRef} text="Hello" isTranslation={false} showTranslationBox={() => {}} test={true} />);
        FlushMirrorFrames();
        const mirror = container.querySelector('.mirror-textarea');
        const styleWrites = ['height', 'width', 'top', 'left'].map((property) => vi.spyOn(mirror.style, property, 'set'));
        const scrollWrite = vi.fn();
        Object.defineProperties(mirror, {
            scrollTop: {get: () => 0, set: scrollWrite, configurable: true},
            scrollLeft: {get: () => 0, set: scrollWrite, configurable: true},
        });

        act(() => editorRef.current.synchronizeMirror());
        FlushMirrorFrames();

        styleWrites.forEach((write) => expect(write).not.toHaveBeenCalled());
        expect(scrollWrite).not.toHaveBeenCalled();
    });

    test('observes both editors and shared layout, then releases original targets on unmount', () =>
    {
        const observers = [];
        vi.stubGlobal('ResizeObserver', vi.fn(function(callback)
        {
            this.callback = callback;
            this.observe = vi.fn();
            this.disconnect = vi.fn();
            observers.push(this);
        }));
        const {getByTestId, container, unmount} = render(
            <div id="editor-page">
                <Editor text="Hello" isTranslation={false} showTranslationBox={() => {}} test={true} />
                <Editor text="Translation" isTranslation={true} showTranslationBox={() => {}} test={true} />
            </div>
        );
        const editorPage = container.querySelector('#editor-page');
        const textareas = [getByTestId('main-textarea'), getByTestId('translated-textarea')];
        const mirrors = container.querySelectorAll('.mirror-textarea');
        observers.forEach((observer, index) =>
        {
            expect(observer.observe).toHaveBeenCalledWith(textareas[index]);
            expect(observer.observe).toHaveBeenCalledWith(textareas[index].closest('.editor-grid'));
            expect(observer.observe).toHaveBeenCalledWith(editorPage);
        });
        FlushMirrorFrames();
        window.requestAnimationFrame.mockClear();

        textareas.forEach((textarea, index) => Object.defineProperty(textarea, 'offsetLeft', {value: 40 + index * 500}));
        act(() => observers.forEach((observer) =>
        {
            observer.callback();
            observer.callback();
        }));
        expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2);
        FlushMirrorFrames();
        expect(mirrors[0].style.left).toBe('40px');
        expect(mirrors[1].style.left).toBe('540px');

        //Keep the original target even if its ID changes before cleanup
        const removePageListener = vi.spyOn(editorPage, 'removeEventListener');
        const removeWindowListener = vi.spyOn(window, 'removeEventListener');
        editorPage.id = 'removed-editor-page';
        act(() => observers.forEach((observer) => observer.callback()));
        const staleCallbacks = Array.from(pendingFrames.values());
        const pendingIds = Array.from(pendingFrames.keys());
        unmount();

        expect(removePageListener).toHaveBeenCalledTimes(2);
        observers.forEach((observer) => expect(observer.disconnect).toHaveBeenCalledTimes(1));
        pendingIds.forEach((frame) => expect(window.cancelAnimationFrame).toHaveBeenCalledWith(frame));
        expect(removeWindowListener).toHaveBeenCalledWith('resize', expect.any(Function));
        window.requestAnimationFrame.mockClear();
        expect(() => staleCallbacks.forEach((callback) => callback())).not.toThrow();
        expect(() => observers.forEach((observer) => observer.callback())).not.toThrow();
        fireEvent.scroll(editorPage);
        fireEvent.resize(window);
        expect(window.requestAnimationFrame).not.toHaveBeenCalled();
        expect(pendingFrames.size).toBe(0);
    });

    test('restores mirror scroll after pasting a colour macro over selected text', async () =>
    {
        const {getByTestId, container} = render(<Editor text="Hello" isTranslation={false} showTranslationBox={() => {}} test={true} />);
        const textarea = getByTestId('main-textarea');
        const mirror = container.querySelector('.mirror-textarea');
        await userEvent.click(textarea);
        textarea.setSelectionRange(0, textarea.value.length);
        textarea.scrollTop = 192;
        textarea.scrollLeft = 36;

        const innerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        const resetMirrorScroll = vi.fn(function(value)
        {
            innerHTML.set.call(this, value);
            this.scrollTop = 0;
            this.scrollLeft = 0;
        });
        Object.defineProperty(mirror, 'innerHTML', {
            get() { return innerHTML.get.call(this); },
            set: resetMirrorScroll,
        });

        await userEvent.paste('[RED_FR] is best!');

        const formattedText = '\uD83D\uDD34 is best!';
        expect(resetMirrorScroll).toHaveBeenCalled();
        expect(textarea).toHaveValue(formattedText);
        expect(textarea.selectionStart).toBe(formattedText.length);
        expect(textarea.selectionEnd).toBe(formattedText.length);
        expect(textarea.scrollTop).toBe(192);
        expect(textarea.scrollLeft).toBe(36);
        expect(mirror.scrollTop).toBe(textarea.scrollTop);
        expect(mirror.scrollLeft).toBe(textarea.scrollLeft);
    });

    test('restores mirror scroll and border-box geometry after a formatted text commit', () =>
    {
        const editorRef = React.createRef();
        const {getByTestId, container} = render(<Editor ref={editorRef} text="Hello" isTranslation={false} showTranslationBox={() => {}} test={true} />);
        const textarea = getByTestId('main-textarea');
        const mirror = container.querySelector('.mirror-textarea');
        Object.defineProperties(textarea, {
            clientHeight: {value: 160},
            offsetHeight: {value: 162},
            offsetWidth: {value: 420},
            offsetTop: {value: 40},
            offsetLeft: {value: 24},
            scrollHeight: {value: 800},
        });
        textarea.scrollTop = 192;
        textarea.scrollLeft = 36;
        fireEvent.scroll(textarea);
        FlushMirrorFrames();
        expect(mirror.scrollTop).toBe(192);
        expect(mirror.scrollLeft).toBe(36);

        const innerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        Object.defineProperty(mirror, 'innerHTML', {
            get() { return innerHTML.get.call(this); },
            set(value)
            {
                innerHTML.set.call(this, value);
                this.scrollTop = 0;
                this.scrollLeft = 0;
            },
        });
        const formattedText = 'Hello\nworld\nagain';
        act(() => editorRef.current.setTextState(formattedText, formattedText.length, formattedText.length, false));

        expect(textarea).toHaveValue(formattedText);
        expect(textarea.selectionStart).toBe(formattedText.length);
        expect(mirror.scrollTop).toBe(textarea.scrollTop);
        expect(mirror.scrollLeft).toBe(textarea.scrollLeft);
        expect(mirror.style.height).toBe('162px');
        expect(mirror.style.width).toBe('420px');
        expect(mirror.style.top).toBe('40px');
        expect(mirror.style.left).toBe('24px');
    });

    test.each([false, true])('synchronizes after programmatic caret scrolling (translation: %s)', (isTranslation) =>
    {
        const editorRef = React.createRef();
        const {getByTestId, container} = render(<Editor ref={editorRef} text="" isTranslation={isTranslation} showTranslationBox={() => {}} test={true} />);
        const textarea = getByTestId(isTranslation ? 'translated-textarea' : 'main-textarea');
        const mirror = container.querySelector('.mirror-textarea');
        Object.defineProperties(textarea, {
            clientHeight: {value: 160},
            offsetHeight: {value: 162},
            offsetWidth: {value: 420},
            scrollHeight: {value: 800},
        });
        textarea.style.lineHeight = '32px';
        const text = Array(20).fill('Hello').join('\n');

        act(() => editorRef.current.setTextState(text, text.length, text.length, true));

        expect(textarea.selectionStart).toBe(text.length);
        expect(textarea.scrollTop).toBe(576);
        expect(mirror.scrollTop).toBe(576);
    });

    test.each([false, true])('recovers delayed scrolling and cancels the frame on unmount (translation: %s)', (isTranslation) =>
    {
        const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
        const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
        try
        {
            const editorRef = React.createRef();
            const {getByTestId, container, unmount} = render(<Editor ref={editorRef} text="Hello" isTranslation={isTranslation} showTranslationBox={() => {}} test={true} />);
            const textarea = getByTestId(isTranslation ? 'translated-textarea' : 'main-textarea');
            const mirror = container.querySelector('.mirror-textarea');
            Object.defineProperties(textarea, {
                clientHeight: {value: 160},
                offsetHeight: {value: 162},
                offsetWidth: {value: 420},
                scrollHeight: {value: 800},
            });
            act(() => editorRef.current.setTextState('Hello\nworld', 11, 11, false));
            const synchronizeFrame = requestFrame.mock.calls.at(-1)[0];
            textarea.scrollTop = 224;
            textarea.scrollLeft = 48;
            expect(mirror.scrollTop).toBe(0);

            act(() => synchronizeFrame());
            expect(mirror.scrollTop).toBe(224);
            expect(mirror.scrollLeft).toBe(48);

            fireEvent.keyUp(textarea);
            const pendingFrame = requestFrame.mock.calls.at(-1)[0];
            cancelFrame.mockClear();
            unmount();
            expect(cancelFrame).toHaveBeenCalledWith(42);
            expect(() => pendingFrame()).not.toThrow();
        }
        finally
        {
            requestFrame.mockRestore();
            cancelFrame.mockRestore();
        }
    });
});

describe('Editor latest derivations', () =>
{
    afterEach(() => vi.restoreAllMocks());

    test('reuses highlighting and measurement across selection updates and invalidates only their inputs', () =>
    {
        const parse = vi.spyOn(TextUtils, 'ParseColouredTextToHtml');
        const replace = vi.spyOn(TextUtils, 'ReplaceWithMacros');
        const editorRef = React.createRef();
        const props = {text: '🟢Hello\nworld', isTranslation: false, showTranslationBox: () => {}, test: true};
        const {getByTestId, container, rerender} = render(<Editor ref={editorRef} {...props} darkMode={false} />);
        const editor = editorRef.current;
        const html = editor.getMirrorHtml();
        const nodes = editor.createDivText();
        const measurementNode = container.querySelector('.hidden-div').firstChild;
        const textarea = getByTestId('main-textarea');
        parse.mockClear();
        replace.mockClear();

        textarea.setSelectionRange(2, 5);
        fireEvent.keyUp(textarea);
        fireEvent.click(textarea);
        expect(editor.getMirrorHtml()).toBe(html);
        expect(editor.createDivText()).toBe(nodes);
        expect(container.querySelector('.hidden-div').firstChild).toBe(measurementNode);
        expect(parse).not.toHaveBeenCalled();
        expect(replace).not.toHaveBeenCalled();

        rerender(<Editor ref={editorRef} {...props} darkMode={true} />);
        const darkHtml = editor.getMirrorHtml();
        expect(darkHtml).not.toBe(html);
        expect(darkHtml.__html).toContain('color: forestgreen');
        expect(editor.createDivText()).toBe(nodes);
        expect(parse).toHaveBeenCalledTimes(1);
        expect(replace).not.toHaveBeenCalled();

        act(() => editor.setTextState('🔴Changed', 3, 3, false));
        expect(editor.getMirrorHtml()).not.toBe(darkHtml);
        expect(editor.getMirrorHtml().__html).toContain('color: indianred');
        expect(editor.createDivText()).not.toBe(nodes);
        expect(parse).toHaveBeenCalledTimes(2);
        act(() => editor.setTextState(props.text, 0, 0, false));
        expect(editor.getMirrorHtml()).not.toBe(darkHtml);
        expect(editor.createDivText()).not.toBe(nodes);
        expect(parse).toHaveBeenCalledTimes(3);
    });

    test.each(['start', 'middle', 'end'])('keeps a repeated broken-source document formatted and its cursor consistent at the %s', async (position) =>
    {
        const source = [
            "describe('Editor mirror",
            "synchronization', () => {",
            "test('restores mirror scroll after",
            'pasting a colour macro over',
            "selected text', async () => {",
            'const {getByTestId, container} =',
            'render(<Editor text="Hello"',
            'isTranslation={false}',
            'showTranslationBox={() => {}}',
            'test={true} />); const textarea =',
            "getByTestId('main-textarea');",
            '});',
            '});',
        ].join('\n');
        const documentText = Array(8).fill(source).join('\n\n');
        const editorRef = React.createRef();
        const {getByTestId, container} = render(<Editor ref={editorRef} text="" isTranslation={false} showTranslationBox={() => {}} test={true} />);
        const textarea = getByTestId('main-textarea');
        await userEvent.click(textarea);
        await userEvent.paste(documentText);
        const baseline = textarea.value;
        expect(baseline).toContain('describe');
        expect(baseline.split('\n\n')).toHaveLength(8);
        expect(textarea.selectionStart).toBe(baseline.length);
        const cursor = position === 'start' ? 0 : position === 'end' ? baseline.length : baseline.indexOf('describe', baseline.length / 2);
        expect(cursor).toBeGreaterThanOrEqual(0);
        textarea.setSelectionRange(cursor, cursor);
        fireEvent.keyUp(textarea);

        await userEvent.keyboard('Q');
        const typed = baseline.substring(0, cursor) + 'Q' + baseline.substring(cursor);
        const typedExpected = TextUtils.FormatStringForDisplay(TextUtils.FormatStringForDisplay(typed, false, TextUtils.DetermineTextChangeType(baseline, typed)), false);
        expect(textarea).toHaveValue(typedExpected);
        expect(textarea.value[textarea.selectionStart - 1]).toBe('Q');
        expect(textarea.selectionEnd).toBe(textarea.selectionStart);

        await userEvent.keyboard('{Backspace}');
        expect(textarea).toHaveValue(baseline);
        expect(textarea.selectionStart).toBe(cursor);
        expect(textarea.selectionEnd).toBe(cursor);

        await userEvent.paste('Paste');
        const pasted = baseline.substring(0, cursor) + 'Paste' + baseline.substring(cursor);
        const pastedExpected = TextUtils.FormatStringForDisplay(TextUtils.FormatStringForDisplay(pasted, false, TextUtils.DetermineTextChangeType(baseline, pasted)), false);
        expect(textarea).toHaveValue(pastedExpected);
        expect(textarea.value.substring(textarea.selectionStart - 5, textarea.selectionStart)).toBe('Paste');
        expect(textarea.selectionEnd).toBe(textarea.selectionStart);
        expect(container.querySelector('.converted-text')).toHaveValue(CreateIngameText(pastedExpected));
        expect(editorRef.current.getMirrorHtml().__html).toBe(TextUtils.ParseColouredTextToHtml(pastedExpected, undefined));
        expect(container.querySelector('.mirror-textarea').querySelectorAll('span').length).toBeLessThan(pastedExpected.length / 4);
    });

    test('shares the latest conversion between render and copy without retaining historical inputs', async () =>
    {
        const convertedRef = React.createRef();
        const writeText = vi.fn().mockResolvedValue(undefined);
        const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText}});
        try
        {
            const replace = vi.spyOn(TextUtils, 'ReplaceWithMacros');
            const {container, rerender} = render(<ConvertedText ref={convertedRef} text="🟢Pokemon\nHello" darkMode={false} />);
            const converted = convertedRef.current;
            const cache = converted.conversionCache;
            replace.mockClear();
            rerender(<ConvertedText ref={convertedRef} text="🟢Pokemon\nHello" darkMode={true} />);
            fireEvent.click(container.querySelector('textarea'));
            expect(converted.conversionCache).toBe(cache);
            expect(replace).not.toHaveBeenCalled();
            expect(writeText).toHaveBeenLastCalledWith(cache.convertedText);

            const text = '🔴Latest & <text>\n\n😀';
            rerender(<ConvertedText ref={convertedRef} text={text} darkMode={true} />);
            const latestCache = converted.conversionCache;
            expect(latestCache).not.toBe(cache);
            expect(replace).toHaveBeenCalledTimes(2);
            replace.mockClear();
            fireEvent.click(container.querySelector('textarea'));
            expect(replace).not.toHaveBeenCalled();
            expect(writeText).toHaveBeenLastCalledWith(CreateIngameText(text));
            expect(container.querySelector('textarea')).toHaveValue(CreateIngameText(text));
            rerender(<ConvertedText ref={convertedRef} text="🟢Pokemon\nHello" darkMode={true} />);
            expect(converted.conversionCache).not.toBe(cache);
            rerender(<ConvertedText ref={convertedRef} text="" darkMode={true} />);
            fireEvent.click(container.querySelector('textarea'));
            expect(writeText).toHaveBeenCalledTimes(2);
            await act(async () => {});
        }
        finally
        {
            if (originalClipboard)
                Object.defineProperty(navigator, 'clipboard', originalClipboard);
            else
                delete navigator.clipboard;
        }
    });

    test.each([false, true])('finishes cursor and mirror synchronization after the final width commit (width changes: %s)', (widthChanges) =>
    {
        const editorRef = React.createRef();
        const {getByTestId} = render(<Editor ref={editorRef} text="Hello" isTranslation={false} showTranslationBox={() => {}} test={true} />);
        const editor = editorRef.current;
        const textarea = getByTestId('main-textarea');
        const width = editor.state.textareaWidth + (widthChanges ? 240 : 0);
        Object.defineProperty(editor.hiddenDivRef.current, 'offsetWidth', {value: width});
        const commits = vi.spyOn(editor, 'setState');
        const finished = [];
        const synchronize = editor.synchronizeMirror.bind(editor);
        vi.spyOn(editor, 'synchronizeMirror').mockImplementation(() =>
        {
            finished.push({width: editor.state.textareaWidth, cursor: textarea.selectionStart});
            synchronize();
        });

        act(() => editor.setTextState('Changed text', 3, 3, false));

        const widthCommits = commits.mock.calls.filter(([state]) => state.textareaWidth !== undefined);
        expect(widthCommits).toHaveLength(widthChanges ? 1 : 0);
        expect(finished.at(-1)).toEqual({width, cursor: 3});
        expect(textarea.selectionEnd).toBe(3);
    });
});
