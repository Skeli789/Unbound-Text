/**
 * This file defines the notification context and provider.
 * It shows short status messages from any component below the provider as react-toastify toasts.
 */

import React, {createContext, useCallback, useMemo, useRef} from 'react';
import {ToastContainer, toast} from 'react-toastify';
import {useTheme} from '@mui/material';

import 'react-toastify/dist/ReactToastify.css';

/** Default durations in milliseconds */
const SUCCESS_DURATION = 3000; //Confirmations clear themselves quickly
const ERROR_DURATION = 6000; //Errors stay long enough to read and can also be dismissed
const TOAST_LIMIT = 3;

/** Context used to send notifications. The default value does nothing when no provider is present. */
export const NotificationContext = createContext({
    notify: () => null,
    dismissNotification: () => {},
});


/**
 * Provides the notify and dismissNotification functions and renders the toast container.
 * @param {Object} props - The props object containing the component's properties.
 * @param {React.ReactNode} props.children - The content that can send notifications.
 * @returns {JSX.Element} The rendered provider.
 */
export function NotificationProvider({children})
{
    const theme = useTheme();
    const nextId = useRef(0); //Unique ids so repeated messages are separate entries

    /**
     * Shows a toast at the bottom right of the page.
     * @param {Object} options - The notification options.
     * @param {string} options.message - The text to show.
     * @param {"success"|"info"|"warning"|"error"} [options.severity="info"] - The severity of the notification.
     * @param {number} [options.duration] - Milliseconds before the notification is dismissed automatically.
     * @param {string} [options.role] - The ARIA role; errors default to alert and other severities to status.
     * @returns {string} The id of the notification.
     */
    const notify = useCallback(({message, severity = "info", duration, role}) =>
    {
        const id = `notification-${++nextId.current}`;
        const autoClose = duration ?? ((severity === "error") ? ERROR_DURATION : SUCCESS_DURATION);
        toast(message, {
            toastId: id,
            type: severity,
            autoClose,
            role: role ?? ((severity === "error") ? "alert" : "status"),
        });
        return id;
    }, []);

    /**
     * Removes a notification from the screen.
     * @param {string} id - The id returned by notify.
     */
    const dismissNotification = useCallback((id) =>
    {
        toast.dismiss(id);
    }, []);

    const value = useMemo(() => ({notify, dismissNotification}), [notify, dismissNotification]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
            <ToastContainer
                position="bottom-right"
                limit={TOAST_LIMIT}
                theme={theme.palette.mode}
                newestOnTop={false}
            />
        </NotificationContext.Provider>
    );
}

export default NotificationProvider;
