import {
    int,
    RuntimeException
} from "./utils"

export const INST_MEMORY:    int = 0x1;
export const INST_INDIRECT:  int = 0x2;
export const INST_IMMEDIATE: int = 0x4;

type InstructionObj = {
    name:        string,
    bin:         int,
    flags?:      int,
    description: string
};

export class Instruction {
    protected _name:        string;
    protected _description: string;
    protected _bin:         int;
    protected _memory:      boolean;
    protected _indirect:    boolean;
    protected _immediate:   boolean;

    constructor(name: string, bin: int, flags: int, description: string) {
        this._name        = name;
        this._bin         = bin;
        this._memory      = (flags & INST_MEMORY) != 0;
        this._indirect    = (flags & INST_INDIRECT) != 0;
        this._immediate   = (flags & INST_IMMEDIATE) != 0;
        this._description = description;
    }

    public static fromObj(obj: InstructionObj): Instruction {
        return new Instruction(
            obj.name, obj.bin, obj.flags || 0, obj.description
        );
    }

    public get bin(): int {
        return this._bin;
    }

    // indirectBit to be used with InstructionSet.getIndirectMask()
    public binFor(arg: int, indirectBit: int): int {
        if (!this.memory && !this.immediate) {
            throw new RuntimeException("Arguments not allowed");
        }
        let b: int = this.bin | arg;
        if (this.indirect) {
            b |= indirectBit;
        } else if (indirectBit != 0) {
            throw new RuntimeException("Indirect references not allowed here");
        }
        return b;
    }

    public asm(): string {
        return this.name;
    }

    public asmFor(arg: int, indirectBit: int): string {
        if (!this.memory && !this.immediate) {
            throw new RuntimeException("Arguments not allowed");
        }
        let res: string = `${this.name} ${arg.pad(4)}`;
        if (this.indirect) {
            if (indirectBit != 0)
                res += " I";
        } else if (indirectBit != 0) {
            throw new RuntimeException("Indirect references not allowed here");
        }
        return res;
    }

    public get name():        string  { return this._name;                      }
    public get description(): string  { return this._description;               }
    public get isArg():       boolean { return this._memory || this._immediate; }
    public get indirect():    boolean { return this._indirect;                  }
    public get memory():      boolean { return this._memory;                    }
    public get immediate():   boolean { return this._immediate;                 }
}

export class InstructionSet {
    private map: Record<string, Instruction> = {};
    private rev: Record<int, Instruction>    = {};

    private _bitsMask:     int;
    private _opCodeMask:   int;
    private _addressMask:  int;
    private _indirectMask: int;

    constructor(props: {instructions: InstructionObj[],
                        bitsMask: int, opCodeMask: int,
                        addressMask: int, indirectMask: int}) {
        this._bitsMask = props.bitsMask;
        this._opCodeMask = props.opCodeMask;
        this._addressMask = props.addressMask;
        this._indirectMask = props.indirectMask;

        let i: Instruction;
        for (let o of props.instructions) {
            i = Instruction.fromObj(o);
            this.map[i.name] = i;
            this.rev[i.bin] = i;
        }
    }

    public get bitsMask():     int { return this._bitsMask;     }
    public get opCodeMask():   int { return this._opCodeMask;   }
    public get addressMask():  int { return this._addressMask;  }
    public get indirectMask(): int { return this._indirectMask; }

    fromName(name: string): Instruction {
        return this.map[name];
    }

    fromBin(baseBin: int): Instruction {
        return this.rev[baseBin];
    }

    public toString(): string {
        let res = "";
        for (let inst of Object.values(this.map)) {
            res += inst.name + ":\t" + inst.description + "\n";
        }
        return res;
    }
}
