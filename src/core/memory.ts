import {
    int
} from "./utils"

import {
    Instruction
} from "./instruction"

import {
    Register
} from "./registers"

export class Memory {
    public  AR:         Register;
    private _data:      int[];
    private _wordSize:  int;
    private _wordMask:  int;
    private defaultVal: int = 0;

    constructor(size: int, wordSize: int) {
        this._wordSize = wordSize;
        this._data = new Array<int>(size);
        this._wordMask = (1 << wordSize) - 1;
        this.clear();
    }

    public read(dest: Register): void {
        dest.load(this.data[this.AR.value]);
    }

    public write(src: Register): void {
        this.data[this.AR.value] =
            src.value & this.wordMask;
    }

    public setContent(input: int[]): void {
        let i: int;
        for (i = 0; i < input.length; i++)
            this.data[i] = input[i] & this.wordMask;
        for (; i < this.data.length; i++)
            this.data[i] = this.defaultVal;
    }

    public clear(): void {
        this.data.fill(this.defaultVal);
    }

    public set nopVal(inst: Instruction) {
        if (inst != undefined) {
            this.defaultVal = inst.bin;
            this.clear();
        }
    }

    public get data():     int[] { return this._data;        }
    public get wordSize(): int   { return this._wordSize;    }
    public get wordMask(): int   { return this._wordMask;    }
    public get length():   int   { return this._data.length; }
}
