const logger = require("../utils/logger");

// ==========================
// Get Seat Locator (FIXED)
// ==========================
function getSeatLocator(page, row, column) {

    return page.getByRole("button", {
        name: new RegExp(`row ${row}, column ${column}(,|$)`, "i")
    });
}

// ==========================
// Check Seat Availability
// ==========================
async function isSeatAvailable(page, row, column) {

    const seat = getSeatLocator(page, row, column);

    const count = await seat.count();

    if (count === 0) {
        return false;
    }

    const label = await seat.first().getAttribute("aria-label");

    return label.toLowerCase().includes("available");
}

// ==========================
// Click Seat
// ==========================
async function clickSeat(page, row, column) {

    logger.step(`Selecting Seat ${row}${column}...`);

    const seat = getSeatLocator(page, row, column);

    await seat.first().click();

    logger.success(`Seat ${row}${column} selected successfully.`);

    return true;
}

// ==========================
// Check Seat Once
// ==========================
async function checkSeatOnce(page, row, column) {

    logger.step(`Checking Seat ${row}${column}...`);

    const available = await isSeatAvailable(page, row, column);

    if (!available) {

        logger.warning(`Seat ${row}${column} is unavailable.`);
        return false;

    }

    logger.success(`Seat ${row}${column} is available.`);

    return await clickSeat(page, row, column);
}

// ==========================
module.exports = {
    getSeatLocator,
    isSeatAvailable,
    clickSeat,
    checkSeatOnce
};