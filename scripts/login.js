const { chromium } = require("playwright");

async function login() {

    const browser = await chromium.launch({
        channel: "chrome",
        headless: false,
        args: ["--start-maximized"]
    });

    const context = await browser.newContext({
        viewport: null
    });

    const page = await context.newPage();

    await page.goto("https://www.district.in", {
        waitUntil: "networkidle"
    });

    console.log("\n========================================");
    console.log("Login to District");
    console.log("========================================");
    console.log("Complete the login manually.");
    console.log("After login, press ENTER in the terminal.");

    process.stdin.resume();

    process.stdin.once("data", async () => {

        await context.storageState({
            path: "storage/district.json"
        });

        console.log("\n✅ Login session saved successfully!");

        await browser.close();

        process.exit();

    });

}

login();