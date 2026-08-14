const { chromium } = require("playwright");
const logger = require("../utils/logger");

// ============================================================
// OPEN DISTRICT
// ============================================================
async function openDistrict() {

    logger.info("Launching Chrome...");

    const browser = await chromium.launch({

        channel: "chrome",

        headless: false,

        args: [
            "--start-maximized"
        ]

    });

    logger.info("Creating browser context...");

    const context = await browser.newContext({

        viewport: null,

        permissions: [],

        storageState: "storage/district.json"

    });

    const page = await context.newPage();

    // ========================================================
    // OPEN WEBSITE
    // ========================================================

    logger.info("Opening District...");

    await page.goto(
        "https://www.district.in",
        {
            waitUntil: "domcontentloaded",
            timeout: 60000
        }
    );

    logger.info(
        "Initial document loaded."
    );

    // ========================================================
    // WAIT FOR FULL BROWSER LOAD
    // ========================================================

    try {

        await page.waitForLoadState(
            "load",
            {
                timeout: 30000
            }
        );

        logger.info(
            "Browser load event completed."
        );

    } catch (err) {

        logger.warning(
            "Browser load event took longer than expected. Continuing..."
        );
    }


    // ========================================================
    // WAIT FOR DOCUMENT READY STATE
    // ========================================================

    try {

        await page.waitForFunction(
            () => document.readyState === "complete",
            {
                timeout: 30000
            }
        );

        logger.info(
            "Document readyState = complete."
        );

    } catch (err) {

        logger.warning(
            "Document did not reach readyState=complete within timeout."
        );
    }


    // ========================================================
    // WAIT FOR DISTRICT UI
    // ========================================================
    //
    // Instead of simply waiting 3 seconds, we wait for an
    // actual District UI element.
    //
    // The location button normally has:
    // button[data-district-ui="true"][aria-label]
    //
    // ========================================================

    const locationButton = page.locator(
        'button[data-district-ui="true"][aria-label]'
    ).first();

    try {

        await locationButton.waitFor({

            state: "visible",

            timeout: 30000

        });

        logger.success(
            "District main UI is ready."
        );

    } catch (err) {

        logger.warning(
            "District location UI was not detected within 30 seconds."
        );

        // Don't immediately crash.
        // The page may still be rendering.
        await page.waitForTimeout(3000);
    }


    // ========================================================
    // SMALL FINAL RENDER BUFFER
    // ========================================================

    await page.waitForTimeout(1500);

    logger.success(
        "District page initialization completed."
    );


    // ========================================================
    // RETURN
    // ========================================================

    return {

        browser,

        context,

        page

    };
}


// ============================================================
// EXPORT
// ============================================================

module.exports = {

    openDistrict

};