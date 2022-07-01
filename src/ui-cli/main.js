"use strict";

// TODO: parse args

import {
    computers, computerName
} from "../core/computers";
import { assemble } from "../core/assembly";

import * as fs    from "fs";
import * as vm    from "vm";
import * as repl  from "repl";
import * as which from "which";
import {spawn}    from "child_process";
import {sprintf}  from "sprintf-js";
import {getopt}   from "./getopt";

const print = console.log;
const printf = (...args) => print(sprintf(...args));
const now = () => {
    const d = new Date();
    return sprintf("%4d.%02d.%02d %02d:%02d:%02d.%03d",
                   d.getFullYear(), d.getMonth() + 1, d.getDate(),
                   d.getHours(), d.getMinutes(), d.getSeconds(),
                   d.getMilliseconds());
};

export async function main(argv) {
    let globalObj = globalThis;
    let arch, c;
    let opts;
    let h = {
        props: {}, funcs: {}, cmds: {}
    };

    function defProp(name, comment, obj) {
        if (!Array.isArray(name)) {
            Object.defineProperty(globalObj, name, obj);
            h.props[name] = comment;
        } else {
            // multiple names, or aliases are provided
            for (let n of name) {
                Object.defineProperty(globalObj, n, obj);
            }
            h.props[name.join("|")] = comment;
        }
    }

    function defFunc(name, comment, f) {
        if (!Array.isArray(name)) {
            globalObj[name] = f;
            h.funcs[name] = comment;
        } else {
            // multiple names, or aliases are provided
            for (let n of name) {
                globalObj[n] = f;
            }
            h.funcs[name.join("|")] = comment;
        }
    }

    function defCmd(name, comment, f) {
        const obj = {get: () => { f(); return undefined; }};
        if (!Array.isArray(name)) {
            Object.defineProperty(globalObj, name, obj);
            h.cmds[name] = comment;
        } else {
            // multiple names, or aliases are provided
            for (let n of name) {
                Object.defineProperty(globalObj, n, obj);
            }
            h.cmds[name.join("|")] = comment;
        }
    }

    defFunc("print",   "print to console",           print);
    defFunc("printf",  "formatted print to console", printf);
    defFunc("sprintf", "format a string",            sprintf);
    defFunc("now",     "current date and time",      now);

    defCmd("ls", "list files in the current directory",
           () => print(fs.readdirSync(".").join("\n")));

    defCmd("pwd", "print working directory",
           () => print(process.cwd()));

    defCmd("exit", "exit command line", process.exit);

    defProp(["computer", "c"], "current computer object", {get: () => c});

    defProp("arch", "current computer architecture", {
        get: () => arch,
        set: v => {
            v = v.toUpperCase();
            let all = Object.keys(computers);
            if (all.includes(v)) {
                if (c) {
                    for (let reg of Object.keys(c.RS.map)) {
                        delete globalObj[reg];
                    }
                }

                c = new computers[v]();
                globalObj.RS = c.RS;
                globalObj.IS = c.IS;

                if (!opts.quiet) {
                    c.logger.connect(() => {
                        let last = c.logger.array[c.logger.array.length - 1];
                        print("LOG: " + last);
                    });

                    c.connectOnOut(c => {
                        print("OUT: " + c);
                    });
                }

                for (let reg of Object.keys(c.RS.map)) {
                    globalObj[reg] = c[reg];
                }
                arch = v;
                c.logger.log(`Welcome to ${computerName(v)}!`, true);
            } else {
                console.error(`unknown architecture '${v}'`);
                console.error("choose one of the following: " +
                              JSON.stringify(all));
            }
        }
    });

    defProp("M", "memory data", {
        get: () => c.M.data
    });

    defProp("regs", "register file", {
        get: () => c.RS.map
    });

    defProp("live", "live preview flag", {
        get: () => { return c.live; },
        set: v => { c.live = v; }
    });

    defProp("mStart", "memory start address", {
        get: () => { return c.fmt.mStart; },
        set: v => { c.fmt.mStart = v; }
    });

    for (let opt of ["signed", "dec", "hex", "chr", "text", "label"]) {
        defProp(opt, `${opt} flag`, {
            get: () => { return c.fmt[opt]; },
            set: v => { c.fmt[opt] = v; }
        });
    }

    defFunc("readFile", "read text file", path =>
        fs.readFileSync(
            path.replace(/^~/, process.env["HOME"])
        ).toString());

    defFunc("asmStr", "assemble source string", src =>
        assemble(c.IS, src.split("\n")).binary);

    defFunc("asm", "assemble file", path => {
        let hex = "";
        for (let word of asmStr(readFile(path))) {
            hex += (word & c.M.wordMask)
                .toHex().padStart(c.fmt.hexSize, '0') + "\n";
        }
        const out = path + ".hex";
        fs.writeFileSync(out, hex);
    });

    defFunc("loadStr", "load source string to memory", src =>
        c.loadProgram(src));

    defFunc("load", "load source file to memory", path =>
        c.loadProgram(readFile(path)));

    defFunc("start", "start running (async)", () => c.start());

    defFunc("tick", "tick one clock cycle", () => {
        c.startEnable();
        c.tick();
        c.stop();
    });

    defFunc("tickInst", "tick till the next instruction", () => {
        c.startEnable();
        c.nextInst();
        c.stop();
    });

    defFunc("input", "input a string to I/O", str => {
        c.putInpStr(str);
    });

    defFunc("inputChar", "input a character to I/O", c => {
        c.putInp(c);
    });

    defCmd("clear", "clear computer", () =>
        c.clear());

    defCmd("logs", "print the computer logs", () =>
        print(c.logger.array.join("\n")));

    defCmd("details", "print the current architecture details", () =>
        print(c.toString()));

    defCmd("info", "print the computer state", () =>
        print(c.fmt.all));

    defCmd("help", "show this help", () => {
        const format = "  %-15s %s";
        print("Commands:");
        for (let p in h.cmds) {
            printf(format, p, h.cmds[p]);
        }
        print("\nProperties:");
        for (let p in h.props) {
            printf(format, p, h.props[p]);
        }
        print("\nFunctions:");
        for (let p in h.funcs) {
            printf(format, p, h.funcs[p]);
        }
    });

    const archs = "<" + Object.keys(computers).join("|") + ">";
    opts = getopt({
        "_meta_":       { maxArgs: 0 },
        "quiet":        { key: "q",          description: "hide logs"                      },
        "arch":         { key: "a", args: 1, description: "computer architecture " + archs },
        "load":         { key: "i", args: 1, description: "load source file"               },
        "eval":         { key: "e", args: 1, description: "evaluate commands"              },
        "height":       { key: "h", args: 1, description: "height of the terminal"         },
        "asm":          {           args: 1, description: "assemble a file and close"      },
        "web":          {                    description: "start web ui"                   },
    }, argv);

    if (opts.web && (opts.arch || opts.load || opts.eval || opts.height || opts.asm)) {
        console.error("--web cannot be used with any other option");
        process.exit(1);
    }

    if (opts.load && opts.asm) {
        console.error("--load and --asm cannot be used together");
        process.exit(1);
    }

    if (opts.web) {
        const html = fs.realpathSync(__dirname) + "/index.html";
        const browsersFallback = [
            process.env["BROWSER"],
            "brave", "chromium", "firefox", "epiphany"
        ];

        let cmd;
        for (let b of browsersFallback) {
            try {
                await which(b);
                cmd = b;
                break;
            } catch (_) {}
        }

        if (["brave", "chromium"].includes(cmd)) {
            cmd += " --app=";
        } else {
            cmd += " ";
        }
        cmd += `'file://${html}'`;

        print(cmd);
        spawn(cmd, {shell: true});
        return 0;
    }

    globalObj.arch = opts.arch || "MANO";
    c.fmt.h = opts.height || 30;

    if (opts.asm) {
        asm(opts.asm);
        print("Assembled file generated");
        return 0;
    }

    if (opts.load) {
        c.logger.log("Loading file '" + opts.load + "' from cli", true);
        load(opts.load);
    }

    if (opts.eval) {
        eval("(async () => {\n" + opts.eval + "\n})()");
    }

    repl.start({ignoreUndefined: true});
    return 0;
}
