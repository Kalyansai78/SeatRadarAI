const logger = require("../utils/logger");

// Proceed to Payment

async function proceedToPayment(page) {

    logger.step("Proceeding to Payment...");

    await page.getByRole("button", {
        name: "Proceed"
    }).click();

    logger.success("Proceed action completed.");

}

// Skip Food & Beverages

async function skipBeverages(page) {

    logger.step("Skipping Food & Beverages...");

    const skipButton = page.getByRole("button", {
        name: "Skip"
    });

    await skipButton.waitFor();

    await skipButton.click();

    logger.success("Food & Beverages skipped.");

}

// Close Best Seats Popup

async function closeBestSeatsPopup(page) {

    const closeButton = page.getByTestId("close-icon");

    if (await closeButton.count() > 0) {

        logger.step("Closing Best Seats popup...");

        await closeButton.click();

        logger.success("Best Seats popup closed.");

    }

}

module.exports = {
    proceedToPayment,
    skipBeverages,
    closeBestSeatsPopup
};