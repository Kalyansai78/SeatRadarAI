const {
    openDistrict,
    openLocationPopup,
    searchCity,
    selectCity,
    openSearch,
    searchMovie,
    selectMovie,
    clickBookTickets,
    selectLanguage,
    clickProceed,
    selectDate
} = require("./district");


// ============================================================
// CONFIG
// ============================================================

const config =
    require("../config/config.json");


// ============================================================
// AVAILABILITY ENGINE
// ============================================================

const {
    findTheatre,
    getTheatreContainer,
    getAvailableSessions,
    findMatchingSession
} = require("../engine/availabilityEngine");


// ============================================================
// BOOKING ENGINE
// ============================================================

const {
    proceedToPayment,
    skipBeverages,
    handleAgeConfirmation,
    closeBestSeatsPopup
} = require("../engine/bookingEngine");


// ============================================================
// RELEASE ENGINE
// ============================================================

const {
    monitorBookingRelease,
    monitorTheatreRelease,
    monitorShowRelease
} = require("../engine/releaseEngine");


// ============================================================
// MONITOR ENGINE
// ============================================================

const {
    startMonitoring: startSeatMonitoring
} = require("../engine/monitorEngine");


// ============================================================
// SEAT ENGINE
// ============================================================

const {
    checkPreferredSeats,
    selectSeats
} = require("../engine/seatEngine");

const {
    notifyAndConfirm
} = require("./notifier");

const {
    prepareBookingReview
} = require("../engine/reviewEngine");

// ============================================================
// LOGGER
// ============================================================

const logger =
    require("../utils/logger");


// ============================================================
// READLINE
// ============================================================

const readline =
    require("readline");


// ============================================================
// VALIDATE CONFIG
// ============================================================

function validateConfig(config) {

    if (!config.movie) {
        throw new Error(
            "❌ Movie is missing in config.json"
        );
    }

    if (!config.city) {
        throw new Error(
            "❌ City is missing in config.json"
        );
    }

    if (!config.theatre) {
        throw new Error(
            "❌ Theatre is missing in config.json"
        );
    }

    if (!config.date) {
        throw new Error(
            "❌ Date is missing in config.json"
        );
    }

    if (!config.time) {
        throw new Error(
            "❌ Exact show time is missing in config.json"
        );
    }

    if (!config.seatPreference) {
        throw new Error(
            "❌ seatPreference is missing in config.json"
        );
    }

    if (!config.seatPreference.row) {
        throw new Error(
            "❌ Seat row is missing in config.json"
        );
    }

    if (!config.seatPreference.count) {
        throw new Error(
            "❌ Seat count is missing in config.json"
        );
    }

    if (!config.monitor) {
        throw new Error(
            "❌ monitor configuration is missing in config.json"
        );
    }

    if (
        typeof config.monitor.interval !== "number" ||
        config.monitor.interval <= 0
    ) {
        throw new Error(
            "❌ monitor.interval must be greater than 0."
        );
    }

    if (
        typeof config.monitor.maxAttempts !== "number" ||
        config.monitor.maxAttempts < 0
    ) {
        throw new Error(
            "❌ monitor.maxAttempts must be 0 or greater. Use 0 for unlimited monitoring."
        );
    }

    return true;
}


// ============================================================
// PRINT CONFIG
// ============================================================

function printConfig(config) {

    console.log(
        "\n🎬 SeatRadar AI - Smart Booking\n"
    );

    console.log(
        "======================================"
    );

    console.log(
        "        BOOKING CONFIGURATION"
    );

    console.log(
        "======================================"
    );

    console.log(
        `🎬 Movie      : ${config.movie}`
    );

    console.log(
        `📍 City       : ${config.city}`
    );

    console.log(
        `🏢 Theatre    : ${config.theatre}`
    );

    console.log(
        `📅 Date       : ${config.date}`
    );

    console.log(
        `🕒 Show Time  : ${config.time}`
    );

    console.log(
        `🎟️ Seats      : ${config.seatPreference.count}`
    );

    console.log(
        `🔤 Row        : ${config.seatPreference.row}`
    );

    console.log(
        `🌐 Language   : ${config.language || "Auto"}`
    );

    console.log(
        "======================================"
    );

    console.log(
        `⏱️ Monitor    : every ${
            config.monitor.interval / 1000
        } seconds`
    );

    console.log(
        `🔁 Attempts   : ${
            config.monitor.maxAttempts === 0
                ? "Unlimited"
                : config.monitor.maxAttempts
        }`
    );

    console.log(
        "======================================\n"
    );
}

// ============================================================
// NORMALIZE SEAT RESULT
// ============================================================
//
// checkPreferredSeats() returns:
//
// {
//     seatClass,
//     seats
// }
//
// monitorEngine returns:
//
// {
//     available,
//     seatClass,
//     seats
// }
//
// We normalize both into:
//
// {
//     available,
//     seatClass,
//     seats
// }
//
// ============================================================

function normalizeSeatResult(result) {

    if (
        !result ||
        !Array.isArray(result.seats) ||
        result.seats.length === 0
    ) {

        return {
            available: false,
            seatClass: null,
            seats: []
        };
    }

    return {
        available: true,
        seatClass: result.seatClass || null,
        seats: result.seats
    };
}


// ============================================================
// SELECT EXACT MONITORED SEATS
// ============================================================

async function selectMonitoredSeats(
    page,
    seatResult
) {

    if (
        !seatResult ||
        !seatResult.available ||
        !Array.isArray(seatResult.seats) ||
        seatResult.seats.length === 0
    ) {

        logger.error(
            "No monitored seats available for selection."
        );

        return false;
    }

    logger.step(
        "Selecting exact monitored seats..."
    );

    logger.info(
        `Seats to select: ${
            seatResult.seats
                .map(
                    seat =>
                        `${seat.row}${seat.seatNumber}`
                )
                .join(", ")
        }`
    );

    try {

        /*
         * IMPORTANT:
         *
         * Pass the original seat objects to seatEngine.
         *
         * The seat objects contain:
         *
         * row
         * seatNumber
         * column
         * seatClass
         *
         * seatEngine knows how to use the District
         * internal column correctly.
         */

        const selected =
            await selectSeats(
                page,
                seatResult.seats
            );

        if (!selected) {

            logger.error(
                "Seat engine could not select the monitored seats."
            );

            return false;
        }

        logger.success(
            "All monitored seats selected successfully."
        );

        return true;

    } catch (error) {

        logger.error(
            `Monitored seat selection failed: ${error.message}`
        );

        return false;
    }
}


// ============================================================
// MAIN
// ============================================================

async function run() {

    let browser = null;

    try {

        // ====================================================
        // VALIDATE CONFIG
        // ====================================================

        validateConfig(config);

        printConfig(config);


        // ====================================================
        // OPEN DISTRICT
        // ====================================================

        logger.info(
            "Opening District..."
        );

        const result =
            await openDistrict();

        browser =
            result.browser;

        const page =
            result.page;

        logger.success(
            "District Opened"
        );


        // ====================================================
        // SELECT CITY
        // ====================================================

        logger.info(
            "Selecting City..."
        );

        await openLocationPopup(
            page
        );

        await page.waitForTimeout(
            1000
        );

        await searchCity(
            page,
            config.city
        );

        await page.waitForTimeout(
            1000
        );

        await selectCity(
            page,
            config.city
        );

        await page.waitForTimeout(
            3000
        );


        // ====================================================
        // OPEN SEARCH
        // ====================================================

        logger.info(
            "Opening Search..."
        );

        const searchOpened =
            await openSearch(
                page
            );

        if (!searchOpened) {

            logger.warning(
                "Search interface was not opened."
            );
        }


        // ====================================================
        // SEARCH MOVIE
        // ====================================================

        logger.info(
            "Searching Movie..."
        );

        const movieSearchSuccess =
            await searchMovie(
                page,
                config.movie
            );

        if (!movieSearchSuccess) {

            logger.error(
                `❌ Unable to search for movie: ${config.movie}`
            );

            return;
        }


        // ====================================================
        // SELECT MOVIE
        // ====================================================

        logger.info(
            "Selecting Movie..."
        );

        const movieSelected =
            await selectMovie(
                page,
                config.movie
            );

        if (!movieSelected) {

            logger.error(
                `❌ Could not select movie: ${config.movie}`
            );

            return;
        }


        // ====================================================
        // BOOK TICKETS
        // ====================================================

        logger.info(
            "Clicking Book Tickets..."
        );

        await page.waitForTimeout(
            2000
        );

        await clickBookTickets(
            page
        );


        // ====================================================
        // LANGUAGE
        // ====================================================

        logger.info(
            "Selecting Language..."
        );

        await page.waitForTimeout(
            1000
        );

        const languageSelected =
            await selectLanguage(
                page,
                config.language
            );

        if (!languageSelected) {

            logger.error(
                "❌ Language selection failed."
            );

            return;
        }


        // ====================================================
        // PROCEED
        // ====================================================

        logger.info(
            "Clicking Proceed..."
        );

        await page.waitForTimeout(
            1000
        );

        await clickProceed(
            page
        );


        // ====================================================
        // DATE RELEASE MONITORING
        // ====================================================

        logger.info(
            `Checking requested date: ${config.date}`
        );

        const dateReleased =
            await monitorBookingRelease(
                page,
                config.date,
                config.monitor.interval,
                config.monitor.maxAttempts
            );

        if (!dateReleased) {

            logger.error(
                `❌ Requested date "${config.date}" is not available.`
            );

            logger.warning(
                "Booking flow stopped because requested date was not released."
            );

            return;
        }


        // ====================================================
        // SELECT DATE
        // ====================================================

        logger.info(
            `Selecting Date: ${config.date}`
        );

        await page.waitForTimeout(
            1000
        );

        const dateSelected =
            await selectDate(
                page,
                config.date
            );

        if (!dateSelected) {

            logger.error(
                `❌ Could not select date: ${config.date}`
            );

            return;
        }

        await page.waitForTimeout(
            2000
        );


        // ====================================================
        // THEATRE RELEASE MONITORING
        // ====================================================

        logger.info(
            `Checking requested theatre: ${config.theatre}`
        );

        const theatreReleased =
            await monitorTheatreRelease(
                page,
                config.theatre,
                config.monitor.interval,
                config.monitor.maxAttempts
            );

        if (!theatreReleased) {

            logger.error(
                `❌ Theatre "${config.theatre}" is not available.`
            );

            logger.warning(
                "Booking flow stopped because requested theatre was not available."
            );

            return;
        }


        // ====================================================
        // FIND THEATRE
        // ====================================================

        logger.info(
            `Searching Theatre: ${config.theatre}`
        );

        const theatreEl =
            await findTheatre(
                page,
                config.theatre
            );

        if (!theatreEl) {

            logger.error(
                `❌ Theatre not found: ${config.theatre}`
            );

            return;
        }

        logger.success(
            `Theatre "${config.theatre}" found.`
        );


        // ====================================================
        // GET THEATRE CONTAINER
        // ====================================================

        const theatreContainer =
            await getTheatreContainer(
                theatreEl
            );


        // ====================================================
        // SHOW RELEASE MONITORING
        // ====================================================

        logger.info(
            `Checking requested show: ${config.time}`
        );

        const showReleased =
            await monitorShowRelease(
                page,
                config.theatre,
                config.time,
                config.monitor.interval,
                config.monitor.maxAttempts
            );

        if (!showReleased) {

            logger.error(
                `❌ Show "${config.time}" is not available.`
            );

            logger.warning(
                "Booking flow stopped because requested show was not available."
            );

            return;
        }


        // ====================================================
        // READ AVAILABLE SESSIONS
        // ====================================================

        logger.step(
            "Reading available sessions..."
        );

        const sessions =
            await getAvailableSessions(
                theatreContainer
            );

        if (
            !sessions ||
            sessions.length === 0
        ) {

            logger.error(
                "❌ No sessions found."
            );

            return;
        }


        // ====================================================
        // PRINT AVAILABLE SHOWS
        // ====================================================

        console.log(
            "\n======================================"
        );

        console.log(
            "        AVAILABLE SHOWS"
        );

        console.log(
            "======================================"
        );

        sessions.forEach(
            (session, index) => {

                let output =
                    `${index + 1}. ${session.time}`;

                if (session.format) {

                    output +=
                        ` | ${session.format}`;
                }

                console.log(
                    output
                );
            }
        );

        console.log(
            "======================================\n"
        );


        // ====================================================
        // FIND EXACT SHOW
        // ====================================================

        logger.info(
            `Looking for exact show time: ${config.time}`
        );

        const matchedSession =
            await findMatchingSession(
                sessions,
                config
            );

        if (!matchedSession) {

            logger.error(
                `❌ Show time "${config.time}" is not available.`
            );

            logger.warning(
                "No alternative show will be selected automatically."
            );

            return;
        }


        // ====================================================
        // SELECT SHOW
        // ====================================================

        logger.info(
            `Selecting show: ${matchedSession.time}`
        );

        await matchedSession.locator.click({
            force: true
        });

        logger.success(
            `Show "${matchedSession.time}" selected.`
        );


        // ====================================================
        // 18+ CONFIRMATION
        // ====================================================

        await handleAgeConfirmation(
            page
        );


        // ====================================================
        // WAIT FOR SEAT MAP
        // ====================================================

        logger.info(
            "Waiting for seat map..."
        );

        await page.waitForTimeout(
            5000
        );

        await closeBestSeatsPopup(
            page
        );


        // ====================================================
        // SEAT PREFERENCE
        // ====================================================

        console.log(
            "\n======================================"
        );

        console.log(
            "          SEAT PREFERENCE"
        );

        console.log(
            "======================================"
        );

        console.log(
            `Row   : ${config.seatPreference.row}`
        );

        console.log(
            `Count : ${config.seatPreference.count}`
        );

        console.log(
            "======================================\n"
        );


        // ====================================================
        // FIRST CHECK REQUESTED SEATS
        // ====================================================

        logger.step(
            `Checking requested seats in row ${config.seatPreference.row}...`
        );


        /*
         * IMPORTANT FIX
         *
         * checkPreferredSeats() returns:
         *
         * {
         *     seatClass,
         *     seats
         * }
         *
         * It does NOT return:
         *
         * {
         *     available: true,
         *     seatClass,
         *     seats
         * }
         *
         * Therefore normalize it before using it.
         */

        const initialSeatCheck =
            await checkPreferredSeats(
                page,
                config.seatPreference.row,
                config.seatPreference.count
            );


        let seatResult =
            normalizeSeatResult(
                initialSeatCheck
            );


        // ====================================================
        // SEATS NOT AVAILABLE
        // ====================================================

        if (!seatResult.available) {

            logger.warning(
                `Requested ${config.seatPreference.count} seat(s) are not currently available in row ${config.seatPreference.row}.`
            );

            logger.info(
                "Starting requested-seat monitoring..."
            );


            // ------------------------------------------------
            // MONITOR REQUESTED SEATS
            // ------------------------------------------------

            seatResult =
                await startSeatMonitoring(
                    page,
                    config.seatPreference.row,
                    config.seatPreference.count,
                    config.monitor.interval,
                    config.monitor.maxAttempts
                );


            // ------------------------------------------------
            // MONITORING FAILED
            // ------------------------------------------------

            if (
                !seatResult ||
                !seatResult.available
            ) {

                logger.error(
                    "❌ Requested seats did not become available."
                );

                logger.warning(
                    "Booking flow stopped."
                );

                return;
            }
            const confirmed =
                await notifyAndConfirm({
                    type: "SEATS_AVAILABLE",

                    movie: config.movie,

                    theatre: config.theatre,

                    date: config.date,

                    time: config.time,

                    seats: seatResult.seats.map(
                        seat =>
                            `${seat.row}${seat.seatNumber}`
                )
            });
            
            // ------------------------------------------------
            // USER DECLINED
            // ------------------------------------------------

            if (!confirmed) {

                logger.warning(
                    "User declined the booking."
                );

                logger.info(
                    "No seats were selected."
                );

                logger.info(
                    "Booking flow stopped."
                );

                return;
            }


            // ------------------------------------------------
            // USER CONFIRMED
            // ------------------------------------------------

            logger.success(
                "User confirmed booking."
            );
        }


        // ====================================================
        // VERIFY SEAT RESULT
        // ====================================================

        if (
            !seatResult ||
            !seatResult.available ||
            !Array.isArray(seatResult.seats) ||
            seatResult.seats.length === 0
        ) {

            logger.error(
                "❌ No requested seats available for selection."
            );

            return;
        }


        // ====================================================
        // PRINT SEAT AVAILABILITY
        // ====================================================

        logger.success(
            `Requested seats available: ${
                seatResult.seats
                    .map(
                        seat =>
                            `${seat.row}${seat.seatNumber}`
                    )
                    .join(", ")
            }`
        );


        // ====================================================
        // SELECT ONLY REQUESTED SEATS
        // ====================================================

        const seatsSelected =
            await selectMonitoredSeats(
                page,
                seatResult
            );

        if (!seatsSelected) {

            logger.error(
                "❌ Requested seat selection failed."
            );

            return;
        }

        logger.success(
            "Requested seats selected successfully."
        );


        // ====================================================
        // PROCEED TO PAYMENT
        // ====================================================

        await proceedToPayment(
            page
        );

        await page.waitForLoadState(
            "domcontentloaded"
        ).catch(() => {});


        // ====================================================
        // FOOD & BEVERAGES
        // ====================================================

        await skipBeverages(
            page
        );


        // ============================================================
        // PREPARE BOOKING REVIEW
        // ============================================================

        logger.step(
            "Preparing final booking review..."
        );

        const review =
            await prepareBookingReview(
                page,
                config
            );

        if (!review.success) {

            logger.error(
                "❌ Could not prepare booking review."
            );

            logger.warning(
                "Booking flow stopped before payment."
            );

            return;
        }

        logger.success(
            "Booking review prepared successfully."
        );

        logger.info(
            "Payment has NOT been initiated."
        );

        logger.info(
            "Waiting for user confirmation before payment."
        );

        // ====================================================
        // DEVELOPMENT PAUSE
        // ====================================================

        await page.pause();


    } catch (error) {

        console.error(
            "\n❌ SeatRadar AI Error:\n"
        );

        console.error(
            error
        );

    } finally {

        /*
         * Keep browser open during development.
         *
         * Once the complete flow is stable,
         * enable browser.close().
         */

        if (browser) {

            logger.info(
                "Browser session finished."
            );

            // await browser.close();
        }
    }
}


// ============================================================
// START
// ============================================================

run();