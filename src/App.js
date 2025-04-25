//This CSS must go above the module imports!
import "bootstrap/dist/css/bootstrap.min.css";

import EditorPage from "./EditorPage";

import './styles/App.css';
//import 'semantic-ui-css/semantic.min.css';

function App()
{
    return (
        <div className="app">
            <EditorPage/>
        </div>
    );
}

export default App;
