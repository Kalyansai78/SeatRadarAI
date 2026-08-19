const logger = require("../utils/logger");

// ============================================================
// ESCAPE REGEX TEXT
// ============================================================

function escapeRegExp(text) {

    return String(text).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}


// ============================================================
// GET EXACT SEAT LOCATOR
// ============================================================
//
// IMPORTANT:
//
// seatNumber = number visible to USER
// column     = District's internal DOM column
//
// Example:
//
// Visible seat : C1
// Internal     : column 9
//
// We use:
//
// seatNumber -> logic / terminal
// column     -> Playwright locator
// ============================================================

function getSeatLocator(page, seat) {

    const row =
        escapeRegExp(seat.row);

    const seatClass =
        escapeRegExp(seat.seatClass);

    const column =
        seat.column;

    return page.getByRole("button", {
        name: new RegExp(
            `available\\s+seat.*class\\s+${seatClass}.*row\\s+${row}\\s*,\\s*column\\s+${column}\\b`,
            "i"
        )
    }).first();
}


// ============================================================
// GET VISIBLE SEAT NUMBER
// ============================================================
//
// District displays the actual seat number inside the button.
//
// Example:
//
// <button>
//     1
// </button>
//
// The aria-label may say:
//
// available seat, class DIAMOND, row C, column 9, price 150
//
// Therefore:
//
// column 9 != seat number 1
//
// We read the visible button text.
// ============================================================

async function getVisibleSeatNumber(seat) {

    try {

        const text =
            await seat.innerText();

        const cleaned =
            text.trim();

        const match =
            cleaned.match(/\d+/);

        if (match) {

            return Number(
                match[0]
            );
        }

    } catch {

        // Ignore and return null.
    }

    return null;
}


// ============================================================
// DISCOVER ALL AVAILABLE SEATS
// ============================================================
//
// We do NOT assume:
//
// A-Z rows
// AA / AB rows
// Bronze / Silver / Gold
// fixed column numbering
//
// Everything is discovered from actual seat map.
//
// We capture BOTH:
//
// seatNumber -> visible number
// column     -> internal District column
// ============================================================

async function discoverAvailableSeats(page) {

    logger.step(
        "Discovering available seats..."
    );

    const seatButtons =
        page.getByRole("button", {
            name: /^available\s+seat/i
        });

    const count =
        await seatButtons.count();

    logger.info(
        `Seat buttons found: ${count}`
    );

    const availableSeats = [];

    for (
        let i = 0;
        i < count;
        i++
    ) {

        const seat =
            seatButtons.nth(i);

        const ariaLabel =
            await seat
                .getAttribute("aria-label")
                .catch(() => null);

        if (!ariaLabel) {
            continue;
        }


        // --------------------------------------------------------
        // Expected:
        //
        // available seat,
        // class DIAMOND,
        // row C,
        // column 9,
        // price 150
        //
        // Price is intentionally ignored.
        // --------------------------------------------------------

        const match =
            ariaLabel.match(
                /available\s+seat.*?class\s+([^,]+).*?row\s+([^,]+).*?column\s+(\d+)/i
            );

        if (!match) {
            continue;
        }


        const seatClass =
            match[1].trim();

        const row =
            match[2].trim();

        const column =
            Number(match[3]);


        // --------------------------------------------------------
        // Read USER-VISIBLE seat number.
        // --------------------------------------------------------

        const seatNumber =
            await getVisibleSeatNumber(
                seat
            );


        if (
            seatNumber === null ||
            Number.isNaN(seatNumber)
        ) {

            // Some special/disabled seats can have no
            // visible number. Ignore them rather than
            // breaking the whole discovery process.

            logger.info(
                `Skipping seat with unreadable visible number: ` +
                `${seatClass} ${row} column ${column}.`
            );

            continue;
        }


        availableSeats.push({

            seatClass,

            row,

            // USER-FACING NUMBER
            seatNumber,

            // DISTRICT INTERNAL COLUMN
            column
        });
    }


    logger.info(
        `Available seats discovered: ${availableSeats.length}`
    );

    return availableSeats;
}


// ============================================================
// GROUP SEATS BY CLASS + ROW
// ============================================================
//
// Important:
//
// GOLD A
// SILVER A
// BRONZE A
//
// are different seating groups.
//
// We must NEVER mix them.
// ============================================================

function groupSeatsByClassAndRow(seats) {

    const groups =
        new Map();

    for (const seat of seats) {

        const key =
            `${seat.seatClass}|||${seat.row}`;

        if (!groups.has(key)) {

            groups.set(
                key,
                []
            );
        }

        groups
            .get(key)
            .push(seat);
    }


    // Sort by USER-VISIBLE seat number.

    for (
        const seatsInGroup
        of groups.values()
    ) {

        seatsInGroup.sort(
            (a, b) =>
                a.seatNumber -
                b.seatNumber
        );
    }


    return groups;
}


// ============================================================
// GET AVAILABLE SEATS IN PREFERRED ROW
// ============================================================

async function getAvailableSeatsInRow(
    page,
    row
) {

    logger.info(
        `Inspecting available seats in row ${row}...`
    );

    const allSeats =
        await discoverAvailableSeats(
            page
        );

    const normalizedRow =
        String(row)
            .trim()
            .toUpperCase();

    const rowSeats =
        allSeats.filter(
            seat =>
                seat.row
                    .trim()
                    .toUpperCase() ===
                normalizedRow
        );

    logger.info(
        `Row ${row}: ${rowSeats.length} available seat(s)`
    );

    return rowSeats;
}


// ============================================================
// FIND CONTINUOUS SEATS
// ============================================================
//
// IMPORTANT:
//
// DO NOT use District's column here.
//
// Example:
//
// Visible:
//
// 1  2  3  4  5  6
//
// Internal:
//
// 9  10 11 12 13 14
//
// We want:
//
// 1 -> 2 -> 3 -> 4 -> 5 -> 6
//
// Therefore continuity is based on seatNumber.
// ============================================================

function findContinuousSeats(
    seats,
    count
) {

    if (!Array.isArray(seats)) {
        return null;
    }

    if (
        !Number.isInteger(count) ||
        count <= 0
    ) {
        return null;
    }

    if (seats.length < count) {
        return null;
    }


    const sortedSeats =
        [...seats].sort(
            (a, b) =>
                a.seatNumber -
                b.seatNumber
        );


    for (
        let i = 0;
        i <= sortedSeats.length - count;
        i++
    ) {

        const group =
            sortedSeats.slice(
                i,
                i + count
            );

        let continuous =
            true;


        for (
            let j = 1;
            j < group.length;
            j++
        ) {

            if (
                group[j].seatNumber !==
                group[j - 1].seatNumber + 1
            ) {

                continuous =
                    false;

                break;
            }
        }


        if (continuous) {

            return group;
        }
    }


    return null;
}


// ============================================================
// FIND BEST GROUP IN A ROW
// ============================================================
//
// A row can exist in multiple classes.
//
// Example:
//
// BRONZE A -> 1,2,3,4
// SILVER A -> 1,2,3,4
// GOLD A   -> 1,2,3,4
//
// Each class is checked separately.
// ============================================================

function findSeatsInRow(
    rowSeats,
    count
) {

    const groups =
        new Map();


    for (const seat of rowSeats) {

        const key =
            seat.seatClass;

        if (!groups.has(key)) {

            groups.set(
                key,
                []
            );
        }

        groups
            .get(key)
            .push(seat);
    }


    for (
        const [seatClass, seats]
        of groups
    ) {

        const selected =
            findContinuousSeats(
                seats,
                count
            );


        if (selected) {

            return {

                seatClass,

                seats:
                    selected
            };
        }
    }


    return null;
}


// ============================================================
// CHECK PREFERRED SEATS - READ ONLY
// ============================================================
//
// IMPORTANT:
//
// This function DOES NOT click anything.
//
// It only discovers currently available seats.
//
// Used by monitorEngine.
//
// Returns:
//
// {
//     seatClass: "CLASSIC",
//     seats: [...]
// }
//
// or:
//
// null
// ============================================================

async function checkPreferredSeats(
    page,
    row,
    count
) {

    logger.step(
        `Checking ${count} preferred seat(s) in row ${row}...`
    );


    const rowSeats =
        await getAvailableSeatsInRow(
            page,
            row
        );


    if (
        !rowSeats ||
        rowSeats.length === 0
    ) {

        logger.info(
            `No available seats found in row ${row}.`
        );

        return null;
    }


    const result =
        findSeatsInRow(
            rowSeats,
            count
        );


    if (!result) {

        logger.info(
            `No ${count} continuous seat(s) available in row ${row}.`
        );

        return null;
    }


    logger.success(
        `Found ${count} continuous seat(s) in ` +
        `${result.seatClass} row ${row}: ` +
        result.seats
            .map(
                seat =>
                    seat.seatNumber
            )
            .join(", ")
    );


    return result;
}


// ============================================================
// SELECT SEATS
// ============================================================
//
// Uses:
//
// seatNumber -> terminal output
// column     -> actual Playwright locator
// ============================================================

async function selectSeats(
    page,
    seats
) {

    if (
        !Array.isArray(seats) ||
        seats.length === 0
    ) {

        logger.error(
            "No seats supplied for selection."
        );

        return false;
    }


    for (const seatInfo of seats) {

        const seat =
            getSeatLocator(
                page,
                seatInfo
            );


        await seat.waitFor({
            state: "visible",
            timeout: 10000
        });


        await seat.scrollIntoViewIfNeeded();


        await seat.click();


        logger.success(
            `Seat ${seatInfo.seatClass} ` +
            `${seatInfo.row}${seatInfo.seatNumber} selected`
        );
    }


    return true;
}


// ============================================================
// SELECT PREFERRED ROW
// ============================================================

async function selectPreferredRow(
    page,
    row,
    count
) {

    logger.step(
        `Trying preferred row ${row} for ${count} seats...`
    );


    const result =
        await checkPreferredSeats(
            page,
            row,
            count
        );


    if (!result) {

        logger.warning(
            `Could not find ${count} suitable seats in row ${row}.`
        );

        return false;
    }


    logger.success(
        `Seats found in ${result.seatClass} row ${row}: ` +
        result.seats
            .map(
                seat =>
                    seat.seatNumber
            )
            .join(", ")
    );


    await selectSeats(
        page,
        result.seats
    );


    return true;
}


// ============================================================
// DISCOVER ACTUAL ROWS
// ============================================================

function discoverRows(
    seats
) {

    const rows = [];

    for (const seat of seats) {

        if (!rows.includes(seat.row)) {

            rows.push(
                seat.row
            );
        }
    }

    return rows;
}


// ============================================================
// SELECT FROM OTHER ACTUAL ROWS
// ============================================================

async function selectAnyRow(
    page,
    count
) {

    logger.step(
        "Trying other available rows..."
    );


    const allSeats =
        await discoverAvailableSeats(
            page
        );


    if (
        !allSeats ||
        allSeats.length === 0
    ) {

        logger.warning(
            "No available seats discovered."
        );

        return false;
    }


    const rows =
        discoverRows(
            allSeats
        );


    logger.info(
        `Rows discovered: ${rows.join(", ")}`
    );


    for (const row of rows) {

        const rowSeats =
            allSeats.filter(
                seat =>
                    seat.row === row
            );


        const result =
            findSeatsInRow(
                rowSeats,
                count
            );


        if (!result) {
            continue;
        }


        logger.success(
            `Seats found in ${result.seatClass} row ${row}: ` +
            result.seats
                .map(
                    seat =>
                        seat.seatNumber
                )
                .join(", ")
        );


        await selectSeats(
            page,
            result.seats
        );


        return true;
    }


    return false;
}


// ============================================================
// MAIN SMART SELECTION
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
        `Finding ${count} seat(s)` +
        (
            row
                ? ` in preferred row ${row}...`
                : "..."
        )
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
    // 2. DYNAMIC FALLBACK
    // ========================================================

    const fallbackSuccess =
        await selectAnyRow(
            page,
            count
        );


    if (fallbackSuccess) {

        logger.success(
            "Seats selected successfully."
        );

        return true;
    }


    // ========================================================
    // 3. FAILED
    // ========================================================

    logger.error(
        `Unable to find ${count} suitable seats.`
    );

    return false;
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    getSeatLocator,

    discoverAvailableSeats,

    getAvailableSeatsInRow,

    findContinuousSeats,

    findSeatsInRow,

    checkPreferredSeats,

    selectSeats,

    selectPreferredRow,

    selectAnyRow,

    autoSelectBestSeats

};