const logger = require("../utils/logger");

// Open Location Popup
async function openLocationPopup(page) {

    await page.getByRole("button", {
        name: "Gurugram"
    }).click();

}

// Search City
async function searchCity(page, city) {

    await page
        .getByPlaceholder("Search city, area or locality")
        .fill(city);

}

// Select Hyderabad
async function selectCity(page) {

    await page.getByRole("button", {
        name: "Hyderabad",
        exact: true
    }).click();

}

// Open Search
async function openSearch(page) {

    await page
        .getByRole("link")
        .filter({ hasText: /^$/ })
        .nth(1)
        .click();

}

// Search Movie
async function searchMovie(page, movieName) {

    await page
        .getByRole("dialog")
        .filter({ hasText: "Search for events, movies," })
        .getByRole("textbox")
        .fill(movieName);

}

// Select Movie
async function selectMovie(page, movieName) {

    await page.getByRole("link", {
        name: movieName
    }).click();

}

// Click Book Tickets
async function clickBookTickets(page) {

    await page.getByRole("button", {
        name: "Book Tickets",
        exact: true
    }).click();

}

// Select Language
async function selectLanguage(page, language) {

    const languageOption = page.locator(
        `label[for="${language}_lsd"]`
    );

    // Check if the language selection page exists
    if (await languageOption.count() === 0) {

        logger.info("Language selection not required.");

        return true;

    }

    // Check whether the requested language exists
    if (!(await languageOption.isVisible())) {

        logger.error(`Requested language "${language}" is not available.`);

        return false;

    }

    logger.step(`Selecting ${language} language...`);

    await languageOption.click();

    logger.success(`${language} selected successfully.`);

    return true;

}

// Click Proceed
async function clickProceed(page) {

    await page.getByRole("button", {
        name: "Proceed"
    }).click();

}

// Select Date
async function selectDate(page, dayDate) {

    await page.getByRole("button", {
        name: dayDate
    }).click();

}

// Select Show Time
async function selectShow(page, showTime) {

    await page.getByRole("button", {
        name: showTime
    }).click();

}

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