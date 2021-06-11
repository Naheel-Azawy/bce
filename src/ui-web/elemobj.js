/* Copyright 2021-present Naheel Azawy.  All rights reserved.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// `args` can be "properties" or the "content"
// "properties" include properties of the element and optionally the "content"
// "content" can be an element, html string, or an array of any of both
// "con" is like "content" but preferred for inline cases
export function $elem(tag, args, con) {
    function pushstuff(parent, stuff) {
        let children;
        if (Array.isArray(stuff)) {
            children = stuff;
        } else {
            children = [stuff];
        }
        for (let child of children) {
            if (typeof child == "string") {
                parent.innerHTML += child;
            } else if (child instanceof Element) {
                parent.appendChild(child);
            } else {
                throw new Error("Unknown child type");
            }
        }
    }

    let elem = document.createElement(tag);

    if (args) {
        try {
            // assume args are the content
            pushstuff(elem, args);
        } catch (e) {
            // assume args are the properties
            if (e.message == "Unknown child type") {
                // extract special props
                let content = args.content;
                let style = args.style;
                let run = args.run;
                delete args.content;
                delete args.style;
                
                for (let prop in args) {
                    elem[prop] = args[prop];
                }

                if (content) {
                    pushstuff(elem, content);
                }

                if (con) {
                    pushstuff(elem, con);
                }

                if (style) {
                    if (typeof style == "object") {
                        Object.assign(elem.style, style);
                    } else {
                        elem.style = style;
                    }
                }

                if (run) {
                    run(elem);
                }
            } else {
                throw e;
            }
        }
    }
    return elem;
}

export function $get(q) {
    if (q[0] == '#') {
        return document.getElementById(q.substring(1));
    } else if (q[0] == '.') {
        return document.getElementsByClassName(q.substring(1));
    } else {
        return document.getElementsByTagName(q);
    }
}

// https://www.w3schools.com/TAGs/
export const $a = (args, con) => $elem("a", args, con);
export const $abbr = (args, con) => $elem("abbr", args, con);
export const $acronym = (args, con) => $elem("acronym", args, con);
export const $address = (args, con) => $elem("address", args, con);
export const $applet = (args, con) => $elem("applet", args, con);
export const $area = (args, con) => $elem("area", args, con);
export const $article = (args, con) => $elem("article", args, con);
export const $aside = (args, con) => $elem("aside", args, con);
export const $audio = (args, con) => $elem("audio", args, con);
export const $b = (args, con) => $elem("b", args, con);
export const $base = (args, con) => $elem("base", args, con);
export const $basefont = (args, con) => $elem("basefont", args, con);
export const $bdi = (args, con) => $elem("bdi", args, con);
export const $bdo = (args, con) => $elem("bdo", args, con);
export const $big = (args, con) => $elem("big", args, con);
export const $blockquote = (args, con) => $elem("blockquote", args, con);
export const $body = (args, con) => $elem("body", args, con);
export const $br = (args, con) => $elem("br", args, con);
export const $button = (args, con) => $elem("button", args, con);
export const $canvas = (args, con) => $elem("canvas", args, con);
export const $caption = (args, con) => $elem("caption", args, con);
export const $center = (args, con) => $elem("center", args, con);
export const $cite = (args, con) => $elem("cite", args, con);
export const $code = (args, con) => $elem("code", args, con);
export const $col = (args, con) => $elem("col", args, con);
export const $colgroup = (args, con) => $elem("colgroup", args, con);
export const $data = (args, con) => $elem("data", args, con);
export const $datalist = (args, con) => $elem("datalist", args, con);
export const $dd = (args, con) => $elem("dd", args, con);
export const $del = (args, con) => $elem("del", args, con);
export const $details = (args, con) => $elem("details", args, con);
export const $dfn = (args, con) => $elem("dfn", args, con);
export const $dialog = (args, con) => $elem("dialog", args, con);
export const $dir = (args, con) => $elem("dir", args, con);
export const $div = (args, con) => $elem("div", args, con);
export const $dl = (args, con) => $elem("dl", args, con);
export const $dt = (args, con) => $elem("dt", args, con);
export const $em = (args, con) => $elem("em", args, con);
export const $embed = (args, con) => $elem("embed", args, con);
export const $fieldset = (args, con) => $elem("fieldset", args, con);
export const $figcaption = (args, con) => $elem("figcaption", args, con);
export const $figure = (args, con) => $elem("figure", args, con);
export const $font = (args, con) => $elem("font", args, con);
export const $footer = (args, con) => $elem("footer", args, con);
export const $form = (args, con) => $elem("form", args, con);
export const $frame = (args, con) => $elem("frame", args, con);
export const $frameset = (args, con) => $elem("frameset", args, con);
export const $h1 = (args, con) => $elem("h1", args, con);
export const $h2 = (args, con) => $elem("h2", args, con);
export const $h3 = (args, con) => $elem("h3", args, con);
export const $h4 = (args, con) => $elem("h4", args, con);
export const $h5 = (args, con) => $elem("h5", args, con);
export const $h6 = (args, con) => $elem("h6", args, con);
export const $head = (args, con) => $elem("head", args, con);
export const $header = (args, con) => $elem("header", args, con);
export const $hr = (args, con) => $elem("hr", args, con);
export const $html = (args, con) => $elem("html", args, con);
export const $i = (args, con) => $elem("i", args, con);
export const $iframe = (args, con) => $elem("iframe", args, con);
export const $img = (args, con) => $elem("img", args, con);
export const $input = (args, con) => $elem("input", args, con);
export const $ins = (args, con) => $elem("ins", args, con);
export const $kbd = (args, con) => $elem("kbd", args, con);
export const $label = (args, con) => $elem("label", args, con);
export const $legend = (args, con) => $elem("legend", args, con);
export const $li = (args, con) => $elem("li", args, con);
export const $link = (args, con) => $elem("link", args, con);
export const $main = (args, con) => $elem("main", args, con);
export const $map = (args, con) => $elem("map", args, con);
export const $mark = (args, con) => $elem("mark", args, con);
export const $meta = (args, con) => $elem("meta", args, con);
export const $meter = (args, con) => $elem("meter", args, con);
export const $nav = (args, con) => $elem("nav", args, con);
export const $noframes = (args, con) => $elem("noframes", args, con);
export const $object = (args, con) => $elem("object", args, con);
export const $ol = (args, con) => $elem("ol", args, con);
export const $optgroup = (args, con) => $elem("optgroup", args, con);
export const $option = (args, con) => $elem("option", args, con);
export const $output = (args, con) => $elem("output", args, con);
export const $p = (args, con) => $elem("p", args, con);
export const $param = (args, con) => $elem("param", args, con);
export const $picture = (args, con) => $elem("picture", args, con);
export const $pre = (args, con) => $elem("pre", args, con);
export const $progress = (args, con) => $elem("progress", args, con);
export const $q = (args, con) => $elem("q", args, con);
export const $rp = (args, con) => $elem("rp", args, con);
export const $rt = (args, con) => $elem("rt", args, con);
export const $ruby = (args, con) => $elem("ruby", args, con);
export const $s = (args, con) => $elem("s", args, con);
export const $samp = (args, con) => $elem("samp", args, con);
export const $script = (args, con) => $elem("script", args, con);
export const $section = (args, con) => $elem("section", args, con);
export const $select = (args, con) => $elem("select", args, con);
export const $small = (args, con) => $elem("small", args, con);
export const $source = (args, con) => $elem("source", args, con);
export const $span = (args, con) => $elem("span", args, con);
export const $strike = (args, con) => $elem("strike", args, con);
export const $strong = (args, con) => $elem("strong", args, con);
export const $style = (args, con) => $elem("style", args, con);
export const $sub = (args, con) => $elem("sub", args, con);
export const $summary = (args, con) => $elem("summary", args, con);
export const $sup = (args, con) => $elem("sup", args, con);
export const $svg = (args, con) => $elem("svg", args, con);
export const $table = (args, con) => $elem("table", args, con);
export const $tbody = (args, con) => $elem("tbody", args, con);
export const $td = (args, con) => $elem("td", args, con);
export const $template = (args, con) => $elem("template", args, con);
export const $textarea = (args, con) => $elem("textarea", args, con);
export const $tfoot = (args, con) => $elem("tfoot", args, con);
export const $th = (args, con) => $elem("th", args, con);
export const $thead = (args, con) => $elem("thead", args, con);
export const $time = (args, con) => $elem("time", args, con);
export const $title = (args, con) => $elem("title", args, con);
export const $tr = (args, con) => $elem("tr", args, con);
export const $track = (args, con) => $elem("track", args, con);
export const $tt = (args, con) => $elem("tt", args, con);
export const $u = (args, con) => $elem("u", args, con);
export const $ul = (args, con) => $elem("ul", args, con);
export const $var = (args, con) => $elem("var", args, con);
export const $video = (args, con) => $elem("video", args, con);
export const $wbr = (args, con) => $elem("wbr", args, con);
