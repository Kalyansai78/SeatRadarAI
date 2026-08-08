const logger = require("../utils/logger");

// ==========================
// Helper: Convert Time
// ==========================
function convertTo24Hour(timeStr) {

    const [time, modifier] = timeStr.split(" ");
    let [hours] = time.split(":");

    hours = parseInt(hours);

    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    return hours;
}

// ==========================
// Find Theatre
// ==========================
async function findTheatre(page, theatre) {

    logger.step(`Searching for theatre "${theatre}"...`);

    const theatreLocator = page.getByRole("link", { name: theatre });

    if (await theatreLocator.count() === 0) {
        logger.error(`Theatre "${theatre}" not found.`);
        return null;
    }

    logger.success(`Theatre "${theatre}" found.`);
    return theatreLocator;
}

// ==========================
// Get Theatre Container
// ==========================
async function getTheatreContainer(theatreLocator) {

    return theatreLocator.locator(
        "xpath=ancestor::li[contains(@class,'movieSessions')]"
    );
}

// ==========================
// Get Sessions (CLEAN)
// ==========================
async function getAvailableSessions(theatreContainer) {

    logger.step("Reading available sessions...");

    const sessions = [];

    const showBlocks = theatreContainer.locator(
        "li[data-time-selection]"
    );

    const count = await showBlocks.count();

    logger.info(`Found ${count} show(s)`);

    for (let i = 0; i < count; i++) {

        const show = showBlocks.nth(i);

        // ✅ Clean Time
        const rawTime = await show
            .locator("div[class*='time']")
            .first()
            .innerText();

        const time = rawTime.split("\n")[0].trim();

        // ✅ Format
        let format = null;
        const formatLocator = show.locator("span[class*='frmt']");
        if (await formatLocator.count() > 0) {
            format = (await formatLocator.innerText()).trim();
        }

        // ✅ Experience
        let experience = null;
        const expLocator = show.locator("div[class*='premiumLabel']");
        if (await expLocator.count() > 0) {
            experience = (await expLocator.innerText()).trim();
        }

        sessions.push({
            time,
            format,
            experience,
            locator: show // keep this (IMPORTANT)
        });
    }

    logger.success("Sessions extracted successfully.");
    return sessions;
}

// ==========================
// Find Matching Session (SMART + FIXED)
// ==========================
async function findMatchingSession(sessions, config) {

    logger.step("Finding matching session...");

    const preferredTime = config.timePreference?.toLowerCase();
    const preferredFormat = config.format?.toLowerCase();
    const preferredExperience = config.experience?.toLowerCase();

    const timeRanges = {
        morning: [6, 12],
        afternoon: [12, 16],
        evening: [16, 19],
        night: [19, 24]
    };

    let filtered = sessions;

    // 🎯 TIME FILTER
    if (preferredTime && timeRanges[preferredTime]) {

        const [start, end] = timeRanges[preferredTime];

        filtered = filtered.filter(s => {
            const hour = convertTo24Hour(s.time);
            return hour >= start && hour < end;
        });
    }

    // 🎯 FORMAT FILTER
    if (preferredFormat) {
        filtered = filtered.filter(s =>
            s.format &&
            s.format.toLowerCase().includes(preferredFormat)
        );
    }

    // 🎯 EXPERIENCE FILTER
    if (preferredExperience) {
        filtered = filtered.filter(s =>
            s.experience &&
            s.experience.toLowerCase().includes(preferredExperience)
        );
    }

    // ⚠️ FALLBACK → TIME ONLY
    if (filtered.length === 0) {

        logger.warning("No exact match. Falling back to time only...");

        if (preferredTime && timeRanges[preferredTime]) {

            const [start, end] = timeRanges[preferredTime];

            filtered = sessions.filter(s => {
                const hour = convertTo24Hour(s.time);
                return hour >= start && hour < end;
            });
        }
    }

    if (filtered.length === 0) {
        logger.warning("No matching session found.");
        return null;
    }

    const selected = filtered[0];

    logger.success(
        `Matched session: ${selected.time} ${selected.format || ""} ${selected.experience || ""}`
    );

    return selected;
}

// ==========================
module.exports = {
    findTheatre,
    getTheatreContainer,
    getAvailableSessions,
    findMatchingSession
};