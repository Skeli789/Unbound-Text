import React from 'react';
import {ThemeProvider} from '@mui/material';
import {render, fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {CreateAppTheme} from '../AppTheme';
import {NotificationProvider} from '../NotificationContext';
import {FormatStringForDisplay} from '../TextUtils';
import {PrettifyButton} from '../subcomponents/PrettifyButton';


/**
 * Renders the PrettifyButton inside the notification provider used by the app.
 * @param {string} text - The text to prettify.
 * @returns {Object} The render result and the spy used as setPrettifiedText.
 */
function renderPrettifyButton(text = "Hi. There")
{
    const setPrettifiedText = vi.fn();
    const result = render(
        <NotificationProvider>
            <PrettifyButton text={text} setPrettifiedText={setPrettifiedText} />
        </NotificationProvider>
    );
    return {...result, setPrettifiedText};
}

//Checks the confirmation dialog that asks before reformatting the text
describe('PrettifyButton', () =>
{
    test('asks for confirmation before reformatting the text', () =>
    {
        const {setPrettifiedText, getByTestId} = renderPrettifyButton();

        fireEvent.click(getByTestId('prettify-button'));

        expect(screen.getByRole('dialog', {name: 'Make your text pretty?'})).toBeInTheDocument();
        expect(screen.getByText('This will reformat your text!')).toBeInTheDocument();
        expect(setPrettifiedText).not.toHaveBeenCalled();
    });

    test('Do It reformats the text once and shows a success notification', async () =>
    {
        const {setPrettifiedText, getByTestId} = renderPrettifyButton();

        fireEvent.click(getByTestId('prettify-button'));
        const doIt = screen.getByRole('button', {name: 'Do It'});
        fireEvent.click(doIt);
        fireEvent.click(doIt); //A repeated click must not reformat the text again

        expect(setPrettifiedText).toHaveBeenCalledTimes(1);
        expect(setPrettifiedText).toHaveBeenCalledWith("Hi. There");
        expect(await screen.findByRole('status')).toHaveTextContent('Prettified!');
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    test.each([
        ["Hi! Great to meet you!", "Hi! Great to meet you!"],
        ["Hi! Yes. OK?", "Hi! Yes. OK?"],
        ["And I command you to cease these childish antics of yours… NOW!",
            "And I command you to cease these\nchildish antics of yours… NOW!"],
        ["And I command you to cease these childish antics of yours{.} NOW!",
            "And I command you to cease these\nchildish antics of yours… NOW!"],
        ["And I command you to cease these childish antics of yours… NOW! Hi! Great to meet you!",
            "And I command you to cease these\nchildish antics of yours… NOW!\n\nHi! Great to meet you!"],
        ["Wait… NOW! Hi! Great to meet you!", "Wait… NOW!\n\nHi! Great to meet you!"],
        ["Wait{.} NOW! Hi! Great to meet you!", "Wait… NOW!\n\nHi! Great to meet you!"],
        ['Hi!? "Yes!" OK.', 'Hi!? "Yes!" OK.'],
        ["Hi! [RED]Great to meet you!", "Hi! 🔴Great to meet you!"],
        ["Hi! Great to meet you! This next sentence is much too long to fit on that same line.",
            "Hi! Great to meet you!\n\n" + FormatStringForDisplay("This next sentence is much too long to fit on that same line.", false)],
        ["And I command you to cease these childish antics of yours…🟢{PAUSE}{18}🔴 NOW!",
            "And I command you to cease these\nchildish antics of yours…🟢{PAUSE}{18}🔴 NOW!"],
    ])('keeps following sentences on the current line only when they fit: %s', (text, expected) =>
    {
        const {setPrettifiedText, getByTestId} = renderPrettifyButton(text);

        fireEvent.click(getByTestId('prettify-button'));
        fireEvent.click(screen.getByRole('button', {name: 'Do It'}));

        expect(setPrettifiedText).toHaveBeenCalledWith(expected);
    });

    test.each([false, true])('Cancel uses the regular text colour in both themes (dark mode: %s)', (darkMode) =>
    {
        const theme = CreateAppTheme(darkMode);
        const {getByTestId} = render(
            <ThemeProvider theme={theme}>
                <NotificationProvider>
                    <PrettifyButton text="Hi" setPrettifiedText={vi.fn()} />
                </NotificationProvider>
            </ThemeProvider>
        );

        fireEvent.click(getByTestId('prettify-button'));
        const cancel = screen.getByRole('button', {name: 'Cancel'});
        expect(cancel).toHaveStyle({color: theme.palette.text.primary});
        expect(cancel).not.toHaveStyle({color: theme.palette.primary.main});
    });

    test('Cancel closes the dialog without changing the text and returns focus to the Prettify button', async () =>
    {
        const user = userEvent.setup();
        const {setPrettifiedText, getByTestId} = renderPrettifyButton();
        const button = getByTestId('prettify-button');

        await user.click(button);
        await user.click(screen.getByRole('button', {name: 'Cancel'}));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(button).toHaveFocus();
        expect(button.closest('[aria-hidden="true"]')).toBeNull();
        expect(setPrettifiedText).not.toHaveBeenCalled();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    test('keyboard users can open the dialog with Enter and Escape returns focus to the Prettify button', async () =>
    {
        const user = userEvent.setup();
        const {setPrettifiedText, getByTestId} = renderPrettifyButton();
        const button = getByTestId('prettify-button');

        button.focus();
        await user.keyboard('{Enter}');
        expect(screen.getByRole('dialog', {name: 'Make your text pretty?'})).toBeInTheDocument();

        await user.keyboard('{Escape}');

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(button).toHaveFocus();
        expect(setPrettifiedText).not.toHaveBeenCalled();
    });
});
