const {
    checkSeatOnce
} = require("./seatEngine");

const logger = require("../utils/logger");

// Monitor Multiple Seats

async function monitorSeats(page, seats) {

    for (const seat of seats) {

        const available = await checkSeatOnce(
            page,
            seat.row,
            seat.column
        );

        if (available) {

            return true;

        }

    }

    logger.warning("No preferred seats are available.");

    return false;

}

// Start Monitoring

async function startMonitoring(
    page,
    seats,
    interval,
    maxAttempts
) {

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {

        logger.title(`Attempt ${attempt} / ${maxAttempts}`);

        const seatFound = await monitorSeats(
            page,
            seats
        );

        if (seatFound) {

            return true;

        }

        logger.warning("No seats found in this attempt.");

        if (attempt < maxAttempts) {

            logger.wait(
                `Waiting ${interval / 1000} seconds before next attempt...`
            );

            await page.waitForTimeout(interval);

            logger.info("Refreshing Seat Map...");

            await page.reload({
                waitUntil: "networkidle"
            });

        }

    }

    logger.error("Monitoring finished. No preferred seats were found.");

    return false;

}

module.exports = {
    monitorSeats,
    startMonitoring
};