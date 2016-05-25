'use strict';

const chalk = require('chalk');

class Logger {
    static log() {
        console.log.apply(console, arguments);
    }
    static info(msg) {
        var before = [chalk.bgBlack.white.bold("  INFO   ")+chalk.styles.bgWhite.open+chalk.styles.black.open];
        var after = [chalk.styles.bgWhite.close+chalk.styles.black.close];
        var args = before.concat(...arguments).concat(after);
        console.log.apply(console, args);
    }
    static success(msg) {
        var before = [chalk.bgGreen.white.bold(" SUCCESS ")+chalk.styles.bgWhite.open+chalk.styles.black.open];
        var after = [chalk.styles.bgWhite.close+chalk.styles.black.close];
        var args = before.concat(...arguments).concat(after);
        console.log.apply(console, args);
    }
    static warning(msg) {
        var before = [chalk.bgYellow.black.bold(" WARNING ")+chalk.styles.bgWhite.open+chalk.styles.black.open];
        var after = [chalk.styles.bgWhite.close+chalk.styles.black.close];
        var args = before.concat(...arguments).concat(after);
        console.log.apply(console, args);
    }
    static error(msg) {
        var before = [chalk.bgRed.yellow.bold("  ERROR  ")+chalk.styles.bgRed.open+chalk.styles.white.open+chalk.styles.bold.open];
        var after = [chalk.styles.bgRed.close+chalk.styles.white.close+chalk.styles.bold.close];
        var args = before.concat(...arguments).concat(after);
        console.log.apply(console, args);
    }
    static test() {
        Logger.info("Test");
        Logger.success("Test");
        Logger.warning("Test");
        Logger.error("Test");
    }
}

module.exports = Logger;
