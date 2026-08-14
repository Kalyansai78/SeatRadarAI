const logger = require("../utils/logger");

// ======================================================
// HELPER
// ======================================================

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


// ======================================================
// SAFE CLICK
// ======================================================

async function safeClick(locator, name) {

    try {

        await locator.click({
            timeout: 8000
        });

    } catch (error) {

        logger.warning(
            `${name} normal click failed. Retrying...`
        );

        await locator.click({
            force: true,
            timeout: 5000
        });
    }
}


// ======================================================
// OPEN LOCATION POPUP
// ======================================================

async function openLocationPopup(page) {

    logger.step("Opening location selector...");

    // Find the actual location button in the header
    const locationButton = page.locator(
        'button[data-district-ui="true"][aria-label]'
    ).first();

    await locationButton.waitFor({
        state: "visible",
        timeout: 10000
    });

    const currentCity =
        await locationButton.getAttribute("aria-label");

    logger.info(
        `Current District location: ${currentCity}`
    );

    // Click the location button
    await safeClick(
        locationButton,
        "Location button"
    );

    // Wait for the REAL location search input
    const locationInput = page.getByPlaceholder(
        "Search city, area or locality"
    ).first();

    await locationInput.waitFor({
        state: "visible",
        timeout: 10000
    });

    logger.success(
        "Location popup opened."
    );

    return true;
}


// ======================================================
// SEARCH CITY
// ======================================================

async function searchCity(page, city) {

    logger.step(
        `Searching city: ${city}`
    );

    const locationInput = page.getByPlaceholder(
        "Search city, area or locality"
    ).first();

    await locationInput.waitFor({
        state: "visible",
        timeout: 10000
    });

    await locationInput.fill("");

    await locationInput.fill(city);

    // Allow search results to render
    await page.waitForTimeout(1000);

    logger.success(
        `City search entered: ${city}`
    );

    return true;
}


// ======================================================
// SELECT CITY
// ======================================================

async function selectCity(page, city) {

    logger.step(
        `Selecting city: ${city}`
    );

    /*
     * IMPORTANT:
     *
     * Before searching for the city button,
     * verify that the location popup is ACTUALLY visible.
     */

    const locationInput = page.getByPlaceholder(
        "Search city, area or locality"
    ).first();

    if (
        !(await locationInput.isVisible().catch(() => false))
    ) {

        throw new Error(
            "Location popup is not visible while selecting city."
        );
    }

    logger.info(
        "Location popup confirmed."
    );

    /*
     * Exact city button.
     *
     * Example:
     *
     * Hyderabad
     * Hyderabad, Telangana
     *
     * aria-label = Hyderabad
     */
    const cityButton = page.getByRole("button", {
        name: city,
        exact: true
    }).first();

    await cityButton.waitFor({
        state: "visible",
        timeout: 10000
    });

    logger.info(
        `City button "${city}" is visible.`
    );

    await cityButton.scrollIntoViewIfNeeded();

    await page.waitForTimeout(500);

    logger.info(
        `Clicking city "${city}"...`
    );

    await safeClick(
        cityButton,
        `City "${city}"`
    );

    /*
     * Wait for popup to disappear.
     */
    try {

        await locationInput.waitFor({
            state: "hidden",
            timeout: 10000
        });

    } catch (error) {

        logger.warning(
            "Location popup did not close immediately."
        );

        await page.waitForTimeout(2000);
    }

    logger.success(
        `City "${city}" selected.`
    );

    /*
     * Give District time to update the homepage.
     */
    await page.waitForTimeout(2500);

    return true;
}


// ======================================================
// OPEN SEARCH
// ======================================================

async function openSearch(page) {

    logger.step(
        "Opening Search..."
    );

    /*
     * District header search link.
     */
    const searchLink = page.getByRole("link", {
        name: /Search for events, movies and restaurants/i
    }).first();

    if (
        await searchLink.count() > 0 &&
        await searchLink.isVisible().catch(() => false)
    ) {

        await safeClick(
            searchLink,
            "Search link"
        );

        await page.waitForTimeout(1500);

        logger.success(
            "Search opened."
        );

        return true;
    }

    /*
     * Some versions of the page may already expose
     * a search input.
     */
    const searchInput = page.locator(
        'input[type="search"], input[type="text"]'
    );

    const count = await searchInput.count();

    for (let i = 0; i < count; i++) {

        const input = searchInput.nth(i);

        if (
            await input.isVisible().catch(() => false)
        ) {

            const placeholder =
                await input.getAttribute("placeholder");

            if (
                placeholder &&
                /search city|area or locality/i.test(
                    placeholder
                )
            ) {
                continue;
            }

            logger.success(
                "Search input already available."
            );

            return true;
        }
    }

    logger.warning(
        "Search link/input not found."
    );

    return false;
}


// ======================================================
// SEARCH MOVIE
// ======================================================

async function searchMovie(page, movieName) {

    logger.step(
        `Searching Movie: ${movieName}`
    );

    /*
     * First check if movie is already visible.
     */
    const movieRegex = new RegExp(
        escapeRegExp(movieName),
        "i"
    );

    const existingMovie = page.getByRole("link", {
        name: movieRegex
    });

    if (
        await existingMovie.count() > 0
    ) {

        for (let i = 0; i < await existingMovie.count(); i++) {

            if (
                await existingMovie
                    .nth(i)
                    .isVisible()
                    .catch(() => false)
            ) {

                logger.success(
                    `Movie "${movieName}" already visible.`
                );

                return true;
            }
        }
    }

    /*
     * Movie isn't on current page.
     * Open search.
     */
    logger.info(
        "Movie not visible. Opening search..."
    );

    const opened = await openSearch(page);

    if (!opened) {

        logger.error(
            "❌ Could not open District search."
        );

        return false;
    }

    await page.waitForTimeout(1000);

    /*
     * Find visible text/search input.
     */
    const inputs = page.locator(
        'input[type="search"], input[type="text"]'
    );

    const count = await inputs.count();

    for (let i = 0; i < count; i++) {

        const input = inputs.nth(i);

        if (
            !(await input.isVisible().catch(() => false))
        ) {
            continue;
        }

        const placeholder =
            await input.getAttribute("placeholder");

        /*
         * Never use location input.
         */
        if (
            placeholder &&
            /search city|area or locality/i.test(
                placeholder
            )
        ) {
            continue;
        }

        await input.fill(movieName);

        logger.success(
            `Movie search entered: ${movieName}`
        );

        await page.waitForTimeout(1500);

        return true;
    }

    logger.error(
        "❌ Movie search input not found."
    );

    return false;
}


// ======================================================
// SELECT MOVIE
// ======================================================

async function selectMovie(page, movieName) {

    logger.step(
        `Selecting movie: ${movieName}`
    );

    const movieRegex = new RegExp(
        escapeRegExp(movieName),
        "i"
    );

    const movieLinks = page.getByRole("link", {
        name: movieRegex
    });

    const count = await movieLinks.count();

    logger.info(
        `Matching movie links: ${count}`
    );

    if (count === 0) {

        logger.error(
            `Movie "${movieName}" not found.`
        );

        return false;
    }

    for (let i = 0; i < count; i++) {

        const movie = movieLinks.nth(i);

        if (
            !(await movie.isVisible().catch(() => false))
        ) {
            continue;
        }

        const text =
            (await movie.innerText().catch(() => ""))
                .replace(/\n/g, " | ")
                .trim();

        logger.info(
            `Selecting movie result: ${text}`
        );

        await safeClick(
            movie,
            `Movie "${movieName}"`
        );

        logger.success(
            `Movie "${movieName}" selected successfully.`
        );

        return true;
    }

    return false;
}


// ======================================================
// BOOK TICKETS
// ======================================================

async function clickBookTickets(page) {

    logger.info(
        "Clicking Book Tickets..."
    );

    const button = page.getByRole("button", {
        name: /Book Tickets/i
    }).first();

    await button.waitFor({
        state: "visible",
        timeout: 15000
    });

    await safeClick(
        button,
        "Book Tickets"
    );

    await page.waitForTimeout(1500);
}


// ======================================================
// LANGUAGE
// ======================================================

async function selectLanguage(page, language) {

    if (!language) {

        logger.info(
            "Language selection not required."
        );

        return true;
    }

    logger.info(
        `Selecting language: ${language}`
    );

    const languageOption = page.locator(
        `label[for="${language}_lsd"]`
    );

    if (
        await languageOption.count() === 0
    ) {

        logger.info(
            "Language selection not required."
        );

        return true;
    }

    if (
        !(await languageOption
            .isVisible()
            .catch(() => false))
    ) {

        logger.error(
            `Language "${language}" is not available.`
        );

        return false;
    }

    await safeClick(
        languageOption,
        `${language} language`
    );

    logger.success(
        `${language} selected successfully.`
    );

    return true;
}


// ======================================================
// PROCEED
// ======================================================

async function clickProceed(page) {

    logger.info(
        "Clicking Proceed..."
    );

    const button = page.getByRole("button", {
        name: /^Proceed$/i
    }).first();

    await button.waitFor({
        state: "visible",
        timeout: 15000
    });

    await safeClick(
        button,
        "Proceed"
    );
}


// ======================================================
// DATE
// ======================================================

async function selectDate(page, date) {

    logger.info(
        `Selecting date: ${date}`
    );

    const dateButton = page.getByRole("button", {
        name: date,
        exact: true
    }).first();

    await dateButton.waitFor({
        state: "visible",
        timeout: 10000
    });

    await safeClick(
        dateButton,
        `Date "${date}"`
    );

    return true;
}


// ======================================================
// SHOW TIME
// ======================================================

async function selectShow(page, showTime) {

    logger.info(
        `Selecting show time: ${showTime}`
    );

    const showButton = page.getByRole("button", {
        name: showTime,
        exact: true
    }).first();

    await showButton.waitFor({
        state: "visible",
        timeout: 10000
    });

    await safeClick(
        showButton,
        `Show time "${showTime}"`
    );

    return true;
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {
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
};