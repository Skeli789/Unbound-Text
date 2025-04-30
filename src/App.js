import React, {useEffect, useState} from "react";
import {enable as enableDarkMode, disable as disableDarkMode,
        auto as followSystemColorScheme, setFetchMethod as darkModeSetFetchMethod} from "darkreader";

//This CSS must go above the module imports!
import "bootstrap/dist/css/bootstrap.min.css";

import EditorPage from "./EditorPage";

//This CSS must go below the module imports!
import 'semantic-ui-css/semantic.min.css';
import './styles/App.css';

function App()
{
    let [loaded, setLoaded] = useState(false); //State to track if the app is loaded

    //Run when the component mounts
    useEffect(() =>
    {
        //Enable or disable dark mode if it was set explicitly
        darkModeSetFetchMethod(window.fetch);
        if (localStorage.getItem("darkMode") === "true")
            enableDarkMode();
        else if (localStorage.getItem("darkMode") === "false")
            disableDarkMode();
        else //Otherwise, follow the system color scheme
            followSystemColorScheme();

        //Ready to load the app
        setLoaded(true);
    }, []);

    return (
        <div className="app">
        {
            loaded &&
                <EditorPage />
        }
        </div>
    );
}

export default App;
