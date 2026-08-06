const logger = require("../utils/logger");

// Proceed to Payment

async function proceedToPayment(page) {

    logger.step("Proceeding to Payment...");

    await page.getByRole("button", {
        name: "Proceed"
    }).click();

    logger.success("Proceed action completed.");

}

module.exports = {
    proceedToPayment
};