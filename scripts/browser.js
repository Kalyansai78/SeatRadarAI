const { chromium } = require("playwright");

async function openDistrict() {

    const browser = await chromium.launch({
        channel: "chrome",
        headless: false,
        args: ["--start-maximized"]
    });

    const context = await browser.newContext({
        viewport: null,
        permissions: [],
        storageState: "storage/district.json"
    });

    const page = await context.newPage();

    await page.goto("https://www.district.in", {
        waitUntil: "networkidle"
    });

    return {
        browser,
        context,
        page
    };

}

module.exports = {
    openDistrict
};