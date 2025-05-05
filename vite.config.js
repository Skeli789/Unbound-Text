import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {defineConfig as defineTestConfig} from "vitest/config";

export default defineConfig(
    {
        root: ".",
        publicDir: "public",
        base: "/Unbound-Text/",
        plugins: [react()],
        test: defineTestConfig(
            {
                globals: true,
                setupFiles: "./src/tests/SetupTests.js",
                environment: "jsdom"
            }
        ),
    }
);
