import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {defineConfig as defineTestConfig} from "vitest/config";

// Determine the base path based on the environment
const isGitHubPages = process.env.VITE_DEPLOY_ENV === "gh-pages";

export default defineConfig(
    {
        root: ".",
        publicDir: "public",
        base: isGitHubPages ? "/Unbound-Text/crown/" : "/", // Use GitHub Pages base path with crown subdirectory
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
