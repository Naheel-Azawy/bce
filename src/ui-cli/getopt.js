export function getopt(opts, args) {
    let res = {};

    if (!args) {
        return res;
    }

    let bin = "f.js";
    if (typeof(process) != 'undefined' && args[0].includes("node")) {
        bin = args[1];
        bin = bin.substring(bin.lastIndexOf("/") + 1);
        args = args.slice(2);
    }

    res.printHelp = function() {
        console.log(`USAGE: ${bin} [OPTIONS]... args...`);
        console.log("The following options are supported:");
        for (let o in opts) {
            if (o == "_meta_") continue;
            let s = opts[o].key;
            if (s) {
                s = '-' + s + ',';
            } else {
                s = "   ";
            }
            console.log(`  ${s} --${o} ${opts[o].args==1?"<ARG>":""}\t${opts[o].description}`);
        }
        console.log("      --help      \tDisplay this help and exit");
    };

    const exit = function(code) {
        process.exit(code);
    };

    const err = function(msg) {
        console.log(msg);
        res.printHelp();
        exit(1);
        return {};
    };

    // map of keys
    let keysMap = {};
    for (let o in opts) {
        if (opts[o].key) {
            keysMap[opts[o].key] = o;
        }
    }

    for (let i in args) {
        if (args[i] == undefined) continue;
        i = Number(i);
        // replace keys with full names
        if (args[i].startsWith("-") && args[i].length == 2) {
            if (args[i].charAt(1) in keysMap) {
                args[i] = "--" + keysMap[args[i].charAt(1)];
            } else {
                return err("Unknown option " + args[i]);
            }
        }
        // handle options
        if (args[i].startsWith("--")) {
            let o = args[i].substring(2);
            if (o == "help") {
                res.printHelp();
                args[i] = undefined;
                exit(0);
            } else if (o in opts) {
                if (opts[o].args == 1) {
                    if (i + 1 < args.length) {
                        res[o] = args[i + 1];
                        if (!isNaN(Number(res[o]))) {
                            res[o] = Number(res[o]);
                        }
                        args[i + 1] = undefined;
                    } else {
                        return err(`A value is needed for ${args[i]} ${Number(i)+1} ${args.length}`);
                    }
                    args[i] = undefined;
                } else if (opts[o].args == undefined) {
                    res[o] = true;
                    args[i] = undefined;
                } else {
                    return err("Unsupported args != 1");
                }
            } else {
                return err("Unknown option " + args[i]);
            }
        }
    }

    // add extra args
    res.args = [];
    for (let a of args) {
        if (a != undefined) {
            res.args.push(a);
            let max = opts["_meta_"].maxArgs;
            if (res.args.length > max) {
                return err(`Only ${max} arguments allowed`);
            }
        }
    }
    return res;
}
