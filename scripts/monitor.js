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
    selectDate,
    selectShow
} = require("./district");

const {
    startMonitoring
} = require("../engine/monitorEngine");

const config = require("../config/config.json");

async function run() {

    try {

        const { browser, page } = await openDistrict();

        console.log("District Opened");

        // Select City
        console.log("Selecting City...");
        await openLocationPopup(page);

        await searchCity(page, config.city);

        await page.waitForTimeout(2000);

        await selectCity(page);

        await page.waitForTimeout(3000);

        // Open Search
        console.log("Opening Search...");
        await openSearch(page);

        await page.waitForTimeout(2000);

        // Search Movie
        console.log("Searching Movie...");
        await searchMovie(page, config.movie);

        await page.waitForTimeout(2000);

        // Select Movie
        console.log("Selecting Movie...");
        await selectMovie(page, config.movie);

        await page.waitForLoadState("networkidle");

        await page.waitForTimeout(3000);

        // Book Tickets
        console.log("Clicking Book Tickets...");
        await clickBookTickets(page);

        await page.waitForTimeout(1000);

        // Select Language
        console.log("Selecting Language...");
        await selectLanguage(page, "English");

        await page.waitForTimeout(1000);

        // Proceed
        console.log("Clicking Proceed...");
        await clickProceed(page);

        await page.waitForTimeout(2000);

        // Select Date
        console.log("Selecting Date...");
        await selectDate(page, config.date);

        await page.waitForTimeout(2000);

        // Select Show
        console.log("Selecting Show...");
        await selectShow(page, config.show);

        // Wait for Seat Map
        await page.waitForTimeout(5000);

        // Display Seats
        console.log("\n==============================");
        console.log("Seats to Monitor");
        console.log("==============================");

        for (const seat of config.seats) {

            console.log(
                `Row ${seat.row}, Column ${seat.column}`
            );

        }

        console.log("==============================\n");

        // Monitor All Preferred Seats
        await startMonitoring(
        page,
        config.seats,
        config.monitor.interval,
        config.monitor.maxAttempts
    );

        await page.pause();

        await browser.close();

    }
    catch (err) {

        console.error(err);

    }

}

run();