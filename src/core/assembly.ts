import {
    int,
    Nullable,
    RuntimeException
} from "./utils"

import {
    Instruction,
    InstructionSet
} from "./instruction"

const ADR_NOT_FOUND: int[] = [];

function fixEscapeChars(inp: string): string {
    return inp
        .split("\\t" ).join("\t")
        .split("\\b" ).join("\b")
        .split("\\n" ).join("\n")
        .split("\\r" ).join("\r")
        .split("\\f" ).join("\f")
        .split("\\'" ).join("\'")
        .split("\\\"").join("\"")
        .split("\\\\").join("\\");
}

class Data extends Instruction {
    constructor() {
        super("", 0, 0, "");
    }

    public binFrom(data: string): int {
        return parseInt(data);
    }
}

class DecData extends Data {
}

class HexData extends Data {
    public binFrom(data: string): int {
        return parseInt(data, 16);
    }
}

class BinData extends Data {
    public binFrom(data: string): int {
        return parseInt(data, 2);
    }
}

class CharData extends Data {
    public binFrom(s: string): int {
        s = fixEscapeChars(s);
        if (s.length == 1) {
            return s.charAt(0).toInt();
        } else {
            if (s.charAt(s.length - 1) == '\'') {
                if (s.length == 4 && s.charAt(1) == '\\')
                    return s.charAt(2).toInt();
                else
                    return s.charAt(1).toInt();
            } else {
                return -1;
            }
        }
    }
}

class StringData extends Data {
    public binsFrom(s: string): Nullable<int[]> {
        if (s.charAt(0) != '"' || s.charAt(s.length - 1) != '"') {
            return null;
        } else {
            s = s.substring(1, s.length - 1);
            s = fixEscapeChars(s);
            let res = new Array<int>(s.length + 1);
            for (let i = 0; i < s.length; ++i)
                res[i] = s[i].toInt();
            res[s.length] = '\0'.toInt();
            return res;
        }
    }
}

type AsmQueueItem = {
    adr:  int,
    line: int,
    inst: string
};

type AsmResult = {
    binary:   int[],
    linesMap: Record<int, int> // adr -> line
}

class AsmErr extends RuntimeException {
    constructor(i: int, msg: string) {
        super(`${i + 1}: ${msg}`);
    }
}

class AsmErrUnknown extends AsmErr {
    constructor(i: int, inst: string) {
        super(i, `Unknown instruction format ${inst}`);
    }
}

export class Assembler {
    private static strOrg: string = "ORG";
    private static strAdr: string = "ADR";
    private static strEnd: string = "END";
    private static instructionSetData: Record<string, Instruction> = {
        "DEC": new DecData(),
        "BIN": new BinData(),
        "HEX": new HexData(),
        "CHR": new CharData(),
        "STR": new StringData()
    };

    private instructionSet: InstructionSet;
    private labels:         Record<string, int> = {};
    private secondRound:    boolean;

    constructor(instructionSet: InstructionSet) {
        this.instructionSet = instructionSet;
    }

    private getInstruction(name: string): Nullable<Instruction> {
        let res = Assembler.instructionSetData[name];
        if (!res) {
            res = this.instructionSet.fromName(name);
        }
        return res;
    }

    public assembleInstruction(lineNumber: int, inst: string): int[] {
        let sp = inst.split(/\s+/);
        let instName = sp[0].toUpperCase();
        if (instName == Assembler.strAdr) {
            if (sp.length == 1) {
                throw new AsmErr(lineNumber, `Expected an address after ${instName}`);
            }
            let l = this.labels[sp[1]];
            if (!this.secondRound) {
                return ADR_NOT_FOUND;
            } else if (l == undefined) {
                throw new AsmErr(lineNumber, "Unknown address " + sp[1]);
            } else {
                return [ l ];
            }
        }
        let i = this.getInstruction(instName);
        if (i == undefined) {
            let num = Number(inst);
            if (isNaN(num)) {
                throw new AsmErr(lineNumber, `Unknown instruction '${instName}'`);
            } else {
                return [ num ];
            }
        } else if (i.isArg) {
            if (sp.length == 1) {
                throw new AsmErr(lineNumber, `Expected an argument after ${instName}`);
            }
            let adr = Number(sp[1]);
            if (isNaN(adr)) {
                let l = this.labels[sp[1]];
                if (!this.secondRound) {
                    return ADR_NOT_FOUND;
                } else if (l == undefined) {
                    throw new AsmErr(lineNumber, `Unknown address ${sp[1]}`);
                } else {
                    adr = l;
                }
            }
            let indirect = false;
            if (sp.length > 2) {
                sp[2] = sp[2].toLowerCase();
                if (sp[2] == "i") {
                    if (!i.indirect)
                        throw new AsmErr(lineNumber, "Indirect not supported");
                    indirect = true;
                } else {
                    throw new AsmErrUnknown(lineNumber, inst);
                }
            }
            if (sp.length > 3) {
                throw new AsmErrUnknown(lineNumber, inst);
            }
            try {
                return [ i.binFor(adr, indirect ?
                    this.instructionSet.indirectMask : 0) ];
            } catch (e) {
                throw new AsmErr(lineNumber, e.message);
            }
        } else if (i instanceof Data) {
            let data = inst.substring(3).trim();
            if (data.length == 0)
                throw new AsmErrUnknown(lineNumber, inst);
            if (i instanceof StringData) {
                let res = (i as StringData).binsFrom(data);
                if (!res)
                    throw new AsmErr(lineNumber, `Expected a string '${data}'`);
                return res;
            } else {
                let res: int = 0;
                if (i instanceof DecData) {
                    try {
                        res = (i as Data).binFrom(data);
                    } catch (e) {
                        throw new AsmErr(lineNumber, `Expected a decimal number '${data}'`);
                    }
                } else if (i instanceof HexData) {
                    try {
                        res = (i as Data).binFrom(data);
                    } catch (e) {
                        throw new AsmErr(lineNumber, `Expected a hexadecimal number '${data}'`);
                    }
                } else if (i instanceof BinData) {
                    try {
                        res = (i as Data).binFrom(data);
                    } catch (e) {
                        throw new AsmErr(lineNumber, `Expected a binary number '${data}'`);
                    }
                } else if (i instanceof CharData) {
                    res = (i as Data).binFrom(data);
                    if (res == -1)
                        throw new AsmErr(lineNumber, `Expected a character '${data}'`);
                }
                return [ res ];
            }
        } else {
            return [ i.bin ];
        }
    }

    public assemble(lines: string[], memLabels: Record<int, string>): AsmResult {
        this.labels = {};
        this.secondRound = false;
        let resMap: Record<int, int> = {}; // adr -> bin
        let linesMap: Record<int, int> = {}; // adr -> line
        let notFoundAdrQueue: AsmQueueItem[] = [];
        let upperLbl: string = "";
        let adr: int = 0;

        for (let i = 0; i < lines.length; ++i) {
            lines[i] = lines[i].split(";")[0].trim();
            if (lines[i].length == 0)
                continue;
            let spaceLoc: int = lines[i].indexOf(' ');
            let name: string;
            let args: string;

            if (spaceLoc > 0) {
                name = lines[i].substring(0, spaceLoc).toUpperCase();
                args = lines[i].substring(spaceLoc + 1).trim();
            } else {
                name = lines[i].toUpperCase();
                args = "";
            }

            if (name == Assembler.strOrg) {
                let p = false;
                if (args.charAt(0) == '+') {
                    p = true;
                    args = args.substring(1);
                }
                let o = parseInt(args);
                if (!isNaN(o)) {
                    if (p)
                        adr += o;
                    else
                        adr = o;
                } else {
                    throw new AsmErr(i, "Expected a number for ORG");
                }

            } else if (name == Assembler.strEnd) {
                break;

            } else {
                let lblMatch = lines[i].match(/([A-Za-z_0-9]+)\s*,\s*(.*)/);
                if (lblMatch) {
                    lblMatch[1] = lblMatch[1].trim();
                    lblMatch[2] = lblMatch[2].trim();
                    if (lblMatch[2]) {
                        this.labels[lblMatch[1]] = adr;
                        lines[i] = lblMatch[2];
                    } else {
                        upperLbl = lblMatch[1];
                        continue;
                    }
                } else if (upperLbl) {
                    this.labels[upperLbl] = adr;
                    upperLbl = "";
                }
                let bins: int[] = this.assembleInstruction(i, lines[i]);
                if (bins == ADR_NOT_FOUND) {
                    notFoundAdrQueue.push({adr: adr, line: i, inst: lines[i]});
                    adr++;
                } else {
                    for (let j = 0; j < bins.length; ++j) {
                        resMap[adr] = bins[j];
                        linesMap[adr] = i;
                        ++adr;
                    }
                }
            }
        }

        this.secondRound = true;
        let queueItem: Nullable<AsmQueueItem>;
        while (notFoundAdrQueue.length != 0) {
            queueItem = notFoundAdrQueue.shift();
            if (queueItem) {
                resMap[queueItem.adr] = this.assembleInstruction(queueItem.line, queueItem.inst)[0];
                linesMap[queueItem.adr] = queueItem.line;
            }
        }
        let addresses = Object.keys(resMap).map(Number);
        let maxAdr: int = Math.max(...addresses);
        let arr = new Array<int>(maxAdr + 1);
        for (const a of addresses)
            arr[a] = resMap[a];

        if (memLabels) {
            for (let k of Object.keys(this.labels)) {
                memLabels[this.labels[k]] = k;
            }
        }

        return {binary: arr, linesMap: linesMap};
    }

    public disassemble(bin: int): string {
        bin = bin & this.instructionSet.bitsMask;
        let i = this.instructionSet.fromBin(bin);
        if (!i) {
            i = this.instructionSet.fromBin(bin & this.instructionSet.opCodeMask);
        }
        if (!i) {
            return "0x" + bin.toHex().pad(4);
        } else if (i.isArg) {
            return i.asmFor(bin & this.instructionSet.addressMask,
                            bin & this.instructionSet.indirectMask);
        } else {
            return i.asm();
        }
    }

}

export function assemble(instructionSet: InstructionSet,
                         lines: string[],
                         memLabels: Record<int, string> = {}): AsmResult {
    return new Assembler(instructionSet).assemble(lines, memLabels);
}

export function disassemble(instructionSet: InstructionSet, bin: int): string {
    return new Assembler(instructionSet).disassemble(bin);
}
