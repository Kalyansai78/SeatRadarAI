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

    const available = await isSeatAvailable(page, row, column);

    if (!available) {

        console.log(`Seat ${row}${column} is not available.`);

        return false;

    }

    const seat = await findSeat(page, row, column);

    await seat.click();

    console.log(`Seat ${row}${column} selected successfully.`);

    return true;

}

// Check Seat Once

async function checkSeatOnce(page, row, column) {

    console.log(`Checking Seat ${row}${column}...`);

    const clicked = await clickSeat(page, row, column);

    if (clicked) {

        console.log(`Seat ${row}${column} is available.`);

        return true;

    }

    console.log(`Seat ${row}${column} is unavailable.`);

    return false;

}

module.exports = {
    findSeat,
    isSeatAvailable,
    clickSeat,
    checkSeatOnce
};