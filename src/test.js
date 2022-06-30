import * as fs from "fs";
import { strictEqual } from "assert";

import {
    intToPrintableChar,
    intsToPrintableString
} from "./core/utils";

import {
    Register
} from "./core/registers";

import {
    Memory
} from "./core/memory";

import {
    Instruction,
    INST_MEMORY,
    INST_INDIRECT,
    INST_IMMEDIATE
} from "./core/instruction";

import {
    PROG_HEX,
    PROG_DEC,
    PROG_BIN
} from "./core/computer";

import {
    ComputerMano
} from "./core/computer-mano";

import {
    ComputerBen
} from "./core/computer-ben";

import {
    Assembler,
    assemble,
    disassemble
} from "./core/assembly";

describe("Register", () => {
    it("should handle register operations", () => {
        let r = new Register(4, "r", "foo");
        r.load(14);
        strictEqual(r.value, 14);
        strictEqual(r.bitAt(0), false);
        strictEqual(r.bitAt(1), true);
        r.setBit(0, true);
        strictEqual(r.value, 15);
        r.increment();
        strictEqual(r.value, 0);
        r.increment();
        strictEqual(r.value, 1);
        r.clear();
        strictEqual(r.value, 0);
        r.load(14);
        strictEqual(r.bitsRange(0, 2), 6);
    });
});

describe("Memory", () => {
    it("should handle memory operations", () => {
        let TR = new Register(16, "TR", "");
        let AR = new Register(12, "AR", "");
        let M = new Memory(4096, 16);
        M.AR = AR;
        M.setContent([1, 2, 3, 4, 5, 65535, 65536, 65537]);
        AR.load(7);
        M.read(TR);
        strictEqual(TR.value, 1);
    });
});

describe("Instruction", () => {
    it("should handle instructions", () => {
        let i = new Instruction("AND", 0x0000, INST_MEMORY | INST_INDIRECT, "Logical AND memory with AC");
        strictEqual(i.asmFor(2, 0x8000), "AND 0002 I");
        strictEqual(i.binFor(2, 0x8000), 0x8002);
    });
});

describe("disassemble", () => {
    it("should handle disassemble binary", () => {
        let is = new ComputerMano().IS;
        strictEqual(disassemble(is, 0xA003), "LDA 0003 I");
    });
});

describe("assembleInst", () => {
    it("should handle assemble instructions", () => {
        let is = new ComputerMano().IS;
        let instance = new Assembler(is);
        let asm = str => instance.assembleInstruction(0, str);

        strictEqual(asm("NOP")[0].toHex(), "ffff");
        strictEqual(asm("and 1")[0], 1);
        strictEqual(asm("LDA 3 I")[0].toHex(), "a003");
        strictEqual(asm("dec 123")[0], 123);
        strictEqual(asm("HEX beef")[0].toHex(), "beef");
        strictEqual(asm("bin 101")[0], 5);
        strictEqual(intToPrintableChar(asm("chr 'm'")[0]), 'm');
        strictEqual(intsToPrintableString(asm('str "abc"')), "abc");
    });
});

describe("assemble", () => {
    it("should handle assemble code", () => {
        let is = new ComputerMano().IS;
        let p = fs.readFileSync("./examples/mano-add.bca").toString();
        let out = assemble(is, p.split("\n"));
        // for (let i in out)
        //    console.log(`${i}: ${out[i].toHex()}`);
        strictEqual(JSON.stringify(out.binary),
                    JSON.stringify([0x2004, 0x1005, 0x3006, 0x7001, 83, -23, 0]));
    });
});

function val(p, lbl) {
    let m = p.match(new RegExp(lbl + "\\s*,\\s*([a-zA-Z]*)\\s*(.+)"));
    return m && m[2] ? Number(m[2]) : undefined;
}

describe("ComputerMano", async () => {
    it("should run the multiplication program", async () => {
        let c = new ComputerMano();
        let p = fs.readFileSync("./examples/mano-mul.bca").toString();
        let x = val(p, "x");
        let y = val(p, "y");
        c.loadProgram(p);
        await c.start();
        strictEqual(c.M.data[20], x * y);
    });

    it("should run addition program", async () => {
        let c = new ComputerMano();
        let p = fs.readFileSync("./examples/mano-add.bca").toString();
        let a = val(p, "A");
        let b = val(p, "B");
        c.loadProgram(p);
        await c.start();
        strictEqual(c.M.data[6], a + b);
    });

    it("should run a dec program", async () => {
        let c = new ComputerMano();
        let p = fs.readFileSync("./examples/mano-add-dec.bca").toString();
        let a = Number(p.split("\n")[4]);
        let b = Number(p.split("\n")[5]);
        c.loadProgram(p, PROG_DEC);
        await c.start();
        strictEqual(c.M.data[6], a + b);
    });

    it("should run a hex program", async () => {
        let c = new ComputerMano();
        let p = fs.readFileSync("./examples/mano-add-hex.bca").toString();
        let a = Number("0x" + p.split("\n")[4]);
        let b = Number("0x" + p.split("\n")[5]);
        c.loadProgram(p, PROG_HEX);
        await c.start();
        strictEqual(c.M.data[6], a + b);
    });

    it("should run a bin program", async () => {
        let c = new ComputerMano();
        let p = fs.readFileSync("./examples/mano-add-bin.bca").toString();
        let a = Number("0b" + p.split("\n")[4].replace(/\s/g, ""));
        let b = Number("0b" + p.split("\n")[5].replace(/\s/g, ""));
        c.loadProgram(p, PROG_BIN);
        await c.start();
        strictEqual(c.M.data[6], a + b);
    });

    it("should run the io program", async () => {
        let c = new ComputerMano();
        let outBuf = "";
        c.connectOnOut(c => outBuf += c == '\0' ? '' : c);
        let p = fs.readFileSync("./examples/mano-io.bca").toString();
        c.loadProgram(p);
        c.putInpStr("Naheel");
        await c.start();
        strictEqual(outBuf.trim(), "hello, what's your name? hi! nice to meet you Naheel");
    });
});

describe("ComputerBen", async () => {
    it("should run the multiplication program", async () => {
        let c = new ComputerBen();
        let p = fs.readFileSync("./examples/ben-mul.bca").toString();
        let x = val(p, "x");
        let y = val(p, "y");
        c.loadProgram(p);
        await c.start();
        strictEqual(c.M.data[12], x * y);
    });

    it("should run the addition program", async () => {
        let c = new ComputerBen();
        let p = fs.readFileSync("./examples/ben-add.bca").toString();
        let a = val(p, "a");
        let b = val(p, "b");
        c.loadProgram(p);
        await c.start();
        strictEqual(c.M.data[7], a + b);
    });
});
