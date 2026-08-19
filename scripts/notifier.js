const readline = require("readline");

// ============================================================
// SEATRADAR NOTIFIER
// ============================================================
//
// Current version:
// - Displays notifications in terminal
// - Waits for user confirmation
// - Does NOT select seats
// - Does NOT proceed with payment
// - Can later be connected to Telegram / Web Push / frontend
// ============================================================


// ============================================================
// CREATE NOTIFICATION
// ============================================================

function notifyUser({
    type,
    movie,
    theatre,
    date,
    time,
    seats = []
}) {

    console.log("\n");
    console.log("==============================================");
    console.log("          🔔 SEATRADAR AI NOTIFICATION");
    console.log("==============================================");

    switch (type) {

        case "DATE_AVAILABLE":

            console.log("📅 Requested date is now available!");

            break;


        case "THEATRE_AVAILABLE":

            console.log("🏢 Requested theatre is now available!");

            break;


        case "SHOW_AVAILABLE":

            console.log("🕒 Requested show is now available!");

            break;


        case "SEATS_AVAILABLE":

            console.log("💺 Requested seats are now available!");

            break;


        case "BOOKING_REVIEW":

            console.log("🎟️ Booking review is ready!");

            break;


        default:

            console.log("🔔 SeatRadar event detected.");

    }

    console.log("----------------------------------------------");

    if (movie) {
        console.log(`🎬 Movie   : ${movie}`);
    }

    if (theatre) {
        console.log(`🏢 Theatre : ${theatre}`);
    }

    if (date) {
        console.log(`📅 Date    : ${date}`);
    }

    if (time) {
        console.log(`🕒 Show    : ${time}`);
    }

    if (seats.length > 0) {
        console.log(`💺 Seats   : ${seats.join(", ")}`);
    }

    console.log("==============================================");

}


// ============================================================
// WAIT FOR USER CONFIRMATION
// ============================================================

async function waitForConfirmation() {

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });


    return new Promise((resolve) => {

        rl.question(
            "\n👉 Confirm and continue booking? (Y/N): ",
            (answer) => {

                rl.close();

                const value =
                    answer
                        .trim()
                        .toLowerCase();


                if (
                    value === "y" ||
                    value === "yes"
                ) {

                    console.log(
                        "\n[SUCCESS] User confirmed booking."
                    );

                    resolve(true);

                } else {

                    console.log(
                        "\n[INFO] User cancelled booking."
                    );

                    resolve(false);
                }

            }
        );

    });

}


// ============================================================
// NOTIFY + WAIT FOR CONFIRMATION
// ============================================================

async function notifyAndConfirm(details) {

    notifyUser(details);

    return await waitForConfirmation();

}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

    notifyUser,

    waitForConfirmation,

    notifyAndConfirm

};