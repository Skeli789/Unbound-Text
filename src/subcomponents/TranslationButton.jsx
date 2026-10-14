/**
 * This file defines the TranslationButton component.
 * It is used to translate text into another language using an external API.
 */

import axios from 'axios';
import React, {Component} from 'react';
import {Box, Button, CircularProgress, FormControl, FormHelperText, InputLabel, Link, MenuItem, Select, Stack, Typography} from '@mui/material';

import {CreateIngameText} from "../ConvertedText";
import {NotificationContext} from "../NotificationContext";

//Translation service
const TRANSLATION_API_URL = "https://api.mymemory.translated.net/get";
const SUPPORT_EMAIL = import.meta.env.VITE_TRANSLATION_EMAIL || ""; //Email for the translation API
const SUPPORTED_LANGUAGES =
{
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "vi": "Vietnamese",
};

//Request limits and response checks
const TRANSLATION_MAX_BYTES = 500; //Documented maximum size of the q parameter in UTF-8 bytes
const MIN_MATCH_SCORE = 0.85; //Lowest match score accepted from the service's alternative matches
const UNCHANGED_MIN_WORDS = 3; //Unchanged text only counts as a failure with at least this many words
const WORD_PATTERN = /(?:<[^<>]*>|[^\s<]|<)+/g; //Words, keeping in-game tags such as <pause 30> whole
const byteEncoder = new TextEncoder();

//Names sent in place of the buffers so they provide the correct context in the sentence
const PLAYER_PLACEHOLDER = "Billybobbydoe";
const RIVAL_PLACEHOLDER = "Billybobbyfoe";

//Reset value for the status and message, used once a request ends or is cancelled
const IDLE_STATUS = {status: "idle", message: null};

//User-facing messages
const MISSING_LANGUAGE_MESSAGE = "Choose a language first.";
const MISSING_TEXT_MESSAGE = "Add some text to translate first.";
const NETWORK_ERROR_MESSAGE = "Could not reach the translation service. Check your connection and try again.";
const UNEXPECTED_RESPONSE_MESSAGE = "The translation service returned an unexpected response.";


//Error types

/**
 * Error for a response from the translation service that cannot be used.
 */
class TranslationResponseError extends Error
{
}

/**
 * Error for text that cannot be sent to the translation service.
 */
class TranslationInputError extends Error
{
}

/**
 * Chooses the message to show when a translation request fails.
 * @param {Error} error - The error thrown while translating.
 * @returns {string} The message to show the user.
 */
function GetTranslationErrorMessage(error)
{
    if (error instanceof TranslationResponseError || error instanceof TranslationInputError)
        return error.message;
    if (error?.response) //The server answered with an HTTP error status
        return `The translation service returned HTTP ${error.response.status}. Try again later.`;
    return NETWORK_ERROR_MESSAGE;
}

//Request chunking

/**
 * Measures text in UTF-8 bytes, the unit of the service's size limit.
 * @param {string} text - The text to measure.
 * @returns {number} The number of bytes.
 */
function GetByteLength(text)
{
    return byteEncoder.encode(text).length;
}

/**
 * Splits one paragraph into pieces within the byte limit, breaking only between words.
 * @param {string} paragraph - The paragraph to split.
 * @returns {Array<string>} The pieces in order, to be joined with a space after translation.
 */
function SplitIntoChunks(paragraph)
{
    const chunks = [];
    let current = "";

    for (const word of paragraph.match(WORD_PATTERN) ?? [])
    {
        if (GetByteLength(word) > TRANSLATION_MAX_BYTES)
            throw new TranslationInputError(`A word or tag in the text is over ${TRANSLATION_MAX_BYTES} bytes, so it cannot be translated. Shorten it and try again.`);

        const joined = (current === "") ? word : `${current} ${word}`;
        if (GetByteLength(joined) <= TRANSLATION_MAX_BYTES)
        {
            current = joined;
            continue;
        }
        chunks.push(current);
        current = word;
    }

    if (current !== "")
        chunks.push(current);
    return chunks;
}

//Response checks

/**
 * Compares text ignoring case and extra whitespace.
 * @param {string} text - The text to normalize.
 * @returns {string} The normalized text.
 */
function NormalizeForComparison(text)
{
    return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Checks if the service returned the source text unchanged, so it probably did not translate it.
 * @param {string} source - The text that was sent.
 * @param {string} translated - The text the service returned.
 * @returns {boolean} Whether the text came back unchanged.
 */
function IsUnchangedText(source, translated)
{
    if (NormalizeForComparison(source) !== NormalizeForComparison(translated))
        return false;

    let withoutTags = source.replace(/<[^<>]*>/g, " ");
    for (const name of [PLAYER_PLACEHOLDER, RIVAL_PLACEHOLDER])
        withoutTags = withoutTags.replaceAll(name, " "); //Names are the same in every language
    return (withoutTags.match(/\p{L}{3,}/gu) ?? []).length >= UNCHANGED_MIN_WORDS;
}

/**
 * Gets the primary language part of a language code, such as es from es-ES.
 * @param {string} code - The language code.
 * @returns {string} The lowercase primary language part.
 */
function GetPrimaryLanguage(code)
{
    return String(code ?? "").split(/[-_]/)[0].toLowerCase();
}

/**
 * Finds the most confident alternative match that is a translation into the requested language.
 * @param {Array<Object>} matches - The alternative matches returned by the service.
 * @param {string} language - The requested language code.
 * @param {string} source - The text that was sent.
 * @returns {string|null} The translation, or null when no match is reliable.
 */
function FindAlternateTranslation(matches, language, source)
{
    let best = null;
    for (const match of Array.isArray(matches) ? matches : [])
    {
        const translation = (typeof match?.translation === "string") ? match.translation : "";
        const score = Number(match?.match);
        if (translation.trim() === "" || !Number.isFinite(score) || score < MIN_MATCH_SCORE)
            continue;
        if (GetPrimaryLanguage(match.target) !== language)
            continue;
        if (typeof match.source === "string" && GetPrimaryLanguage(match.source) !== "en")
            continue;
        if (NormalizeForComparison(translation) === NormalizeForComparison(source))
            continue;
        if (best === null || score > best.score)
            best = {translation, score};
    }
    return best?.translation ?? null;
}

//Shared elements

/**
 * Creates the link to the MyMemory translation service.
 * @returns {JSX.Element} The link, which opens the service in a new tab.
 */
function MyMemoryLink()
{
    return (
        <Link href="https://mymemory.translated.net/" color="inherit" underline="hover" target="_blank" rel="noopener noreferrer">
            MyMemory
        </Link>
    );
}


export class TranslationButton extends Component
{
    static contextType = NotificationContext;

    /**
     * Represents the TranslationButton component.
     * @param {Object} props - The props object containing the component's properties.
     * @param {string} props.text - The text to be translated.
     * @param {boolean} props.isForTranslationBox - Whether the button is for the translation box.
     * @param {Function} props.showTranslationBox - Function to show the translated text in another editor.
     */
    constructor(props)
    {
        super(props);

        this.state =
        {
            translateToLanguage: "",
            ...IDLE_STATUS, //Adds the status ("idle", "loading" or "error") and the message shown with it
        };

        this.showTranslationBox = props.showTranslationBox;
        this.abortController = null; //Set as soon as a request starts so repeated clicks are ignored
        this.mounted = false;
    }

    //Lifecycle
    /**
     * Runs after the component is created and added to the DOM.
     */
    componentDidMount()
    {
        this.mounted = true;
    }

    /**
     * Runs when the component is removed from the DOM.
     */
    componentWillUnmount()
    {
        this.mounted = false;
        this.abortController?.abort(); //Stop any request so its result is never shown after unmounting
    }

    //Helpers
    /**
     * Checks if a language has been chosen for translation.
     * @return {boolean} Whether a language has been chosen.
     */
    isLanguageChosen()
    {
        return Object.hasOwn(SUPPORTED_LANGUAGES, this.state.translateToLanguage);
    }

    //Event handlers
    /**
     * Sets the translation language and clears any error shown.
     * @param {Object} e - The event for the dropdown selection.
     */
    setTranslationLanguage(e)
    {
        const language = e.target.value;
        this.setState((state) => ({translateToLanguage: language, ...((state.status === "error") ? IDLE_STATUS : null)}));
    }

    /**
     * Stops the translation request in progress. The translated text box is left unchanged.
     */
    cancelTranslation()
    {
        const controller = this.abortController;
        if (controller == null)
            return;

        this.abortController = null; //Free the button straight away so a new request can start
        controller.abort();
        this.setState(IDLE_STATUS);
    }

    /**
     * Translates the text using the selected language.
     * @returns {Promise<void>} A promise that resolves when the translation is complete or cancelled.
     */
    async translateText()
    {
        //Ignore repeated clicks straight away, before React has re-rendered the disabled button
        if (this.abortController != null)
            return;

        //Preparation
        const language = this.state.translateToLanguage;
        const sourceText = this.props.text;

        //Handle errors
        if (!this.isLanguageChosen())
        {
            this.setState({status: "error", message: MISSING_LANGUAGE_MESSAGE});
            return;
        }
        else if (sourceText.trim() === "")
        {
            this.setState({status: "error", message: MISSING_TEXT_MESSAGE});
            return;
        }

        //Create the text to be translated
        let text = CreateIngameText(sourceText); //Start with the ingame text as a base
        text = text.replaceAll("\\e", "é").replaceAll('\\"', '"').replaceAll("[.]", "…");
        text = text.replaceAll(/([.!?…])\\n/g, "$1\n"); //\n's with a . ! ? or … before them
        text = text.replaceAll("\\n", " ").replaceAll("\\l", " ").replaceAll("\\p", "\n"); //
        text = text.replaceAll("[PLAYER]", PLAYER_PLACEHOLDER).replaceAll("[RIVAL]", RIVAL_PLACEHOLDER);
        text = text.replaceAll("[PAUSE][", "[PAUSE").replaceAll("[BUFFER][0", "[BUFFER0");
        text = text.replaceAll("[", "<").replaceAll("]", ">"); //Prevent buffers from being removed by turning them into HTML tags

        //Translate the text in byte-limited pieces, one request at a time as to not overwhelm the server
        const controller = new AbortController();
        this.abortController = controller;
        this.setState({status: "loading", message: `Translating to ${SUPPORTED_LANGUAGES[language]}...`});

        try
        {
            const plans = text.split("\n").map((paragraph) => ({source: paragraph, chunks: SplitIntoChunks(paragraph)}));
            if (plans.every((plan) => plan.chunks.length === 0))
                throw new TranslationInputError(MISSING_TEXT_MESSAGE);

            //Chunk requests
            const translatedParagraphs = [];
            for (const plan of plans)
            {
                if (plan.chunks.length === 0) //Blank paragraphs are kept as they are and never sent
                {
                    translatedParagraphs.push(plan.source);
                    continue;
                }

                const translatedChunks = [];
                for (const chunk of plan.chunks)
                {
                    translatedChunks.push(await this.requestTranslation(chunk, language, controller.signal));
                    if (controller.signal.aborted) //Cancelled or unmounted while waiting, so drop the result
                        return;
                }
                translatedParagraphs.push(translatedChunks.join(" ")); //Pieces of one paragraph are rejoined with a space
            }

            //Response handling
            let translatedText = translatedParagraphs.join("\\p").replaceAll("\n", "\\p");
            this.showTranslationBox(translatedText); //Show the translated text in the other box
            this.context.notify({message: "Translation complete!", severity: "success"});
        }
        catch (e)
        {
            if (controller.signal.aborted) //Cancelled or unmounted, so stay silent
                return;

            console.error(e?.message ?? "Translation failed"); //Only the message is logged so the email parameter is never logged
            const message = GetTranslationErrorMessage(e);
            this.setState({status: "error", message});
            this.context.notify({message, severity: "error"});
        }
        finally
        {
            if (this.abortController === controller) //Only the current request clears the loading state
            {
                this.abortController = null;
                if (this.mounted)
                    this.setState((state) => ((state.status === "loading") ? IDLE_STATUS : null));
            }
        }
    }

    //Translation requests
    /**
     * Requests the translation of one chunk of text and restores the in-game placeholders.
     * @param {string} text - The chunk to translate.
     * @param {string} language - The language code to translate into.
     * @param {AbortSignal} signal - Cancels the request when aborted.
     * @returns {Promise<string>} The translated chunk.
     */
    async requestTranslation(text, language, signal)
    {
        const params =
        {
            q: text,
            langpair: `en|${language}`,
        };
        if (SUPPORT_EMAIL !== "")
            params.de = SUPPORT_EMAIL;

        const response = await axios.get(TRANSLATION_API_URL, {params, signal});
        const body = response.data;

        //The service reports its own failures inside a successful HTTP response
        if (body?.quotaFinished === true || body?.quotaFinished === "true")
            throw new TranslationResponseError("The translation service has run out of quota. Try again later.");
        const status = Number(body?.responseStatus);
        if (Number.isFinite(status) && status !== 200)
            throw new TranslationResponseError(`The translation service rejected the request${body.responseDetails ? `: ${body.responseDetails}` : "."}`);
        if (status !== 200 || typeof body?.responseData?.translatedText !== "string")
            throw new TranslationResponseError(UNEXPECTED_RESPONSE_MESSAGE);

        let translatedText = body.responseData.translatedText;
        if (IsUnchangedText(text, translatedText)) //Try a confident alternative before giving up
        {
            translatedText = FindAlternateTranslation(body.matches, language, text);
            if (translatedText === null)
                throw new TranslationResponseError("The translation service returned the original text. Try again later.");
        }
        translatedText = translatedText.replaceAll(PLAYER_PLACEHOLDER, "[PLAYER]").replaceAll(RIVAL_PLACEHOLDER, "[RIVAL]"); //Give Player and Rival their buffers back
        translatedText = translatedText.replaceAll(/<\/.*>/g, ""); //Remove closing tags added in
        translatedText = translatedText.replaceAll("<pause", "<pause><").replaceAll("<buffer0", "<buffer><0"); //Restore newer buffers
        translatedText = translatedText.replaceAll("<", "[").replaceAll(">", "]"); //Convert all buffers back
        return translatedText;
    }

    //Render
    /**
     * Creates the language list for the dropdown menu.
     * @returns {Array<JSX.Element>} The list of languages as MenuItem elements.
     */
    createLanguageList()
    {
        let languages = [];

        for (let languageId of Object.keys(SUPPORTED_LANGUAGES))
        {
            languages.push(
                <MenuItem key={languageId} value={languageId} >
                    {SUPPORTED_LANGUAGES[languageId]} {/* Language name */}
                </MenuItem>
            );
        }

        return languages;
    }

    /**
     * Renders the TranslationButton component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const languageDropdownId = "language-dropdown";
        const languageLabelId = "language-dropdown-label";
        const statusId = "translate-status";

        if (this.props.isForTranslationBox) //Is the translated text box
        {
            return (
                <Box className="translate-toolbar translated-text-toolbar">
                    <Typography variant="body2" color="text.secondary">
                        Machine translation from <MyMemoryLink />. Check the wording before using it.
                    </Typography>
                </Box>
            );
        }

        const isLoading = this.state.status === "loading";
        const hasError = this.state.status === "error";

        return (
            <Box className="translate-toolbar">
                <Stack direction="row" spacing={1} useFlexGap sx={{flexWrap: "wrap", alignItems: "center"}}>
                    {/* Dropdown for the language selection */}
                    <FormControl size="small" error={hasError} sx={{minWidth: 120}}>
                        <InputLabel id={languageLabelId}>Translate to</InputLabel>
                        <Select
                            labelId={languageLabelId}
                            id={languageDropdownId}
                            label="Translate to"
                            value={this.state.translateToLanguage}
                            disabled={isLoading}
                            onChange={this.setTranslationLanguage.bind(this)}
                        >
                            {this.createLanguageList()}
                        </Select>
                    </FormControl>

                    {/* Translate button */}
                    {this.state.translateToLanguage &&
                        <Button variant="contained" color="primary" id="translate-button" data-testid="translate-button"
                                aria-busy={isLoading} aria-describedby={statusId} disabled={isLoading}
                                startIcon={isLoading ? <CircularProgress size={16} color="inherit" aria-label="Translation in progress" sx={{color: "text.primary"}} /> : null}
                                className="translate-button"
                                onClick={this.translateText.bind(this)}>
                            {isLoading ? "Translating..." : "Translate"}
                        </Button>
                    }

                    {/* Cancel while a request is running */}
                    {isLoading &&
                        <Button variant="outlined" color="error" onClick={this.cancelTranslation.bind(this)}>
                            Cancel
                        </Button>
                    }
                </Stack>

                <FormHelperText id={statusId} error={hasError} role={hasError ? "alert" : "status"}>
                    {this.state.message ?? <>Uses the <MyMemoryLink /> translation service.</>}
                </FormHelperText>
            </Box>
        );
    }
}

export default TranslationButton;
