import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './styles/index.css';

//Get the root element from the DOM
const container = document.getElementById('root');

//Create a root
const root = createRoot(container);

//Initial render
root.render(<App />);

const styleLink = document.createElement("link");
styleLink.rel = "stylesheet";
styleLink.href = "https://cdn.jsdelivr.net/npm/semantic-ui/dist/semantic.min.css"; //For search dropdown
document.head.appendChild(styleLink);
