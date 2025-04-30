import React, {Component} from 'react';
import {Button, OverlayTrigger} from "react-bootstrap";


export class QuickButton extends Component
{
    constructor(props)
    {
        super(props);
    }

    render()
    {
        return (
            <OverlayTrigger placement="top" overlay={this.props.tooltip}>
                <Button variant="secondary" className="quick-button" onClick={
                    () => this.props.func(this.props.text)}>{this.props.text.replaceAll("[]", "")
                }
                </Button>
            </OverlayTrigger>
        )
    }
}

export default QuickButton;
