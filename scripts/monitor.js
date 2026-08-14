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

const config = require("../config/config.json");

const {
    findTheatre,
    getTheatreContainer,
    getAvailableSessions,
    findMatchingSession
} = require("../engine/availabilityEngine");

const {
    proceedToPayment,
    skipBeverages,
    closeBestSeatsPopup
} = require("../engine/bookingEngine");

const logger = require("../utils/logger");


// ======================================================
// VALIDATE CONFIG
// ======================================================

function validateConfig(config) {

    if (!config.movie) {
        throw new Error("❌ Movie is missing in config.json");
    }

    if (!config.city) {
        throw new Error("❌ City is missing in config.json");
    }

    if (!config.theatre) {
        throw new Error("❌ Theatre is missing in config.json");
    }

    if (!config.date) {
        throw new Error("❌ Date is missing in config.json");
    }

    if (!config.time) {
        throw new Error("❌ Exact show time is missing in config.json");
    }

    if (!config.seatPreference) {
        throw new Error(
            "❌ seatPreference is missing in config.json"
        );
    }

    if (!config.seatPreference.count) {
        throw new Error(
            "❌ Seat count is missing in config.json"
        );
    }

    return true;
}


// ======================================================
// PRINT CONFIG
// ======================================================

function printConfig(config) {

    console.log("\n🎬 SeatRadar AI - Smart Booking\n");

    console.log("======================================");
    console.log("        BOOKING CONFIGURATION");
    console.log("======================================");

    console.log(`🎬 Movie      : ${config.movie}`);
    console.log(`📍 City       : ${config.city}`);
    console.log(`🏢 Theatre    : ${config.theatre}`);
    console.log(`📅 Date       : ${config.date}`);
    console.log(`🕒 Show Time  : ${config.time}`);
    console.log(
        `🎟️ Seats      : ${config.seatPreference.count}`
    );
    console.log(
        `🔤 Row        : ${config.seatPreference.row || "Auto"}`
    );
    console.log(
        `🌐 Language   : ${config.language || "Auto"}`
    );

    console.log("======================================\n");
}


// ======================================================
// MAIN
// ======================================================

async function run() {

    let browser = null;

    try {

        // ==================================================
        // VALIDATE CONFIG
        // ==================================================

        validateConfig(config);

        printConfig(config);


        // ==================================================
        // BROWSER
        // ==================================================

        logger.info("Opening District...");

        const result = await openDistrict();

        browser = result.browser;

        const page = result.page;

        logger.success("District Opened");


        // ==================================================
        // CITY
        // ==================================================

        logger.info("Selecting City...");

        await openLocationPopup(page);

        await page.waitForTimeout(1000);

        await searchCity(
            page,
            config.city
        );

        await page.waitForTimeout(1000);

        await selectCity(
            page,
            config.city
        );

        /*
         * Do NOT use networkidle.
         *
         * District can keep background requests running.
         */

        await page.waitForTimeout(3000);


        // ==================================================
        // SEARCH MOVIE
        // ==================================================

        logger.info("Opening Search...");

        const searchOpened = await openSearch(page);

        /*
         * openSearch may return false if the movie is already
         * visible on the page.
         */

        if (!searchOpened) {

            logger.warning(
                "Search interface was not opened."
            );
        }


        // ==================================================
        // SEARCH MOVIE
        // ==================================================

        logger.info("Searching Movie...");

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


        // ==================================================
        // SELECT MOVIE
        // ==================================================

        logger.info("Selecting Movie...");

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


        // ==================================================
        // BOOK TICKETS
        // ==================================================

        logger.info("Clicking Book Tickets...");

        await page.waitForTimeout(2000);

        await clickBookTickets(page);


        // ==================================================
        // LANGUAGE
        // ==================================================

        logger.info("Selecting Language...");

        await page.waitForTimeout(1000);

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


        // ==================================================
        // PROCEED
        // ==================================================

        logger.info("Clicking Proceed...");

        await page.waitForTimeout(1000);

        await clickProceed(page);


        // ==================================================
        // DATE
        // ==================================================

        logger.info(
            `Selecting Date: ${config.date}`
        );

        await page.waitForTimeout(2000);

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


        // ==================================================
        // WAIT FOR SHOW LIST
        // ==================================================

        await page.waitForTimeout(2000);


        // ==================================================
        // THEATRE
        // ==================================================

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


        // ==================================================
        // THEATRE CONTAINER
        // ==================================================

        const theatreContainer =
            await getTheatreContainer(
                theatreEl
            );


        // ==================================================
        // AVAILABLE SESSIONS
        // ==================================================

        const sessions =
            await getAvailableSessions(
                theatreContainer
            );


        console.log("\n======================================");
        console.log("        AVAILABLE SHOWS");
        console.log("======================================");

        sessions.forEach((session, index) => {

            let output =
                `${index + 1}. ${session.time}`;

            if (session.format) {

                output +=
                    ` | ${session.format}`;
            }

            console.log(output);
        });

        console.log("======================================\n");


        // ==================================================
        // SELECT EXACT SHOW
        // ==================================================

        logger.info(
            `Looking for exact show time: ${config.time}`
        );

        /*
         * IMPORTANT:
         *
         * findMatchingSession will now be responsible
         * for matching config.time.
         *
         * We are intentionally NOT using timePreference.
         */

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


        // ==================================================
        // SELECT SHOW
        // ==================================================

        logger.info(
            `Selecting show: ${matchedSession.time}`
        );

        await matchedSession.locator.click({
            force: true
        });

        logger.success(
            `Show "${matchedSession.time}" selected.`
        );


        // ==================================================
        // SEAT MAP
        // ==================================================

        logger.info(
            "Waiting for seat map..."
        );

        await page.waitForTimeout(5000);

        await closeBestSeatsPopup(page);


        // ==================================================
        // SEAT PREFERENCE
        // ==================================================

        console.log("\n======================================");
        console.log("          SEAT PREFERENCE");
        console.log("======================================");

        console.log(
            `Row   : ${
                config.seatPreference.row || "Auto"
            }`
        );

        console.log(
            `Count : ${
                config.seatPreference.count
            }`
        );

        console.log("======================================\n");


        // ==================================================
        // SEAT SELECTION
        // ==================================================

        const {
            autoSelectBestSeats
        } = require("../engine/seatEngine");

        logger.info(
            "Finding suitable seats..."
        );

        const success =
            await autoSelectBestSeats(
                page,
                config
            );


        // ==================================================
        // PAYMENT
        // ==================================================

        if (!success) {

            logger.error(
                "❌ Seat selection failed."
            );

            return;
        }


        logger.success(
            "Seats selected successfully."
        );


        // ==================================================
        // PROCEED TO PAYMENT
        // ==================================================

        await proceedToPayment(page);

        await page.waitForLoadState(
            "domcontentloaded"
        );

        await skipBeverages(page);


        // ==================================================
        // PAUSE FOR TESTING
        // ==================================================

        logger.success(
            "Booking flow reached payment stage."
        );

        await page.pause();

    } catch (error) {

        console.error("\n❌ SeatRadar AI Error:\n");

        console.error(error);

    } finally {

        /*
         * During development we don't automatically close
         * the browser after every failure.
         *
         * This allows us to inspect the page when something
         * goes wrong.
         */

        if (browser) {

            logger.info(
                "Browser session finished."
            );

            // Uncomment this later when the flow is stable.
            // await browser.close();
        }
    }
}


// ======================================================
// START
// ======================================================

run();