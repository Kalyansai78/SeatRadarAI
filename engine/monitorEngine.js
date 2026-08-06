const {
    checkSeatOnce
} = require("./seatEngine");

// Monitor Multiple Seats

async function monitorSeats(page, seats) {

    console.log("\nStarting Seat Monitoring...\n");

    for (const seat of seats) {

        console.log(
            `Checking ${seat.row}${seat.column}...`
        );

        const available = await checkSeatOnce(
            page,
            seat.row,
            seat.column
        );

        if (available) {

            console.log(
                `\nSeat ${seat.row}${seat.column} booked successfully.`
            );

            return true;

        }

    }

    console.log("\nNo preferred seats are available.");

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

        console.log("\n==============================");
        console.log(`Attempt ${attempt} of ${maxAttempts}`);
        console.log("==============================");

        const seatFound = await monitorSeats(
            page,
            seats
        );

        if (seatFound) {

            console.log("\nMonitoring Completed Successfully.");

            return true;

        }

        console.log("\nNo seats found in this attempt.");

        // Wait before next attempt
        if (attempt < maxAttempts) {

            console.log(
                `Waiting ${interval / 1000} seconds before next attempt...\n`
            );

            await page.waitForTimeout(interval);

            console.log("Refreshing Seat Map...\n");

            await page.reload({
                waitUntil: "networkidle"
            });

        }

    }

    console.log("\nMonitoring Finished.");

    return false;

}

module.exports = {
    monitorSeats,
    startMonitoring
};