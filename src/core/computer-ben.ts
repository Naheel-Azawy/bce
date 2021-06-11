import {
    int
} from "./utils"

import {
    InstructionSet,
    INST_MEMORY,
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

export class ComputerBen extends Computer {

    // registers
    public get A():   Register { return this.RS.reg("A");   }
    public get B():   Register { return this.RS.reg("B");   }
    public get ALU(): Register { return this.RS.reg("ALU"); }
    public get OUT(): Register { return this.RS.reg("OUT"); }
    public get PC():  Register { return this.RS.reg("PC");  } // override
    public get IR():  Register { return this.RS.reg("IR");  }
    public get MAR(): Register { return this.RS.reg("MAR"); }
    public get SC():  Register { return this.RS.reg("SC");  } // override
    public get CF():  FlipFlop { return this.RS.ff("CF");   }
    public get ZF():  FlipFlop { return this.RS.ff("ZF");   }
    public get S():   FlipFlop { return this.RS.ff("S");    } // override

    // timings
    private T0: boolean;
    private T1: boolean;
    private T2: boolean;
    private T3: boolean;
    private T4: boolean;

    // control unit flags
    private LDA:  boolean;
    private ADD:  boolean;
    private SUB:  boolean;
    private STA:  boolean;
    private LDI:  boolean;
    private JMP:  boolean;
    private JC:   boolean;
    private JZ:   boolean;
    private OUTI: boolean;
    private HLT:  boolean;

    constructor() {
        super({
            name: "Ben's Computer",
            description: "Even simpler computer built by Ben Eater on a breadboard.\n" +
                "https://www.youtube.com/user/eaterbc",

            registerFile: new RegisterFile([
                {bits: 8, name: "A",   description: "Register A"},
                {bits: 8, name: "B",   description: "Register B"},
                {bits: 8, name: "ALU", description: "ALU Register"},
                {bits: 8, name: "OUT", description: "Output Register"},
                {bits: 4, name: "PC",  description: "Program Counter"},
                {bits: 8, name: "IR",  description: "Instruction Register"},
                {bits: 4, name: "MAR", description: "Memory Address Register"},
                {bits: 3, name: "SC",  description: "Sequence Counter"},
                {bits: 1, name: "CF",  description: "Carry Flag"},
                {bits: 1, name: "ZF",  description: "Zero Flag"},
                {bits: 1, name: "S",   description: "Start Flag"}
            ]),

            instructionSet: new InstructionSet({
                instructions: [
                    /*
                      .    4        4       bits
                      +---------+---------+
                      |  opcode | address |
                      +---------+---------+
                    */
                    {name: "LDA", bin: 0x10, flags: INST_MEMORY,    description: "Load from memory to A"},
                    {name: "ADD", bin: 0x20, flags: INST_MEMORY,    description: "Add from memory to A"},
                    {name: "SUB", bin: 0x30, flags: INST_MEMORY,    description: "Subtract memory from A"},
                    {name: "STA", bin: 0x40, flags: INST_MEMORY,    description: "Store A to memory"},
                    {name: "LDI", bin: 0x50, flags: INST_IMMEDIATE, description: "Load immediate"},
                    {name: "JMP", bin: 0x60, flags: INST_MEMORY,    description: "Jump"},
                    {name: "JC",  bin: 0x70, flags: INST_MEMORY,    description: "Jump if carry"},
                    {name: "JZ",  bin: 0x80, flags: INST_MEMORY,    description: "Jump if A is zero"},
                    {name: "OUT", bin: 0xE0, description: "Copy to output register"},
                    {name: "HLT", bin: 0xF0, description: "Halt"},
                    {name: "NOP", bin: 0x00, description: "No operation"},
                ],
                bitsMask:     0xff,
                opCodeMask:   0xf0,
                addressMask:  0x0f,
                indirectMask: 0x00
            }),

            memory: new Memory(16, 8),
            addressReg: "MAR",

            isIOSupported: false
        });
    }

    public controlUnitRun(): void {

        // Fetch
        if (this.T0) {
            this.log("T0: CO MI");
            this.MAR.load(this.PC.value);
            this.incSC();
        } else if (this.T1) {
            this.log("T1: RO II CE");
            this.M.read(this.IR);
            this.PC.increment();
            let op = this.IR.bitsRange(4, 7);
            this.LDA  = op == 1;
            this.ADD  = op == 2;
            this.SUB  = op == 3;
            this.STA  = op == 4;
            this.LDI  = op == 5;
            this.JMP  = op == 6;
            this.JC   = op == 7;
            this.JZ   = op == 8;
            this.OUTI = op == 0xE;
            this.HLT  = op == 0xF;
            this.incSC();
        }

        // Memory-Reference
        // LDA
        if (this.LDA && this.T2) {
            this.log("LDA T2: IO MI");
            this.MAR.load(this.IR.bitsRange(0, 3));
            this.incSC();
        } else if (this.LDA && this.T3) {
            this.log("LDA T3: RO AI");
            this.M.read(this.A);
            this.incSC();
        } else if (this.LDA && this.T4) {
            this.log("LDA T4: NOP");
            this.clrSC();
        }
        // ADD
        else if (this.ADD && this.T2) {
            this.log("ADD T2: IO MI");
            this.MAR.load(this.IR.bitsRange(0, 3));
            this.incSC();
        } else if (this.ADD && this.T3) {
            this.log("ADD T3: RO BI");
            this.M.read(this.B);
            this.incSC();
        } else if (this.ADD && this.T4) {
            this.log("ADD T4: ΣO AI FI");
            let res = this.A.value + this.B.value;
            this.ALU.load(res % this.A.max);
            this.CF.b = (res & this.A.max) != 0;
            this.ZF.b = res == 0;
            this.A.load(this.ALU.value);
            this.clrSC();
        }
        // SUB
        else if (this.SUB && this.T2) {
            this.log("SUB T2: IO MI");
            this.MAR.load(this.IR.bitsRange(0, 3));
            this.incSC();
        } else if (this.SUB && this.T3) {
            this.log("SUB T3: RO BI");
            this.M.read(this.B);
            this.incSC();
        } else if (this.SUB && this.T4) {
            this.log("SUB T4: SU ΣO AI FI");
            let res = this.B.value;
            res = (~res + 1) & this.B.mask;
            res += this.A.value;
            this.ALU.load(res % this.A.max);
            this.CF.b = (res & this.A.max) != 0;
            this.ZF.b = res == 0;
            this.A.load(this.ALU.value);
            this.clrSC();
        }
        // STA
        else if (this.STA && this.T2) {
            this.log("STA T2: IO MI");
            this.MAR.load(this.IR.bitsRange(0, 3));
            this.incSC();
        } else if (this.STA && this.T3) {
            this.log("STA T3: AO RI");
            this.M.write(this.A);
            this.incSC();
        } else if (this.STA && this.T4) {
            this.log("STA T4: NOP");
            this.clrSC();
        }
        // LDI
        else if (this.LDI && this.T2) {
            this.log("LDA T2: IO AI");
            this.A.load(this.IR.bitsRange(0, 3));
            this.incSC();
        } else if (this.LDI && this.T3) {
            this.log("LDI T3: NOP");
            this.incSC();
        } else if (this.LDI && this.T4) {
            this.log("LDI T4: NOP");
            this.clrSC();
        }
        // JMP
        else if (this.JMP && this.T2) {
            this.log("JMP T2: IO J");
            this.PC.load(this.IR.value);
            this.incSC();
        } else if (this.JMP && this.T3) {
            this.log("JMP T3: NOP");
            this.incSC();
        } else if (this.JMP && this.T4) {
            this.log("JMP T4: NOP");
            this.clrSC();
        }
        // JC
        else if (this.JC && this.T2) {
            if (this.CF.b) {
                this.log("JC T2: IO J");
                this.PC.load(this.IR.value);
            } else {
                this.log("JC T2: NOP");
            }
            this.incSC();
        } else if (this.JC && this.T3) {
            this.log("JC T3: NOP");
            this.incSC();
        } else if (this.JC && this.T4) {
            this.log("JC T4: NOP");
            this.clrSC();
        }
        // JZ
        else if (this.JZ && this.T2) {
            if (this.ZF.b) {
                this.log("JZ T2: IO J");
                this.PC.load(this.IR.value);
            } else {
                this.log("JZ T2: NOP");
            }
            this.incSC();
        } else if (this.JZ && this.T3) {
            this.log("JZ T3: NOP");
            this.incSC();
        } else if (this.JZ && this.T4) {
            this.log("JZ T4: NOP");
            this.clrSC();
        }

        // Register-Reference
        // OUT
        else if (this.OUTI && this.T2) {
            this.log("OUT T2: AO OI");
            this.OUT.load(this.A.value);
            this.incSC();
        } else if (this.OUTI && this.T3) {
            this.log("OUT T3: NOP");
            this.incSC();
        } else if (this.OUTI && this.T4) {
            this.log("OUT T4: NOP");
            this.clrSC();
        }
        // HLT
        else if (this.HLT && this.T2) {
            this.log("HLT T2: HLT");
            this.S.b = false;
            this.incSC();
        } else if (this.HLT && this.T3) {
            this.log("HTL T3: NOP");
            this.incSC();
        } else if (this.HLT && this.T4) {
            this.log("HLT T4: NOP");
            this.clrSC();
        }
    }

    public setSC(time: int): void {
        this.SC.load(time);
        this.T0 = this.SC.value == 0;
        this.T1 = this.SC.value == 1;
        this.T2 = this.SC.value == 2;
        this.T3 = this.SC.value == 3;
        this.T4 = this.SC.value == 4;
    }

}
