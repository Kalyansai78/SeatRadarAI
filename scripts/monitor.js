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
    startMonitoring
} = require("../engine/monitorEngine");

const {
    proceedToPayment,
    skipBeverages,
    closeBestSeatsPopup
} = require("../engine/bookingEngine");

const logger = require("../utils/logger");

async function run() {

    try {

        const { browser, page } = await openDistrict();

        logger.success("District Opened");

        // ==========================
        // CITY
        // ==========================
        logger.info("Selecting City...");
        await openLocationPopup(page);
        await searchCity(page, config.city);
        await page.waitForTimeout(2000);
        await selectCity(page);

        // ==========================
        // SEARCH MOVIE
        // ==========================
        await page.waitForTimeout(3000);
        logger.info("Opening Search...");
        await openSearch(page);

        await page.waitForTimeout(2000);
        logger.info("Searching Movie...");
        await searchMovie(page, config.movie);

        await page.waitForTimeout(2000);
        logger.info("Selecting Movie...");
        await selectMovie(page, config.movie);

        await page.waitForLoadState("networkidle");

        // ==========================
        // BOOK
        // ==========================
        await page.waitForTimeout(3000);
        logger.info("Clicking Book Tickets...");
        await clickBookTickets(page);

        // ==========================
        // LANGUAGE
        // ==========================
        await page.waitForTimeout(1000);
        logger.info("Selecting Language...");
        const languageSelected = await selectLanguage(page, config.language);

        if (!languageSelected) {
            await browser.close();
            return;
        }

        // ==========================
        // PROCEED
        // ==========================
        await page.waitForTimeout(1000);
        logger.info("Clicking Proceed...");
        await clickProceed(page);

        // ==========================
        // DATE
        // ==========================
        await page.waitForTimeout(2000);
        logger.info("Selecting Date...");
        await selectDate(page, config.date);

        await page.waitForTimeout(2000);

        // ==========================
        // THEATRE
        // ==========================
        const theatre = await findTheatre(page, config.theatre);

        if (!theatre) {
            await browser.close();
            return;
        }

        const theatreContainer = await getTheatreContainer(theatre);

        // ==========================
        // SESSIONS
        // ==========================
        const sessions = await getAvailableSessions(theatreContainer);

        console.log("\n==== AVAILABLE SHOWS ====");

        sessions.forEach((s, i) => {
            console.log(
                `${i + 1}. ${s.time} | ${s.format || "N/A"} | ${s.experience || "N/A"}`
            );
        });

        console.log("==========================\n");

        // ==========================
        // SELECT SESSION
        // ==========================
        const matchedSession = await findMatchingSession(sessions, config);

        if (!matchedSession) {
            await browser.close();
            return;
        }

        logger.info("Selecting Matched Session...");
        await matchedSession.locator.click();

        // ==========================
        // SEAT MAP
        // ==========================
        await page.waitForTimeout(5000);
        await closeBestSeatsPopup(page);

        console.log("\n==============================");
        console.log("Seats to Monitor");
        console.log("==============================");

        config.seats.forEach(seat => {
            console.log(`Row ${seat.row}, Column ${seat.column}`);
        });

        console.log("==============================\n");

        // ==========================
        // MONITOR SEATS
        // ==========================
        const seatFound = await startMonitoring(
            page,
            config.seats,
            config.monitor.interval,
            config.monitor.maxAttempts
        );

        if (seatFound) {
            await proceedToPayment(page);
            await page.waitForLoadState("networkidle");
            await skipBeverages(page);
        }

        await page.pause();
        await browser.close();

    } catch (err) {
        console.error(err);
    }
}

run();