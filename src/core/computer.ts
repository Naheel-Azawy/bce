import {
    int,
    long,
    char,
    double,
    Nullable,
    RuntimeException,
    Logger,
    sleep,
    intToPrintableCharString,
    parseIntArray
} from "./utils"

import {
    Instruction,
    InstructionSet
} from "./instruction"

import {
    Memory
} from "./memory"

import {
    Register,
    FlipFlop,
    RegisterFile
} from "./registers"

import {
    assemble,
    disassemble
} from "./assembly"

export const PROG_ASM: int = 0;
export const PROG_HEX: int = 1;
export const PROG_DEC: int = 2;
export const PROG_BIN: int = 3;

type ComputerListener = ()        => void;
type CharListener     = (c: char) => void;

type ComputerObj = {
    name:           string,
    description:    string,
    registerFile:   RegisterFile,
    instructionSet: InstructionSet,
    memory:         Memory,
    addressReg:     string,
    isIOSupported:  boolean,
    inputFlag?:     string,
    outputFlag?:    string
};

type ComputerIO = {
    inpBuffer:    char[],
    outBuffer:    char[],
    fgi:          FlipFlop,
    fgo:          FlipFlop,
    cleared:      boolean,
    outListeners: CharListener[],
    inpListeners: CharListener[]
};

export abstract class Computer {
    public    memLabels:   Record<int, string> = {};
    public    linesMap:    Record<int, int>    = {};
    public    breakpoints: int[]               = [];
    protected listeners:   ComputerListener[]  = [];
    protected src:         string = "";
    protected srcKind:     int = PROG_ASM;
    protected io:          Nullable<ComputerIO>;
    protected period:      int = 0;
    private   _avgFreq:    double = 0;

    private _logger:         Logger;
    private _name:           string;
    private _description:    string;
    private _registerFile:   RegisterFile;
    private _instructionSet: InstructionSet;
    private _memory:         Memory;
    private _fmt:            Formatter;

    public get logger():        Logger         { return this._logger;         }
    public get name():          string         { return this._name;           }
    public get description():   string         { return this._description;    }
    public get RS():            RegisterFile   { return this._registerFile;   }
    public get IS():            InstructionSet { return this._instructionSet; }
    public get M():             Memory         { return this._memory;         }
    public get isIOSupported(): boolean        { return this.io != undefined; }
    public get fmt():           Formatter      { return this._fmt;            }

    constructor(init: ComputerObj) {
        this._logger         = new Logger();
        this._name           = init.name;
        this._description    = init.description;
        this._registerFile   = init.registerFile;
        this._instructionSet = init.instructionSet;
        this._memory         = init.memory;
        this.M.AR            = this.RS.reg(init.addressReg);
        this.M.nopVal        = this.IS.fromName("NOP");

        if (init.isIOSupported) {
            this.io = {
                inpBuffer:    [],
                outBuffer:    [],
                fgi:          this.RS.ff(init.inputFlag!),
                fgo:          this.RS.ff(init.outputFlag!),
                cleared:      false,
                outListeners: [],
                inpListeners: []
            };
        } else {
            this.io = undefined;
        }

        this._fmt = new Formatter(this);
        this.clear();
    }

    public toString(): string {
        let res = "";
        res += this.name + "\n";
        for (let i = 0; i < this.name.length; ++i) {
            res += "=";
        }
        res += "\n" + this.description + "\n\n";
        res += "Word size:\t" + this.M.wordSize + " bits\n";
        res += "Memory size:\t" + this.M.length + " words\n\n";
        res += "Registers:\n" + this.RS.toString() + "\n";
        res += "Instructions:\n" + this.IS.toString();
        return res;
    }

    public loadProgram(src: string, kind: int): boolean {
        if (kind != -1 && kind != undefined) {
            this.srcKind = kind;
        }

        try {
            if (src == undefined) {
                throw new RuntimeException("Undefined program");
            }
            src = src.trim();
            if (src.length == 0) {
                throw new RuntimeException("Empty program");
            }
            let name: string
            let data: int[];
            switch (this.srcKind) {
                case PROG_ASM:
                    name = "assembly";
                    let res = assemble(this.IS, src.split("\n"), this.memLabels);
                    data = res.binary;
                    this.linesMap = res.linesMap;
                    break;
                case PROG_BIN:
                    name = "binary";
                    src = src.replace(/ /g, "");
                    data = parseIntArray(src.split("\n"), 2);
                    break;
                case PROG_HEX:
                    name = "hex";
                    src = src.replace(/ /g, "");
                    data = parseIntArray(src.split("\n"), 16);
                    break;
                case PROG_DEC:
                    name = "decimal";
                    src = src.replace(/ /g, "");
                    data = parseIntArray(src.split("\n"), 10);
                    break;
                default:
                    throw new RuntimeException(`Unknown program kind ${this.srcKind}`);
            }
            this.loadMemory(data);
            this.logger.log(`Loaded ${name} program`);
            return true;
        } catch (e) {
            this.logger.log("Error loading program: " + e.message);
            this.runListeners();
            return false;
        }
    }

    public loadMemory(input: int[]): void {
        this.M.setContent(input);
        this.runListeners();
    }

    public clearMemInternal(): void {
        this.M.clear();
        this.memLabels   = {};
        this.linesMap    = {};
        this.breakpoints = [];
    }

    public clearRegsInternal(): void {
        for (let r of this.RS.all) {
            r.clear();
        }
        this.clrSC();
    }

    public clearMem(): void {
        this.clearMemInternal();
        this.runListeners();
    }

    public clearRegs(): void {
        this.clearRegsInternal();
        this.runListeners();
    }

    public clear(): void {
        this.clearMemInternal();
        this.clearRegsInternal();
        this.clearIO();
        this.logger.clear();
        this.runListeners();
    }

    public runListeners(): void {
        for (let l of this.listeners) {
            l();
        }
    }

    public incSC(): void {
        this.setSC(this.SC.value + 1);
    }

    public clrSC(): void {
        this.setSC(0);
    }

    public get running(): boolean {
        return this.S.b;
    }

    public startEnable(): void {
        this.S.b = true;
    }

    public async start(): Promise<void> {
        if (this.running) {
            return;
        }
        this.startEnable();
        await this.loop();
    }

    public tick(): void {
        if (!this.running) {
            return;
        }
        this.controlUnitRun();
        this.runListeners();
    }

    public nextInst(): void {
        if (this.SC.value == 0) {
            this.tick();
        }
        while (this.SC.value != 0) {
            this.tick();
        }
    }

    public stop(): void {
        this.S.b = false;
        this.runListeners();
    }

    protected async loop(): Promise<void> {
        let startPC = this.PC.value;
        let t: long;
        let f: double;
        let line: int;
        while (this.running) {
            t = Date.now();
            this.tick();
            await sleep(this.period - (Date.now() - t));
            if (this._avgFreq == 0) {
                this._avgFreq = 1 / ((Date.now() - t) / 1000.0);
            } else {
                f = 1 / ((Date.now() - t) / 1000.0);
                if (Number.isFinite(f)) {
                    this._avgFreq = (this._avgFreq + f) / 2;
                }
            }

            // handle breakpoints if any
            if (this.PC.value > startPC) {
                line = this.linesMap[this.PC.value - 1];
                if (this.breakpoints.includes(line)) {
                    this.S.b = false;
                    break;
                }
            }
        }
    }

    public get avgFreq(): int {
        return this._avgFreq;
    }

    public get freq(): int {
        return this.period <= 0 ? -1 : 1 / (this.period / 1000);
    }

    public set freq(f: int) {
        this.period = f == 0 ? -1 : Math.round(1 / (f / 1000.0));
        if (this.period < 0) {
            this.period = -1;
        }
    }

    public connectOnUpdate(l: ComputerListener): void {
        this.listeners.push(l);
        this.runListeners();
    }

    protected log(msg: string): void {
        this.logger.log(msg);
        let inst = this.M.data[this.PC.value];
        if (this.SC.value == 1) {
            this.logger.log(">>> " + this.fmt.registersMini);
            this.logger.log("");
            this.logger.log("<<< " + disassemble(this.IS, inst));
        }
    }

    // io

    public putOut(c: char): void {
        if (!this.io) return;
        this.io!.cleared = false;
        this.io!.outBuffer.push(c);
        for (let l of this.io!.outListeners) {
            l(c);
        }
        this.io!.fgo.b = true;
    }

    public putInp(c: char): void {
        if (!this.io) return;
        this.io!.cleared = false;
        this.io!.inpBuffer.push(c);
        for (let l of this.io!.inpListeners) {
            l(c);
        }
        this.io!.fgi.b = true;
    }

    protected getInp(): char {
        if (!this.io || this.io.inpBuffer.length == 0) {
            return '\0';
        } else {
            let res = this.io.inpBuffer.shift();
            return res ? res : '\0';
        }
    }

    protected checkFGI(): void {
        if (!this.io) return;
        if (this.io!.inpBuffer.length != 0) {
            this.io!.fgi.b = true;
        }
    }

    public putInpStr(inp: string): void {
        if (!this.io) return;
        for (let c of inp)
            this.putInp(c);
        this.putInp('\0');
    }

    public isIoCleared(): boolean {
        if (!this.io) return false;
        return this.io!.cleared;
    }

    public connectOnOut(l: CharListener): void {
        if (!this.io) return;
        this.io!.outListeners.push(l);
    }

    public connectOnInp(l: CharListener): void {
        if (!this.io) return;
        this.io!.inpListeners.push(l);
    }

    public clearIO(): void {
        if (!this.io) return;
        this.io!.inpBuffer = [];
        this.io!.outBuffer = [];
        this.io!.cleared = true;
        for (let l of this.io!.inpListeners) {
            l('\0');
        }
        for (let l of this.io!.outListeners) {
            l('\0');
        }
    }

    // abstract

    public abstract get PC():             Register;
    public abstract get SC():             Register;
    public abstract get S():              FlipFlop;
    public abstract     controlUnitRun(): void;
    public abstract     setSC(time: int): void;

}

const FMT_PNT        = "->";
const FMT_NO_PNT     = "  ";

class Formatter {

    private hMin:    int = 20;
    public  h:       int = 0;
    private _mStart: int = -1;
    private hexSize: int;
    private c:       Computer;

    // options
    public signed: boolean = true;
    public dec:    boolean = true;
    public hex:    boolean = true;
    public chr:    boolean = true;
    public text:   boolean = true;
    public label:  boolean = true;

    constructor(computer: Computer) {
        this.c = computer;
        this.hexSize = Math.ceil(this.c.M.wordSize / 4);
    }

    public get mStart(): int {
        return this._mStart;
    }

    public set mStart(val: int) {
        let max = this.c.M.length - this.h;
        if (val < -1) {
            this._mStart = -1;
        } else if (val >= max) {
            this._mStart = max;
        } else {
            this._mStart = val;
        }
    }

    public get registersMini(): string {
        let res = "";
        let count = 0;
        for (let r of this.c.RS.all) {
            res += r.name + ": 0x" +
                r.value.toHex().padStart(Math.ceil(r.bits / 4), '0') +
                (count % 5 == 0 ? "\n" : " ");
            ++count;
        }
        return res;
    }

    public get registers(): string {
        let res = "";
        for (let r of this.c.RS.all) {
            res += r.name.padEnd(6) +
                this.nums(r.value, Math.ceil(r.bits / 4)) + "\n";
        }
        return res;
    }

    public get memory(): string {
        let res = "";
        let h = Math.max(this.h, this.hMin);
        let lines = 0;
        let i = this.mStart;
        if (i == -1) { // follow PC
            i = this.c.PC.value - (this.h / 2);
            if (i < 0) {
                i = 0;
            }
        }
        let lbl;
        while (lines < h && i < this.c.M.length) {
            res += (i == (this.c.PC.value - 1) ? FMT_PNT : FMT_NO_PNT) + " ";
            res += i.toString().padStart(4, '0') + ": ";
            res += this.nums(this.c.M.data[i], this.hexSize);
            if (this.text) {
                res += " " + disassemble(this.c.IS, this.c.M.data[i]);
            }
            if (this.label && this.c.memLabels[i]) {
                res += ", " + this.c.memLabels[i];
            }
            res += "\n";
            ++i;
            ++lines;
        }
        return res;
    }

    public get all(): string {
        let res = "";
        let mem = this.memory.split("\n");
        let reg = this.registers.split("\n");
        let len = Math.max(mem.length, reg.length);
        let memMaxW = mem[0].length;
        for (let i = 0; i < len; ++i) {
            res += (mem[i] ? mem[i] : "").padEnd(memMaxW + 3) +
                (reg[i] ? reg[i] : "") + "\n";
        }
        return res;
    }

    private nums(val: int, hexSize: int): string {
        let arr = [];
        if (this.hex) {
            arr.push(("0x" + val.toHex().padStart(hexSize, '0'))
                         .padStart(this.hexSize + 2));
        }
        if (this.dec) {
            let dec = val;
            if (this.signed) {
                let sign = (val >> (this.c.M.wordSize - 1)) & 1;
                if (sign != 0) {
                    dec = (((~dec) & this.c.M.wordMask) + 1) * -1;
                }
            }
            arr.push(dec.toString().padStart(8));
        }
        if (this.chr) {
            arr.push(intToPrintableCharString(val));
        }
        return arr.join(" ");
    }
}
