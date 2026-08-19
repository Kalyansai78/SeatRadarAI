const {
    checkPreferredSeats
} = require("./seatEngine");

const logger = require("../utils/logger");

// ============================================================
// MONITOR PREFERRED SEATS - ONE CHECK
// ============================================================
//
// IMPORTANT:
//
// This function ONLY checks availability.
//
// It does NOT select seats.
//
// Returns:
//
// {
//     available: true,
//     seatClass: "CLASSIC",
//     seats: [...]
// }
//
// OR:
//
// {
//     available: false,
//     seatClass: null,
//     seats: []
// }
// ============================================================

async function monitorSeats(
    page,
    row,
    count
) {

    logger.step(
        `Checking ${count} seat(s) in preferred row ${row}...`
    );


    try {

        const result =
            await checkPreferredSeats(
                page,
                row,
                count
            );


        if (!result) {

            logger.warning(
                `Requested ${count} seat(s) are not currently available in row ${row}.`
            );

            return {

                available: false,

                seatClass: null,

                seats: []
            };
        }


        logger.success(
            `Requested seats are available.`
        );


        return {

            available: true,

            seatClass:
                result.seatClass,

            seats:
                result.seats
        };


    } catch (error) {

        logger.warning(
            `Seat availability check failed: ${error.message}`
        );

        return {

            available: false,

            seatClass: null,

            seats: []
        };
    }
}


// ============================================================
// WAIT
// ============================================================

async function waitBeforeSeatCheck(
    page,
    interval
) {

    logger.wait(
        `Seats not available. Checking again in ${interval / 1000} seconds...`
    );


    await page.waitForTimeout(
        interval
    );
}


// ============================================================
// REFRESH SEAT MAP
// ============================================================
//
// We intentionally refresh the page.
//
// The purpose is to force District to retrieve the latest
// seat availability.
//
// After refresh we wait for the page to settle.
//
// NOTE:
// This function does NOT select anything.
// ============================================================

async function refreshSeatMap(
    page
) {

    try {

        logger.info(
            "Refreshing Seat Map..."
        );


        await page.reload({
            waitUntil: "domcontentloaded",
            timeout: 30000
        });


        await page.waitForLoadState(
            "load",
            {
                timeout: 30000
            }
        ).catch(() => {});


        await page.waitForFunction(
            () =>
                document.readyState ===
                "complete",
            {
                timeout: 30000
            }
        ).catch(() => {});


        await page.waitForTimeout(
            1500
        );


        logger.success(
            "Seat Map refreshed successfully."
        );


        return true;


    } catch (error) {

        logger.warning(
            `Seat Map refresh failed: ${error.message}`
        );

        return false;
    }
}


// ============================================================
// START SEAT MONITORING
// ============================================================
//
// interval:
//     milliseconds
//
// maxAttempts:
//
//     0 = unlimited
//
//     >0 = limited number of checks
//
// Example:
//
// startSeatMonitoring(
//     page,
//     "C",
//     3,
//     30000,
//     0
// );
//
// This means:
//
// Check row C
// Find 3 continuous seats
// Every 30 seconds
// Forever
// ============================================================

async function startMonitoring(
    page,
    row,
    count,
    interval = 60000,
    maxAttempts = 0
) {

    logger.step(
        `Monitoring ${count} seat(s) in row ${row}...`
    );


    let attempt = 0;


    while (true) {

        attempt++;


        // ----------------------------------------------------
        // ATTEMPT HEADER
        // ----------------------------------------------------

        if (maxAttempts > 0) {

            logger.title(
                `Seat Check ${attempt} / ${maxAttempts}`
            );

        } else {

            logger.title(
                `Seat Check ${attempt}`
            );
        }


        // ----------------------------------------------------
        // CHECK SEATS
        // ----------------------------------------------------

        const result =
            await monitorSeats(
                page,
                row,
                count
            );


        // ----------------------------------------------------
        // SEATS FOUND
        // ----------------------------------------------------

        if (result.available) {

            logger.success(
                `Requested seats are now available!`
            );


            logger.success(
                `Available seats: ` +
                result.seats
                    .map(
                        seat =>
                            `${seat.row}${seat.seatNumber}`
                    )
                    .join(", ")
            );


            return result;
        }


        // ----------------------------------------------------
        // MAX ATTEMPTS
        // ----------------------------------------------------

        if (
            maxAttempts > 0 &&
            attempt >= maxAttempts
        ) {

            logger.warning(
                `Requested seats were not available after ${maxAttempts} checks.`
            );


            return {

                available: false,

                seatClass: null,

                seats: []
            };
        }


        // ----------------------------------------------------
        // WAIT
        // ----------------------------------------------------

        await waitBeforeSeatCheck(
            page,
            interval
        );


        // ----------------------------------------------------
        // REFRESH
        // ----------------------------------------------------

        const refreshed =
            await refreshSeatMap(
                page
            );


        if (!refreshed) {

            logger.warning(
                "Could not refresh Seat Map. Continuing monitoring..."
            );
        }
    }
}


// ============================================================
// BACKWARD-COMPATIBLE ALIAS
// ============================================================
//
// Some existing code may call:
//
// startMonitoring()
//
// Keep the original export name.
//
// ============================================================

async function monitorPreferredSeats(
    page,
    row,
    count,
    interval = 60000,
    maxAttempts = 0
) {

    return startMonitoring(
        page,
        row,
        count,
        interval,
        maxAttempts
    );
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    monitorSeats,

    startMonitoring,

    monitorPreferredSeats,

    refreshSeatMap

};