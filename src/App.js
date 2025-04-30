import React, {useEffect, useState} from "react";
import {ToastContainer} from "react-toastify";
import {enable as enableDarkMode, disable as disableDarkMode, isEnabled as isDarkReaderEnabled,
        auto as followSystemColorScheme, setFetchMethod as darkModeSetFetchMethod} from "darkreader";

//This CSS must go above the module imports!
import "bootstrap/dist/css/bootstrap.min.css";

import EditorPage from "./EditorPage";
import Footer from "./Footer";
import Header from "./Header";

//This CSS must go below the module imports!
import 'semantic-ui-css/semantic.min.css';
import './styles/App.css';

const MIN_WIDTH = 450; //Minimum width to zoom out to


function App()
{
    let [loaded, setLoaded] = useState(false); //State to track if the app is loaded
    let [darkMode, setDarkMode] = useState(false); //State to track if dark mode is enabled

    //Run when the component mounts
    useEffect(() =>
    {
        //Automatically zoom out on page load if viewport width is less than the minimum width
        if (window.innerWidth < MIN_WIDTH)
        {
            // Calculate the new zoom ratio based on the window width
            let zoom = Math.min(window.innerWidth / MIN_WIDTH, 1);
            document.body.style.zoom = zoom.toString();
            console.log("Zooming out to " + Math.round(zoom * 100) + "%");
        }

        //Enable or disable dark mode if it was set explicitly
        darkModeSetFetchMethod(window.fetch);
        if (localStorage.getItem("darkMode") === "true")
            enableDarkMode();
        else if (localStorage.getItem("darkMode") === "false")
            disableDarkMode();
        else //Otherwise, follow the system color scheme
            followSystemColorScheme();
        setDarkMode(isDarkReaderEnabled());

        //Ready to load the app
        setLoaded(true);
    }, []);

    if (!loaded)
        return <div className="app" />;

    return (
        <div className="app">
            <Header />
            <EditorPage darkMode={darkMode} />
            <Footer darkMode={darkMode} toggleParentDarkMode={setDarkMode} />

            {/* Allow toast notifications */}
            <ToastContainer />
        </div>
    );
}

export default App;
