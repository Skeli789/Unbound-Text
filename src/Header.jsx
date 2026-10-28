/**
 * This file defines the Header component.
 * It is used to display a header at the top of the page.
 * On narrow screens the settings controls move into a popover opened from a settings button.
 */

import React, {useEffect, useRef, useState} from "react";
import {AppBar, Box, IconButton, Popover, Stack, Toolbar, Tooltip, Typography, useMediaQuery} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

import AutoSaveButton from "./subcomponents/AutoSaveButton";
import DarkModeButton from "./subcomponents/DarkModeButton";

import "./styles/HeaderFooter.css";

//Must match the breakpoint in Editor.css so the layouts change together
const COMPACT_QUERY = "(max-width: 640px)";
const SETTINGS_POPOVER_ID = "settings-popover";


/**
 * Renders the Header component.
 * @param {Object} props - The props object containing the component's properties.
 * @param {boolean} props.darkMode - The current dark mode state.
 * @param {Function} props.toggleParentDarkMode - The function to toggle dark mode in the parent component.
 * @returns {JSX.Element} The rendered component.
 */
export function Header({darkMode, toggleParentDarkMode})
{
    // State
    const isCompact = useMediaQuery(COMPACT_QUERY, {noSsr: true});
    const [settingsAnchor, setSettingsAnchor] = useState(null);
    const settingsButtonRef = useRef(null);
    const isSettingsOpen = Boolean(settingsAnchor);

    // Effects
    //Close the popover when the wide layout returns so the settings controls are never mounted twice
    useEffect(() =>
    {
        if (!isCompact)
            setSettingsAnchor(null);
    }, [isCompact]);

    // Event handlers
    /**
     * Opens the settings popover below the settings button.
     * @param {React.MouseEvent<HTMLButtonElement>} event - The click event from the settings button.
     */
    const openSettings = (event) =>
    {
        event.currentTarget.blur(); //Chromium blocks aria-hidden on a focused opener
        setSettingsAnchor(event.currentTarget);
    };

    /**
     * Returns focus to the settings button once the popover has finished closing.
     */
    const restoreSettingsFocus = () =>
    {
        if (isCompact)
            settingsButtonRef.current?.focus();
    };

    // Render
    return (
        <AppBar position="static" component="header" elevation={0} color="primary" enableColorOnDark className="header">
            <Toolbar variant="dense" className="header-toolbar">
                <Typography variant="h6" component="h1" className="header-title">
                    Crown Text Editor
                </Typography>

                <Box className="header-actions">
                    {isCompact ? (
                        <>
                            <Tooltip title="Settings" placement="bottom" arrow describeChild>
                                <IconButton ref={settingsButtonRef} aria-label="Open settings" aria-haspopup="dialog"
                                            aria-controls={isSettingsOpen ? SETTINGS_POPOVER_ID : undefined}
                                            aria-expanded={isSettingsOpen}
                                            onClick={openSettings}>
                                    <MenuIcon />
                                </IconButton>
                            </Tooltip>
                            <Popover id={SETTINGS_POPOVER_ID} open={isSettingsOpen} anchorEl={settingsAnchor}
                                     onClose={() => setSettingsAnchor(null)}
                                     slotProps={{
                                         paper: {role: "dialog", "aria-label": "Settings"},
                                         transition: {onExited: restoreSettingsFocus},
                                     }}
                                     anchorOrigin={{vertical: "bottom", horizontal: "right"}}
                                     transformOrigin={{vertical: "top", horizontal: "right"}}>
                                <Stack className="settings-popover" role="group" aria-label="Settings">
                                    <AutoSaveButton label="Auto Save" />
                                    <DarkModeButton label={darkMode ? "Light Mode" : "Dark Mode"} darkMode={darkMode}
                                                    toggleParentDarkMode={toggleParentDarkMode} />
                                </Stack>
                            </Popover>
                        </>
                    ) : (
                        <>
                            <AutoSaveButton />
                            <DarkModeButton darkMode={darkMode}
                                            toggleParentDarkMode={toggleParentDarkMode} />
                        </>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default Header;
