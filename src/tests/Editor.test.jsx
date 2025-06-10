import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import {userEvent} from '@testing-library/user-event';


import Editor from '../Editor';


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
            insert: "Hello{{.}} It's me, the bestest editor ever!",
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
            insert: "{{}GREEN", //The } is added automatically
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
            name: "Adding { to .} completes the ellipsis",
            default: "Hello|.} one",
            insert: "{{}",
            expected: "Hello…| one",
        },
        {
            name: "Adding . to {} completes the ellipsis",
            default: "Hello{|} one",
            insert: ".",
            expected: "Hello…| one",
        },
        {
            name: "Adding } to {. completes the ellipsis",
            default: "Hello{.| one",
            insert: "}",
            expected: "Hello…| one",
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
            default: "Hello, one two {GRE|\n\n|EN} text.",
            insert: -1,
            expected: "Hello, one two 🟢| text.",
        },
        {
            name: "Replace multiple characters to finish a macro",
            default: "Hello, one two {GR|\n\nE|N} text.",
            insert: "EE",
            expected: "Hello, one two 🟢| text.",
        },
        {
            name: "Replace full macro with just {",
            default: "Hello, |{PLAYER}|",
            insert: "{{}",
            expected: "Hello, {}|", //Technically, this is a bug, but it's not a big deal
        },
        {
            name: "Replace text with the first character of the text",
            default: "|ABC|",
            insert: "A",
            expected: "A|",
        },
        {
            name: "Replace one character with another to finish a macro",
            default: "Hello {R|B|D} man",
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
            paste: "{RED_FR} is best!",
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
    ];

    for (let data of testData)
    {
        test(data.name, async () =>
        {
            //Create the editor
            const {getByTestId} = render(<Editor text="" isTranslation={false} showTranslationBox={() => {}}  test={true} />);
            const textarea = getByTestId('main-textarea');
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
        });
    }
});