
// type aliases, only for convenience
export type int         = number;
export type long        = number;
export type double      = number;
export type char        = string;
export type Nullable<T> = T | undefined | null;

export class RuntimeException extends Error {}

type LogListener = () => void;

export class Logger {
    private logs:      string[];
    private listeners: LogListener[];

    constructor() {
        this.logs = [];
        this.listeners = [];
    }

    log(s: string, run_now: boolean): void {
        this.logs.push(s);
        if (run_now) {
            this.runListeners();
        }
    }

    connect(l: LogListener): void {
        this.listeners.push(l);
    }

    clear(): void {
        this.logs = [];
        this.runListeners();
    }

    runListeners(): void {
        for (let l of this.listeners) {
            l();
        }
    }

    get array(): string[] {
        return this.logs;
    }

    toString(): string {
        return this.logs.join("\n");
    }
}

// extend number and string
declare global {
    interface Number {
        pad(length: number): string;
        toChar():            char;
        toHex():             string;
    }

    interface String {
        pad(length: number): string;
        toInt():             int;
    }
}

function padString(s: string, length: number): string {
    while (s.length < length) {
        s = '0' + s;
    }
    return s;
}

String.prototype.pad = function(length: number): string {
    return padString(String(this), length);
};

Number.prototype.pad = function(length: number): string {
    return padString(String(this), length);
};

Number.prototype.toHex = function(): string {
    return Number(this).toString(16);
};

Number.prototype.toChar = function(): string {
    return String.fromCharCode(Number(this));
};

String.prototype.toInt = function(): int {
    return this.charCodeAt(0);
};

export function intToPrintableChar(c: int) {
    return (c >= 32 && c <= 176) ? c.toChar() : " ";
}

export function intToPrintableCharString(c: int) {
    return (c >= 32 && c <= 176) ? `'${c.toChar()}'` : "   ";
}

export function intsToPrintableString(arr: int[]) {
    let res = "";
    for (let i of arr)
        if (i != 0)
            res += intToPrintableChar(i);
    return res;
}

export function parseIntArray(arr: string[], radix: int): int[] {
    let res: int[] = new Array<int>(arr.length);
    let i: int = 0;
    try {
        for (i = 0; i < arr.length; ++i) {
            if (arr[i].length == 0)
                continue;
            res[i] = parseInt(arr[i], radix);
        }
    } catch (e) {
        throw new RuntimeException(i + ": " + e.message);
    }
    return res;
}

declare global {
    function setTimeout(f: any, time: long): void;
}

export async function sleep(time: long) {
    return new Promise((resolve) => setTimeout(resolve, time));
}
