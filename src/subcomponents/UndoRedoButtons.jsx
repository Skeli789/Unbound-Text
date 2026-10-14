/**
 * This file defines the UndoRedoButtons component.
 * It is used to render undo and redo buttons for the editor.
 */

import React, {Component} from 'react';
import {IconButton, Tooltip} from "@mui/material";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";

import {ACTIVE_CONTROL_SX, CONTROL_BUTTON_SX} from "../AppTheme";


export class UndoRedoButtons extends Component
{
    /**
     * Represents the UndoRedoButtons component.
     * @constructor
     * @param {Object} props - The props object containing the component's properties.
     * @param {Array} props.undoStack - The undo stack array.
     * @param {Array} props.redoStack - The redo stack array.
     * @param {Function} props.undo - The function to call when the undo button is clicked.
     * @param {Function} props.redo - The function to call when the redo button is clicked.
     */
    constructor(props)
    {
        super(props);
        this.compactQuery = window.matchMedia?.("(max-width: 640px)");
        this.state = {isCompact: Boolean(this.compactQuery?.matches)};
        this.buttonsRef = React.createRef();
        this.updateViewportOffset = this.updateViewportOffset.bind(this);
        this.updateTooltipPlacement = this.updateTooltipPlacement.bind(this);
    }

    /**
     * Tracks keyboard, scrolling and footer size changes affecting the floating controls.
     */
    componentDidMount()
    {
        this.updateViewportOffset();
        this.compactQuery?.addEventListener("change", this.updateTooltipPlacement);
        window.addEventListener("resize", this.updateViewportOffset);
        document.addEventListener("scroll", this.updateViewportOffset, true);
        window.visualViewport?.addEventListener("resize", this.updateViewportOffset);
        window.visualViewport?.addEventListener("scroll", this.updateViewportOffset);
        const footer = document.querySelector(".footer");
        if (footer && typeof window.ResizeObserver === "function")
        {
            this.footerObserver = new window.ResizeObserver(this.updateViewportOffset);
            this.footerObserver.observe(footer);
        }
    }

    /**
     * Refreshes clearance after history changes alter the controls or editor layout.
     */
    componentDidUpdate()
    {
        this.updateViewportOffset();
    }

    /**
     * Releases viewport and document listeners and the footer observer.
     */
    componentWillUnmount()
    {
        this.compactQuery?.removeEventListener("change", this.updateTooltipPlacement);
        window.removeEventListener("resize", this.updateViewportOffset);
        document.removeEventListener("scroll", this.updateViewportOffset, true);
        window.visualViewport?.removeEventListener("resize", this.updateViewportOffset);
        window.visualViewport?.removeEventListener("scroll", this.updateViewportOffset);
        this.footerObserver?.disconnect();
    }

    /**
     * Matches tooltip placement to the horizontal or side-column button layout.
     * @param {MediaQueryListEvent} event - Whether the narrow editor breakpoint matches.
     */
    updateTooltipPlacement(event)
    {
        this.setState({isCompact: event.matches});
    }

    /**
     * Keeps floating controls above the keyboard and any footer in the visible viewport.
     */
    updateViewportOffset()
    {
        const viewport = window.visualViewport;
        const visibleTop = viewport?.offsetTop || 0;
        const visibleBottom = viewport ? viewport.height + visibleTop : window.innerHeight;
        const footer = document.querySelector(".footer")?.getBoundingClientRect();
        const controlsBottom = footer && footer.top < visibleBottom && footer.bottom > visibleTop
            ? footer.top : visibleBottom;
        const bottomOffset = Math.max(0, window.innerHeight - controlsBottom);
        this.buttonsRef.current?.style.setProperty("--undo-redo-bottom-offset", `${bottomOffset}px`);
    }

    /**
     * Prevents a pointer press from blurring the editor and dismissing its keyboard.
     * @param {React.SyntheticEvent} event - The pointer or mouse press on a history button.
     */
    preserveEditorFocus(event)
    {
        event.preventDefault();
    }

    /**
     * Renders an undo or redo button with its tooltip.
     * @param {string} label - The accessible name and tooltip of the button.
     * @param {React.ReactNode} icon - The icon shown in the button.
     * @param {boolean} enabled - Whether the action is available.
     * @param {Function} onClick - Called when the button is clicked.
     * @returns {JSX.Element} The rendered button.
     */
    renderButton(label, icon, enabled, onClick)
    {
        return (
            <Tooltip title={label} placement={this.state.isCompact ? "top" : "right"} arrow enterTouchDelay={0} describeChild>
                <span>
                    <IconButton aria-label={label} disabled={!enabled} onClick={onClick}
                                onPointerDown={this.preserveEditorFocus} onMouseDown={this.preserveEditorFocus}
                                sx={[CONTROL_BUTTON_SX, enabled && ACTIVE_CONTROL_SX]}>
                        {icon}
                    </IconButton>
                </span>
            </Tooltip>
        );
    }

    /**
     * Renders the UndoRedoButtons component.
     * @returns {JSX.Element} The rendered component.
     */
    render()
    {
        const canUndo = this.props.undoStack.length > 0;
        const canRedo = this.props.redoStack.length > 0;

        return (
            <div className="undo-redo-buttons" ref={this.buttonsRef} hidden={!canUndo && !canRedo}>
                {this.renderButton("Undo", <UndoIcon fontSize="small" />, canUndo, () => this.props.undo())}
                {this.renderButton("Redo", <RedoIcon fontSize="small" />, canRedo, () => this.props.redo())}
            </div>
        );
    }
}

export default UndoRedoButtons;
