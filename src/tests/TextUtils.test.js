import '@testing-library/jest-dom';

import {
    DoesLineEndParagraph, DoesLineHaveScrollAfterIt, DoesLineHaveScrollAfterItByLines,
    FindIndexOfLineEnd, FindIndexOfLineStart, GetCharacterWidth, GetDisplayColour, GetLineTotalWidth,
    GetMacroWidth, GetNextLetterIndex, GetStringWidth, IsColour, IsPause, IsPunctuation,
    LineHasCharAfterIndex, LineHasCharAfterIndexBeforeOtherChar, ReplaceMacros, ReplaceWithMacros,
    TextChange, DetermineTextChangeType, ParseColouredTextToHtml,
    SEMI_LINE_WIDTH, FULL_LINE_WIDTH,
} from '../TextUtils';

//Tests for ReplaceMacros
describe('ReplaceMacros', () =>
{
    test('replaces keys with values', () =>
    {
        const obj = { HELLO: 'hi', WORLD: 'earth' };
        expect(ReplaceMacros('A [HELLO] [WORLD]!', obj)).toBe('A hi earth!');
    });
});

//Tests for ReplaceWithMacros
describe('ReplaceWithMacros', () =>
{
    test('replaces values with keys', () =>
    {
        const obj = { HELLO: 'hi', WORLD: 'earth' };
        expect(ReplaceWithMacros('A hi earth!', obj)).toBe('A [HELLO] [WORLD]!');
    });
});

//Tests for IsColour
describe('IsColour', () =>
{
    test('identifies colour symbols', () =>
    {
        expect(IsColour('🟢')).toBe(true);
    });

    test('identifies non-colour symbols', () =>
    {
        expect(IsColour('X')).toBe(false);
    });

    test('handles empty string', () =>
    {
        expect(IsColour('')).toBe(false);
    });
});

describe('GetDisplayColour', () =>
{
    test('returns correct colour in light mode', () => 
    {
        expect(GetDisplayColour('green', false)).toBe('green');
        expect(GetDisplayColour('blue', false)).toBe('blue');
    });

    test('returns correct colour in dark mode', () =>
    {
        expect(GetDisplayColour('green', true)).toBe('forestgreen');
        expect(GetDisplayColour('blue', true)).toBe('mediumblue');
    });

    test('handles unknown colours gracefully', () =>
    {
        expect(GetDisplayColour('UNKNOWN', true)).toBe('UNKNOWN');
    });

    test('handles case insensitivity', () =>
    {
        expect(GetDisplayColour('GREEN', true)).toBe('forestgreen');
    });
});


//Tests for IsPunctuation
describe('IsPunctuation', () =>
{
    test('identifies punctuation characters', () =>
    {
        expect(IsPunctuation('.')).toBe(true);
        expect(IsPunctuation('!')).toBe(true);
        expect(IsPunctuation('?')).toBe(true);
    });

    test('identifies non-punctuation characters', () =>
    {
        expect(IsPunctuation('A')).toBe(false);
        expect(IsPunctuation('1')).toBe(false);
        expect(IsPunctuation(' ')).toBe(false);
    });

    test('handles empty string', () =>
    {
        expect(IsPunctuation('')).toBe(false);
    });
});

//Tests for IsPause
describe('IsPause', () =>
{
    test('detects [PAUSE] in text', () =>
    {
        const text = Array.from('abc[PAUSE]def');
        expect(IsPause(text, 3)).toBe(true);
        expect(IsPause(text, 4)).toBe(false);
    });

    test('detects [PAUSE] at end of text', () =>
    {
        const text = Array.from('abc[PAUSE]');
        expect(IsPause(text, 3)).toBe(true);
        expect(IsPause(text, 4)).toBe(false);
    });

    test('detects [PAUSE] at start of text', () =>
    {
        const text = Array.from('[PAUSE]abc');
        expect(IsPause(text, 0)).toBe(true);
        expect(IsPause(text, 1)).toBe(false);
    });

    test('detects [PAUSE] in empty text', () =>
    {
        const text = Array.from('[PAUSE]');
        expect(IsPause(text, 0)).toBe(true);
        expect(IsPause(text, 1)).toBe(false);
    });

    test('handles empty string', () =>
    {
        const text = Array.from('');
        expect(IsPause(text, 0)).toBe(false);
    });
});

//Tests for GetNextLetterIndex
describe('GetNextLetterIndex', () =>
{
    test('skips colours', () =>
    {
        const text = Array.from('🟢A');
        expect(GetNextLetterIndex(text, 0)).toBe(1);
    });

    test('skips pauses', () =>
    {
        const pauseText = Array.from('[PAUSE]X');
        expect(GetNextLetterIndex(pauseText, 0)).toBe(7);
    });

    test('returns markers for rival, player, buffer', () =>
    {
       expect(GetNextLetterIndex(Array.from('[RIVAL]'), 0)).toBe(1);
       expect(GetNextLetterIndex(Array.from('[PLAYER]'), 0)).toBe(1);
       expect(GetNextLetterIndex(Array.from('[BUFFER]'), 0)).toBe(1);
    });
});

//Tests for GetCharacterWidth
describe('GetCharacterWidth', () =>
{
    test('handles colour as preceding char', () =>
    {
        expect(GetCharacterWidth('🟢', 'A')).toBe(0);
    });

    test('uses actualCharSizes for newline', () =>
    {
        expect(GetCharacterWidth('!', '\n')).toBe(4);
    });

    test('uses charSizes and defaults', () =>
    {
        expect(GetCharacterWidth('A', 'B')).toBe(6);
        expect(GetCharacterWidth('@', 'B')).toBe(6);
        expect(GetCharacterWidth('!', 'B')).toBe(6);
    });
});

//Tests for GetMacroWidth
describe('GetMacroWidth', () =>
{
    test('returns macro size for known macro', () =>
    {
        expect(GetMacroWidth('PLAYER')).toBe(42);
    });

    test('returns 0 for unknown macro', () =>
    {
        expect(GetMacroWidth('UNKNOWN')).toBe(0);
    });
});

//Tests for GetStringWidth
describe('GetStringWidth', () =>
{
    test('sums character widths', () =>
    {
        expect(GetStringWidth('ABC')).toBe(18);
    });

    test('handles macros', () =>
    {
        expect(GetStringWidth('[PLAYER]')).toBe(42);
    });

    test('stops at newline', () =>
    {
        expect(GetStringWidth('AB\nCD')).toBe(12);
    });
});

//Tests for GetLineTotalWidth
describe('GetLineTotalWidth', () =>
{
    test('only one line', () =>
    {
        //Always full line width if only one line in textbox
        const lines = ['1'];
        expect(GetLineTotalWidth(lines, 0, false)).toBe(FULL_LINE_WIDTH);
        expect(GetLineTotalWidth(lines, 0, true)).toBe(FULL_LINE_WIDTH);
    });

    test('two lines', () =>
    {
        const lines = ['1', '2'];
        expect(GetLineTotalWidth(lines, 0, false)).toBe(FULL_LINE_WIDTH); //First in a new textbox so always full line width
        expect(GetLineTotalWidth(lines, 1, false)).toBe(SEMI_LINE_WIDTH); //SEMI_LINE_WIDTH unless last line is locked
        expect(GetLineTotalWidth(lines, 1, true)).toBe(FULL_LINE_WIDTH);  //Last line is locked so full line width
    });

    test('two lines with two blank lines at the end', () =>
    {
        const lines = ['1', '2', '', ''];
        expect(GetLineTotalWidth(lines, 0, false)).toBe(FULL_LINE_WIDTH); //First in a new textbox so always full line width
        expect(GetLineTotalWidth(lines, 1, false)).toBe(SEMI_LINE_WIDTH); //SEMI_LINE_WIDTH
    });

    test('two lines seperated by a new textbox', () =>
    {
        const lines = ['1', '', '2'];
        expect(GetLineTotalWidth(lines, 0, false)).toBe(SEMI_LINE_WIDTH);
        expect(GetLineTotalWidth(lines, 1, false)).toBe(SEMI_LINE_WIDTH); //Would be semi line width if the user starts typing here
        expect(GetLineTotalWidth(lines, 2, false)).toBe(FULL_LINE_WIDTH); //First in a new textbox so always full line width
    });

    test('two sets of lines seperated by a new textbox', () =>
    {
        const lines = ['1', '', '2', '3', '4'];
        expect(GetLineTotalWidth(lines, 0, false)).toBe(SEMI_LINE_WIDTH);
        expect(GetLineTotalWidth(lines, 1, false)).toBe(SEMI_LINE_WIDTH); //Would be semi line width if the user starts typing here
        expect(GetLineTotalWidth(lines, 2, false)).toBe(FULL_LINE_WIDTH); //First in a new textbox so always full line width
        expect(GetLineTotalWidth(lines, 3, false)).toBe(SEMI_LINE_WIDTH); //Has a scroll after it so semi line width
        expect(GetLineTotalWidth(lines, 4, false)).toBe(SEMI_LINE_WIDTH); //SEMI_LINE_WIDTH unless last line is locked
        expect(GetLineTotalWidth(lines, 4, true)).toBe(FULL_LINE_WIDTH);  //Last line is locked so full line width
    });

    test('three lines all seperated by a new textbox', () =>
    {
        const lines = ['1', '', '2', '', '3'];

        expect(GetLineTotalWidth(lines, 0, false)).toBe(SEMI_LINE_WIDTH);
        expect(GetLineTotalWidth(lines, 1, false)).toBe(SEMI_LINE_WIDTH); //Would be semi line width if the user starts typing here
        expect(GetLineTotalWidth(lines, 2, false)).toBe(SEMI_LINE_WIDTH);
        expect(GetLineTotalWidth(lines, 3, false)).toBe(SEMI_LINE_WIDTH); //Would be semi line width if the user starts typing here
        expect(GetLineTotalWidth(lines, 4, false)).toBe(FULL_LINE_WIDTH); //Always full line width if only one line in textbox
        expect(GetLineTotalWidth(lines, 4, true)).toBe(FULL_LINE_WIDTH);
    });

    test('blank line at end', () =>
    {
        const lines = ['1', ''];
        expect(GetLineTotalWidth(lines, 0, false)).toBe(FULL_LINE_WIDTH); //Still full because the user can start typing on the next line
        expect(GetLineTotalWidth(lines, 1, false)).toBe(SEMI_LINE_WIDTH); //Would be semi line width if the user starts typing here
    });
});

//Tests for FindIndexOfLineStart
describe('FindIndexOfLineStart', () =>
{
    test('finds line start index of first line', () =>
    {
        const text = 'Hello\nWorld';
        for (let i = 0; i < 6; ++i)
            expect(FindIndexOfLineStart(text, i)).toBe(0);
    });

    test('finds line start index of second line', () =>
    {
        const text = 'Hello\nWorld';
        for (let i = 6; i < text.length; ++i)
            expect(FindIndexOfLineStart(text, i)).toBe(6);
    });
});

//Tests for FindIndexOfLineEnd
describe('FindIndexOfLineEnd', () =>
{
    test('finds line end index of first line', () =>
    {
        const text = 'Hello\nWorld';
        for (let i = 0; i < 6; ++i)
            expect(FindIndexOfLineEnd(text, i)).toBe(5);
    });

    test('finds line end index of second line', () =>
    {
        const text = 'Hello\nWorld';
        for (let i = 6; i < text.length; ++i)
            expect(FindIndexOfLineEnd(text, i)).toBe(11);
    });
});

//Tests for DoesLineEndParagraph
describe('DoesLineEndParagraph', () =>
{
    test('only one line', () =>
    {
        expect(DoesLineEndParagraph('A', 0)).toBe(false);
    });

    test('two lines seperated by a single blank line', () =>
    {
        expect(DoesLineEndParagraph('A\nB', 0)).toBe(false);
    });

    test('two lines seperated by two blank lines', () =>
    {
        expect(DoesLineEndParagraph('A\n\nB', 0)).toBe(true);
        expect(DoesLineEndParagraph('A\n\nB', 3)).toBe(false); //Second line not followed by a paragraph
    });

    test('two lines then two blank lines', () =>
    {
        expect(DoesLineEndParagraph('A\nB\n\nC', 0)).toBe(false);
        expect(DoesLineEndParagraph('A\nB\n\nC', 2)).toBe(true);
        expect(DoesLineEndParagraph('A\nB\n\nC', 5)).toBe(false); //Last line not followed by a paragraph
    });
});

//Tests for DoesLineHaveScrollAfterIt
describe('DoesLineHaveScrollAfterIt', () =>
{
    test('single line', () =>
    {
        const text = "A";
        const start = 0, end = text.length;
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(false);
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(false);
    });

    test('two lines', () =>
    {
        const text = "A\nB";

        //Line 1
        let start = 0, end = text.length;
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(false); //First line not followed by a scroll
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(false); //First line not followed by a scroll
    
        //Line 2
        start = text.indexOf("\n") + 1; end = text.length;
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(true); //Last line followed by a scroll
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(false); //Last line not followed by a scroll when locked
    });

    test('two lines seperated by a single blank line', () =>
    {
        const text = "A\n\nB";

        //Line 1
        let start = 0, end = text.indexOf("\n");
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(true); //First line followed by a scroll
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(true); //First line followed by a scroll

        //Line 2
        start = text.indexOf("B"); end = text.length;
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(false); //Last line not followed by a scroll
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(false); //Last line not followed by a scroll
    });

    test('multiple lines', () =>
    {
        const text = "A\nB\nC\n\nD";

        //Line 1
        let start = 0, end = text.indexOf("\n");
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(false); //First line not followed by a scroll
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(false); //First line not followed by a scroll

        //Line 2
        start = text.indexOf("B"); end = start + 1;
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(true); //Second line followed by a scroll
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(true); //Second line followed by a scroll
    
        //Line 3
        start = text.indexOf("C"); end = start + 1;
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(true); //Third line followed by a scroll
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(true); //Third line followed by a scroll
    
        //Line 4
        start = text.indexOf("D"); end = text.length;
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(false); //Last line not followed by a scroll
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(false); //Last line not followed by a scroll
    });

    test('three lines all seperated by a new textbox', () =>
    {
        const text = "A\n\nB\n\nC\nD";

        //Line 1
        let start = 0, end = text.indexOf("\n");
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(true); //First line followed by a scroll
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(true); //First line followed by a scroll

        //Line 2
        start = text.indexOf("B"); end = start + 1;
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(true); //Second line followed by a scroll
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(true); //Second line followed by a scroll
    
        //Line 3
        start = text.indexOf("C"); end = start + 1;
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(false); //Third line not followed by a scroll
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(false); //Third line not followed by a scroll
    
        //Line 4
        start = text.indexOf("D"); end = text.length;
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(true); //Treated like it is so the last line width calculation is correct
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(false); //Last line not followed by a scroll when locked
    });

    test('blank line at end', () =>
    {
        const text = "A\n";

        //Line 1
        let start = 0, end = text.indexOf("\n");
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(false); //No scroll because the user can start typing on the next line
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(false);

        //Line 2
        start = text.indexOf("\n") + 1; end = text.length;
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(true); //Shorter line if the user starts typing here
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(false); //Last line not followed by a scroll when locked
    });

    test('two blank lines at end', () =>
    {
        const text = "A\n\n";

        //Line 1
        let start = 0, end = text.indexOf("\n");
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(true); //Scroll because assumed end of paragraph
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(true); //Scroll because assumed end of paragraph

        //Line 2
        start = text.length; end = text.length;
        expect(DoesLineHaveScrollAfterIt(text, start, end, false)).toBe(false); //Last line not followed by a scroll
        expect(DoesLineHaveScrollAfterIt(text, start, end, true)).toBe(false); //Last line not followed by a scroll
    });
});

//Tests for DoesLineHaveScrollAfterItByLines
describe('DoesLineHaveScrollAfterItByLines', () =>
{
    test('single line', () =>
    {
        const lines = ['A'];
        expect(DoesLineHaveScrollAfterItByLines(lines, 0)).toBe(false); //A
    });

    test('two lines', () =>
    {
        const lines = ['A', 'B'];
        expect(DoesLineHaveScrollAfterItByLines(lines, 0)).toBe(false); //A
        expect(DoesLineHaveScrollAfterItByLines(lines, 1)).toBe(false); //B
    });

    test('two lines seperated by a single blank line', () =>
    {
        const lines = ['A', '', 'B'];
        expect(DoesLineHaveScrollAfterItByLines(lines, 0)).toBe(true);  //A ▼
        expect(DoesLineHaveScrollAfterItByLines(lines, 1)).toBe(true);  //Would have scroll if the user starts typing here
        expect(DoesLineHaveScrollAfterItByLines(lines, 2)).toBe(false); //B
    });

    test('multiple lines', () =>
    {
        const lines = ['A', 'B', 'C', '', 'D'];
        expect(DoesLineHaveScrollAfterItByLines(lines, 0)).toBe(false); //A
        expect(DoesLineHaveScrollAfterItByLines(lines, 1)).toBe(true);  //B ▼
        expect(DoesLineHaveScrollAfterItByLines(lines, 2)).toBe(true);  //C ▼
        expect(DoesLineHaveScrollAfterItByLines(lines, 3)).toBe(true);  //Would have scroll if the user starts typing here
        expect(DoesLineHaveScrollAfterItByLines(lines, 4)).toBe(false); //D
    });

    test('three lines all seperated by a new textbox', () =>
    {
        const lines = ['A', '', 'B', '', 'C', 'D'];
        expect(DoesLineHaveScrollAfterItByLines(lines, 0)).toBe(true);  //A ▼
        expect(DoesLineHaveScrollAfterItByLines(lines, 1)).toBe(true);  //Would have scroll if the user starts typing here
        expect(DoesLineHaveScrollAfterItByLines(lines, 2)).toBe(true);  //B ▼
        expect(DoesLineHaveScrollAfterItByLines(lines, 3)).toBe(true);  //Would have scroll if the user starts typing here
        expect(DoesLineHaveScrollAfterItByLines(lines, 4)).toBe(false); //C
        expect(DoesLineHaveScrollAfterItByLines(lines, 5)).toBe(false); //D
    });

    test('blank line at end', () =>
    {
        const lines = ['A', ''];
        expect(DoesLineHaveScrollAfterItByLines(lines, 0)).toBe(false); //No scroll because the user can start typing on the next line
        expect(DoesLineHaveScrollAfterItByLines(lines, 1)).toBe(false); //No scroll on last line
    });

    test('two blank lines at end', () =>
    {
        const lines = ['A', '', ''];
        expect(DoesLineHaveScrollAfterItByLines(lines, 0)).toBe(true); //Scroll because assumed end of paragraph
        expect(DoesLineHaveScrollAfterItByLines(lines, 1)).toBe(true); //Would have scroll if the user starts typing here
        expect(DoesLineHaveScrollAfterItByLines(lines, 2)).toBe(false); //No scroll on last line
    });
});

//Tests for LineHasCharAfterIndex
describe('LineHasCharAfterIndex', () =>
{
    test('detects given char after index', () =>
    {
        expect(LineHasCharAfterIndex('abc', 1, 'c')).toBe(true);
    });

    test('detects absence of given char after index', () =>
    {
        expect(LineHasCharAfterIndex('abc', 2, 'a')).toBe(false);
    });
});

//Tests for LineHasCharAfterIndexBeforeOtherChar
describe('LineHasCharAfterIndexBeforeOtherChar', () =>
{
    test('detects given char before other char', () =>
    {
        expect(LineHasCharAfterIndexBeforeOtherChar('abc', 0, 'b', 'c')).toBe(true);
    });

    test('detects given char after other char', () =>
    {
        expect(LineHasCharAfterIndexBeforeOtherChar('abc', 0, 'c', 'b')).toBe(false);
    });

    test('detects absence of given char after index', () =>
    {
        expect(LineHasCharAfterIndexBeforeOtherChar('abc', 2, 'a', '')).toBe(false);
    });
});

//Tests for DetermineTextChangeType
describe('Test DetermineTextChangeType', () =>
{
    test('no change', () =>
    {
        const oldText = "Hello World";
        const newText = "Hello World";
        const {type, inserted} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.NO_CHANGE);
        expect(inserted).toBe("");
    });

    test('single replace', () =>
    {
        const oldText = "Hello World";
        const newText = "Hello Wxrld";
        const {type, inserted, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.SINGLE_REPLACE);
        expect(inserted).toBe("x");
        expect(deleted).toBe("o");
        expect(start).toBe(7);
        expect(end).toBe(8);
        expect(oldStart).toBe(7);
        expect(oldEnd).toBe(8);
    });

    test('multi replace same length', () =>
    {
        const oldText = "Hello World";
        const newText = "Hella Wxrld";
        const {type, inserted, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.MULTI_REPLACE_MULTI);
        expect(inserted).toBe("a Wx");
        expect(deleted).toBe("o Wo");
        expect(start).toBe(4);
        expect(end).toBe(8);
        expect(oldStart).toBe(4);
        expect(oldEnd).toBe(8);
    });

    test('single insert at start', () =>
    {
        const oldText = "Hello World";
        const newText = "XHello World";
        const {type, inserted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.SINGLE_INSERT);
        expect(inserted).toBe("X");
        expect(start).toBe(0);
        expect(end).toBe(1);
        expect(oldStart).toBe(0);
        expect(oldEnd).toBe(0);
    });

    test('single insert in middle', () =>
    {
        const oldText = "Hello World";
        const newText = "Hello XWorld";
        const {type, inserted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.SINGLE_INSERT);
        expect(inserted).toBe("X");
        expect(start).toBe(6);
        expect(end).toBe(7);
        expect(oldStart).toBe(6);
        expect(oldEnd).toBe(6);
    });

    test('single insert at end', () =>
    {
        const oldText = "Hello World";
        const newText = "Hello World!";
        const {type, inserted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.SINGLE_INSERT);
        expect(inserted).toBe("!");
        expect(start).toBe(11);
        expect(end).toBe(newText.length);
        expect(oldStart).toBe(oldText.length);
        expect(oldEnd).toBe(oldText.length);
    });

    test('multi insert at start', () =>
    {
        const oldText = "Hello World";
        const newText = "XXHello World";
        const {type, inserted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.MULTI_INSERT);
        expect(inserted).toBe("XX");
        expect(start).toBe(0);
        expect(end).toBe(2);
        expect(oldStart).toBe(0);
        expect(oldEnd).toBe(0);
    });

    test('multi insert in middle', () =>
    {
        const oldText = "Hello World";
        const newText = "Hello XXWorld";
        const {type, inserted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.MULTI_INSERT);
        expect(inserted).toBe("XX");
        expect(start).toBe(6);
        expect(end).toBe(8);
        expect(oldStart).toBe(6);
        expect(oldEnd).toBe(6);
    });

    test('multi insert at end', () =>
    {
        const oldText = "Hello World";
        const newText = "Hello World!!";
        const {type, inserted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.MULTI_INSERT);
        expect(inserted).toBe("!!");
        expect(start).toBe(11);
        expect(end).toBe(newText.length);
        expect(oldStart).toBe(oldText.length);
        expect(oldEnd).toBe(oldText.length);
    });

    test('multi replace increase length by one', () =>
    {
        const oldText = "Hello World";
        const newText = "Hello Wxrld!";
        const {type, inserted, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.MULTI_REPLACE_MULTI);
        expect(inserted).toBe("xrld!");
        expect(deleted).toBe("orld");
        expect(start).toBe(7);
        expect(end).toBe(newText.length);
        expect(oldStart).toBe(7);
        expect(oldEnd).toBe(oldText.length);
    });

    test('multi replace at end increase length by one', () =>
    {
        const oldText = "Hello World";
        const newText = "Hello Worl!!";
        const {type, inserted, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.MULTI_REPLACE_SINGLE);
        expect(inserted).toBe("!!");
        expect(deleted).toBe("d");
        expect(start).toBe(10);
        expect(end).toBe(newText.length);
        expect(oldStart).toBe(10);
        expect(oldEnd).toBe(oldText.length);
    });

    test('multi replace increase length by multiple', () =>
    {
        const oldText = "Hello World";
        const newText = "XXHello XX World!!";
        const {type, inserted, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.MULTI_REPLACE_MULTI);
        expect(inserted).toBe("XXHello XX World!!");
        expect(deleted).toBe("Hello World");
        expect(start).toBe(0);
        expect(end).toBe(newText.length);
        expect(oldStart).toBe(0);
        expect(oldEnd).toBe(oldText.length);
    });

    test('multi replace single char with multiple chars', () =>
    {
        const oldText = "Hello World";
        const newText = "Hello WXXXrld";
        const {type, inserted, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.MULTI_REPLACE_SINGLE);
        expect(inserted).toBe("XXX");
        expect(deleted).toBe("o");
        expect(start).toBe(7);
        expect(end).toBe(10);
        expect(oldStart).toBe(7);
        expect(oldEnd).toBe(8);
    });
    
    test('multi replace single char only with multiple chars', () =>
    {
        const oldText = "G";
        const newText = "Hello World!";
        const {type, inserted, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.MULTI_REPLACE_SINGLE);
        expect(inserted).toBe("Hello World!");
        expect(deleted).toBe("G");
        expect(start).toBe(0);
        expect(end).toBe(12);
        expect(oldStart).toBe(0);
        expect(oldEnd).toBe(1);
    });

    test('single delete at start', () =>
    {
        const oldText = "Hello World";
        const newText = "ello World";
        const {type, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.SINGLE_DELETE);
        expect(deleted).toBe("H");
        expect(start).toBe(0);
        expect(end).toBe(0);
        expect(oldStart).toBe(0);
        expect(oldEnd).toBe(1);
    });

    test('single delete in middle', () =>
    {
        const oldText = "Hello World";
        const newText = "Hell World";
        const {type, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.SINGLE_DELETE);
        expect(deleted).toBe("o");
        expect(start).toBe(4);
        expect(end).toBe(4);
        expect(oldStart).toBe(4);
        expect(oldEnd).toBe(5);
    });

    test('single delete at end', () =>
    {
        const oldText = "Hello World";
        const newText = "Hello Worl";
        const {type, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.SINGLE_DELETE);
        expect(deleted).toBe("d");
        expect(start).toBe(newText.length);
        expect(end).toBe(newText.length);
        expect(oldStart).toBe(10);
        expect(oldEnd).toBe(oldText.length);
    });

    test('multi delete at start', () =>
    {
        const oldText = "Hello World";
        const newText = "llo World";
        const {type, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.MULTI_DELETE);
        expect(deleted).toBe("He");
        expect(start).toBe(0);
        expect(end).toBe(0);
        expect(oldStart).toBe(0);
        expect(oldEnd).toBe(2);
    });

    test('multi delete in middle', () =>
    {
        const oldText = "Hello World";
        const newText = "Hlo World";
        const {type, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.MULTI_DELETE);
        expect(deleted).toBe("el");
        expect(start).toBe(1);
        expect(end).toBe(1);
        expect(oldStart).toBe(1);
        expect(oldEnd).toBe(3);
    });

    test('multi delete at end', () =>
    {
        const oldText = "Hello World";
        const newText = "Hello Wor";
        const {type, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.MULTI_DELETE);
        expect(deleted).toBe("ld");
        expect(start).toBe(newText.length);
        expect(end).toBe(newText.length);
        expect(oldStart).toBe(9);
        expect(oldEnd).toBe(oldText.length);
    });

    test('multi replace with single char decrease length by one', () =>
    {
        const oldText = "Hello World";
        const newText = "Hello WorY";
        const {type, inserted, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.SINGLE_REPLACE_MULTI);
        expect(inserted).toBe("Y");
        expect(deleted).toBe("ld");
        expect(start).toBe(9);
        expect(end).toBe(newText.length);
        expect(oldStart).toBe(9);
        expect(oldEnd).toBe(oldText.length);
    });

    test('multi replace with multiple chars decrease length by one', () =>
    {
        const oldText = "Hello World";
        const newText = "Hello 1234";
        const {type, inserted, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.MULTI_REPLACE_MULTI);
        expect(inserted).toBe("1234");
        expect(deleted).toBe("World");
        expect(start).toBe(6);
        expect(end).toBe(newText.length);
        expect(oldStart).toBe(6);
        expect(oldEnd).toBe(oldText.length);
    });

    test('multi replace with single char decrease length by multiple', () =>
    {
        const oldText = "Hello World";
        const newText = "Hello B";
        const {type, inserted, deleted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.SINGLE_REPLACE_MULTI);
        expect(inserted).toBe("B");
        expect(deleted).toBe("World");
        expect(start).toBe(6);
        expect(end).toBe(newText.length);
        expect(oldStart).toBe(6);
        expect(oldEnd).toBe(oldText.length);
    })

    test('multi replace with multiple chars decrease length by multiple', () =>
    {
        const oldText = "Hello World";
        const newText = "Hello BAD";
        const {type, inserted, start, end, oldStart, oldEnd} = DetermineTextChangeType(oldText, newText);
        expect(type).toBe(TextChange.MULTI_REPLACE_MULTI);
        expect(inserted).toBe("BAD");
        expect(start).toBe(6);
        expect(end).toBe(newText.length);
        expect(oldStart).toBe(6);
        expect(oldEnd).toBe(oldText.length);
    });
});

// Tests for ParseColouredTextToHtml
describe('Test ParseColouredTextToHtml', () =>
{
    test('handles text without colour symbols', () =>
    {
        const text = "Hello World";
        const result = ParseColouredTextToHtml(text, false);
        expect(result).toBe('<span style="color: inherit">H</span><span style="color: inherit">e</span><span style="color: inherit">l</span><span style="color: inherit">l</span><span style="color: inherit">o</span><span style="color: inherit"> </span><span style="color: inherit">W</span><span style="color: inherit">o</span><span style="color: inherit">r</span><span style="color: inherit">l</span><span style="color: inherit">d</span>');
    });

    test('handles text with colour symbols in light mode', () =>
    {
        const text = "🟢Hello🔵World";
        const result = ParseColouredTextToHtml(text, false);
        expect(result).toBe('<span style="color: green">🟢</span><span style="color: green">H</span><span style="color: green">e</span><span style="color: green">l</span><span style="color: green">l</span><span style="color: green">o</span><span style="color: blue">🔵</span><span style="color: blue">W</span><span style="color: blue">o</span><span style="color: blue">r</span><span style="color: blue">l</span><span style="color: blue">d</span>');
    });

    test('handles text with colour symbols in dark mode', () =>
    {
        const text = "H🟢ello🔵World";
        const result = ParseColouredTextToHtml(text, true);
        expect(result).toBe('<span style="color: inherit">H</span><span style="color: forestgreen">🟢</span><span style="color: forestgreen">e</span><span style="color: forestgreen">l</span><span style="color: forestgreen">l</span><span style="color: forestgreen">o</span><span style="color: mediumblue">🔵</span><span style="color: mediumblue">W</span><span style="color: mediumblue">o</span><span style="color: mediumblue">r</span><span style="color: mediumblue">l</span><span style="color: mediumblue">d</span>');
    });

    test('handles text with newlines', () =>
    {
        const text = "Hello\nWorld";
        const result = ParseColouredTextToHtml(text, false);
        expect(result).toBe('<span style="color: inherit">H</span><span style="color: inherit">e</span><span style="color: inherit">l</span><span style="color: inherit">l</span><span style="color: inherit">o</span><br/><span style="color: inherit">W</span><span style="color: inherit">o</span><span style="color: inherit">r</span><span style="color: inherit">l</span><span style="color: inherit">d</span>');
    });

    test('handles text ending with a newline', () =>
    {
        const text = "Hello\n";
        const result = ParseColouredTextToHtml(text, false);
        expect(result).toBe('<span style="color: inherit">H</span><span style="color: inherit">e</span><span style="color: inherit">l</span><span style="color: inherit">l</span><span style="color: inherit">o</span><br/><span style="color: inherit">&nbsp;</span>');
    });

    test('escapes HTML special characters', () =>
    {
        const text = "<Hello & World>";
        const result = ParseColouredTextToHtml(text, false);
        expect(result).toBe('<span style="color: inherit">&lt;</span><span style="color: inherit">H</span><span style="color: inherit">e</span><span style="color: inherit">l</span><span style="color: inherit">l</span><span style="color: inherit">o</span><span style="color: inherit"> </span><span style="color: inherit">&amp;</span><span style="color: inherit"> </span><span style="color: inherit">W</span><span style="color: inherit">o</span><span style="color: inherit">r</span><span style="color: inherit">l</span><span style="color: inherit">d</span><span style="color: inherit">&gt;</span>');
    });
});
