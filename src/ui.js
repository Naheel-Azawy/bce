
if (typeof window !== "undefined") {
    const web = require("./ui-web/main");
    window.addEventListener("load", web.main);
} else if (typeof process !== "undefined") {
    const cli = require("./ui-cli/main");
    cli.main(process.argv);
}
