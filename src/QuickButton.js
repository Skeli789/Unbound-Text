import React, {Component} from 'react';
import {Button, OverlayTrigger} from "react-bootstrap";

import "./styles/Editor.css";


export class QuickButton extends Component
{
    constructor(props)
    {
        super(props);

        this.text = props.text;
        this.tooltip = props.tooltip;
        this.func = props.func;
    }

    render()
    {
        return (
            <OverlayTrigger placement="top" overlay={this.tooltip}>
                <Button variant="secondary" className="quick-button" onClick={() => this.func(this.text)}>{this.text.replaceAll("[]", "")}</Button>
            </OverlayTrigger>
        )
    }
}

export default QuickButton;
