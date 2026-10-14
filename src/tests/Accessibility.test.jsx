import React from 'react';
import {act, render, screen, fireEvent, waitFor, within} from '@testing-library/react';
import {vi} from 'vitest';
import userEvent from '@testing-library/user-event';

import Editor from '../Editor';
import AutoSaveButton from '../subcomponents/AutoSaveButton';
import DarkModeButton from '../subcomponents/DarkModeButton';
import LockFinalLineButton from '../subcomponents/LockFinalLineButton';
import QuickButtons from '../subcomponents/QuickButtons';
import UndoRedoButtons from '../subcomponents/UndoRedoButtons';
import {AppThemeProvider, CreateAppTheme} from '../AppTheme';


//Checks that the editor text areas and copy button expose accessible names
describe('Editor fields are labelled', () =>
{
    const dummyFunc = () => {};

    test('game text area is labelled by its title', () =>
    {
        const {getByTestId} = render(<Editor text="Hello" isTranslation={false} showTranslationBox={dummyFunc} test={true} />);
        expect(screen.getByLabelText('Game text')).toBe(getByTestId('main-textarea'));
    });

    test('translated text area is labelled by its title', () =>
    {
        render(<Editor text="Hello" isTranslation={true} showTranslationBox={dummyFunc} test={true} />);
        expect(screen.getByLabelText('Translated text').tagName).toBe('TEXTAREA');
    });

    test('converted text area is labelled and its copy button has a name', () =>
    {
        render(<Editor text="Hello" isTranslation={false} showTranslationBox={dummyFunc} test={true} />);
        expect(screen.getByLabelText('Converted text').tagName).toBe('TEXTAREA');
        expect(screen.getByRole('button', {name: 'Copy converted text'})).toBeInTheDocument();
    });
});

//Checks the quick button toolbar names and the text each button inserts
describe('QuickButtons', () =>
{
    test('exposes a named toolbar and inserts the chosen text', () =>
    {
        const insert = vi.fn();
        render(<QuickButtons addTextAtSelectionStart={insert} />);
        expect(screen.getByRole('toolbar', {name: 'Insert text'})).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', {name: 'Red'}));
        expect(insert).toHaveBeenCalledWith('🔴');
    });

    test('colour buttons show their symbol and keep the colour as the accessible name', () =>
    {
        render(<QuickButtons addTextAtSelectionStart={vi.fn()} />);
        const red = screen.getByRole('button', {name: 'Red'});
        expect(red).toHaveTextContent('🔴');
        expect(red).toHaveClass('quick-button-symbol');
    });
});

//Checks undo and redo availability and their highlight state
describe('UndoRedoButtons', () =>
{
    afterEach(() =>
    {
        vi.unstubAllGlobals();
    });

    test.each([['Undo', false], ['Redo', true]])('%s tooltip follows the narrow layout breakpoint (initially narrow: %s)', async (action, isCompact) =>
    {
        const mediaQuery = new EventTarget();
        mediaQuery.matches = isCompact;
        const removeListener = vi.spyOn(mediaQuery, 'removeEventListener');
        vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));
        const {unmount} = render(<UndoRedoButtons undoStack={['previous']} redoStack={['next']} undo={vi.fn()} redo={vi.fn()} />);
        expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 640px)');

        const anchor = screen.getByRole('button', {name: action}).parentElement;
        await userEvent.hover(anchor);
        await screen.findByRole('tooltip');
        expect(within(screen.getByRole('tooltip')).getByText(action)).toHaveClass(
            isCompact ? 'MuiTooltip-tooltipPlacementTop' : 'MuiTooltip-tooltipPlacementRight');

        act(() =>
        {
            mediaQuery.matches = !isCompact;
            const event = new Event('change');
            event.matches = !isCompact;
            mediaQuery.dispatchEvent(event);
        });
        await waitFor(() => expect(within(screen.getByRole('tooltip')).getByText(action)).toHaveClass(
            isCompact ? 'MuiTooltip-tooltipPlacementRight' : 'MuiTooltip-tooltipPlacementTop'));
        unmount();
        expect(removeListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    test('tracks the visible viewport above the keyboard and removes its listeners', () =>
    {
        const viewport = new EventTarget();
        viewport.height = window.innerHeight - 250;
        viewport.offsetTop = 30;
        const removeListener = vi.spyOn(viewport, 'removeEventListener');
        vi.stubGlobal('visualViewport', viewport);

        const {container, unmount} = render(<UndoRedoButtons undoStack={[]} redoStack={[]} undo={vi.fn()} redo={vi.fn()} />);
        const controls = container.querySelector('.undo-redo-buttons');
        expect(controls.style.getPropertyValue('--undo-redo-bottom-offset')).toBe('220px');

        viewport.offsetTop = 80;
        viewport.dispatchEvent(new Event('scroll'));
        expect(controls.style.getPropertyValue('--undo-redo-bottom-offset')).toBe('170px');

        viewport.height = window.innerHeight;
        viewport.dispatchEvent(new Event('resize'));
        expect(controls.style.getPropertyValue('--undo-redo-bottom-offset')).toBe('0px');

        unmount();
        expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function));
        expect(removeListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    });

    test('hides undo, redo and their container when there is nothing to restore', () =>
    {
        const {container} = render(<UndoRedoButtons undoStack={[]} redoStack={[]} undo={vi.fn()} redo={vi.fn()} />);
        expect(screen.queryByRole('button', {name: 'Undo'})).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Redo'})).not.toBeInTheDocument();
        expect(container.querySelector('.undo-redo-buttons')).toHaveAttribute('hidden');
    });

    test('enables undo once there is history and calls it on click', () =>
    {
        const undo = vi.fn();
        render(<UndoRedoButtons undoStack={['previous']} redoStack={[]} undo={undo} redo={vi.fn()} />);

        const button = screen.getByRole('button', {name: 'Undo'});
        expect(button).toBeEnabled();
        fireEvent.click(button);
        expect(undo).toHaveBeenCalledTimes(1);
    });

    test('shows both buttons when either action is available and disables unavailable actions', () =>
    {
        const callbacks = {undo: vi.fn(), redo: vi.fn()};
        const {rerender, container} = render(<UndoRedoButtons undoStack={['previous']} redoStack={[]} {...callbacks} />);
        expect(screen.getByRole('button', {name: 'Undo'})).toBeEnabled();
        expect(screen.getByRole('button', {name: 'Undo'})).toHaveStyle({backgroundColor: '#1976d2'});
        expect(screen.getByRole('button', {name: 'Redo'})).toBeDisabled();
        expect(screen.getByRole('button', {name: 'Redo'})).not.toHaveStyle({backgroundColor: '#1976d2'});
        fireEvent.click(screen.getByRole('button', {name: 'Redo'}));
        expect(callbacks.redo).not.toHaveBeenCalled();
        expect(container.querySelector('.undo-redo-buttons')).not.toHaveAttribute('hidden');

        rerender(<UndoRedoButtons undoStack={[]} redoStack={['next']} {...callbacks} />);
        expect(screen.getByRole('button', {name: 'Undo'})).toBeDisabled();
        fireEvent.click(screen.getByRole('button', {name: 'Undo'}));
        expect(callbacks.undo).not.toHaveBeenCalled();
        expect(screen.getByRole('button', {name: 'Redo'})).toBeEnabled();
        fireEvent.click(screen.getByRole('button', {name: 'Redo'}));
        expect(callbacks.redo).toHaveBeenCalledTimes(1);

        rerender(<UndoRedoButtons undoStack={[]} redoStack={[]} {...callbacks} />);
        expect(container.querySelector('.undo-redo-buttons')).toHaveAttribute('hidden');
        expect(screen.queryByRole('button', {name: 'Undo'})).not.toBeInTheDocument();
        expect(screen.queryByRole('button', {name: 'Redo'})).not.toBeInTheDocument();
    });

    test.each(['Undo', 'Redo'])('highlights available %s and leaves the other button neutral', (action) =>
    {
        render(<UndoRedoButtons undoStack={action === 'Undo' ? ['previous'] : []}
                                redoStack={action === 'Redo' ? ['next'] : []}
                                undo={vi.fn()} redo={vi.fn()} />);
        expect(screen.getByRole('button', {name: action})).toHaveStyle({backgroundColor: '#1976d2'});
        const unavailable = action === 'Undo' ? 'Redo' : 'Undo';
        expect(screen.getByRole('button', {name: unavailable})).toBeDisabled();
        expect(screen.getByRole('button', {name: unavailable})).not.toHaveStyle({backgroundColor: '#1976d2'});
    });

    test.each(['Undo', 'Redo'])('pressing %s retains textarea focus', async (action) =>
    {
        const callback = vi.fn();
        render(<>
            <textarea aria-label="Focused editor" />
            <UndoRedoButtons undoStack={['previous']} redoStack={['next']} undo={callback} redo={callback} />
        </>);
        const textarea = screen.getByRole('textbox');
        textarea.focus();
        await userEvent.click(screen.getByRole('button', {name: action}));
        expect(textarea).toHaveFocus();
        expect(callback).toHaveBeenCalledTimes(1);
    });

    test('clears the visible footer and updates on scrolling and footer resizing', () =>
    {
        const {container, unmount} = render(<>
            <footer className="footer" />
            <UndoRedoButtons undoStack={['previous']} redoStack={[]} undo={vi.fn()} redo={vi.fn()} />
        </>);
        const controls = container.querySelector('.undo-redo-buttons');
        const footer = container.querySelector('.footer');
        const footerRect = vi.spyOn(footer, 'getBoundingClientRect');
        footerRect.mockReturnValue({top: window.innerHeight - 48, bottom: window.innerHeight});
        fireEvent.scroll(document);
        expect(controls.style.getPropertyValue('--undo-redo-bottom-offset')).toBe('48px');

        footerRect.mockReturnValue({top: window.innerHeight - 72, bottom: window.innerHeight});
        fireEvent(window, new Event('resize'));
        expect(controls.style.getPropertyValue('--undo-redo-bottom-offset')).toBe('72px');

        footerRect.mockReturnValue({top: window.innerHeight + 10, bottom: window.innerHeight + 58});
        fireEvent.scroll(container);
        expect(controls.style.getPropertyValue('--undo-redo-bottom-offset')).toBe('0px');
        unmount();
    });
});

//Checks that toggle buttons report their pressed or on state
describe('Toggle buttons expose their state', () =>
{
    beforeEach(() =>
    {
        localStorage.clear();
    });

    afterEach(() =>
    {
        localStorage.clear();
    });

    test('lock button reports its state and requests the opposite state on click', () =>
    {
        const lockFinalLine = vi.fn();
        render(<LockFinalLineButton isFinalLineLocked={false} lockFinalLine={lockFinalLine} />);

        const button = screen.getByRole('button', {name: 'Lock final line'});
        expect(button).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(button);
        expect(lockFinalLine).toHaveBeenCalledWith(true);
    });

    test('locked lock button shows a red icon and no selected background', () =>
    {
        render(<LockFinalLineButton isFinalLineLocked={true} lockFinalLine={vi.fn()} />);

        const button = screen.getByRole('button', {name: 'Lock final line'});
        expect(button).toHaveAttribute('aria-pressed', 'true');
        expect(button.querySelector('svg')).toHaveStyle({color: '#d32f2f'});
        expect(['', 'transparent', 'rgba(0, 0, 0, 0)']).toContain(getComputedStyle(button).backgroundColor);
    });

    test('unlocked lock button keeps the neutral icon colour', () =>
    {
        render(<LockFinalLineButton isFinalLineLocked={false} lockFinalLine={vi.fn()} />);

        const icon = screen.getByRole('button', {name: 'Lock final line'}).querySelector('svg');
        expect(icon).not.toHaveStyle({color: '#d32f2f'});
    });

    test('dark mode button reports dark mode and requests the opposite on click', () =>
    {
        const toggleParentDarkMode = vi.fn();
        render(<DarkModeButton darkMode={true} toggleParentDarkMode={toggleParentDarkMode} />);

        const button = screen.getByRole('button', {name: 'Toggle Dark Mode'});
        expect(button).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(button);
        expect(toggleParentDarkMode).toHaveBeenCalledWith(false);
    });

    test('autosave button is pressed by default and updates aria-pressed when turned off', () =>
    {
        render(<AutoSaveButton />);

        const button = screen.getByRole('button', {name: 'Toggle AutoSave'});
        expect(button).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(button);
        expect(button).toHaveAttribute('aria-pressed', 'false');
        expect(localStorage.getItem('autosaveEnabled')).toBe('false');
    });

    test('settings rows are single toggle buttons that keep their label', () =>
    {
        const toggleParentDarkMode = vi.fn();
        render(
            <>
                <AutoSaveButton label="AutoSave" />
                <DarkModeButton label="Dark mode" darkMode={false} toggleParentDarkMode={toggleParentDarkMode} />
            </>
        );

        const autoSave = screen.getByRole('button', {name: 'Toggle AutoSave'});
        expect(autoSave).toHaveTextContent('AutoSave');
        expect(autoSave).toHaveAttribute('aria-pressed', 'true');
        expect(autoSave.querySelector('button')).toBeNull();
        fireEvent.click(autoSave);
        expect(autoSave).toHaveAttribute('aria-pressed', 'false');

        const darkMode = screen.getByRole('button', {name: 'Toggle Dark Mode'});
        expect(darkMode).toHaveTextContent('Dark mode');
        expect(darkMode).toHaveAttribute('aria-pressed', 'false');
        fireEvent.click(darkMode);
        expect(toggleParentDarkMode).toHaveBeenCalledTimes(1);
        expect(toggleParentDarkMode).toHaveBeenCalledWith(true);
    });

    test('settings rows have no tooltip, title or description', () =>
    {
        render(
            <>
                <AutoSaveButton label="AutoSave" />
                <DarkModeButton label="Dark mode" darkMode={false} toggleParentDarkMode={vi.fn()} />
            </>
        );

        for (const name of ['Toggle AutoSave', 'Toggle Dark Mode'])
        {
            const row = screen.getByRole('button', {name});
            fireEvent.mouseOver(row);
            expect(row).not.toHaveAttribute('title');
            expect(row).not.toHaveAttribute('aria-describedby');
        }
    });

    test('standalone autosave button keeps its tooltip on hover', async () =>
    {
        render(<AutoSaveButton />);

        const button = screen.getByRole('button', {name: 'Toggle AutoSave'});
        expect(button).toHaveAttribute('title', 'AutoSave is On');
        fireEvent.mouseOver(button);
        expect(await screen.findByRole('tooltip')).toHaveTextContent('AutoSave is On');
    });

    test.each([false, true])('autosave icon is green only while it is turned on and the button has no blue background (dark mode: %s)', (darkMode) =>
    {
        render(<AppThemeProvider darkMode={darkMode}><AutoSaveButton /></AppThemeProvider>);

        const button = screen.getByRole('button', {name: 'Toggle AutoSave'});
        const icon = button.querySelector('svg');
        const onColour = '#66bb6a'; // AutoSaveButton uses the same on colour in both themes
        expect(['', 'transparent', 'rgba(0, 0, 0, 0)']).toContain(getComputedStyle(button).backgroundColor);
        expect(icon).toHaveStyle({color: onColour});
        fireEvent.click(button);
        expect(getComputedStyle(button).backgroundColor).not.toBe('rgb(25, 118, 210)');
        expect(icon).not.toHaveStyle({color: onColour});
    });
});

//Checks that editors rendered side by side keep their control ids unique
describe('Editors rendered together have unique control ids', () =>
{
    const dummyFunc = () => {};

    function renderBothEditors()
    {
        return render(
            <>
                <Editor text="Hello" isTranslation={false} showTranslationBox={dummyFunc} test={true} />
                <Editor text="Hallo" isTranslation={true} showTranslationBox={dummyFunc} test={true} />
            </>
        );
    }

    beforeEach(() =>
    {
        localStorage.clear();
    });

    afterEach(() =>
    {
        localStorage.clear();
    });

    test('text colour selects are labelled by their own editor label', () =>
    {
        const {container} = renderBothEditors();

        const ids = Array.from(container.querySelectorAll('[id]'), (element) => element.id);
        expect(new Set(ids).size).toBe(ids.length);

        for (const [gridId, labelId] of [['editor-grid', 'text-colour-label'], ['editor-grid-translate', 'translation-text-colour-label']])
        {
            const grid = container.querySelector(`#${gridId}`);
            const label = container.querySelector(`#${labelId}`);
            expect(label).toHaveTextContent('Text colour');
            expect(grid).toContainElement(label);

            const combobox = within(grid).getByRole('combobox', {name: 'Text colour'});
            expect(combobox.getAttribute('aria-labelledby').split(' ')).toContain(labelId);
        }
    });

    test('text colour tooltip opens to the left of the symbol when there is room', async () =>
    {
        const {container} = renderBothEditors();
        fireEvent.mouseOver(container.querySelector('#editor-grid .text-colour-dropdown'));

        const tooltip = await screen.findByRole('tooltip');
        await waitFor(() => expect(tooltip).toHaveAttribute('data-popper-placement', 'left'));
    });

    test('text colour symbols have no arrow padding that would push them off-centre', () =>
    {
        const {container} = renderBothEditors();

        for (const gridId of ['editor-grid', 'editor-grid-translate'])
        {
            const select = container.querySelector(`#${gridId} .text-colour-dropdown .MuiSelect-select`);
            expect(select).toHaveStyle({paddingLeft: '0px', paddingRight: '0px'});
        }
    });

    test('text colour selects are 28px squares without the label offset', () =>
    {
        const {container} = renderBothEditors();

        for (const gridId of ['editor-grid', 'editor-grid-translate'])
        {
            const control = container.querySelector(`#${gridId} .text-colour-dropdown`);
            expect(control).toHaveStyle({width: '28px', height: '28px'});
            expect(control.querySelector('.MuiInput-root')).toHaveStyle({marginTop: '0px'});
        }
    });

    test.each([false, true])('text colour selects have an opaque themed fill in both editors (dark mode: %s)', (darkMode) =>
    {
        const {container} = render(
            <AppThemeProvider darkMode={darkMode}>
                <Editor text="Hello" isTranslation={false} darkMode={darkMode} showTranslationBox={dummyFunc} test={true} />
                <Editor text="Hallo" isTranslation={true} darkMode={darkMode} showTranslationBox={dummyFunc} test={true} />
            </AppThemeProvider>
        );

        for (const gridId of ['editor-grid', 'editor-grid-translate'])
        {
            const control = container.querySelector(`#${gridId} .text-colour-dropdown`);
            expect(['', 'transparent', 'rgba(0, 0, 0, 0)']).not.toContain(getComputedStyle(control).backgroundColor);
            expect(control).toHaveStyle({backgroundColor: CreateAppTheme(darkMode).palette.background.paper});
        }
    });

    test('each prettify dialog is labelled by its own editor ids', async () =>
    {
        renderBothEditors();

        for (const [buttonId, titleId, descriptionId] of [
            ['prettify-button', 'prettify-dialog-title', 'prettify-dialog-description'],
            ['translation-prettify-button', 'translation-prettify-dialog-title', 'translation-prettify-dialog-description']])
        {
            fireEvent.click(screen.getByTestId(buttonId));

            const dialog = screen.getByRole('dialog', {name: 'Make your text pretty?'});
            expect(dialog).toHaveAttribute('aria-labelledby', titleId);
            expect(dialog).toHaveAttribute('aria-describedby', descriptionId);
            expect(document.getElementById(titleId)).toHaveTextContent('Make your text pretty?');
            expect(document.getElementById(descriptionId)).toHaveTextContent('This will reformat your text!');

            fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        }
    });
});
