import {
    int
} from "./utils"

import {
    InstructionSet,
    INST_MEMORY,
    INST_INDIRECT,
    INST_IMMEDIATE
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
    Computer
} from "./computer"

export class ComputerMano extends Computer {

    // registers
    public get AR():   Register { return this.RS.reg("AR");   }
    public get PC():   Register { return this.RS.reg("PC");   } // override
    public get DR():   Register { return this.RS.reg("DR");   }
    public get AC():   Register { return this.RS.reg("AC");   }
    public get IR():   Register { return this.RS.reg("IR");   }
    public get TR():   Register { return this.RS.reg("TR");   }
    public get INPR(): Register { return this.RS.reg("INPR"); }
    public get OUTR(): Register { return this.RS.reg("OUTR"); }
    public get SC():   Register { return this.RS.reg("SC");   } // override
    public get E():    FlipFlop { return this.RS.ff("E");     }
    public get S():    FlipFlop { return this.RS.ff("S");     } // override
    public get R():    FlipFlop { return this.RS.ff("R");     }
    public get IEN():  FlipFlop { return this.RS.ff("IEN");   }
    public get FGI():  FlipFlop { return this.RS.ff("FGI");   }
    public get FGO():  FlipFlop { return this.RS.ff("FGO");   }

    // timings
    private T0: boolean;
    private T1: boolean;
    private T2: boolean;
    private T3: boolean;
    private T4: boolean;
    private T5: boolean;
    private T6: boolean;

    // control unit flags
    private D0:  boolean;
    private D1:  boolean;
    private D2:  boolean;
    private D3:  boolean;
    private D4:  boolean;
    private D5:  boolean;
    private D6:  boolean;
    private D7:  boolean;
    private I:   boolean;
    private B11: boolean;
    private B10: boolean;
    private B9:  boolean;
    private B8:  boolean;
    private B7:  boolean;
    private B6:  boolean;
    private B5:  boolean;
    private B4:  boolean;
    private B3:  boolean;
    private B2:  boolean;
    private B1:  boolean;
    private B0:  boolean;

    constructor() {
        super({
            name: "Mano's Computer",
            description: "A simple computer with a single accumulator register and I/O support. Based on the architecture described in the Computer System Architecture book by M. Morris Mano",

            registerFile: new RegisterFile([
                {bits: 12, name: "AR",   description: "Address Register"},
                {bits: 12, name: "PC",   description: "Program Counter"},
                {bits: 16, name: "DR",   description: "Data Register"},
                {bits: 16, name: "AC",   description: "Accumulator"},
                {bits: 16, name: "IR",   description: "Instruction Register"},
                {bits: 16, name: "TR",   description: "Temporary Register"},
                {bits:  8, name: "INPR", description: "Input Register"},
                {bits:  8, name: "OUTR", description: "Output Register"},
                {bits:  3, name: "SC",   description: "Sequence Counter"},
                {bits:  1, name: "E",    description: "Extended AC"},
                {bits:  1, name: "S",    description: "Start Flag"},
                {bits:  1, name: "R",    description: "Interrupt"},
                {bits:  1, name: "IEN",  description: "Interrupt Enabled"},
                {bits:  1, name: "FGI",  description: "Input Flag"},
                {bits:  1, name: "FGO",  description: "Output Flag"}
            ]),

            instructionSet: new InstructionSet({
                instructions: [
                    /*
                      Memory reference
                      . 1      3            12         bits
                      +---+--------+-----------------+
                      | I | opcode |     address     |
                      +---+--------+-----------------+
                    */
                    {name: "AND", bin: 0x0000, flags: INST_MEMORY | INST_INDIRECT, description: "Logical AND memory with AC"},
                    {name: "ADD", bin: 0x1000, flags: INST_MEMORY | INST_INDIRECT, description: "Arithmetic ADD memory with AC"},
                    {name: "LDA", bin: 0x2000, flags: INST_MEMORY | INST_INDIRECT, description: "Load from memory to AC"},
                    {name: "STA", bin: 0x3000, flags: INST_MEMORY | INST_INDIRECT, description: "Store AC to memory"},
                    {name: "BUN", bin: 0x4000, flags: INST_MEMORY | INST_INDIRECT, description: "Branch unconditional"},
                    {name: "BSA", bin: 0x5000, flags: INST_MEMORY | INST_INDIRECT, description: "Branch and save return address"},
                    {name: "ISZ", bin: 0x6000, flags: INST_MEMORY | INST_INDIRECT, description: "Increment and skip if zero"},

                    /*
                      Register reference
                      . 1      3            12         bits
                      +---+--------+-----------------+
                      | 0 |  1 1 1 |     address     |
                      +---+--------+-----------------+
                    */
                    {name: "CLA", bin: 0x7800, description: "Clear AC"},
                    {name: "CLE", bin: 0x7400, description: "Clear E"},
                    {name: "CMA", bin: 0x7200, description: "Complement AC"},
                    {name: "CME", bin: 0x7100, description: "Complement E"},
                    {name: "CIR", bin: 0x7080, description: "Circulate right (AC and E)"},
                    {name: "CIL", bin: 0x7040, description: "Circulate left (AC and E)"},
                    {name: "INC", bin: 0x7020, description: "Increment AC"},
                    {name: "SPA", bin: 0x7010, description: "Skip if positive AC"},
                    {name: "SNA", bin: 0x7008, description: "Skip if negative AC"},
                    {name: "SZA", bin: 0x7004, description: "Skip if zero AC"},
                    {name: "SZE", bin: 0x7002, description: "Skip if zero E"},
                    {name: "HLT", bin: 0x7001, description: "Halt"},

                    /*
                      IO reference
                      . 1      3            12         bits
                      +---+--------+-----------------+
                      | 1 |  1 1 1 |     address     |
                      +---+--------+-----------------+
                    */
                    {name: "INP", bin: 0xF800, description: "Input a character to AC"},
                    {name: "OUT", bin: 0xF400, description: "Output a character from AC"},
                    {name: "SKI", bin: 0xF200, description: "Skip if input flag"},
                    {name: "SKO", bin: 0xF100, description: "Skip if output flag"},
                    {name: "ION", bin: 0xF080, description: "Interrupt on"},
                    {name: "IOF", bin: 0xF040, description: "Interrupt off"},

                    {name: "NOP", bin: 0xFFFF, description: "No operation"}
                ],
                bitsMask:     0xffff,
                opCodeMask:   0x7000,
                addressMask:  0x0fff,
                indirectMask: 0x8000
            }),

            memory: new Memory(4096, 16),
            addressReg: "AR",

            isIOSupported: true,
            inputFlag:     "FGI",
            outputFlag:    "FGO"
        });
    }

    public controlUnitRun(): void {

        // Fetch
        if (!this.R.b && this.T0) {
            this.AR.load(this.PC.value);
            this.incSC();
            this.log("R'T0: AR <- PC");
        } else if (!this.R.b && this.T1) {
            this.M.read(this.IR);
            this.PC.increment();
            this.incSC();
            this.log("R'T1: IR <- M[AR], PC <- PC + 1");
        }

        // Decode
        if (!this.R.b && this.T2) {
            let op = this.IR.bitsRange(12, 14);
            this.D0 = op == 0;
            this.D1 = op == 1;
            this.D2 = op == 2;
            this.D3 = op == 3;
            this.D4 = op == 4;
            this.D5 = op == 5;
            this.D6 = op == 6;
            this.D7 = op == 7;
            this.AR.load(this.IR.bitsRange(0, 11));
            this.I = this.IR.bitAt(15);
            this.incSC();
            this.log("R'T2: D0, ..., D7 <- Decode IR(12-14), AR <- IR(0-11), I <- IR(15)");
        }

        let r: boolean = this.D7 && !this.I && this.T3;
        let p: boolean = this.D7 &&  this.I && this.T3;
        if (r || p) {
            let B: int = (Math.log(this.IR.bitsRange(0, 11)) / Math.log(2)) | 0;
            this.B11 = B == 11;
            this.B10 = B == 10;
            this.B9 = B == 9;
            this.B8 = B == 8;
            this.B7 = B == 7;
            this.B6 = B == 6;
            this.B5 = B == 5;
            this.B4 = B == 4;
            this.B3 = B == 3;
            this.B2 = B == 2;
            this.B1 = B == 1;
            this.B0 = B == 0;
            this.clrSC();
        }

        // Indirect
        if (!this.D7 && this.I && this.T3) {
            this.M.read(this.AR);
            this.incSC();
            this.log("D7'IT3: AR <- M[AR]");
        } else if (!this.D7 && !this.I && this.T3) {
            this.incSC();
            this.log("D7'IT3: NOOP");
        }

        // Interrupt
        else if (this.IEN.b && this.R.b && this.T0) {
            this.AR.clear();
            this.TR.load(this.PC.value);
            this.log("AR <- 0, TR <- PC");
        } else if (this.IEN.b && this.R.b && this.T1) {
            this.M.write(this.TR);
            this.PC.clear();
            this.log("M[AR] <- TR, PC <- 0");
        } else if (this.IEN.b && this.R.b && this.T2) {
            this.PC.increment();
            this.IEN.b = false;
            this.R.b = false;
            this.clrSC();
            this.log("PC <- PC + 1, IEN <- 0, R <- 0, SC <- 0");
        }

        // Memory-Reference
        // AND
        else if (this.D0 && this.T4) {
            this.M.read(this.DR);
            this.incSC();
            this.log("D0T4: DR <- M[AR]");
        } else if (this.D0 && this.T5) {
            this.AC.load(this.AC.value & this.DR.value);
            this.clrSC();
            this.log("D0T5: AC <- AC ^ DR, SC <- 0");
        }
        // ADD
        else if (this.D1 && this.T4) {
            this.M.read(this.DR);
            this.incSC();
            this.log("D1T4: DR <- M[AR]");
        } else if (this.D1 && this.T5) {
            let res = this.AC.value + this.DR.value;
            this.AC.load(res % this.AC.max);
            this.E.b = (res & this.AC.max) != 0;
            this.clrSC();
            this.log("D1T5: AC <- AC + DR, E <- Cout, SC <- 0");
        }
        // LDA
        else if (this.D2 && this.T4) {
            this.M.read(this.DR);
            this.incSC();
            this.log("D2T4: DR <- M[AR]");
        } else if (this.D2 && this.T5) {
            this.AC.load(this.DR.value);
            this.clrSC();
            this.log("D2T5: AC <- DR, SC <- 0");
        }
        // STA
        else if (this.D3 && this.T4) {
            this.M.write(this.AC);
            this.clrSC();
            this.log("D3T4: M[AR] <- AC, SC <- 0");
        }
        // BUN
        else if (this.D4 && this.T4) {
            this.PC.load(this.AR.value);
            this.clrSC();
            this.log("D4T4: PC <- AR, SC <- 0");
        }
        // BSA
        else if (this.D5 && this.T4) {
            this.M.write(this.PC);
            this.AR.increment();
            this.incSC();
            this.log("D5T4: M[AR] <- PC, AR <- AR + 1");
        } else if (this.D5 && this.T5) {
            this.PC.load(this.AR.value);
            this.clrSC();
            this.log("D5T5: PC <- AR, SC <- 0");
        }
        // ISZ
        else if (this.D6 && this.T4) {
            this.M.read(this.DR);
            this.incSC();
            this.log("D6T4: DR <- M[AR]");
        } else if (this.D6 && this.T5) {
            this.DR.increment();
            this.incSC();
            this.log("D6T5: DR <- DR + 1");
        } else if (this.D6 && this.T6) {
            this.M.write(this.DR);
            if (this.DR.value == 0)
                this.PC.increment();
            this.clrSC();
            this.log("D6T6: M[AR] <- DR, if (DR = 0) then (PC <- PC + 1), SC <- 0");
        }

        // Register-Reference
        // CLA
        else if (r && this.B11) {
            this.AC.clear();
            this.log("D7I'T3B11: AC <- 0, SC <- 0");
        }
        // CLE
        else if (r && this.B10) {
            this.E.b = false;
            this.log("D7I'T3B10: E <- 0, SC <- 0");
        }
        // CMA
        else if (r && this.B9) {
            this.AC.load(~this.AC.value & this.AC.mask);
            this.log("D7I'T3B9: AC <- AC', SC <- 0");
        }
        // CME
        else if (r && this.B8) {
            this.E.toggle();
            this.log("D7I'T3B8: E <- E', SC <- 0");
        }
        // CIR
        else if (r && this.B7) {
            let value = this.AC.value;
            let lsb = (value & 1) != 0;
            value >>= 1;
            if (this.E.b)
                value |= this.AC.max >> 1;
            this.E.b = lsb;
            this.AC.load(value);
            this.log("D7I'T3B7: AC <- shr(AC), AC(15) <- E, E <- AC(0), SC <- 0");
        }
        // CIL
        else if (r && this.B6) {
            let value = this.AC.value;
            let msb = (value & (this.AC.max >> 1)) != 0;
            value = (value << 1) & this.AC.mask;
            if (this.E.b)
                value |= 1;
            this.E.b = msb;
            this.AC.load(value);
            this.log("D7I'T3B6: AC <- shl(AC), AC(0) <- E, E <- AC(15), SC <- 0");
        }
        // INC
        else if (r && this.B5) {
            this.AC.increment();
            this.log("D7I'T3B5: AC <- AC + 1, SC <- 0");
        }
        // SPA
        else if (r && this.B4) {
            if (!this.AC.bitAt(15))
                this.PC.increment();
            this.log("D7I'T3B4: if (AC(15) = 0) then (PC <- PC + 1), SC <- 0");
        }
        // SNA
        else if (r && this.B3) {
            if (this.AC.bitAt(15))
                this.PC.increment();
            this.log("D7I'T3B3: if (AC(15) = 1) then (PC <- PC + 1), SC <- 0");
        }
        // SZA
        else if (r && this.B2) {
            if (this.AC.value == 0)
                this.PC.increment();
            this.log("D7I'T3B2: if (AC = 0) then (PC <- PC + 1), SC <- 0");
        }
        // SZE
        else if (r && this.B1) {
            if (!this.E.b)
                this.PC.increment();
            this.log("D7I'T3B1: if (E = 0) then (PC <- PC + 1), SC <- 0");
        }
        // HLT
        else if (r && this.B0) {
            this.S.b = false;
            this.log("D7I'T3B0: S <- 0, SC <- 0");
        }

        // Input-Output
        // INP
        else if (p && this.B11) {
            this.INPR.load(this.getInp().toInt());
            this.AC.setBits(0, 7, this.INPR.value);
            this.FGI.b = false;
            this.checkFGI();
            this.log("AC(0-7) <- INPR, FGI <- 0");
        }
        // OUT
        else if (p && this.B10) {
            this.OUTR.load(this.AC.bitsRange(0, 7));
            this.putOut(this.OUTR.value.toChar());
            this.FGO.b = false;
            this.log("OUTR <- AC(0-7), FGO <- 0");
        }
        // SKI
        else if (p && this.B9) {
            if (this.FGI.b)
                this.PC.increment();
            this.log("if (FGI = 1) then (PC <- PC + 1)");
        }
        // SKO
        else if (p && this.B8) {
            if (this.FGO.b)
                this.PC.increment();
            this.log("if (FGO = 1) then (PC <- PC + 1)");
        }
        // ION
        else if (p && this.B7) {
            this.IEN.b = true;
            this.log("IEN <- 1");
        }
        // IOF
        else if (p && this.B6) {
            this.IEN.b = false;
            this.log("IEN <- 0");
        }

    }

    public setSC(time: int): void {
        this.SC.load(time);
        this.T0 = this.SC.value == 0;
        this.T1 = this.SC.value == 1;
        this.T2 = this.SC.value == 2;
        this.T3 = this.SC.value == 3;
        this.T4 = this.SC.value == 4;
        this.T5 = this.SC.value == 5;
        this.T6 = this.SC.value == 6;
    }

}
