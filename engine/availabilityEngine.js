const logger = require("../utils/logger");

// ======================================================
// CONVERT TIME → MINUTES
// ======================================================

function convertToMinutes(timeStr) {

    if (!timeStr) {
        return null;
    }

    const value = timeStr
        .trim()
        .toUpperCase();

    const match = value.match(
        /^(\d{1,2}):(\d{2})\s*(AM|PM)$/
    );

    if (!match) {
        return null;
    }

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const modifier = match[3];

    if (hours < 1 || hours > 12) {
        return null;
    }

    if (minutes < 0 || minutes > 59) {
        return null;
    }

    if (modifier === "PM" && hours !== 12) {
        hours += 12;
    }

    if (modifier === "AM" && hours === 12) {
        hours = 0;
    }

    return hours * 60 + minutes;
}


// ======================================================
// NORMALIZE TIME
// ======================================================

function normalizeTime(time) {

    if (!time) {
        return null;
    }

    return time
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
}


// ======================================================
// FORMAT TAG SCORE
// ======================================================

function getTagScore(format) {

    const f = (format || "").toUpperCase();

    let score = 0;

    if (f.includes("IMAX")) {
        score += 5;
    }

    if (f.includes("DOLBY")) {
        score += 4;
    }

    if (f.includes("4DX")) {
        score += 4;
    }

    if (f.includes("ATMOS")) {
        score += 3;
    }

    if (f.includes("3D")) {
        score += 3;
    }

    if (f.includes("RECLINER")) {
        score += 2;
    }

    return score;
}


// ======================================================
// FIND THEATRE
// ======================================================

async function findTheatre(page, theatre) {

    logger.step(
        `Searching for theatre "${theatre}"...`
    );

    /*
     * Try exact text first.
     */

    const exactLocator = page.getByText(
        theatre,
        {
            exact: true
        }
    ).first();

    if (await exactLocator.count() > 0) {

        logger.success(
            `Theatre "${theatre}" found.`
        );

        return exactLocator;
    }


    /*
     * Fallback:
     * partial text matching.
     */

    const partialLocator = page.getByText(
        theatre,
        {
            exact: false
        }
    ).first();

    if (await partialLocator.count() === 0) {

        logger.error(
            `Theatre "${theatre}" not found.`
        );

        return null;
    }

    logger.success(
        `Theatre "${theatre}" found.`
    );

    return partialLocator;
}


// ======================================================
// GET THEATRE CONTAINER
// ======================================================

async function getTheatreContainer(
    theatreLocator
) {

    /*
     * District theatre/session structure can change.
     *
     * First try the known movieSessions container.
     */

    const container =
        theatreLocator.locator(
            "xpath=ancestor::li[contains(@class,'movieSessions')]"
        ).first();

    if (await container.count() > 0) {

        return container;
    }


    /*
     * Fallback:
     * walk upwards looking for a container containing
     * data-time-selection elements.
     */

    let current = theatreLocator;

    for (let i = 0; i < 5; i++) {

        current = current.locator(
            ".."
        );

        if (await current.count() === 0) {
            break;
        }

        const sessions =
            current.locator(
                "li[data-time-selection]"
            );

        if (await sessions.count() > 0) {

            return current;
        }
    }

    return theatreLocator;
}


// ======================================================
// GET AVAILABLE SESSIONS
// ======================================================

async function getAvailableSessions(
    theatreContainer
) {

    logger.step(
        "Reading available sessions..."
    );

    const sessions = [];

    const showBlocks =
        theatreContainer.locator(
            "li[data-time-selection]"
        );

    const count =
        await showBlocks.count();

    logger.info(
        `Found ${count} show(s)`
    );


    for (let i = 0; i < count; i++) {

        const show =
            showBlocks.nth(i);

        // ==================================================
        // TIME
        // ==================================================

        let rawTime = "";

        const timeLocator =
            show.locator(
                "div[class*='time']"
            ).first();

        if (await timeLocator.count() > 0) {

            rawTime =
                await timeLocator
                    .innerText()
                    .catch(() => "");
        }


        /*
         * Sometimes the time can contain multiple lines.
         */

        const time =
            rawTime
                .split("\n")[0]
                .trim();


        if (!time) {

            logger.warning(
                `Show ${i + 1} has no readable time.`
            );

            continue;
        }


        // ==================================================
        // FORMAT / TAGS
        // ==================================================

        let tags = [];

        const elements =
            show.locator("*");

        const elementCount =
            await elements.count();


        for (
            let j = 0;
            j < elementCount;
            j++
        ) {

            const element =
                elements.nth(j);

            const text =
                await element
                    .innerText()
                    .catch(() => "");

            if (!text) {
                continue;
            }

            const clean =
                text.trim();

            if (!clean) {
                continue;
            }


            const upper =
                clean.toUpperCase();

            const normalized =
                upper.replace(
                    /\s+/g,
                    ""
                );


            /*
             * Ignore empty / N/A values.
             */

            if (
                normalized === "N/A" ||
                normalized === "NA"
            ) {
                continue;
            }


            /*
             * Ignore the actual time.
             */

            if (
                normalized.includes(
                    time
                        .replace(/\s+/g, "")
                        .toUpperCase()
                )
            ) {
                continue;
            }


            /*
             * Ignore very long text.
             */

            if (
                normalized.length > 15
            ) {
                continue;
            }


            /*
             * Recognized formats.
             */

            if (
                /2D|3D|4DX|IMAX|DOLBY|ATMOS|RECLINER|SCREEN|HDR|K/i
                    .test(upper)
            ) {

                tags.push(
                    upper.trim()
                );
            }
        }


        tags = [
            ...new Set(tags)
        ];


        const format =
            tags.length > 0
                ? tags.join(" | ")
                : "";


        // ==================================================
        // STORE SESSION
        // ==================================================

        sessions.push({
            time,
            format,
            locator: show
        });
    }


    logger.success(
        "Sessions extracted successfully."
    );

    return sessions;
}


// ======================================================
// FIND EXACT MATCHING SESSION
// ======================================================

async function findMatchingSession(
    sessions,
    config
) {

    console.log(
        "\n[STEP] Finding exact show time..."
    );


    // ==================================================
    // VALIDATE CONFIG TIME
    // ==================================================

    if (!config.time) {

        logger.error(
            "❌ No exact show time provided in config.json."
        );

        return null;
    }


    const requestedTime =
        normalizeTime(
            config.time
        );


    const requestedMinutes =
        convertToMinutes(
            requestedTime
        );


    if (requestedMinutes === null) {

        logger.error(
            `❌ Invalid show time: "${config.time}"`
        );

        logger.error(
            'Expected format: "7:20 PM" or "1:10 AM"'
        );

        return null;
    }


    logger.info(
        `Requested show time: ${requestedTime}`
    );


    // ==================================================
    // CHECK EACH SESSION
    // ==================================================

    for (const session of sessions) {

        const sessionTime =
            normalizeTime(
                session.time
            );

        const sessionMinutes =
            convertToMinutes(
                sessionTime
            );


        if (sessionMinutes === null) {

            logger.warning(
                `Could not understand show time: ${session.time}`
            );

            continue;
        }


        const isExactMatch =
            sessionMinutes === requestedMinutes;


        console.log(
            `[CHECK] ${session.time} | ` +
            `${session.format || "STANDARD"} | ` +
            `Exact Match: ${isExactMatch}`
        );


        if (isExactMatch) {

            logger.success(
                `Exact show found: ${session.time}`
            );

            return session;
        }
    }


    // ==================================================
    // NO MATCH
    // ==================================================

    logger.error(
        `❌ Show "${config.time}" is not available.`
    );

    console.log(
        "\nAvailable times:"
    );

    sessions.forEach(
        session => {

            console.log(
                `  • ${session.time}` +
                (
                    session.format
                        ? ` | ${session.format}`
                        : ""
                )
            );
        }
    );


    return null;
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    convertToMinutes,

    normalizeTime,

    getTagScore,

    findTheatre,

    getTheatreContainer,

    getAvailableSessions,

    findMatchingSession
};