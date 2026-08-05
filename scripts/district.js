const browser = require("./browser");

const navigation = require("./navigation");

module.exports = {
    ...browser,
    ...navigation
};