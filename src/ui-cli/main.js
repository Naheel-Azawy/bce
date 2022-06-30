"use strict";

// TODO: parse args

import {
    computers, computer_name
} from "../core/computers";
import { assemble }  from "../core/assembly";
import * as fs       from "fs";
import * as vm       from "vm";
import * as repl     from "repl";

const print = console.log;

function startRepl() {
    let globalObj = globalThis;
    let arch, c;

    Object.defineProperty(globalObj, "ls", {
        get: () => fs.readdirSync(".")
    });

    Object.defineProperty(globalObj, "exit", {
        get: () => process.exit()
    });

    Object.defineProperty(globalObj, "c", {get: () => c});

    Object.defineProperty(globalObj, "arch", {
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

                c.logger.connect(() => {
                    let last = c.logger.array[c.logger.array.length - 1];
                    print("LOG: " + last);
                });

                c.connectOnOut(c => {
                    print("OUT: " + c);
                });

                for (let reg of Object.keys(c.RS.map)) {
                    globalObj[reg] = c[reg];
                }
                arch = v;
                c.logger.log(`Welcome to ${computer_name(v)}!`, true);
            } else {
                console.error(`unknown architecture '${v}'`);
                console.error("choose one of the following: " +
                              JSON.stringify(all));
            }
        }
    });

    Object.defineProperty(globalObj, "live", {
        get: () => { return c.live; },
        set: v => { c.live = v; }
    });

    Object.defineProperty(globalObj, "mStart", {
        get: () => { return c.fmt.mStart; },
        set: v => { c.fmt.mStart = v; }
    });

    for (let opt of ["signed", "dec", "hex", "chr", "text", "label"]) {
        Object.defineProperty(globalObj, opt, {
            get: () => { return c.fmt[opt]; },
            set: v => { c.fmt[opt] = v; }
        });
    }

    function loadSrc(fileOrSrc) {
        if (fs.existsSync(fileOrSrc)) {
            return fs.readFileSync(fileOrSrc).toString();
        } else {
            return fileOrSrc;
        }
    }

    function asm(fileOrSrc, out) {
        let bin = assemble(c.IS, loadSrc(fileOrSrc)
                           .split("\n")).binary;
        if (out) {
            let hex = "";
            for (let word of bin) {
                hex += word + "\n";
            }
            fs.writeFileSync(out, hex);
            return undefined;
        } else {
            return bin;
        }
    }

    function load(fileOrSrc) {
        c.loadProgram(loadSrc(fileOrSrc));
    }

    async function start() {
        await c.start();
    }

    function tick() {
        c.startEnable();
        c.tick();
        c.stop();
    }

    function tickInst() {
        c.startEnable();
        c.nextInst();
        c.stop();
    }

    function input(str) {
        c.putInpStr(str);
    }

    function inputChar(c) {
        c.putInp(c);
    }

    function info() {
        print(c.fmt.all);
    }

    function clear() {
        c.clear();
    }

    Object.assign(globalObj, {
        fs, print, computers, asm,
        load, start, tick, tickInst,
        input, inputChar, info, clear
    });

    globalObj.arch = "MANO";
    c.fmt.h = 30;
    repl.start({ignoreUndefined: true});
}

async function main(args) {
    startRepl();
}

main(process.argv.slice(2));
