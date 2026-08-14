const logger = require("../utils/logger");

// ============================================================
// WAIT FOR PAGE TO BE READY
// ============================================================
async function waitForPageReady(page, timeout = 30000) {

    logger.info("Waiting for page to finish loading...");

    try {

        // ----------------------------------------------------
        // 1. DOM CONTENT LOADED
        // ----------------------------------------------------
        await page.waitForLoadState("domcontentloaded", {
            timeout
        }).catch(() => {});


        // ----------------------------------------------------
        // 2. FULL PAGE LOAD
        // ----------------------------------------------------
        await page.waitForLoadState("load", {
            timeout
        }).catch(() => {});


        // ----------------------------------------------------
        // 3. DOCUMENT READY STATE
        // ----------------------------------------------------
        await page.waitForFunction(
            () => document.readyState === "complete",
            {
                timeout
            }
        ).catch(() => {});


        // ----------------------------------------------------
        // 4. SMALL RENDER BUFFER
        // ----------------------------------------------------
        await page.waitForTimeout(1000);


        logger.success("Page is ready.");

    } catch (err) {

        logger.warning(
            "Page readiness check timed out. Continuing..."
        );
    }
}


// ============================================================
// PROCEED TO PAYMENT
// ============================================================
async function proceedToPayment(page) {

    logger.step("Proceeding to Payment...");

    try {

        // Wait for current page to settle
        await waitForPageReady(page);


        // ----------------------------------------------------
        // FIND PROCEED BUTTON
        // ----------------------------------------------------
        const proceedBtn = page.locator(
            "button:has-text('Proceed')"
        ).first();


        await proceedBtn.waitFor({
            state: "visible",
            timeout: 15000
        });


        logger.info(
            "Proceed button is visible."
        );


        // ----------------------------------------------------
        // WAIT UNTIL BUTTON IS ENABLED
        // ----------------------------------------------------
        try {

            await page.waitForFunction(
                (button) => {
                    return (
                        button &&
                        !button.disabled &&
                        button.getAttribute("aria-disabled") !== "true"
                    );
                },
                await proceedBtn.elementHandle(),
                {
                    timeout: 10000
                }
            );

        } catch (err) {

            logger.warning(
                "Could not verify Proceed button enabled state. Continuing..."
            );
        }


        // ----------------------------------------------------
        // CLICK
        // ----------------------------------------------------
        logger.info(
            "Clicking Proceed..."
        );

        await proceedBtn.click();


        logger.success(
            "Proceed action completed."
        );


        // ----------------------------------------------------
        // WAIT FOR NEXT PAGE / STATE
        // ----------------------------------------------------
        await waitForPageReady(page);

    } catch (err) {

        logger.error(
            `Proceed button failed: ${err.message}`
        );

        throw err;
    }
}


// ============================================================
// SKIP FOOD & BEVERAGES
// ============================================================

async function skipBeverages(page) {

    logger.step("Skipping Food & Beverages...");

    try {

        await waitForPageReady(page);

        const skipBtn = page.getByRole("button", {
            name: "Skip",
            exact: true
        });

        await skipBtn.waitFor({
            state: "visible",
            timeout: 15000
        });

        logger.info("Skip button is visible.");

        await skipBtn.click();

        logger.success("Food & Beverages skipped.");

        await waitForPageReady(page);

        return true;

    } catch (err) {

        logger.warning(
            `Skip button could not be clicked: ${err.message}`
        );

        return false;
    }
}

// ============================================================
// CLOSE BEST SEATS POPUP
// ============================================================
async function closeBestSeatsPopup(page) {

    try {

        const closeBtn = page.locator(
            "[data-testid='close-icon']"
        ).first();


        if (
            await closeBtn.count() > 0 &&
            await closeBtn.isVisible().catch(() => false)
        ) {

            logger.step(
                "Closing Best Seats popup..."
            );


            await closeBtn.click();


            logger.success(
                "Best Seats popup closed."
            );
        }

    } catch (err) {

        // Optional popup.
        logger.info(
            "No Best Seats popup found."
        );
    }
}


// ============================================================
// CLOSE ANY GENERIC POPUP
// ============================================================
async function closeAnyPopup(page) {

    try {

        const buttons = page.locator("button");

        const count = await buttons.count();


        for (let i = 0; i < count; i++) {

            const btn = buttons.nth(i);


            if (
                !(await btn.isVisible().catch(() => false))
            ) {
                continue;
            }


            const text = (
                await btn.innerText().catch(() => "")
            )
                .trim()
                .toLowerCase();


            if (
                text.includes("close") ||
                text.includes("no thanks")
            ) {

                await btn.click();


                logger.info(
                    `Closed popup using button: "${text}"`
                );

                break;
            }
        }

    } catch (err) {

        // Optional popup.
        logger.info(
            "No generic popup needed to be closed."
        );
    }
}


// ============================================================
// EXPORTS
// ============================================================
module.exports = {

    proceedToPayment,

    skipBeverages,

    closeBestSeatsPopup,

    closeAnyPopup,

    waitForPageReady

};