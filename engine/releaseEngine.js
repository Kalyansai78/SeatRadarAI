const logger = require("../utils/logger");

const {
    findTheatre,
    getTheatreContainer,
    getAvailableSessions,
    findMatchingSession
} = require("../engine/availabilityEngine");


// ============================================================
// NORMALIZE TEXT
// ============================================================

function normalizeText(value) {

    if (!value) {
        return "";
    }

    return value
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
}


// ============================================================
// NORMALIZE DATE
// ============================================================

function normalizeDate(date) {

    return normalizeText(date);
}


// ============================================================
// REFRESH PAGE
// ============================================================

async function refreshPage(page) {

    try {

        logger.info(
            "Refreshing page for availability check..."
        );

        await page.reload({
            waitUntil: "domcontentloaded",
            timeout: 30000
        });

        await page.waitForLoadState(
            "load",
            {
                timeout: 30000
            }
        ).catch(() => {});

        await page.waitForFunction(
            () => document.readyState === "complete",
            {
                timeout: 30000
            }
        ).catch(() => {});

        await page.waitForTimeout(1500);

        logger.success(
            "Page refreshed successfully."
        );

        return true;

    } catch (error) {

        logger.warning(
            `Page refresh failed: ${error.message}`
        );

        return false;
    }
}


// ============================================================
// FIND REQUESTED DATE BUTTON
// ============================================================

async function findDateButton(page, date) {

    const requestedDate =
        normalizeDate(date);

    if (!requestedDate) {
        return null;
    }


    // --------------------------------------------------------
    // EXACT BUTTON
    // --------------------------------------------------------

    const exactButton =
        page.getByRole("button", {
            name: date,
            exact: true
        }).first();

    if (
        await exactButton.count() > 0 &&
        await exactButton.isVisible().catch(() => false)
    ) {

        return exactButton;
    }


    // --------------------------------------------------------
    // FALLBACK
    // --------------------------------------------------------

    const buttons =
        page.getByRole("button");

    const count =
        await buttons.count();

    for (let i = 0; i < count; i++) {

        const button =
            buttons.nth(i);

        if (
            !(await button.isVisible().catch(() => false))
        ) {
            continue;
        }

        const text =
            (
                await button
                    .innerText()
                    .catch(() => "")
            )
                .trim()
                .replace(/\s+/g, " ")
                .toLowerCase();

        if (text === requestedDate) {

            return button;
        }
    }

    return null;
}


// ============================================================
// CHECK DATE RELEASE
// ============================================================

async function isBookingReleased(
    page,
    date
) {

    logger.step(
        `Checking booking release for ${date}...`
    );

    if (!date) {

        logger.error(
            "No date provided."
        );

        return false;
    }

    try {

        const dateButton =
            await findDateButton(
                page,
                date
            );

        if (!dateButton) {

            logger.info(
                `Date ${date} is not available yet.`
            );

            return false;
        }

        logger.success(
            `Date ${date} is available. Booking is released.`
        );

        return true;

    } catch (error) {

        logger.warning(
            `Could not check booking release: ${error.message}`
        );

        return false;
    }
}


// ============================================================
// MONITOR DATE RELEASE
//
// maxAttempts:
//     0  = unlimited
//     >0 = limited attempts
// ============================================================

async function monitorBookingRelease(
    page,
    date,
    interval = 60000,
    maxAttempts = 0
) {

    logger.step(
        `Monitoring booking release for ${date}...`
    );

    if (!date) {

        logger.error(
            "No date provided."
        );

        return false;
    }


    let attempt = 1;

    while (true) {

        if (maxAttempts > 0) {

            logger.title(
                `Date Check ${attempt} / ${maxAttempts}`
            );

        } else {

            logger.title(
                `Date Check ${attempt}`
            );
        }


        const released =
            await isBookingReleased(
                page,
                date
            );


        if (released) {

            logger.success(
                `Booking released for ${date}.`
            );

            return true;
        }


        // ----------------------------------------------------
        // STOP ONLY WHEN maxAttempts IS REACHED
        // 0 MEANS UNLIMITED
        // ----------------------------------------------------

        if (
            maxAttempts > 0 &&
            attempt >= maxAttempts
        ) {

            break;
        }


        logger.wait(
            `Date not released. Checking again in ${
                interval / 1000
            } seconds...`
        );


        await page.waitForTimeout(
            interval
        );


        await refreshPage(page);

        attempt++;
    }


    logger.warning(
        `Booking for ${date} was not released after ${maxAttempts} checks.`
    );

    return false;
}


// ============================================================
// CHECK THEATRE AVAILABILITY
// ============================================================

async function isTheatreReleased(
    page,
    theatre
) {

    logger.step(
        `Checking theatre availability: ${theatre}...`
    );

    if (!theatre) {

        logger.error(
            "No theatre provided."
        );

        return false;
    }

    try {

        const theatreLocator =
            await findTheatre(
                page,
                theatre
            );

        if (!theatreLocator) {

            logger.info(
                `Theatre "${theatre}" is not available yet.`
            );

            return false;
        }

        logger.success(
            `Theatre "${theatre}" is available.`
        );

        return true;

    } catch (error) {

        logger.warning(
            `Could not check theatre availability: ${error.message}`
        );

        return false;
    }
}


// ============================================================
// MONITOR THEATRE AVAILABILITY
//
// maxAttempts:
//     0  = unlimited
//     >0 = limited attempts
// ============================================================

async function monitorTheatreRelease(
    page,
    theatre,
    interval = 60000,
    maxAttempts = 0
) {

    logger.step(
        `Monitoring theatre "${theatre}"...`
    );

    if (!theatre) {

        logger.error(
            "No theatre provided."
        );

        return false;
    }


    let attempt = 1;

    while (true) {

        if (maxAttempts > 0) {

            logger.title(
                `Theatre Check ${attempt} / ${maxAttempts}`
            );

        } else {

            logger.title(
                `Theatre Check ${attempt}`
            );
        }


        const available =
            await isTheatreReleased(
                page,
                theatre
            );


        if (available) {

            logger.success(
                `Theatre "${theatre}" is now available.`
            );

            return true;
        }


        if (
            maxAttempts > 0 &&
            attempt >= maxAttempts
        ) {

            break;
        }


        logger.wait(
            `Theatre not available. Checking again in ${
                interval / 1000
            } seconds...`
        );


        await page.waitForTimeout(
            interval
        );


        await refreshPage(page);

        attempt++;
    }


    logger.warning(
        `Theatre "${theatre}" was not found after ${maxAttempts} checks.`
    );

    return false;
}


// ============================================================
// CHECK SHOW AVAILABILITY
// ============================================================

async function isShowReleased(
    page,
    theatre,
    showTime
) {

    logger.step(
        `Checking show ${showTime} at ${theatre}...`
    );

    if (!theatre || !showTime) {

        logger.error(
            "Theatre and show time are required."
        );

        return false;
    }

    try {

        // ----------------------------------------------------
        // FIND THEATRE
        // ----------------------------------------------------

        const theatreLocator =
            await findTheatre(
                page,
                theatre
            );

        if (!theatreLocator) {

            logger.info(
                `Theatre "${theatre}" is not available yet.`
            );

            return false;
        }


        // ----------------------------------------------------
        // GET THEATRE CONTAINER
        // ----------------------------------------------------

        const theatreContainer =
            await getTheatreContainer(
                theatreLocator
            );


        // ----------------------------------------------------
        // READ SHOWS
        // ----------------------------------------------------

        const sessions =
            await getAvailableSessions(
                theatreContainer
            );


        if (
            !sessions ||
            sessions.length === 0
        ) {

            logger.info(
                `No shows currently available at "${theatre}".`
            );

            return false;
        }


        // ----------------------------------------------------
        // FIND REQUESTED SHOW
        // ----------------------------------------------------

        const showConfig = {
            time: showTime
        };


        const matchingShow =
            await findMatchingSession(
                sessions,
                showConfig
            );


        if (!matchingShow) {

            logger.info(
                `Show "${showTime}" is not available at "${theatre}" yet.`
            );

            return false;
        }


        logger.success(
            `Show "${showTime}" is now available at "${theatre}".`
        );

        return true;

    } catch (error) {

        logger.warning(
            `Could not check show availability: ${error.message}`
        );

        return false;
    }
}


// ============================================================
// MONITOR SHOW AVAILABILITY
//
// maxAttempts:
//     0  = unlimited
//     >0 = limited attempts
// ============================================================

async function monitorShowRelease(
    page,
    theatre,
    showTime,
    interval = 60000,
    maxAttempts = 0
) {

    logger.step(
        `Monitoring show "${showTime}" at "${theatre}"...`
    );

    if (!theatre || !showTime) {

        logger.error(
            "Theatre and show time are required."
        );

        return false;
    }


    let attempt = 1;

    while (true) {

        if (maxAttempts > 0) {

            logger.title(
                `Show Check ${attempt} / ${maxAttempts}`
            );

        } else {

            logger.title(
                `Show Check ${attempt}`
            );
        }


        const available =
            await isShowReleased(
                page,
                theatre,
                showTime
            );


        if (available) {

            logger.success(
                `Show "${showTime}" is now available.`
            );

            return true;
        }


        if (
            maxAttempts > 0 &&
            attempt >= maxAttempts
        ) {

            break;
        }


        logger.wait(
            `Show not available. Checking again in ${
                interval / 1000
            } seconds...`
        );


        await page.waitForTimeout(
            interval
        );


        await refreshPage(page);

        attempt++;
    }


    logger.warning(
        `Show "${showTime}" was not found after ${maxAttempts} checks.`
    );

    return false;
}


// ============================================================
// WAIT UNTIL DATE RELEASED
//
// This is an unlimited convenience method.
// ============================================================

async function waitForBookingRelease(
    page,
    date,
    interval = 60000
) {

    logger.step(
        `Waiting for booking release: ${date}`
    );

    while (true) {

        const released =
            await isBookingReleased(
                page,
                date
            );


        if (released) {

            logger.success(
                `Booking for ${date} is now released.`
            );

            return true;
        }


        logger.wait(
            `Booking not released. Checking again in ${
                interval / 1000
            } seconds...`
        );


        await page.waitForTimeout(
            interval
        );


        await refreshPage(page);
    }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    normalizeDate,

    refreshPage,

    findDateButton,

    // DATE
    isBookingReleased,
    waitForBookingRelease,
    monitorBookingRelease,

    // THEATRE
    isTheatreReleased,
    monitorTheatreRelease,

    // SHOW
    isShowReleased,
    monitorShowRelease
};