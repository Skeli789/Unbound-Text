import React from 'react';
import axios from 'axios';
import {render, fireEvent, screen, waitFor, within} from '@testing-library/react';
import {createTheme} from '@mui/material/styles';

import {TranslationButton} from '../subcomponents/TranslationButton';
import {NotificationProvider} from '../NotificationContext';

vi.mock('axios', () => ({default: {get: vi.fn()}}));


/**
 * Renders the TranslationButton inside the notification provider used by the app.
 * @param {string} text - The text to translate.
 * @returns {Object} The render result and the spy used as showTranslationBox.
 */
function renderTranslationButton(text = "Hi. There")
{
    const showTranslationBox = vi.fn();
    const result = render(
        <NotificationProvider>
            <TranslationButton text={text} isForTranslationBox={false} showTranslationBox={showTranslationBox} />
        </NotificationProvider>
    );
    return {...result, showTranslationBox};
}

/**
 * Chooses a language from the translation dropdown.
 * @param {string} languageName - The visible name of the language, such as Spanish.
 */
function chooseLanguage(languageName)
{
    fireEvent.mouseDown(screen.getByRole('combobox'));
    fireEvent.click(screen.getByRole('option', {name: languageName}));
}

beforeEach(() =>
{
    axios.get.mockReset();
});

//Checks the validation messages shown before any request is sent
describe('TranslationButton input checks', () =>
{
    test('shows the translate button only after choosing a language', () =>
    {
        const {showTranslationBox} = renderTranslationButton();

        expect(screen.queryByRole('button', {name: 'Translate'})).not.toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument();
        expect(axios.get).not.toHaveBeenCalled();
        expect(showTranslationBox).not.toHaveBeenCalled();

        chooseLanguage('Spanish');

        expect(screen.getByRole('button', {name: 'Translate'})).toBeInTheDocument();
    });

    test('asks for text before translating and does not call the service', async () =>
    {
        const {showTranslationBox} = renderTranslationButton("   ");

        chooseLanguage('Spanish');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));

        expect(await screen.findByRole('alert')).toHaveTextContent('Add some text to translate first.');
        expect(axios.get).not.toHaveBeenCalled();
        expect(showTranslationBox).not.toHaveBeenCalled();
    });
});

//Checks a successful translation and the messages for a failed or malformed service reply
describe('TranslationButton request outcomes', () =>
{
    test('translates with the chosen language and shows the result in the translated box', async () =>
    {
        axios.get.mockResolvedValue({
            data: {responseStatus: 200, responseData: {translatedText: "Hola Billybobbydoe"}},
        });
        const {showTranslationBox} = renderTranslationButton();

        chooseLanguage('Spanish');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));

        await waitFor(() => expect(showTranslationBox).toHaveBeenCalledWith("Hola {PLAYER}"));
        expect(axios.get).toHaveBeenCalledTimes(1);
        expect(axios.get).toHaveBeenCalledWith(
            "https://api.mymemory.translated.net/get",
            expect.objectContaining({
                params: expect.objectContaining({langpair: "en|es"}),
                signal: expect.any(AbortSignal),
            })
        );
        expect(await screen.findByText('Translation complete!')).toBeInTheDocument();
        expect(screen.getByRole('button', {name: 'Translate'})).toBeEnabled();
    });

    test('shows the HTTP status when the service fails and leaves the translated box unchanged', async () =>
    {
        axios.get.mockRejectedValue({response: {status: 429}});
        const {showTranslationBox} = renderTranslationButton();

        chooseLanguage('French');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));

        const messages = await screen.findAllByText('The translation service returned HTTP 429. Try again later.');
        expect(messages.length).toBeGreaterThan(0);
        expect(showTranslationBox).not.toHaveBeenCalled();
        expect(screen.getByRole('button', {name: 'Translate'})).toBeEnabled();
    });

    test('shows the reason when the service reports a failure in a successful response', async () =>
    {
        axios.get.mockResolvedValue({
            data: {responseStatus: 403, responseDetails: "Daily quota exceeded"},
        });
        const {showTranslationBox} = renderTranslationButton();

        chooseLanguage('German');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));

        const messages = await screen.findAllByText('The translation service rejected the request: Daily quota exceeded');
        expect(messages.length).toBeGreaterThan(0);
        expect(showTranslationBox).not.toHaveBeenCalled();
    });

    test('rejects a response without translated text', async () =>
    {
        axios.get.mockResolvedValue({data: {responseStatus: 200}});
        const {showTranslationBox} = renderTranslationButton();

        chooseLanguage('Italian');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));

        const messages = await screen.findAllByText('The translation service returned an unexpected response.');
        expect(messages.length).toBeGreaterThan(0);
        expect(showTranslationBox).not.toHaveBeenCalled();
    });
});

//Checks cancelling and repeated clicks while a request is running
describe('TranslationButton cancelling', () =>
{
    test('Cancel stops the request without showing an error or changing the translated box', async () =>
    {
        axios.get.mockImplementation((url, config) => new Promise((resolve, reject) =>
        {
            config.signal.addEventListener('abort', () => reject(new Error('canceled')));
        }));
        const {showTranslationBox} = renderTranslationButton();

        chooseLanguage('Vietnamese');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));
        fireEvent.click(await screen.findByRole('button', {name: 'Cancel'}));

        await waitFor(() => expect(screen.queryByRole('button', {name: 'Cancel'})).not.toBeInTheDocument());
        expect(screen.getByRole('button', {name: 'Translate'})).toBeEnabled();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(showTranslationBox).not.toHaveBeenCalled();
    });

    test('repeated clicks while a request is running only send one request', async () =>
    {
        axios.get.mockImplementation(() => new Promise(() => {})); //Never resolves
        renderTranslationButton();

        chooseLanguage('Spanish');
        const translate = screen.getByRole('button', {name: 'Translate'});
        fireEvent.click(translate);
        fireEvent.click(translate);

        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('unmounting while a request is running cancels it and never shows the result', async () =>
    {
        let capturedSignal = null;
        axios.get.mockImplementation((url, config) =>
        {
            capturedSignal = config.signal;
            return new Promise(() => {}); //Never resolves
        });
        const {showTranslationBox, unmount} = renderTranslationButton();

        chooseLanguage('Spanish');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));
        unmount();

        expect(capturedSignal.aborted).toBe(true);
        expect(showTranslationBox).not.toHaveBeenCalled();
    });
});

//Checks the language pairs and request parameters sent to the service
describe('TranslationButton language pairs', () =>
{
    test('translates to French with the en|fr language pair', async () =>
    {
        axios.get.mockResolvedValue({
            data: {responseStatus: 200, responseData: {translatedText: "Bonjour comment vas-tu"}},
        });
        const {showTranslationBox} = renderTranslationButton("Hello, how are you?");

        chooseLanguage('French');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));

        await waitFor(() => expect(showTranslationBox).toHaveBeenCalledWith("Bonjour comment vas-tu"));
        expect(axios.get).toHaveBeenCalledWith(
            "https://api.mymemory.translated.net/get",
            expect.objectContaining({params: expect.objectContaining({langpair: "en|fr"})})
        );
    });

    test('does not send an empty email parameter', async () =>
    {
        axios.get.mockResolvedValue({
            data: {responseStatus: 200, responseData: {translatedText: "Hola"}},
        });
        const {showTranslationBox} = renderTranslationButton();

        chooseLanguage('Spanish');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));

        await waitFor(() => expect(showTranslationBox).toHaveBeenCalledTimes(1));
        expect(axios.get.mock.calls[0][1].params).not.toHaveProperty('de', '');
    });
});

//Checks how long text is split into requests of at most 500 bytes
describe('TranslationButton long text', () =>
{
    test('sends pieces of at most 500 UTF-8 bytes and rejoins them with spaces inside one paragraph', async () =>
    {
        axios.get.mockImplementation(async (url, {params}) => ({
            data: {responseStatus: 200, responseData: {translatedText: `ES(${params.q})`}},
        }));
        const source = "Café déjà vu 😀 naïve façade ".repeat(40).trim();
        const {showTranslationBox} = renderTranslationButton(source);

        chooseLanguage('Spanish');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));

        await waitFor(() => expect(showTranslationBox).toHaveBeenCalledTimes(1));
        const queries = axios.get.mock.calls.map(([, config]) => config.params.q);
        expect(queries.length).toBeGreaterThan(1);
        for (const query of queries)
            expect(new TextEncoder().encode(query).length).toBeLessThanOrEqual(500);
        expect(queries.join(" ")).toBe(source);
        expect(showTranslationBox).toHaveBeenCalledWith(queries.map((query) => `ES(${query})`).join(" "));
    });

    test('keeps separate paragraphs apart with a paragraph break and sends each one', async () =>
    {
        axios.get.mockImplementation(async (url, {params}) => ({
            data: {responseStatus: 200, responseData: {translatedText: `ES(${params.q})`}},
        }));
        const {showTranslationBox} = renderTranslationButton("First line.\\pSecond line.");

        chooseLanguage('Spanish');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));

        await waitFor(() => expect(showTranslationBox).toHaveBeenCalledWith("ES(First line.)\\pES(Second line.)"));
        expect(axios.get).toHaveBeenCalledTimes(2);
    });

    test('fails clearly for a word over 500 bytes without calling the service', async () =>
    {
        const {showTranslationBox} = renderTranslationButton("ok " + "é".repeat(251));

        chooseLanguage('Spanish');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));

        const messages = await screen.findAllByText(/over 500 bytes/);
        expect(messages.length).toBeGreaterThan(0);
        expect(axios.get).not.toHaveBeenCalled();
        expect(showTranslationBox).not.toHaveBeenCalled();
    });
});

//Checks how service responses are validated and reported
describe('TranslationButton response checks', () =>
{
    test('shows the quota message when the service reports the quota is used up', async () =>
    {
        axios.get.mockResolvedValue({
            data: {responseStatus: 403, quotaFinished: true, responseDetails: "QUOTA EXCEEDED"},
        });
        const {showTranslationBox} = renderTranslationButton();

        chooseLanguage('Spanish');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));

        const messages = await screen.findAllByText('The translation service has run out of quota. Try again later.');
        expect(messages.length).toBeGreaterThan(0);
        expect(showTranslationBox).not.toHaveBeenCalled();
    });

    test('does not publish English echoed back as the translation', async () =>
    {
        axios.get.mockImplementation(async (url, {params}) => ({
            data: {responseStatus: 200, responseData: {translatedText: params.q}, matches: []},
        }));
        const {showTranslationBox} = renderTranslationButton("Hello, how are you?");

        chooseLanguage('Spanish');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));

        const messages = await screen.findAllByText('The translation service returned the original text. Try again later.');
        expect(messages.length).toBeGreaterThan(0);
        expect(showTranslationBox).not.toHaveBeenCalled();
        expect(screen.queryByText('Translation complete!')).not.toBeInTheDocument();
    });

    test('uses a confident French alternative when the main translation is unchanged', async () =>
    {
        axios.get.mockResolvedValue({
            data: {
                responseStatus: 200,
                responseData: {translatedText: "Hello, how are you?"},
                matches: [
                    {translation: "Hello, how are you?", source: "en-GB", target: "en-GB", match: 0.99},
                    {translation: "Bonjour, comment vas-tu ?", source: "en-GB", target: "fr-FR", match: 0.92},
                ],
            },
        });
        const {showTranslationBox} = renderTranslationButton("Hello, how are you?");

        chooseLanguage('French');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));

        await waitFor(() => expect(showTranslationBox).toHaveBeenCalledWith("Bonjour, comment vas-tu ?"));
        expect(await screen.findByText('Translation complete!')).toBeInTheDocument();
    });

    test('ignores alternatives that are English, low confidence, or from another source language', async () =>
    {
        axios.get.mockResolvedValue({
            data: {
                responseStatus: 200,
                responseData: {translatedText: "Hello, how are you?"},
                matches: [
                    {translation: "Hola, ¿cómo estás?", source: "en-GB", target: "es-ES", match: 0.5},
                    {translation: "¿Qué tal?", source: "de-DE", target: "es-ES", match: 0.99},
                    {translation: "Hello, how are you?", source: "en-GB", target: "es-ES", match: 0.99},
                ],
            },
        });
        const {showTranslationBox} = renderTranslationButton("Hello, how are you?");

        chooseLanguage('Spanish');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));

        const messages = await screen.findAllByText('The translation service returned the original text. Try again later.');
        expect(messages.length).toBeGreaterThan(0);
        expect(showTranslationBox).not.toHaveBeenCalled();
    });
});

//Checks cancelling while a long text is still being sent in pieces
describe('TranslationButton cancelling between pieces', () =>
{
    test('cancelling between pieces sends no more requests and ignores a late reply', async () =>
    {
        let resolveSecondPiece = null;
        axios.get
            .mockResolvedValueOnce({data: {responseStatus: 200, responseData: {translatedText: "uno"}}})
            .mockImplementationOnce(() => new Promise((resolve) => { resolveSecondPiece = resolve; }));
        const {showTranslationBox} = renderTranslationButton("word ".repeat(200).trim());

        chooseLanguage('Spanish');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));
        await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

        fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
        resolveSecondPiece({data: {responseStatus: 200, responseData: {translatedText: "dos"}}});
        await new Promise((resolve) => setTimeout(resolve, 0)); //Let the late reply reach the component

        expect(screen.getByRole('button', {name: 'Translate'})).toBeEnabled();
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(showTranslationBox).not.toHaveBeenCalled();
        expect(screen.queryByText('Translation complete!')).not.toBeInTheDocument();
    });
});

//Checks the loading state and the MyMemory credit links
describe('TranslationButton display', () =>
{
    test('shows Translating... with a spinner inside the button while a request runs', () =>
    {
        axios.get.mockImplementation(() => new Promise(() => {})); //Never resolves
        renderTranslationButton();

        chooseLanguage('Spanish');
        fireEvent.click(screen.getByRole('button', {name: 'Translate'}));

        const translate = screen.getByTestId('translate-button');
        expect(translate).toHaveTextContent('Translating...');
        expect(translate).toBeDisabled();
        expect(translate).toHaveAttribute('aria-busy', 'true');
        const spinner = within(translate).getByRole('progressbar', {name: 'Translation in progress'});
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveStyle({color: createTheme().palette.text.primary});
        expect(screen.getByRole('button', {name: 'Cancel'})).toBeVisible();
    });

    test('credits MyMemory with a link in the idle helper text', () =>
    {
        renderTranslationButton();

        const link = screen.getByRole('link', {name: 'MyMemory'});
        expect(link).toHaveAttribute('href', 'https://mymemory.translated.net/');
        expect(link).toHaveAttribute('target', '_blank');
    });

    test('credits MyMemory with a link in the translated text box', () =>
    {
        render(
            <NotificationProvider>
                <TranslationButton text="" isForTranslationBox={true} showTranslationBox={vi.fn()} />
            </NotificationProvider>
        );

        const link = screen.getByRole('link', {name: 'MyMemory'});
        expect(link).toHaveAttribute('href', 'https://mymemory.translated.net/');
        expect(screen.queryByRole('button', {name: 'Translate'})).not.toBeInTheDocument();
    });
});
