const { chromium } = require("playwright");

async function openDistrict() {

    const browser = await chromium.launch({
        channel: "chrome",
        headless: false
    });

    const context = await browser.newContext({
        permissions: []
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