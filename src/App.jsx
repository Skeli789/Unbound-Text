/**
 * This file defines the the application start point.
 * It contains the main component and handles the theme and dark mode settings.
 */

import React, {useEffect, useState} from "react";

import {AppThemeProvider, GetStoredDarkMode, IsSystemDarkMode, StoreDarkMode, WatchSystemDarkMode} from "./AppTheme";
import EditorPage from "./EditorPage";
import Footer from "./Footer";
import Header from "./Header";
import {NotificationProvider} from "./NotificationContext";

//This CSS must go below the module imports!
import './styles/App.css';


/**
 * Renders the application with the theme and dark mode state.
 * @returns {JSX.Element} The rendered app.
 */
function App()
{
    //Use the stored choice if there is one, otherwise follow the system colour scheme
    let [darkMode, setDarkMode] = useState(() => GetStoredDarkMode() ?? IsSystemDarkMode());

    //Follow system colour scheme changes only while the user has not chosen a mode
    useEffect(() => WatchSystemDarkMode((systemDarkMode) =>
    {
        if (GetStoredDarkMode() === null)
            setDarkMode(systemDarkMode);
    }), []);

    /**
     * Saves an explicit choice so it overrides the system colour scheme, then applies it.
     * @param {boolean} enabled - Whether dark mode is enabled.
     */
    const toggleDarkMode = (enabled) =>
    {
        StoreDarkMode(enabled);
        setDarkMode(enabled);
    };

    return (
        <AppThemeProvider darkMode={darkMode}>
            <NotificationProvider>
                <div className="app">
                    <Header darkMode={darkMode} toggleParentDarkMode={toggleDarkMode} />
                    <main className="main-container">
                        <EditorPage darkMode={darkMode} />
                        <Footer />
                    </main>
                </div>
            </NotificationProvider>
        </AppThemeProvider>
    );
}

export default App;
