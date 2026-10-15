import React from "react";
import {act, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {vi} from "vitest";
import userEvent from "@testing-library/user-event";
import {readFileSync} from "node:fs";
import {join} from "node:path";

import App from "../App";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const COMPACT_QUERY = "(max-width: 640px)";


/**
 * Replaces window.matchMedia with queries that tests can change.
 * @param {Object<string, boolean>} initial - The initial match state for each media query.
 * @returns {Function} A function that sets one query's match state and notifies its listeners.
 */
function StubMediaQueries(initial)
{
    const state = {...initial};
    const listeners = new Map();

    vi.stubGlobal("matchMedia", vi.fn((media) =>
    {
        if (!listeners.has(media))
            listeners.set(media, new Set());

        return {
            media,
            get matches() { return Boolean(state[media]); },
            addEventListener: (type, listener) => listeners.get(media).add(listener),
            removeEventListener: (type, listener) => listeners.get(media).delete(listener),
        };
    }));

    return (media, matches) =>
    {
        state[media] = matches;
        listeners.get(media)?.forEach((listener) => listener({matches, media}));
    };
}

/**
 * Replaces window.matchMedia with a system colour scheme that tests can change.
 * @param {boolean} matches - Whether the system initially prefers dark mode.
 * @returns {Function} A function that sets the system preference and notifies listeners.
 */
function StubSystemDarkMode(matches)
{
    const setMedia = StubMediaQueries({[DARK_QUERY]: matches});
    return (next) => setMedia(DARK_QUERY, next);
}

//Checks that the app shell fills the viewport so the footer stays at the bottom
describe("App shell height", () =>
{
    test("html, body and the app shell fill the viewport so the footer stays at the bottom", () =>
    {
        const indexCss = readFileSync(join(process.cwd(), "src", "styles", "index.css"), "utf8");
        const appCss = readFileSync(join(process.cwd(), "src", "styles", "App.css"), "utf8");
        expect(indexCss).toMatch(/\bhtml\s*\{[^}]*height:\s*100%/);
        expect(indexCss).toMatch(/\bbody\s*\{[^}]*height:\s*100vh;\s*height:\s*100dvh;/);
        expect(indexCss).toMatch(/\bbody\s*\{[^}]*overflow:\s*hidden/);
        expect(appCss).toMatch(/\.app,\s*#root\s*\{\s*height:\s*100vh;\s*height:\s*100dvh;/);
        expect(appCss).toMatch(/\.app\s*\{[^}]*display:\s*flex;\s*flex-direction:\s*column/);
    });

    test("the main container scrolls without overscroll and the editor keeps its content height", () =>
    {
        const appCss = readFileSync(join(process.cwd(), "src", "styles", "App.css"), "utf8");
        const editorCss = readFileSync(join(process.cwd(), "src", "styles", "Editor.css"), "utf8");
        const mainContainer = appCss.match(/\.main-container\s*\{([^}]*)\}/)[1];
        const editorPage = editorCss.match(/\.editor-page\s*\{([^}]*)\}/)[1];

        expect(appCss).toMatch(/\.app\s*\{[^}]*overflow:\s*hidden/);
        expect(mainContainer).toMatch(/display:\s*flex/);
        expect(mainContainer).toMatch(/flex-direction:\s*column/);
        expect(mainContainer).toMatch(/flex:\s*1\s+1\s+auto/);
        expect(mainContainer).toMatch(/min-height:\s*0/);
        expect(mainContainer).toMatch(/overflow-y:\s*auto/);
        expect(mainContainer).toMatch(/overscroll-behavior-y:\s*none/);
        expect(mainContainer).toMatch(/-webkit-overflow-scrolling:\s*touch/);
        expect(editorPage).toMatch(/flex:\s*1\s+0\s+auto/);
        expect(editorPage).not.toMatch(/overflow(?:-y)?:\s*(auto|scroll|hidden)/);
    });

    test("only a single editor floats undo and redo at the bottom right on narrow screens", () =>
    {
        const editorCss = readFileSync(join(process.cwd(), "src", "styles", "Editor.css"), "utf8");
        const narrowCss = editorCss.slice(editorCss.indexOf("@media (max-width: 640px)"));
        const floatingButtons = narrowCss.match(/\.editor-page\s*>\s*\.editor-grid:only-child\s+\.undo-redo-buttons\s*\{([^}]*)\}/)[1];

        expect(floatingButtons).toMatch(/position:\s*fixed/);
        expect(floatingButtons).toMatch(/right:\s*max\([^;]*safe-area-inset-right/);
        expect(floatingButtons).toMatch(/bottom:\s*calc\(var\(--undo-redo-bottom-offset,\s*0px\)\s*\+\s*max\([^;]*safe-area-inset-bottom/);
        expect(editorCss.match(/\.undo-redo-buttons\s*\{([^}]*)\}/)[1]).not.toMatch(/position:\s*fixed/);
    });
});

//Checks dark mode choice between the saved value and the system colour scheme
describe("theme and dark mode", () =>
{
    beforeEach(() =>
    {
        localStorage.clear();
    });

    afterEach(() =>
    {
        vi.unstubAllGlobals();
        delete document.documentElement.dataset.colorMode;
        localStorage.clear();
    });

    test("stored true enables dark mode even when the system is light", () =>
    {
        localStorage.setItem("darkMode", "true");
        StubSystemDarkMode(false);
        render(<App />);
        expect(document.documentElement.dataset.colorMode).toBe("dark");
    });

    test("stored false enables light mode even when the system is dark", () =>
    {
        localStorage.setItem("darkMode", "false");
        StubSystemDarkMode(true);
        render(<App />);
        expect(document.documentElement.dataset.colorMode).toBe("light");
    });

    test("without a stored value, the system dark scheme is used", () =>
    {
        StubSystemDarkMode(true);
        render(<App />);
        expect(document.documentElement.dataset.colorMode).toBe("dark");
    });

    test("without a stored value, system scheme changes are followed", () =>
    {
        const setSystemDarkMode = StubSystemDarkMode(false);
        render(<App />);
        expect(document.documentElement.dataset.colorMode).toBe("light");

        act(() => setSystemDarkMode(true));
        expect(document.documentElement.dataset.colorMode).toBe("dark");
    });

    test("a stored value ignores system scheme changes", () =>
    {
        localStorage.setItem("darkMode", "false");
        const setSystemDarkMode = StubSystemDarkMode(false);
        render(<App />);

        act(() => setSystemDarkMode(true));
        expect(document.documentElement.dataset.colorMode).toBe("light");
    });

    test("toggling saves the choice and stops following the system", () =>
    {
        const setSystemDarkMode = StubSystemDarkMode(false);
        const {getByTestId} = render(<App />);

        fireEvent.click(getByTestId("dark-mode-button"));
        expect(localStorage.getItem("darkMode")).toBe("true");
        expect(document.documentElement.dataset.colorMode).toBe("dark");

        act(() => setSystemDarkMode(false));
        expect(document.documentElement.dataset.colorMode).toBe("dark");
    });
});

//Checks the footer credit text and its link to the Unbound thread
describe("footer credit", () =>
{
    afterEach(() =>
    {
        vi.unstubAllGlobals();
    });

    test("credits Skeli and links Unbound to its PokeCommunity thread in a new tab", () =>
    {
        StubMediaQueries({[COMPACT_QUERY]: false});
        const {container} = render(<App />);
        const footer = container.querySelector(".footer");

        expect(footer.parentElement).toBe(screen.getByRole("main"));
        expect(footer.previousElementSibling).toBe(screen.getByTestId("editor-page"));
        expect(footer).toHaveTextContent("Created by Skeli for Unbound");
        const link = within(footer).getByRole("link", {name: "Unbound"});
        expect(link).toHaveAttribute("href", "https://www.pokecommunity.com/threads/pok%C3%A9mon-unbound-completed.382178/");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
});

//Checks where the settings controls appear on wide and narrow layouts
describe("settings placement", () =>
{
    beforeEach(() =>
    {
        localStorage.clear();
    });

    afterEach(() =>
    {
        vi.unstubAllGlobals();
        delete document.documentElement.dataset.colorMode;
        localStorage.clear();
    });

    test("wide screens show the settings controls in the header and not the footer", () =>
    {
        StubMediaQueries({[COMPACT_QUERY]: false});
        const {container} = render(<App />);
        const header = container.querySelector(".header");
        const footer = container.querySelector(".footer");

        expect(within(header).getByRole("button", {name: "Toggle Auto Save"})).toBeInTheDocument();
        expect(within(header).getByRole("button", {name: "Toggle Dark Mode"})).toBeInTheDocument();
        expect(within(footer).queryByRole("button", {name: "Toggle Auto Save"})).toBeNull();
        expect(within(footer).queryByRole("button", {name: "Toggle Dark Mode"})).toBeNull();
        expect(screen.queryByRole("button", {name: "Open settings"})).toBeNull();
    });

    test("narrow screens move the settings into a popover opened from a settings button", async () =>
    {
        StubMediaQueries({[COMPACT_QUERY]: true});
        render(<App />);

        expect(screen.queryByRole("button", {name: "Toggle Auto Save"})).toBeNull();
        expect(screen.queryByRole("button", {name: "Toggle Dark Mode"})).toBeNull();

        fireEvent.click(screen.getByRole("button", {name: "Open settings"}));
        const group = screen.getByRole("group", {name: "Settings"});
        expect(within(group).getByRole("button", {name: "Toggle Auto Save"})).toBeInTheDocument();

        fireEvent.click(within(group).getByRole("button", {name: "Toggle Dark Mode"}));
        expect(localStorage.getItem("darkMode")).toBe("true");
        expect(document.documentElement.dataset.colorMode).toBe("dark");
    });

    test("the narrow settings popover is a dialog labelled Settings", () =>
    {
        StubMediaQueries({[COMPACT_QUERY]: true});
        render(<App />);

        fireEvent.click(screen.getByRole("button", {name: "Open settings"}));
        const dialog = screen.getByRole("dialog", {name: "Settings"});
        expect(within(dialog).getByRole("group", {name: "Settings"})).toBeInTheDocument();
    });

    test("Escape closes the settings popover and returns focus to the settings button", async () =>
    {
        const user = userEvent.setup();
        StubMediaQueries({[COMPACT_QUERY]: true});
        render(<App />);
        const openButton = screen.getByRole("button", {name: "Open settings"});

        await user.click(openButton);
        await user.click(within(screen.getByRole("group", {name: "Settings"})).getByRole("button", {name: "Toggle Dark Mode"}));
        expect(document.documentElement.dataset.colorMode).toBe("dark");
        expect(screen.getByRole("group", {name: "Settings"})).toBeInTheDocument();

        await user.keyboard("{Escape}");

        await waitFor(() => expect(screen.queryByRole("group", {name: "Settings"})).toBeNull());
        expect(openButton).toHaveFocus();
        expect(openButton.closest('[aria-hidden="true"]')).toBeNull();
    });

    test("returning to the wide layout moves the controls back into the header without duplicates", () =>
    {
        const setMedia = StubMediaQueries({[COMPACT_QUERY]: true});
        const {container} = render(<App />);

        act(() => setMedia(COMPACT_QUERY, false));

        expect(container.querySelector(".header")).toContainElement(screen.getByRole("button", {name: "Toggle Auto Save"}));
        expect(screen.getAllByRole("button", {name: "Toggle Auto Save"})).toHaveLength(1);
        expect(screen.queryByRole("button", {name: "Open settings"})).toBeNull();
    });

    test("the AutoSave row toggles once from its label, its blank space or its icon", () =>
    {
        StubMediaQueries({[COMPACT_QUERY]: true});
        render(<App />);
        fireEvent.click(screen.getByRole("button", {name: "Open settings"}));
        const row = within(screen.getByRole("group", {name: "Settings"})).getByRole("button", {name: "Toggle Auto Save"});
        expect(row).toHaveAttribute("aria-pressed", "true");

        fireEvent.click(within(row).getByText("Auto Save"));
        expect(row).toHaveAttribute("aria-pressed", "false");
        fireEvent.click(row);
        expect(row).toHaveAttribute("aria-pressed", "true");
        fireEvent.click(row.querySelector("svg"));
        expect(row).toHaveAttribute("aria-pressed", "false");
        expect(localStorage.getItem("autosaveEnabled")).toBe("false");
    });

    test("the dark mode row toggles once per click and per Enter or Space press", async () =>
    {
        const user = userEvent.setup();
        StubMediaQueries({[COMPACT_QUERY]: true});
        render(<App />);
        await user.click(screen.getByRole("button", {name: "Open settings"}));
        const row = within(screen.getByRole("group", {name: "Settings"})).getByRole("button", {name: "Toggle Dark Mode"});

        await user.click(within(row).getByText("Dark Mode"));
        expect(localStorage.getItem("darkMode")).toBe("true");
        expect(row).toHaveAttribute("aria-pressed", "true");

        row.focus();
        await user.keyboard("{Enter}");
        expect(localStorage.getItem("darkMode")).toBe("false");

        await user.keyboard(" ");
        expect(localStorage.getItem("darkMode")).toBe("true");
        expect(row).toHaveFocus();
    });

    test("resizing between layouts keeps the saved settings with one control each", () =>
    {
        const setMedia = StubMediaQueries({[COMPACT_QUERY]: true});
        render(<App />);
        fireEvent.click(screen.getByRole("button", {name: "Open settings"}));
        const group = screen.getByRole("group", {name: "Settings"});
        fireEvent.click(within(group).getByRole("button", {name: "Toggle Auto Save"}));
        fireEvent.click(within(group).getByRole("button", {name: "Toggle Dark Mode"}));

        act(() => setMedia(COMPACT_QUERY, false));

        expect(localStorage.getItem("autosaveEnabled")).toBe("false");
        expect(localStorage.getItem("darkMode")).toBe("true");
        expect(screen.getAllByRole("button", {name: "Toggle Auto Save"})).toHaveLength(1);
        expect(screen.getAllByRole("button", {name: "Toggle Dark Mode"})).toHaveLength(1);
    });
});
