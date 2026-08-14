const logger = require("../utils/logger");

// ============================================================
// Normalize text
// ============================================================
function normalizeText(text) {
    return (text || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}


// ============================================================
// Extract row + column from a seat label
//
// Supports examples such as:
//
// Row F, Column 1
// Row F, Column 1, Available
// Row F, Column 1, Booked
// F, Column 1
// ============================================================
function extractSeatPosition(text) {

    if (!text) {
        return null;
    }

    const clean = text.replace(/\s+/g, " ").trim();

    // Row F, Column 1
    let match = clean.match(
        /row\s*([A-Z])\s*[,:\-]?\s*column\s*(\d+)/i
    );

    if (match) {
        return {
            row: match[1].toUpperCase(),
            col: parseInt(match[2], 10)
        };
    }

    // F, Column 1
    match = clean.match(
        /\b([A-Z])\s*[,:\-]?\s*column\s*(\d+)/i
    );

    if (match) {
        return {
            row: match[1].toUpperCase(),
            col: parseInt(match[2], 10)
        };
    }

    return null;
}


// ============================================================
// Determine whether a seat appears available
//
// We inspect several attributes because District can represent
// seat state in different ways.
// ============================================================
async function isSeatAvailable(seat) {

    const ariaLabel = normalizeText(
        await seat.getAttribute("aria-label")
    );

    const title = normalizeText(
        await seat.getAttribute("title")
    );

    const dataState = normalizeText(
        await seat.getAttribute("data-state")
    );

    const dataStatus = normalizeText(
        await seat.getAttribute("data-status")
    );

    const className = normalizeText(
        await seat.getAttribute("class")
    );

    const text = normalizeText(
        await seat.innerText().catch(() => "")
    );

    const combined = [
        ariaLabel,
        title,
        dataState,
        dataStatus,
        text
    ]
        .filter(Boolean)
        .join(" ");

    // --------------------------------------------------------
    // Explicit unavailable states
    // --------------------------------------------------------
    const unavailableWords = [
        "booked",
        "occupied",
        "unavailable",
        "sold",
        "blocked",
        "reserved",
        "not available"
    ];

    for (const word of unavailableWords) {

        if (combined.includes(word)) {
            return false;
        }
    }

    // --------------------------------------------------------
    // Explicit available states
    // --------------------------------------------------------
    const availableWords = [
        "available",
        "vacant",
        "free",
        "open"
    ];

    for (const word of availableWords) {

        if (combined.includes(word)) {
            return true;
        }
    }

    // --------------------------------------------------------
    // State attributes
    // --------------------------------------------------------
    if (
        dataState === "available" ||
        dataStatus === "available"
    ) {
        return true;
    }

    if (
        dataState === "booked" ||
        dataState === "occupied" ||
        dataState === "unavailable" ||
        dataStatus === "booked" ||
        dataStatus === "occupied" ||
        dataStatus === "unavailable"
    ) {
        return false;
    }

    // --------------------------------------------------------
    // Disabled buttons are not selectable
    // --------------------------------------------------------
    const disabled =
        await seat.isDisabled().catch(() => false);

    if (disabled) {
        return false;
    }

    const ariaDisabled =
        normalizeText(
            await seat.getAttribute("aria-disabled")
        );

    if (ariaDisabled === "true") {
        return false;
    }

    // --------------------------------------------------------
    // If no explicit state is found, don't assume available.
    // This prevents selecting booked seats accidentally.
    // --------------------------------------------------------
    return false;
}


// ============================================================
// Get all seat buttons
// ============================================================
function getSeatButtons(page) {

    return page.getByRole("button");
}


// ============================================================
// Get available seats in a specific row
// ============================================================
async function getAvailableSeatsInRow(page, row) {

    const requestedRow = row.toUpperCase();

    logger.info(
        `Inspecting seats in preferred row ${requestedRow}...`
    );

    const buttons = getSeatButtons(page);

    const count = await buttons.count();

    const availableSeats = [];

    let rowSeatCount = 0;

    for (let i = 0; i < count; i++) {

        const seat = buttons.nth(i);

        if (
            !(await seat.isVisible().catch(() => false))
        ) {
            continue;
        }

        const ariaLabel =
            await seat.getAttribute("aria-label");

        const title =
            await seat.getAttribute("title");

        const dataState =
            await seat.getAttribute("data-state");

        const dataStatus =
            await seat.getAttribute("data-status");

        const text =
            await seat.innerText().catch(() => "");

        const combined = [
            ariaLabel,
            title,
            dataState,
            dataStatus,
            text
        ]
            .filter(Boolean)
            .join(" ");

        const position = extractSeatPosition(combined);

        if (!position) {
            continue;
        }

        if (position.row !== requestedRow) {
            continue;
        }

        rowSeatCount++;

        const available =
            await isSeatAvailable(seat);

        logger.info(
            `Seat ${position.row}${position.col} | ` +
            `available=${available} | ` +
            `aria="${ariaLabel || ""}"`
        );

        if (available) {

            availableSeats.push({
                col: position.col,
                locator: seat
            });
        }
    }

    availableSeats.sort(
        (a, b) => a.col - b.col
    );

    logger.info(
        `Row ${requestedRow}: ` +
        `${rowSeatCount} seat(s) detected, ` +
        `${availableSeats.length} available`
    );

    return availableSeats;
}


// ============================================================
// Get all rows
// ============================================================
function getAllRows() {

    return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
}


// ============================================================
// Find continuous seats
// ============================================================
function findContinuousSeats(
    seats,
    countNeeded
) {

    if (
        !Array.isArray(seats) ||
        seats.length < countNeeded
    ) {
        return null;
    }

    for (
        let i = 0;
        i <= seats.length - countNeeded;
        i++
    ) {

        let continuous = true;

        for (
            let j = 0;
            j < countNeeded - 1;
            j++
        ) {

            if (
                seats[i + j].col + 1 !==
                seats[i + j + 1].col
            ) {

                continuous = false;
                break;
            }
        }

        if (continuous) {

            return seats.slice(
                i,
                i + countNeeded
            );
        }
    }

    return null;
}


// ============================================================
// Get seat locator
// ============================================================
function getSeatLocator(
    page,
    row,
    column
) {

    return page.getByRole("button", {
        name: new RegExp(
            `row\\s*${row}\\s*[,\\-:]?\\s*column\\s*${column}\\b`,
            "i"
        )
    });
}


// ============================================================
// Select seats
// ============================================================
async function selectSeats(
    page,
    seatList
) {

    for (const seatInfo of seatList) {

        const {
            row,
            col,
            locator
        } = seatInfo;

        let seat = locator;

        // If locator wasn't supplied, locate it again.
        if (!seat) {

            seat = getSeatLocator(
                page,
                row,
                col
            ).first();
        }

        await seat.scrollIntoViewIfNeeded();

        await seat.click();

        logger.success(
            `Seat ${row}${col} selected`
        );
    }
}


// ============================================================
// Preferred row selection
// ============================================================
async function selectPreferredRow(
    page,
    row,
    count
) {

    const available =
        await getAvailableSeatsInRow(
            page,
            row
        );

    if (available.length === 0) {

        logger.warning(
            `No available seats detected in row ${row}.`
        );

        return false;
    }

    const best =
        findContinuousSeats(
            available,
            count
        );

    if (!best) {

        logger.warning(
            `Row ${row} has ${available.length} ` +
            `available seat(s), but not ${count} ` +
            `continuous seats.`
        );

        return false;
    }

    const columns =
        best.map(seat => seat.col);

    logger.success(
        `Adjacent seats found in row ${row}: ` +
        columns.join(", ")
    );

    await selectSeats(
        page,
        best.map(seat => ({
            row,
            col: seat.col,
            locator: seat.locator
        }))
    );

    return true;
}


// ============================================================
// Any-row adjacent selection
// ============================================================
async function selectAnyRow(
    page,
    count
) {

    logger.step(
        "Trying adjacent seats in other rows..."
    );

    const rows = getAllRows();

    for (const row of rows) {

        const available =
            await getAvailableSeatsInRow(
                page,
                row
            );

        const best =
            findContinuousSeats(
                available,
                count
            );

        if (!best) {
            continue;
        }

        const columns =
            best.map(seat => seat.col);

        logger.success(
            `Adjacent seats found in row ${row}: ` +
            columns.join(", ")
        );

        await selectSeats(
            page,
            best.map(seat => ({
                row,
                col: seat.col,
                locator: seat.locator
            }))
        );

        return true;
    }

    return false;
}


// ============================================================
// Multi-row fallback
// ============================================================
async function selectMultiRowSeats(
    page,
    countNeeded
) {

    logger.step(
        "Trying multi-row seat selection..."
    );

    const rows = getAllRows();

    const selected = [];

    for (const row of rows) {

        const available =
            await getAvailableSeatsInRow(
                page,
                row
            );

        for (const seat of available) {

            selected.push({
                row,
                col: seat.col,
                locator: seat.locator
            });

            if (
                selected.length ===
                countNeeded
            ) {

                await selectSeats(
                    page,
                    selected
                );

                return true;
            }
        }
    }

    return false;
}


// ============================================================
// MAIN SMART SEAT SELECTION
// ============================================================
async function autoSelectBestSeats(
    page,
    config
) {

    const {
        row,
        count
    } = config.seatPreference;

    logger.step(
        `Trying preferred row ${row || "Auto"} ` +
        `for ${count} seats...`
    );

    // ========================================================
    // 1. PREFERRED ROW
    // ========================================================
    if (row) {

        const preferredSuccess =
            await selectPreferredRow(
                page,
                row,
                count
            );

        if (preferredSuccess) {

            logger.success(
                `Preferred row ${row} selected successfully.`
            );

            return true;
        }
    }

    // ========================================================
    // 2. OTHER ROWS
    // ========================================================
    const anyRowSuccess =
        await selectAnyRow(
            page,
            count
        );

    if (anyRowSuccess) {

        return true;
    }

    // ========================================================
    // 3. MULTI-ROW FALLBACK
    // ========================================================
    const multiRowSuccess =
        await selectMultiRowSeats(
            page,
            count
        );

    if (multiRowSuccess) {

        logger.success(
            "Seats selected across multiple rows."
        );

        return true;
    }

    logger.error(
        "❌ Unable to find enough available seats."
    );

    return false;
}


// ============================================================
// EXPORTS
// ============================================================
module.exports = {

    getSeatLocator,

    getAvailableSeatsInRow,

    findContinuousSeats,

    autoSelectBestSeats

};