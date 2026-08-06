const logger = require("../utils/logger");

// Find Seat using Row and Column

async function findSeat(page, row, column) {

    const seat = page.locator(
        `[aria-label*="row ${row}, column ${column}"]`
    );

    return seat;

}

// Check Seat Availability

async function isSeatAvailable(page, row, column) {

    const seat = await findSeat(page, row, column);

    const label = await seat.getAttribute("aria-label");

    return label.startsWith("available");

}

// Click Seat

async function clickSeat(page, row, column) {

    logger.step(`Selecting Seat ${row}${column}...`);

    const seat = await findSeat(page, row, column);

    await seat.click();

    logger.success(`Seat ${row}${column} selected successfully.`);

    return true;

}

// Check Seat Once

async function checkSeatOnce(page, row, column) {

    logger.step(`Checking Seat ${row}${column}...`);

    const available = await isSeatAvailable(
        page,
        row,
        column
    );

    if (!available) {

        logger.warning(`Seat ${row}${column} is unavailable.`);

        return false;

    }

    logger.success(`Seat ${row}${column} is available.`);

    const clicked = await clickSeat(
        page,
        row,
        column
    );

    return clicked;

}

module.exports = {
    findSeat,
    isSeatAvailable,
    clickSeat,
    checkSeatOnce
};