const logger = require("../utils/logger");

// ============================================================
// SAFE CLICK
// ============================================================

async function safeClick(locator, name) {

    try {

        await locator.click({
            timeout: 8000
        });

    } catch (error) {

        logger.warning(
            `${name} click failed. Retrying...`
        );

        await locator.click({
            force: true,
            timeout: 5000
        });
    }
}

// ============================================================
// LOCATION DIALOG
// ============================================================

function getLocationDialog(page) {

    return page
        .getByRole("dialog")
        .filter({
            has: page.getByPlaceholder(
                "Search city, area or locality"
            )
        })
        .first();
}


function getLocationInput(page) {

    return getLocationDialog(page)
        .getByRole("textbox")
        .first();
}

// ============================================================
// OPEN LOCATION
// ============================================================

async function openLocationPopup(page) {

    logger.step("Opening location selector...");

    try {

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

        await safeClick(
            locationButton,
            "Location button"
        );

        const locationInput =
            getLocationInput(page);

        await locationInput.waitFor({
            state: "visible",
            timeout: 10000
        });

        logger.success(
            "Location popup opened."
        );

        return true;

    } catch (error) {

        logger.error(
            `Could not open location popup: ${error.message}`
        );

        return false;
    }
}

// ============================================================
// SEARCH CITY
// ============================================================

async function searchCity(page, city) {

    logger.step(
        `Searching city: ${city}`
    );

    try {

        const locationInput =
            getLocationInput(page);

        await locationInput.waitFor({
            state: "visible",
            timeout: 10000
        });

        await locationInput.fill("");

        await locationInput.fill(city);

        await page.waitForTimeout(800);

        const value =
            await locationInput.inputValue();

        if (
            value.trim().toLowerCase() !==
            city.trim().toLowerCase()
        ) {

            throw new Error(
                `City search value mismatch. ` +
                `Expected "${city}", got "${value}".`
            );
        }

        logger.success(
            `City search entered: ${city}`
        );

        return true;

    } catch (error) {

        logger.error(
            `Could not search city "${city}": ${error.message}`
        );

        return false;
    }
}

// ============================================================
// SELECT CITY
// ============================================================

async function selectCity(page, city) {

    logger.step(
        `Selecting city: ${city}`
    );

    try {

        const locationInput =
            getLocationInput(page);

        await locationInput.waitFor({
            state: "visible",
            timeout: 10000
        });

        const cityButton =
            page.getByRole("button", {
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

        await safeClick(
            cityButton,
            `City "${city}"`
        );

        try {

            await locationInput.waitFor({
                state: "hidden",
                timeout: 5000
            });

        } catch {

            logger.warning(
                "Location popup did not close immediately."
            );
        }

        logger.success(
            `City "${city}" selected.`
        );

        return true;

    } catch (error) {

        logger.error(
            `Could not select city "${city}": ${error.message}`
        );

        return false;
    }
}


// ============================================================
// SEARCH DIALOG
// ============================================================
//
// IMPORTANT:
//
// Do NOT use:
//
// page.getByRole("dialog").first()
//
// District can have more than one dialog.
//
// The movie search dialog contains the "Movies" button
// and the search textbox.
//
// ============================================================

function getSearchDialog(page) {

    return page
        .getByRole("dialog")
        .filter({
            has: page.getByRole("button", {
                name: "Movies",
                exact: true
            })
        })
        .first();
}


function getMovieSearchBox(page) {

    return getSearchDialog(page)
        .getByRole("textbox")
        .first();
}

// ============================================================
// OPEN SEARCH
// ============================================================

async function openSearch(page) {

    logger.step(
        "Opening Search..."
    );

    try {

        // This is the locator discovered using Playwright.
        const searchButton = page
            .getByRole("link")
            .filter({
                hasText: /^$/
            })
            .nth(1);

        await searchButton.waitFor({
            state: "visible",
            timeout: 10000
        });

        logger.info(
            "Search icon is visible."
        );

        await safeClick(
            searchButton,
            "Search icon"
        );

        const searchDialog =
            getSearchDialog(page);

        await searchDialog.waitFor({
            state: "visible",
            timeout: 10000
        });

        const searchBox =
            getMovieSearchBox(page);

        await searchBox.waitFor({
            state: "visible",
            timeout: 10000
        });

        logger.success(
            "Search opened."
        );

        return true;

    } catch (error) {

        logger.warning(
            `Search could not be opened: ${error.message}`
        );

        return false;
    }
}

// ============================================================
// SEARCH MOVIE
// ============================================================

async function searchMovie(page, movieName) {

    logger.step(
        `Searching Movie: ${movieName}`
    );

    try {

        const searchBox =
            getMovieSearchBox(page);

        await searchBox.waitFor({
            state: "visible",
            timeout: 10000
        });

        logger.info(
            "Movie search box is visible."
        );

        // Clear the existing value.
        await searchBox.press(
            "Control+A"
        );

        await searchBox.press(
            "Backspace"
        );

        // Type like a real user.
        // This helps trigger the site's search events.
        await searchBox.pressSequentially(
            movieName,
            {
                delay: 40
            }
        );

        // Verify the actual textbox value.
        const value =
            await searchBox.inputValue();

        logger.info(
            `Search box value: "${value}"`
        );

        if (
            value.trim().toLowerCase() !==
            movieName.trim().toLowerCase()
        ) {

            throw new Error(
                `Movie text was not entered correctly. ` +
                `Expected "${movieName}", got "${value}".`
            );
        }

        logger.success(
            `Movie search entered: ${movieName}`
        );

        // Give the site's search request time to update
        // the result list after the keyboard events.
        await page.waitForTimeout(1200);

        return true;

    } catch (error) {

        logger.error(
            `Could not search for movie "${movieName}": ${error.message}`
        );

        return false;
    }
}

// ============================================================
// SELECT MOVIE
// ============================================================

async function selectMovie(page, movieName) {

    logger.step(
        `Selecting movie: ${movieName}`
    );

    try {

        const searchDialog =
            getSearchDialog(page);

        await searchDialog.waitFor({
            state: "visible",
            timeout: 10000
        });

        // Movie result is visible as text inside the search dialog.
        const movieResult =
            searchDialog.getByText(
                movieName,
                {
                    exact: true
                }
            ).first();

        await movieResult.waitFor({
            state: "visible",
            timeout: 15000
        });

        logger.info(
            `Movie result "${movieName}" is visible.`
        );

        await movieResult.click();

        logger.success(
            `Movie "${movieName}" selected successfully.`
        );

        return true;

    } catch (error) {

        logger.error(
            `Could not select movie "${movieName}": ${error.message}`
        );

        return false;
    }
}

// ============================================================
// BOOK TICKETS
// ============================================================

async function clickBookTickets(page) {

    logger.info(
        "Clicking Book Tickets..."
    );

    try {

        const button =
            page.getByRole("button", {
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

        return true;

    } catch (error) {

        logger.error(
            `Book Tickets failed: ${error.message}`
        );

        return false;
    }
}

// ============================================================
// LANGUAGE
// ============================================================

async function selectLanguage(page, language) {

    if (!language) {
        return true;
    }

    logger.info(
        `Selecting language: ${language}`
    );

    try {

        const option =
            page.locator(
                `label[for="${language}_lsd"]`
            );

        if (await option.count() === 0) {

            logger.info(
                "Language selection not required."
            );

            return true;
        }

        await option.waitFor({
            state: "visible",
            timeout: 10000
        });

        await safeClick(
            option,
            `${language} language`
        );

        logger.success(
            `${language} selected successfully.`
        );

        return true;

    } catch (error) {

        logger.error(
            `Language selection failed: ${error.message}`
        );

        return false;
    }
}

// ============================================================
// PROCEED
// ============================================================

async function clickProceed(page) {

    logger.info(
        "Clicking Proceed..."
    );

    try {

        const button =
            page.getByRole("button", {
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

        return true;

    } catch (error) {

        logger.error(
            `Proceed failed: ${error.message}`
        );

        return false;
    }
}

// ============================================================
// DATE
// ============================================================

async function selectDate(page, date) {

    logger.info(
        `Selecting date: ${date}`
    );

    try {

        const button =
            page.getByRole("button", {
                name: date,
                exact: true
            }).first();

        await button.waitFor({
            state: "visible",
            timeout: 10000
        });

        await safeClick(
            button,
            `Date "${date}"`
        );

        return true;

    } catch (error) {

        logger.error(
            `Date selection failed: ${error.message}`
        );

        return false;
    }
}

// ============================================================
// SHOW
// ============================================================

async function selectShow(page, showTime) {

    logger.info(
        `Selecting show time: ${showTime}`
    );

    try {

        const button =
            page.getByRole("button", {
                name: showTime,
                exact: true
            }).first();

        await button.waitFor({
            state: "visible",
            timeout: 10000
        });

        await safeClick(
            button,
            `Show "${showTime}"`
        );

        return true;

    } catch (error) {

        logger.error(
            `Show selection failed: ${error.message}`
        );

        return false;
    }
}

// ============================================================
// EXPORTS
// ============================================================

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