import {defineConfig, devices} from "@playwright/test"

// Browser-level end-to-end suite: `npm run test:e2e`. The Node suite (`npm test`) is separate.
const port = Number(process.env.E2E_PORT || 8765)

export default defineConfig({
    testDir: "test/e2e",
    testMatch: "**/*.spec.js",
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? "github" : "list",
    use: {
        baseURL: `http://127.0.0.1:${port}`,
        trace: "retain-on-failure"
    },
    projects: [
        {name: "chromium", use: {...devices["Desktop Chrome"]}}
    ],
    webServer: {
        command: `node test/e2e/server.js ${port}`,
        url: `http://127.0.0.1:${port}/test/e2e/harness.html`,
        reuseExistingServer: !process.env.CI
    }
})
