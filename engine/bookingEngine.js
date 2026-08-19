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

    logger.step("Checking Food & Beverages...");

    try {

        // ----------------------------------------------------
        // Give the F&B screen a moment to appear
        // ----------------------------------------------------
        await page.waitForTimeout(1500);


        // ----------------------------------------------------
        // 1. Preferred locator
        // ----------------------------------------------------
        let skipBtn = page.getByRole("button", {
            name: /^Skip$/i
        }).first();


        // ----------------------------------------------------
        // 2. Wait for the Skip button
        // ----------------------------------------------------
        try {

            await skipBtn.waitFor({
                state: "visible",
                timeout: 5000
            });

        } catch {

            // ------------------------------------------------
            // 3. Fallback locator
            // ------------------------------------------------
            logger.info(
                "Primary Skip locator not found. Trying fallback..."
            );

            skipBtn = page.locator("button").filter({
                hasText: /^\s*Skip\s*$/i
            }).first();

            await skipBtn.waitFor({
                state: "visible",
                timeout: 5000
            });
        }


        // ----------------------------------------------------
        // 4. Verify visibility
        // ----------------------------------------------------
        if (!(await skipBtn.isVisible())) {

            logger.info(
                "Food & Beverages screen not available. Continuing..."
            );

            return true;
        }


        logger.info("Skip button is visible.");


        // ----------------------------------------------------
        // 5. Scroll into view
        // ----------------------------------------------------
        await skipBtn.scrollIntoViewIfNeeded();


        // ----------------------------------------------------
        // 6. Click Skip
        // ----------------------------------------------------
        logger.info("Clicking Skip...");

        try {

            await skipBtn.click({
                timeout: 8000
            });

        } catch {

            logger.warning(
                "Normal Skip click failed. Retrying with force..."
            );

            await skipBtn.click({
                force: true,
                timeout: 5000
            });
        }


        // ----------------------------------------------------
        // 7. Wait for F&B screen to disappear
        // ----------------------------------------------------
        await page.waitForTimeout(1000);


        logger.success(
            "Food & Beverages skipped."
        );


        // ----------------------------------------------------
        // 8. Wait for next stage
        // ----------------------------------------------------
        await waitForPageReady(page);

        return true;

    } catch (error) {

        // ----------------------------------------------------
        // IMPORTANT:
        // We should NOT immediately say F&B is unavailable.
        // First check whether the Skip button actually exists.
        // ----------------------------------------------------

        const skipExists = await page.locator(
            "button"
        ).filter({
            hasText: /^\s*Skip\s*$/i
        }).count().catch(() => 0);


        if (skipExists > 0) {

            logger.warning(
                "Food & Beverages is present, but Skip could not be clicked."
            );

            return false;
        }


        logger.info(
            "Food & Beverages screen not present. Continuing..."
        );

        return true;
    }
}

// ============================================================
// HANDLE 18+ CONFIRMATION POPUP
// ============================================================

async function handleAgeConfirmation(page) {

    logger.step("Checking for age confirmation...");

    try {

        const confirmButton = page.getByRole("button", {
            name: "Confirm and proceed",
            exact: true
        }).first();

        // ----------------------------------------------------
        // Wait a short time because the popup can appear
        // slightly after the show is selected.
        // ----------------------------------------------------

        try {

            await confirmButton.waitFor({
                state: "visible",
                timeout: 8000
            });

        } catch {

            logger.info(
                "18+ confirmation popup not present."
            );

            return true;
        }


        // ----------------------------------------------------
        // POPUP FOUND
        // ----------------------------------------------------

        logger.info(
            "18+ confirmation popup detected."
        );

        logger.info(
            "Confirm and proceed button is visible."
        );


        // ----------------------------------------------------
        // CLICK CONFIRM
        // ----------------------------------------------------

        await confirmButton.click();


        logger.success(
            "18+ confirmation accepted."
        );


        // ----------------------------------------------------
        // WAIT FOR POPUP TO DISAPPEAR
        // ----------------------------------------------------

        try {

            await confirmButton.waitFor({
                state: "hidden",
                timeout: 5000
            });

        } catch {

            logger.warning(
                "18+ popup did not disappear immediately."
            );
        }


        // Give the seat page time to render
        await page.waitForTimeout(1500);


        return true;

    } catch (error) {

        logger.warning(
            `18+ confirmation handling failed: ${error.message}`
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
    handleAgeConfirmation,
    closeBestSeatsPopup,
    closeAnyPopup,
    waitForPageReady

};