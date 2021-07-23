"use strict";

import { computers } from "../core/computers";

import {
    $get, $br, $a, $button, $div, $input, $label,
    $option, $select, $table, $tr, $td, $textarea
} from "elemobj";

import * as CodeMirror from "codemirror";

import "codemirror/lib/codemirror.css";
import "./style.css";

const examples = {
    "ac-add":  EXAMPLE_AC_ADD,
    "ac-mul":  EXAMPLE_AC_MUL,
    "ac-io":   EXAMPLE_AC_IO,
    "ben-add": EXAMPLE_BEN_ADD,
    "ben-mul": EXAMPLE_BEN_MUL
};

const NAME = "BCE";

const ABOUT = `
${NAME}
Build ${BUILD}
Copyright (C) 2021-present Naheel Azawy
This program comes with absolutely no warranty.
See the <a href=\"http://www.gnu.org/licenses/\">GNU General Public License, version 3 or later</a> for details.
`;

const HELP_SRC = `
Enter assembly source code to be assembled and loaded to memory.
`;

const HELP_REG = `
Registers and flags
`;

const HELP_MEM = `
Memory values
`;

const HELP_LOG = `
Logs of the program including executed register transfer language
`;

const HELP_TRM = `
Terminal of the computer for IO supported computers
`;

const EXAMPLE = `
lda A
add B
sta C
hlt

A, 1
B, 2
C, 0
`;

let c;
let editor;
let big;
const margin = "5px";

const defaultConf = {
    src:      EXAMPLE.trim(),
    computer: "AC",
    light:    false,
    signed:   true,
    dec:      true,
    hex:      true,
    chr:      true,
    text:     true,
    label:    true,
    live:     true
};

function setConf(key, val) {
    if (window.localStorage) {
        localStorage.setItem(key, val);
    }
}

function getConf(key) {
    if (window.localStorage) {
        let res = localStorage.getItem(key);
        if (res == null) {
            res = defaultConf[key];
        } else if (typeof defaultConf[key] == "boolean") {
            res = res == "true";
        }
        return res;
    } else {
        return defaultConf[key];
    }
}

function saveFile(filename, text) {
    let a = $a();
    a.setAttribute('href', 'data:text/plain;charset=utf-8,' +
                     encodeURIComponent(text));
    a.setAttribute('download', filename);
    a.click();
}

function openFile() {
    return new Promise(resolve => {
        let i = $input({type: "file"});
        i.addEventListener('change', evt => {
            let file = evt.target.files[0];
            let reader = new FileReader();
            reader.onload = event => {
                resolve(event.target.result);
            };
            reader.readAsText(file);
        }, false);
        i.click();
    });
}

function loadProgram() {
    c.loadProgram(editor.getValue());
    c.breakpoints = getBreakpoints();
}

function label(content) {
    return $button({style: {
        background: "none",
        cursor:     "auto",
        boxShadow:  "none"
    }}, content);
}

function modalView() {
    return $div({
        id: "modal-main",
        className: "modal",
        onclick: event => {
            if (event.target == $get("#modal-main")) {
                hideModal();
            }
        }
    }, $div({className: "modal-content"}, [
        $div({id: "modal-main-content"}),
        $br(),
        $button({
            style: {margin: "10px"},
            onclick: hideModal
        }, "CLOSE"),
        $br()
    ]));
}

function showModal(content) {
    let e = $get("#modal-main-content");
    e.innerHTML = "";
    e.appendChild($div(content));
    $get("#modal-main").style.display = "block";
}

function hideModal() {
    $get("#modal-main-content").innerHTML = "";
    $get("#modal-main").style.display = "none";
}

function buttonsView() {
    return $div({style: {
        whiteSpace:  "nowrap",
        overflowX:   "auto",
        display:     big ? "block" : "flex"
    }}, [
        $div({style: {float: "left", marginLeft: margin}}, [
            $button({onclick: async () => {
                editor.setValue(await openFile());
            }}, "OPEN"),

            $button({onclick: () => {
                saveFile("src.txt", editor.getValue());
                // TODO: https://web.dev/file-system-access/
            }}, "SAVE"),

            $button({onclick: () => {
                loadProgram();
                c.start();
            }}, "RUN"),

            $button({onclick: () => {
                c.stop();
            }}, "HALT"),

            $button({onclick: () => {
                c.clear();
                $get("#log").value = "";
                $get("#trm").value = "";
                $get("#trm").trmCount = 0;
            }}, "CLEAR"),

            $button({onclick: () => {
                if ($get("#tick-type").value == "inst") {
                    c.startEnable();
                    c.nextInst();
                    c.stop();
                } else {
                    c.startEnable();
                    c.tick();
                    c.stop();
                }
            }}, "TICK"),

            $select({id: "tick-type"}, [
                $option({value: "clk"}, "Clock"),
                $option({value: "inst"}, "Instruction")
            ])
        ]),

        $div({style: {float: "right", marginRight: margin}}, [
            $input({
                type: "checkbox",
                id: "live-chk",
                value: "live-chk"}),
            $label({style: {marginRight: "10px"},
                    htmlFor: "live-chk"}, "LIVE"),

            "FREQ(Hz): ",
            $input({id: "freq", size: 4, oninput: () => {
                let e = $get("#freq");
                let v = e.value.replace(/[^0-9\-]/g, "");
                if (v && !isNaN(Number(v))) {
                    c.freq = v;
                    c.runListenersNow();
                }
                e.value = v;
            }}),

            $button({onclick: () => showModal(moreView())}, "MORE"),
        ])
    ]);
}

function moreView() {
    function fmtOpt(id, det) {
        return [
            $input({
                type: "checkbox",
                id: id,
                value: id,
                checked: c.fmt[id],
                onchange: () => {
                    c.fmt[id] = $get("#" + id).checked;
                    setConf(id, c.fmt[id]);
                    c.runListenersNow();
                }}),
            $label({htmlFor: id}, det),
            $br()
        ];
    }

    return $table({style: {width: "100%"}}, [
        $tr([
            $td("Theme:"),
            $td($button({onclick: () => {
                document.body.classList.toggle("light");
                setConf("light", document.body.classList.contains("light"));
            }}, "SWITCH THEME"))
        ]),

        $tr([
            $td("Architecture:"),
            $td($select({
                id: "arch",
                onchange: () => initComputer($get("#arch").value)
            }, [
                $option({value: "AC"}, "Accumelator computer"),
                $option({value: "BEN"}, "Ben's computer")
            ]))
        ]),

        $tr([
            $td("Architecture details:"),
            $td($button({onclick: () => {
                showModal($textarea({value: c.toString(), style: {
                    width: "100%",
                    height: "50vh"
                }}));
            }}, "DETAILS"))
        ]),

        $tr([
            $td("Data view:"),
            $td([
                ...fmtOpt("signed", "Signed numbers"),
                ...fmtOpt("dec",    "Show decimals"),
                ...fmtOpt("hex",    "Show hexadecimals"),
                ...fmtOpt("chr",    "Show printable characters"),
                ...fmtOpt("text",   "Show disassembled text"),
                ...fmtOpt("label",  "Show labels")
            ])
        ]),

        $tr([
            $td("Examples:"),
            $td($button({onclick: () => {
                function ex(file, computer, name) {
                    return [
                        $button({
                            style: {
                                width:     "100%",
                                textAlign: "left"
                            },
                            onclick: () => {
                                initComputer(computer);
                                editor.setValue(examples[file]);
                                hideModal();
                            }
                        }, `${name} (${computer} computer)`),
                        $br()
                    ];
                }

                showModal($div([
                    ...ex("ac-add",  "AC",  "Adding example"),
                    ...ex("ac-mul",  "AC",  "Multiplication example"),
                    ...ex("ac-io",   "AC",  "IO example"),
                    ...ex("ben-add", "BEN", "Adding example"),
                    ...ex("ben-mul", "BEN", "Multiplication example")
                ]));
            }}, "LOAD EXAMPLE"))
        ]),

        $tr([
            $td("About:"),
            $td($button({onclick: () => {
                showModal(ABOUT.replace(/\n/g, "<br>"));
            }}, "ABOUT"))
        ])
    ]);
}

function srcView() {
    return $div([
        label("Source"),
        $div({style: {float: "right"}}, [
            $button({onclick: loadProgram}, "LOAD"),
            $button({onclick: () => showModal(HELP_SRC)}, "?")
        ]),
        $br(),
        $textarea({id: "src", className: "textareas", spellcheck: false})
    ]);
}

function regView() {
    return $div([
        label("Registers"),
        $div({style: {float: "right"}}, [
            $button({onclick: () => c.clearRegs()}, "X"),
            $button({onclick: () => showModal(HELP_REG)}, "?")
        ]),
        $br(),
        $textarea({id: "reg", className: "textareas", readOnly: true})
    ]);
}

function memView() {
    function move(dir) {
        if (c.fmt.mStart == -1) {
            let v = c.PC.value - (c.fmt.h / 2);
            if (v < 0) {
                v = 0;
            }
            c.fmt.mStart = v + dir;
        } else {
            c.fmt.mStart += dir;
        }
        c.runListenersNow();
    }

    return $div([
        label("Memory"),
        $div({style: {float: "right"}}, [
            "START: ",
            $input({id: "mstart", size: 4, oninput: () => {
                let e = $get("#mstart");
                let v = e.value.replace(/[^0-9\-]/g, "");
                if (v && !isNaN(Number(v))) {
                    c.fmt.mStart = Number(e.value);
                    c.runListenersNow();
                }
                e.value = v;
            }}),
            $button({onclick: () => move(-1)}, "↑"),
            $button({onclick: () => move(+1)}, "↓"),
            $button({onclick: () => c.clearMem()}, "X"),
            $button({onclick: () => showModal(HELP_MEM)}, "?")
        ]),
        $br(),
        $textarea({
            id: "mem",
            className: "textareas",
            style: {overflowY: "hidden"},
            readOnly: true,
            onwheel: e => move((e.deltaY / 5) | 0)
        })
    ]);
}

function logView() {
    return $div([
        label("Logs"),
        $div({style: {float: "right"}}, [
            $button({onclick: () => {
                saveFile("logs.txt", c.logger.toString());
            }}, "SAVE"),
            $button({onclick: () => {
                c.logger.clear();
                $get("#log").value = "";
            }}, "X"),
            $button({onclick: () => showModal(HELP_LOG)}, "?")
        ]),
        $br(),
        $div({id: "log", className: "textareas", readOnly: true,
              contenteditable: true, style: {border: "1px solid gray"}})
    ]);
}

function trmView() {
    return $div([
        label("Terminal"),
        $div({style: {float: "right"}}, [
            $button({onclick: () => {
                c.clearIO();
                $get("#trm").value = "";
            }}, "X"),
            $button({onclick: () => showModal(HELP_TRM)}, "?")
        ]),
        $br(),
        $textarea({id: "trm", className: "textareas",
                   spellcheck: false, style: {whiteSpace: "normal"}})
    ]);
}

function mainViewBig() {
    return $div({className: "main"}, [
        buttonsView(),
        $div({
            style: {
                display: "flex",
                height:  "60%",
                margin:  margin
            }
        }, [
            $div({style: {width: "40%", marginRight: margin}}, srcView()),
            $div({style: {width: "25%", marginRight: margin}}, regView()),
            $div({style: {width: "35%"}},                      memView())
        ]),
        $br(), $br(),
        $div({
            style: {
                display: "flex",
                height:  "20%",
                margin:  margin
            }
        }, [
            $div({style: {width: "60%", marginRight: margin}}, logView()),
            $div({style: {width: "40%"}},                      trmView())
        ]),

        modalView()
    ]);
}

function mainViewMini() {
    const margin = "5px";

    let items = [];

    function addItem(i, v) {
        items.push(i);
        return $td({style: {height: "70vh"}}, $div({id: `${i}-cont`, style: {
            width:   "95vw",
            height:  "100%",
            margin:  margin
        }}, v));
    }

    function itemBtnBorder(active) {
        return active ? "1px solid var(--primary-foreground)" : "1px solid #00000000";
    }

    function itemBtn(i, txt) {
        return $td($button({
            id: `${i}-b`,
            style: {border: itemBtnBorder(i == "src")},
            onclick: () => showItem(i)
        }, txt));
    }

    function showItem(target) {
        $get(`#${target}-cont`).scrollIntoView({behavior: "smooth"});
        for (let i of items) {
            $get(`#${i}-b`).style.border = itemBtnBorder(i == target);
        }
    }

    return $div({className: "main mini"}, [
        buttonsView(),
        $table({
            style: {
                height:       "85%",
                marginTop:    margin,
                whiteSpace:   "nowrap",
                overflowX:    "auto",
                display:      "flex"
            }
        }, $tr({style: {height: "100%"}}, [
            addItem("src", srcView()),
            addItem("reg", regView()),
            addItem("mem", memView()),
            addItem("log", logView()),
            addItem("trm", trmView())
        ])),

        $table({
            style: {
                marginTop:    margin,
                marginBottom: margin,
                width:        "100%",
                textAlign:    "center",
                whiteSpace:   "nowrap",
                overflowX:    "auto",
                display:      "flex"
            }
        }, $tr([
            itemBtn("src", "SOURCE"),
            itemBtn("reg", "REGISTERS"),
            itemBtn("mem", "MEMORY"),
            itemBtn("log", "LOG"),
            itemBtn("trm", "TERMINAL")
        ])),
        modalView()
    ]);
}

function mainView() {
    return big ? mainViewBig() : mainViewMini();
}

function marker() {
    return $div({style: {color: "red"}}, "●");
}

function initEditor() {
    editor = CodeMirror.fromTextArea($get("#src"), {
        lineNumbers:    true,
        gutters:        ["CodeMirror-linenumbers", "breakpoints"],
        theme:          "simple",
        spellcheck:     false,
        autocorrect:    false,
        autocapitalize: false,
        tabSize:        8,
        indentUnit:     8,
        indentWithTabs: true
    });

    editor.on("gutterClick", (cm, n) => {
        let info = cm.lineInfo(n);
        if (strIsInst(info.text) && !info.gutterMarkers) {
            cm.setGutterMarker(n, "breakpoints", marker());
        } else {
            cm.setGutterMarker(n, "breakpoints", null);
        }
    });

    editor.on("change", () => {
        setConf("src", editor.getValue());
    });
}

function getBreakpoints() {
    let res = [];
    for (let i = 0; i < editor.lineCount(); ++i) {
        if (editor.lineInfo(i).gutterMarkers) {
            res.push(i);
        }
    }
    return res;
}

function strIsInst(line, name) {
    if (!name) {
        name = "([a-zA-Z0-9]+)";
    } else if (!/^[a-zA-Z0-9]+/.test(name)) {
        return false;
    }
    return new RegExp(`^\\s*([a-zA-Z0-9]+\\s*,\\s*)?${name}(\\s[a-zA-Z0-9]+)?(\\s+[Ii])?\\s*;?.*$`)
        .test(line);
}

function defineCodeMirrorSyntax(CodeMirror) {
    CodeMirror.defineMode("myasm", function(config) {
        var atoms = ["org", "adr", "end", "dec", "bin", "hex", "chr", "str"];
        var symbol = /[^\s'`,@()\[\]";]/;
        var type;

        function readSym(stream) {
            var ch;
            while (ch = stream.next()) {
                if (ch == "\\") stream.next();
                else if (!symbol.test(ch)) { stream.backUp(1); break; }
            }
            return stream.current();
        }

        function base(stream, state) {
            if (stream.eatSpace()) {type = "ws"; return null;}
            var ch = stream.next();
            if (ch == "\\") ch = stream.next();

            if (ch == '"') return (state.tokenize = inString)(stream, state);
            if (ch == "'") return (state.tokenize = inChar)(stream, state);
            else if (ch == ";") { stream.skipToEnd(); type = "ws"; return "comment"; }
            else if (/['`,@]/.test(ch)) return null;
            else {
                var name = readSym(stream);
                if (name == ".") return null;
                type = "symbol";
                if (atoms.includes(name.toLowerCase())) return "atom";
                if (strIsNumLit(stream.string, name)) return "number";
                if (name.toLowerCase() == "i" ||
                    strIsInst(stream.string, name)) return "keyword";
                return "variable";
            }
        }

        function strIsNumLit(line, name) {
            let num = "^[\\+\\-]?(0x|0b)?[0-9a-fA-F]+$";
            let numLine = `^\\s*([a-zA-Z0-9]+\\s*,\\s*)([a-zA-Z0-9]+)?\\s+${name.replace("+", "\\+")}\\s*;?.*$`;
            try {
                return new RegExp(num).test(name) && new RegExp(numLine).test(line);
            } catch (e) {
                return false;
            }
        }

        function inString(stream, state) {
            var escaped = false, next;
            while (next = stream.next()) {
                if (next == '"' && !escaped) { state.tokenize = base; break; }
                escaped = !escaped && next == "\\";
            }
            return "string";
        }

        function inChar(stream, state) {
            var escaped = false, next;
            while (next = stream.next()) {
                if (next == "'" && !escaped) { state.tokenize = base; break; }
                escaped = !escaped && next == "\\";
            }
            return "string-2";
        }

        function inComment(stream, state) {
            var next, last;
            while (next = stream.next()) {
                if (next == "#" && last == "|") { state.tokenize = base; break; }
                last = next;
            }
            type = "ws";
            return "comment";
        }

        return {
            startState: function () {
                return {tokenize: base};
            },

            token: function (stream, state) {
                return state.tokenize(stream, state);
            }
        };
    });

    CodeMirror.defineMIME("text/myasm", "myasm");
}

function initComputer(kind) {
    c = new computers[kind]();
    window.computer = c;

    c.fmt.h = 30;
    for (let opt of ["signed", "dec", "hex", "chr", "text", "label"]) {
        c.fmt[opt] = getConf(opt);
    }

    c.connectOnUpdate(() => {
        $get("#reg").value    = c.fmt.registers;
        $get("#mem").value    = c.fmt.memory;
        $get("#mstart").value = c.fmt.mStart;
        $get("#freq").value   = c.avgFreq;
    });

    c.logger.connect(() => {
        let ta = $get("#log");
        let cont = "";
        for (let l of c.logger.array.slice(-100)) {
            if (l.startsWith("Error")) {
                let msg = `<span style="color:red">${l}</span><br>`;
                cont += msg;
            } else {
                cont += `${l}<br>`;
            }
        }
        ta.innerHTML = cont;
        ta.scrollTop = ta.scrollHeight;
        let last = c.logger.array[c.logger.array.length - 1];
        if (last && last.startsWith("Error")) {
            showModal(last);
        }
    });

    c.connectOnOut(c => {
        if (c != '\0') {
            let t = $get("#trm");
            t.value += c;
            if (t.trmCount == undefined) {
                t.trmCount = 0;
            }
            ++t.trmCount;
        }
    });

    $get("#trm").addEventListener("keydown", event => {
        if (event.key == "Enter") {
            let t = $get("#trm");
            let input = t.value.substring(t.trmCount, t.value.length);
            t.trmCount += input.length + 1;
            c.putInpStr(input);
        }
    });

    c.live = getConf("live");
    let live_elem = $get("#live-chk");
    live_elem.checked = getConf("live");
    live_elem.onchange = () => {
        c.live = $get("#live-chk").checked;
        setConf("live", c.live);
    };

    c.logger.log(`Welcome to ${kind} computer!`, true);
    setConf("computer", kind);
}

function init() {
    document.title = NAME;
    let elem = document.body;
    elem.innerHTML = "";
    big = window.screen.availHeight < window.screen.availWidth;
    if (getConf("light")) {
        document.body.classList.add("light");
    } else {
        document.body.classList.remove("light");
    }
    elem.appendChild(mainView());
    initEditor();
    editor.setValue(getConf("src"));
}

function reinit() {
    let log = $get("#log").innerHTML;
    let trm = $get("#trm").value;
    init();
    c.runListenersNow();
    $get("#log").innerHTML = log;
    $get("#trm").value = trm;
}

async function main() {
    if ("serviceWorker" in navigator) {
        try {
            let reg = await navigator.serviceWorker.register("sw.bundle.js");
            console.log("SW registered: ", reg);
        } catch (e) {
            console.log("SW registration failed: ", e);
        }
    }

    window.onbeforeunload = () => "Are you sure you want to leave?";
    window.addEventListener("keydown", event => {
        if (event.key == "Escape") {
            hideModal();
        }
    });
    window.addEventListener("resize", event => {
        let newBig = window.screen.availHeight < window.screen.availWidth;
        if (newBig != big) {
            reinit();
        }
    });

    defineCodeMirrorSyntax(CodeMirror);
    init();
    initComputer(getConf("computer"));
    c.runListenersNow();
}

window.addEventListener("load", main);
