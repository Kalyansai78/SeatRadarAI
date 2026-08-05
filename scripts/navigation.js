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
async function selectLanguage(page) {

    await page.locator('label[for="English_lsd"]').click();

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