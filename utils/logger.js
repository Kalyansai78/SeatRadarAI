function info(message) {

    console.log(`[INFO] ${message}`);

}

function success(message) {

    console.log(`[SUCCESS] ${message}`);

}

function warning(message) {

    console.log(`[WARNING] ${message}`);

}

function error(message) {

    console.log(`[ERROR] ${message}`);

}

function step(message) {

    console.log(`\n[STEP] ${message}`);

}

function wait(message) {

    console.log(`\n[WAIT] ${message}`);

}

function title(message) {

    console.log("\n========================================");
    console.log(message);
    console.log("========================================");

}

module.exports = {

    info,
    success,
    warning,
    error,
    step,
    wait,
    title

};