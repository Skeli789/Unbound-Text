/**
 * This file defines the SettingToggleButton component.
 * It renders a settings toggle as an icon button in the header or as a labelled row in the settings popover.
 */

import React from 'react';
import {Button, IconButton, Tooltip} from '@mui/material';


/**
 * Renders a settings toggle.
 * @param {Object} props - The props object containing the component's properties.
 * @param {string} props.id - The id and test id of the button.
 * @param {string} props.ariaLabel - The accessible name of the button.
 * @param {boolean} props.pressed - Whether the setting is on.
 * @param {React.ReactNode} props.icon - The icon shown in the button.
 * @param {Function} props.onClick - Called when the button is clicked.
 * @param {string} [props.label] - Optional row label. When set, the whole row is one full-width button without a tooltip.
 * @param {string} props.tooltip - The tooltip shown on the icon button.
 * @param {number} [props.enterTouchDelay] - Touch hold time in milliseconds before the tooltip opens.
 * @param {Object} [props.sx] - Extra styles for the icon button.
 * @returns {JSX.Element} The rendered component.
 */
export function SettingToggleButton({id, ariaLabel, pressed, icon, onClick, label, tooltip, enterTouchDelay, sx})
{
    //The settings popover shows the whole row as one button, so the label, blank space and icon all toggle once
    if (label)
    {
        return (
            <Button id={id} data-testid={id} fullWidth
                    className={"settings-row " + id}
                    aria-label={ariaLabel} aria-pressed={pressed}
                    onClick={onClick}>
                <span>{label}</span>
                {icon}
            </Button>
        );
    }

    return (
        <Tooltip title={tooltip} placement="top" arrow enterTouchDelay={enterTouchDelay} describeChild>
            <IconButton id={id} data-testid={id}
                        className={"footer-button " + id}
                        aria-label={ariaLabel} aria-pressed={pressed}
                        sx={sx}
                        onClick={onClick}>
                {icon}
            </IconButton>
        </Tooltip>
    );
}

export default SettingToggleButton;
