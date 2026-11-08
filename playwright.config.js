// Playwright settings. Uses the Chrome already installed on this computer
// (channel: "chrome"), so no browser download is needed.
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  reporter: "list",
  use: {
    baseURL: "http://localhost:8123",
    channel: "chrome",
    headless: true,
    locale: "en-US",
    timezoneId: "UTC",
  },
  webServer: {
    command: "node tests/server.js",
    url: "http://localhost:8123",
    reuseExistingServer: true,
  },
});
