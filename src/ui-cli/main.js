"use strict";

// TODO: build a sane interface

import { computers } from "../core/computers";
import { assemble } from "../core/assembly";
import * as fs from "fs";

async function main(args) {

    let asm = false;
    if (args[0] == "-a") {
        asm = true;
        args = args.slice(1);
    }

    let kind = "AC";
    let c = new computers[kind]();

    let src = fs.readFileSync(args[0]).toString();

    if (asm) {
        let bin = assemble(c.IS, src.split("\n")).binary;
        for (let b of bin) {
            console.log(b);
        }
    } else {
        c.fmt.h = 30;

        /*for (let opt of ["signed", "dec", "hex", "chr", "text", "label"]) {
        // TODO: options to control c.fmt[opt]
        }*/

        /*c.connectOnUpdate(() => {
          console.log(c.fmt.all);
          });*/

        c.logger.connect(msg => {
            console.log("LOG> " + msg);
        });

        c.connectOnOut(c => {
            console.log("TRM_OUT> " + c);
            // TODO: input using c.putInpStr(input);
        });

        c.logger.log(`Welcome to ${kind} computer!`);
        c.loadProgram(src);
        await c.start();
        console.log("");
        console.log("Registers:");
        console.log(c.fmt.registers);
        console.log("Memory:");
        console.log(c.fmt.memory);
    }
}

main(process.argv.slice(2));
