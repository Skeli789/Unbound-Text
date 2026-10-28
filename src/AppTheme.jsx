/**
 * This file defines the MUI theme, the dark mode preference storage, and the theme provider.
 * A stored "true" or "false" overrides the system colour scheme. Without a stored value, the system colour scheme is followed.
 */

import React, {useLayoutEffect, useMemo} from 'react';
import {createTheme, CssBaseline, ThemeProvider} from '@mui/material';

/** Local storage key for the dark mode override */
const DARK_MODE_STORAGE_KEY = "darkMode";

/** Media query for the system dark colour scheme */
const SYSTEM_DARK_QUERY = "(prefers-color-scheme: dark)";

/** Shape of the icon buttons that show a usable action or an active setting */
export const CONTROL_BUTTON_SX = {borderRadius: "6px"};

/** Blue highlight for an enabled control; the doubled selectors outrank the header button colour rule */
export const ACTIVE_CONTROL_SX =
{
    "&&": {backgroundColor: "#1976d2", color: "#ffffff"},
    "&&:hover": {backgroundColor: "#1565c0"},
    "&&.Mui-focusVisible": {outline: "2px solid var(--focus)", outlineOffset: "2px"},
};


// Stored dark mode preference
/**
 * Reads the stored dark mode override.
 * @returns {boolean|null} true or false if set explicitly, otherwise null to follow the system.
 */
export function GetStoredDarkMode()
{
    const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY);
    if (stored === "true")
        return true;
    if (stored === "false")
        return false;
    return null;
}

/**
 * Saves an explicit dark mode choice so it overrides the system colour scheme.
 * @param {boolean} darkMode - Whether dark mode is enabled.
 */
export function StoreDarkMode(darkMode)
{
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(darkMode));
}

// System colour scheme
/**
 * Gets the system colour scheme media query list, if the browser supports it.
 * @returns {MediaQueryList|null} The media query list, or null if unavailable.
 */
function GetSystemQuery()
{
    if (typeof window === "undefined" || typeof window.matchMedia !== "function")
        return null;
    return window.matchMedia(SYSTEM_DARK_QUERY);
}

/**
 * Checks whether the system prefers dark mode.
 * @returns {boolean} true if the system prefers dark mode, otherwise false.
 */
export function IsSystemDarkMode()
{
    const query = GetSystemQuery();
    return query ? query.matches : false;
}

/**
 * Calls back whenever the system colour scheme changes.
 * @param {Function} callback - Called with true for dark mode or false for light mode.
 * @returns {Function} A function that stops watching the system colour scheme.
 */
export function WatchSystemDarkMode(callback)
{
    const query = GetSystemQuery();
    if (!query)
        return () => {};

    const listener = (event) => callback(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
}

// MUI theme and provider
/**
 * Creates the MUI theme for the given mode.
 * @param {boolean} darkMode - Whether to create the dark theme.
 * @returns {Object} The MUI theme.
 */
export function CreateAppTheme(darkMode)
{
    return createTheme({
        shape: {borderRadius: 6},
        palette: {
            mode: darkMode ? "dark" : "light",
            primary: {
                main: darkMode ? "#20c7e857" : "#20c8e8",
                contrastText: "#ffffff",
            },
            error: {main: darkMode ? "#f87171" : "#b91c1c"},
            background: darkMode
                ? {default: "#0f1113", paper: "#1a1d21"}
                : {default: "#f3f4f6", paper: "#ffffff"},
        },
        typography: {
            fontFamily: '"Trebuchet MS", "Lucida Grande", sans-serif',
            button: {textTransform: "none"},
        },
    });
}

/**
 * Provides the MUI theme and applies the global baseline styles.
 * Also sets a data attribute on the document root so plain CSS can target the current mode.
 * @param {Object} props - The props object containing the component's properties.
 * @param {boolean} props.darkMode - Whether dark mode is enabled.
 * @param {React.ReactNode} props.children - The content to render with the theme.
 * @returns {JSX.Element} The rendered provider.
 */
export function AppThemeProvider({darkMode, children})
{
    const theme = useMemo(() => CreateAppTheme(darkMode), [darkMode]);

    //Set before paint so the plain CSS dark mode rules apply immediately
    useLayoutEffect(() =>
    {
        document.documentElement.dataset.colorMode = darkMode ? "dark" : "light";
    }, [darkMode]);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline enableColorScheme />
            {children}
        </ThemeProvider>
    );
}

export default AppThemeProvider;
