import {
    int
} from "./utils"

type DataElementObj = {
    bits:        int,
    name:        string,
    description: string
};

abstract class DataElement {
    private _name:        string;
    private _description: string;
    private _bits:        int;

    constructor(bits: int, name: string, description: string) {
        this._bits        = bits;
        this._name        = name;
        this._description = description;
    }

    public static fromObj(obj: DataElementObj): DataElement {
        if (obj.bits == 1) {
            return new FlipFlop(obj.name, obj.description);
        } else {
            return new Register(obj.bits, obj.name, obj.description);
        }
    }

    public get bits():        int    { return this._bits;        }
    public get name():        string { return this._name;        }
    public get description(): string { return this._description; }

    public abstract get value(): int;
    public abstract     clear(): void;
}

export class FlipFlop extends DataElement {
    public b: boolean;

    constructor(name: string, description: string) {
        super(1, name, description);
    }

    public get value():  int  { return this.b ? 1 : 0; }
    public     clear():  void { this.b = false;        }
    public     toggle(): void { this.b = !this.value;  }
}

export class Register extends DataElement {
    private _value: int;
    private _mask:  int;
    private _max:   int;

    constructor(bits: int, name: string, description: string) {
        super(bits, name, description);
        this._value = 0;
        this._max   = 1 << bits;
        this._mask  = this.max - 1;
    }

    public load(input: int): void {
        this._value = input & this.mask;
    }

    public increment(): void {
        this._value = (this.value + 1) % this.max;
    }

    public clear(): void {
        this._value = 0;
    }

    public get value(): int { return this._value; }
    public get max():   int { return this._max;   }
    public get mask():  int { return this._mask;  }

    public bitAt(position: int): boolean {
        return ((this.value >> position) & 1) == 1;
    }

    public bitsRange(fr: int, to: int): int {
        return (this.value >> fr) & ~(-1 << (to - fr + 1));
    }

    public setBit(bit: int, v: boolean): void {
        this._value = v ? (this.value | 1 << bit) : (this.value & ~(1 << bit));
    }

    public setBits(fr: int, to: int, v: int): void {
        let mask: int = ~(-1 << fr) | (-1 << to + 1);
        v = (v << fr) & ~mask;
        this._value = (this.value & mask) | v;
    }
}

// registers and flags
export class RegisterFile {
    private map: Record<string, DataElement> = {};

    constructor(registers: DataElementObj[]) {
        let r: DataElement;
        for (let o of registers) {
            r = DataElement.fromObj(o);
            this.map[r.name] = r;
        }
    }

    public reg(name: string): Register {
        return this.map[name] as Register;
    }

    public ff(name: string): FlipFlop {
        return this.map[name] as FlipFlop;
    }

    public get all(): DataElement[] {
        return Object.values(this.map);
    }

    public toString(): string {
        let res = "";
        for (let reg of this.all) {
            res += reg.name + ":\t" + reg.description + "\n";
        }
        return res;
    }
}
