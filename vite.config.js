import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {defineConfig as defineTestConfig} from "vitest/config";

export default defineConfig(
    {
        root: ".",
        publicDir: "public",
        base: "/Unbound-Text/",
        plugins: [react()],
        server:
        {
            //Forwards browser console messages to the terminal to help debugging
            forwardConsole:
            {
                unhandledErrors: true,
                logLevels: ['warn', 'error'],
            },
        },
        test: defineTestConfig(
            {
                globals: true,
                setupFiles: "./src/tests/SetupTests.js",
                environment: "jsdom"
            }
        ),
    }
);
