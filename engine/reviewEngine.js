const fs = require("fs");
const path = require("path");

const logger = require("../utils/logger");


// ============================================================
// REVIEW ENGINE
// ============================================================
//
// Responsibilities:
//
// 1. Detect "Review your booking" page
// 2. Extract visible booking information
// 3. Extract seat class
// 4. Extract all selected seats
// 5. Extract payment summary
// 6. Capture booking review screenshot
// 7. Return review information to monitor.js
//
// IMPORTANT:
//
// This engine does NOT:
//
// - click Pay Now
// - handle payment
// - select seats
// - click Proceed
// - send Telegram messages
//
// It only prepares the booking review.
// ============================================================


// ============================================================
// WAIT FOR REVIEW PAGE
// ============================================================

async function waitForReviewPage(
    page,
    timeout = 30000
) {

    logger.step(
        "Waiting for booking review page..."
    );


    try {

        // --------------------------------------------------------
        // Primary check
        // --------------------------------------------------------

        const reviewText =
            page.getByText(
                "Review your booking",
                {
                    exact: false
                }
            ).first();


        if (
            await reviewText
                .waitFor({
                    state: "visible",
                    timeout
                })
                .then(() => true)
                .catch(() => false)
        ) {

            logger.success(
                "Booking review page detected."
            );

            return true;
        }


        // --------------------------------------------------------
        // Fallback: page text
        // --------------------------------------------------------

        const bodyText =
            await page
                .locator("body")
                .innerText()
                .catch(() => "");


        if (
            bodyText
                .toLowerCase()
                .includes(
                    "review your booking"
                )
        ) {

            logger.success(
                "Booking review page detected."
            );

            return true;
        }


        logger.warning(
            "Booking review page could not be detected."
        );

        return false;


    } catch (error) {

        logger.warning(
            `Review page detection failed: ${error.message}`
        );

        return false;
    }
}


// ============================================================
// GET BODY TEXT
// ============================================================

async function getReviewPageText(page) {

    try {

        return await page
            .locator("body")
            .innerText()
            .catch(() => "");

    } catch (error) {

        logger.warning(
            `Could not read review page: ${error.message}`
        );

        return "";
    }
}


// ============================================================
// EXTRACT SEAT CLASS FROM TICKET LINE
// ============================================================
//
// Examples:
//
// CC - C6, C7, C8
// GOLD-D1 - 6
// GOLD-D1
//
// Results:
//
// CC
// GOLD
//
// ============================================================

function extractSeatClassFromTicketLine(line) {

    if (!line) {
        return null;
    }


    const normalized =
        line
            .replace(/\u00A0/g, " ")
            .replace(/\s+/g, " ")
            .trim();


    const match =
        normalized.match(
            /^(.+?)\s*-\s*[A-Z]{1,2}\d{1,3}(?:\s*(?:-|,|$))/i
        );


    if (!match) {
        return null;
    }


    return match[1]
        .replace(/[-\s]+$/g, "")
        .trim() || null;
}


// ============================================================
// EXTRACT SEAT + CLASS INFORMATION
// ============================================================
//
// Supported District formats:
//
// Format 1:
//
// 3 tickets
// CC - C6, C7, C8
//
// Result:
//
// seatClass = CC
// seats = C6, C7, C8
//
//
// Format 2:
//
// 6 tickets
// GOLD-D1 - 6
//
// Result:
//
// seatClass = GOLD
// seats = D1, D2, D3, D4, D5, D6
//
//
// Format 3:
//
// GOLD-D1
//
// Result:
//
// seatClass = GOLD
// seats = D1
//
// IMPORTANT:
//
// We only inspect the ticket section.
// This prevents movie certification such as UA16
// from being detected as a seat.
// ============================================================

async function extractReviewSeatInfo(page) {

    try {

        const bodyText =
            await getReviewPageText(page);


        if (!bodyText) {

            logger.warning(
                "Could not read booking review page text."
            );

            return {
                seatClass: null,
                seats: []
            };
        }


        // ----------------------------------------------------
        // Normalize text
        // ----------------------------------------------------

        const text =
            bodyText
                .replace(/\u00A0/g, " ")
                .replace(/\r/g, "")
                .trim();


        // ----------------------------------------------------
        // Find ticket section
        // ----------------------------------------------------

        const ticketSectionMatch =
            text.match(
                /\b\d+\s+tickets\b([\s\S]{0,250})/i
            );


        if (!ticketSectionMatch) {

            logger.warning(
                "Could not locate ticket section on review page."
            );

            return {
                seatClass: null,
                seats: []
            };
        }


        const ticketSection =
            ticketSectionMatch[1];


        logger.info(
            "Ticket section detected."
        );


        // ----------------------------------------------------
        // Convert ticket section into lines
        // ----------------------------------------------------

        const lines =
            ticketSection
                .split("\n")
                .map(
                    line =>
                        line
                            .trim()
                            .replace(/\s+/g, " ")
                )
                .filter(
                    line => line.length > 0
                );


        if (lines.length === 0) {

            logger.warning(
                "No ticket detail lines found."
            );

            return {
                seatClass: null,
                seats: []
            };
        }


        // ----------------------------------------------------
        // Try each line
        // ----------------------------------------------------

        for (const line of lines) {

            // ------------------------------------------------
            // Extract seat class
            // ------------------------------------------------

            const seatClass =
                extractSeatClassFromTicketLine(
                    line
                );


            // ------------------------------------------------
            // FORMAT 1
            //
            // CC - C6, C7, C8
            //
            // Also supports:
            //
            // C6, C7, C8
            // ------------------------------------------------

            const commaMatch =
                line.match(
                    /\b([A-Z]{1,2}\d{1,3}(?:\s*,\s*[A-Z]{1,2}\d{1,3})+)\b/i
                );


            if (commaMatch) {

                const seats =
                    commaMatch[1]
                        .match(
                            /[A-Z]{1,2}\d{1,3}/gi
                        )
                        .map(
                            seat =>
                                seat.toUpperCase()
                        );


                logger.success(
                    `Review seat class extracted: ${
                        seatClass || "Unknown"
                    }`
                );


                logger.success(
                    `Review seats extracted: ${
                        seats.join(", ")
                    }`
                );


                return {
                    seatClass,
                    seats
                };
            }


            // ------------------------------------------------
            // FORMAT 2
            //
            // GOLD-D1 - 6
            //
            // Means:
            //
            // D1
            // D2
            // D3
            // D4
            // D5
            // D6
            // ------------------------------------------------

            const rangeMatch =
                line.match(
                    /(?:^|\s|-)([A-Z]{1,2})(\d{1,3})\s*-\s*(\d{1,3})(?:\s|$)/i
                );


            if (rangeMatch) {

                const row =
                    rangeMatch[1]
                        .toUpperCase();


                const startSeat =
                    Number(
                        rangeMatch[2]
                    );


                const endSeat =
                    Number(
                        rangeMatch[3]
                    );


                if (
                    endSeat >= startSeat
                ) {

                    const seats = [];


                    for (
                        let number = startSeat;
                        number <= endSeat;
                        number++
                    ) {

                        seats.push(
                            `${row}${number}`
                        );
                    }


                    logger.success(
                        `Review seat class extracted: ${
                            seatClass || "Unknown"
                        }`
                    );


                    logger.success(
                        `Review seats extracted: ${
                            seats.join(", ")
                        }`
                    );


                    return {
                        seatClass,
                        seats
                    };
                }
            }


            // ------------------------------------------------
            // FORMAT 3
            //
            // GOLD-D1
            //
            // ------------------------------------------------

            const singleMatch =
                line.match(
                    /\b([A-Z]{1,2}\d{1,3})\b/i
                );


            if (singleMatch) {

                const seat =
                    singleMatch[1]
                        .toUpperCase();


                logger.success(
                    `Review seat class extracted: ${
                        seatClass || "Unknown"
                    }`
                );


                logger.success(
                    `Review seats extracted: ${seat}`
                );


                return {
                    seatClass,
                    seats: [seat]
                };
            }
        }


        logger.warning(
            "Could not extract seats from ticket section."
        );


        return {
            seatClass: null,
            seats: []
        };


    } catch (error) {

        logger.warning(
            `Could not extract seat information: ${error.message}`
        );


        return {
            seatClass: null,
            seats: []
        };
    }
}


// ============================================================
// BACKWARD-COMPATIBLE SEAT EXTRACTION
// ============================================================
//
// Existing monitor.js code may use:
//
// const seats = await extractReviewSeats(page);
//
// This function continues returning only the seat array.
//
// ============================================================

async function extractReviewSeats(page) {

    const result =
        await extractReviewSeatInfo(page);


    return result.seats;
}


// ============================================================
// EXTRACT PAYMENT SUMMARY
// ============================================================
//
// District review page:
//
// Order amount
// ₹885.00
//
// Booking charge (incl. of GST)
// ₹99.12
//
// To be paid
// ₹984.12
//
// We extract:
//
// orderAmount
// bookingCharge
// totalAmount
//
// ============================================================

async function extractPaymentSummary(page) {

    try {

        const bodyText =
            await getReviewPageText(page);


        if (!bodyText) {

            return {

                orderAmount: null,

                bookingCharge: null,

                totalAmount: null
            };
        }


        // ----------------------------------------------------
        // Normalize whitespace
        // ----------------------------------------------------

        const text =
            bodyText
                .replace(/\u00A0/g, " ")
                .replace(/\r/g, "")
                .trim();


        // ----------------------------------------------------
        // Extract order amount
        // ----------------------------------------------------

        const orderMatch =
            text.match(
                /Order amount[\s\S]{0,150}?₹\s*([\d,]+(?:\.\d{1,2})?)/i
            );


        // ----------------------------------------------------
        // Extract booking charge including GST
        // ----------------------------------------------------

        const chargeMatch =
            text.match(
                /Booking charge\s*\(incl\.\s*of\s*GST\)[\s\S]{0,150}?₹\s*([\d,]+(?:\.\d{1,2})?)/i
            );


        // ----------------------------------------------------
        // Extract final amount
        // ----------------------------------------------------

        const totalMatch =
            text.match(
                /To be paid[\s\S]{0,150}?₹\s*([\d,]+(?:\.\d{1,2})?)/i
            );


        const orderAmount =
            orderMatch
                ? `₹${orderMatch[1]}`
                : null;


        const bookingCharge =
            chargeMatch
                ? `₹${chargeMatch[1]}`
                : null;


        const totalAmount =
            totalMatch
                ? `₹${totalMatch[1]}`
                : null;


        logger.success(
            `Payment summary extracted: ` +
            `Order ${orderAmount || "N/A"} | ` +
            `Booking charge ${bookingCharge || "N/A"} | ` +
            `Total ${totalAmount || "N/A"}`
        );


        return {

            orderAmount,

            bookingCharge,

            totalAmount
        };


    } catch (error) {

        logger.warning(
            `Could not extract payment summary: ${error.message}`
        );


        return {

            orderAmount: null,

            bookingCharge: null,

            totalAmount: null
        };
    }
}


// ============================================================
// EXTRACT BOOKING DETAILS
// ============================================================
//
// The config values are passed into this function.
//
// We already know:
//
// - movie
// - city
// - theatre
// - date
// - time
// - language
//
// The review engine obtains from the actual review page:
//
// - seat class
// - seats
// - order amount
// - booking charge including GST
// - final total
//
// ============================================================

async function extractBookingDetails(
    page,
    config
) {

    logger.step(
        "Extracting booking review details..."
    );


    // --------------------------------------------------------
    // Extract seat class + seats
    // --------------------------------------------------------

    const seatInfo =
        await extractReviewSeatInfo(
            page
        );


    // --------------------------------------------------------
    // Extract payment summary
    // --------------------------------------------------------

    const payment =
        await extractPaymentSummary(
            page
        );


    // --------------------------------------------------------
    // Build booking details object
    // --------------------------------------------------------

    const details = {

        movie:
            config?.movie || null,


        city:
            config?.city || null,


        theatre:
            config?.theatre || null,


        date:
            config?.date || null,


        time:
            config?.time || null,


        language:
            config?.language || null,


        requestedRow:
            config?.seatPreference?.row || null,


        seatCount:
            config?.seatPreference?.count || null,


        seatClass:
            seatInfo.seatClass,


        seats:
            seatInfo.seats,


        orderAmount:
            payment.orderAmount,


        bookingCharge:
            payment.bookingCharge,


        totalAmount:
            payment.totalAmount
    };


    logger.success(
        "Booking review details extracted."
    );


    return details;
}


// ============================================================
// CAPTURE REVIEW SCREENSHOT
// ============================================================

async function captureReviewScreenshot(
    page,
    outputDirectory = "screenshots"
) {

    logger.step(
        "Capturing booking review screenshot..."
    );


    try {

        /*
         * Create screenshot directory if it doesn't exist.
         */

        const absoluteDirectory =
            path.resolve(
                process.cwd(),
                outputDirectory
            );


        if (
            !fs.existsSync(
                absoluteDirectory
            )
        ) {

            fs.mkdirSync(
                absoluteDirectory,
                {
                    recursive: true
                }
            );
        }


        /*
         * Create unique filename.
         */

        const timestamp =
            new Date()
                .toISOString()
                .replace(
                    /[:.]/g,
                    "-"
                );


        const filePath =
            path.join(
                absoluteDirectory,
                `booking-review-${timestamp}.png`
            );


        /*
         * Capture the complete review page.
         */

        await page.screenshot({

            path: filePath,

            fullPage: true

        });


        logger.success(
            `Booking review screenshot saved: ${filePath}`
        );


        return filePath;


    } catch (error) {

        logger.warning(
            `Could not capture review screenshot: ${error.message}`
        );


        return null;
    }
}


// ============================================================
// PREPARE BOOKING REVIEW
// ============================================================
//
// Main function used by monitor.js.
//
// Returns:
//
// {
//     success: true,
//     screenshotPath: "...",
//     details: {...}
// }
//
// OR:
//
// {
//     success: false,
//     screenshotPath: null,
//     details: null
// }
//
// ============================================================

async function prepareBookingReview(
    page,
    config,
    options = {}
) {

    logger.step(
        "Preparing booking review..."
    );


    // --------------------------------------------------------
    // WAIT FOR REVIEW PAGE
    // --------------------------------------------------------

    const reviewReady =
        await waitForReviewPage(
            page,
            options.timeout || 30000
        );


    if (!reviewReady) {

        logger.error(
            "Booking review page is not ready."
        );


        return {

            success: false,

            screenshotPath: null,

            details: null
        };
    }


    // --------------------------------------------------------
    // EXTRACT DETAILS
    // --------------------------------------------------------

    const details =
        await extractBookingDetails(
            page,
            config
        );


    // --------------------------------------------------------
    // SCREENSHOT
    // --------------------------------------------------------

    const screenshotPath =
        await captureReviewScreenshot(
            page,
            options.screenshotDirectory ||
                "screenshots"
        );


    // --------------------------------------------------------
    // DISPLAY SUMMARY
    // --------------------------------------------------------

    console.log(
        "\n======================================"
    );


    console.log(
        "        BOOKING REVIEW"
    );


    console.log(
        "======================================"
    );


    console.log(
        `🎬 Movie      : ${
            details.movie ||
            "Unknown"
        }`
    );


    console.log(
        `🏢 Theatre    : ${
            details.theatre ||
            "Unknown"
        }`
    );


    console.log(
        `📅 Date       : ${
            details.date ||
            "Unknown"
        }`
    );


    console.log(
        `🕒 Show Time  : ${
            details.time ||
            "Unknown"
        }`
    );


    console.log(
        `🌐 Language   : ${
            details.language ||
            "Unknown"
        }`
    );


    console.log(
        `💺 Class      : ${
            details.seatClass ||
            "Could not extract"
        }`
    );


    console.log(
        `💺 Seats      : ${
            details.seats.length > 0
                ? details.seats.join(", ")
                : "Could not extract"
        }`
    );


    console.log(
        `💰 Tickets    : ${
            details.orderAmount ||
            "Could not extract"
        }`
    );


    console.log(
        `🧾 GST/Charge : ${
            details.bookingCharge ||
            "Could not extract"
        }`
    );


    console.log(
        `💳 Total      : ${
            details.totalAmount ||
            "Could not extract"
        }`
    );


    console.log(
        `📸 Screenshot : ${
            screenshotPath ||
            "Not captured"
        }`
    );


    console.log(
        "======================================"
    );


    return {

        success: true,

        screenshotPath,

        details
    };
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    waitForReviewPage,

    getReviewPageText,

    extractReviewSeatInfo,

    extractReviewSeats,

    extractPaymentSummary,

    extractBookingDetails,

    captureReviewScreenshot,

    prepareBookingReview

};