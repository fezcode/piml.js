// piml.js — encoder/decoder for PIML (Parenthesis Intended Markup Language)
// Implements PIML spec v1.2.0: https://github.com/fezcode/piml

class PimlSyntaxError extends Error {
    constructor(message, line) {
        super(line ? `${message} (line ${line})` : message);
        this.name = "PimlSyntaxError";
        this.line = line;
    }
}

// Type inference patterns, per spec v1.2.0.
const INT_RE = /^-?(0|[1-9][0-9]*)$/;
const FLOAT_RE = /^-?(0|[1-9][0-9]*)\.[0-9]+$/;

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

// scan splits the input into significant lines. Tabs in indentation are
// rejected; comment lines (first non-space char is '#') are dropped; a
// trailing '\r' is stripped from every line. Blank lines are kept because
// multi-line string blocks preserve them.
function scan(input) {
    const rawLines = String(input).split("\n");
    const lines = [];
    for (let i = 0; i < rawLines.length; i++) {
        const num = i + 1;
        let l = rawLines[i];
        if (l.endsWith("\r")) l = l.slice(0, -1);
        if (l.trim() === "") {
            lines.push({ indent: 0, text: "", blank: true, num });
            continue;
        }
        let indent = 0;
        while (indent < l.length) {
            if (l[indent] === " ") {
                indent++;
                continue;
            }
            if (l[indent] === "\t") {
                throw new PimlSyntaxError("tabs are not allowed in indentation", num);
            }
            break;
        }
        const text = l.slice(indent);
        if (text[0] === "#") continue; // full-line comment, at any indentation
        lines.push({ indent, text, blank: false, num });
    }
    return lines;
}

// parseScalar interprets everything after "(key)" or ">" on a line:
// quoting, inline comments, and the \# escape.
function parseScalar(rest, num) {
    let s = rest.trim();
    if (s === "") return { text: "", quoted: false, empty: true };

    if (s[0] === '"') {
        // A value is quoted only when the quotes cleanly wrap it: the LAST
        // '"' on the line is followed by nothing but whitespace or an
        // inline comment. Anything else falls through and the value is
        // ordinary literal text, quotes included.
        const last = s.lastIndexOf('"');
        if (last > 0) {
            const tail = s.slice(last + 1);
            const trimmed = tail.trim();
            if (trimmed === "" || (trimmed.startsWith("#") && tail.length > trimmed.length)) {
                return { text: s.slice(1, last), quoted: true, empty: false };
            }
        }
    }

    if (s[0] === "#") return { text: "", quoted: false, empty: true };

    // Inline comment: '#' preceded by whitespace. '\#' never matches
    // because its preceding character is a backslash.
    for (let i = 1; i < s.length; i++) {
        if (s[i] === "#" && (s[i - 1] === " " || s[i - 1] === "\t")) {
            s = s.slice(0, i).replace(/[ \t]+$/, "");
            break;
        }
    }
    s = s.split("\\#").join("#");
    if (s === "") return { text: "", quoted: false, empty: true };
    return { text: s, quoted: false, empty: false };
}

// scalarValue applies the spec's schemaless type inference.
function scalarValue(scalar) {
    if (scalar.quoted) return scalar.text;
    const s = scalar.text;
    if (s === "nil") return null;
    if (s === "true") return true;
    if (s === "false") return false;
    if (INT_RE.test(s) || FLOAT_RE.test(s)) return Number(s);
    return s;
}

// unescapeContentLine removes the positional escapes from a multi-line
// content line: \# anywhere a line starts, and \( / \> on the first line.
function unescapeContentLine(content, firstLine) {
    let i = 0;
    while (i < content.length && content[i] === " ") i++;
    const rest = content.slice(i);
    if (rest.startsWith("\\#")) return content.slice(0, i) + rest.slice(1);
    if (firstLine && (rest.startsWith("\\(") || rest.startsWith("\\>"))) {
        return content.slice(0, i) + rest.slice(1);
    }
    return content;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

class Parser {
    constructor(lines) {
        this.lines = lines;
        this.pos = 0;
    }

    peek() {
        return this.pos < this.lines.length ? this.lines[this.pos] : null;
    }

    consume() {
        this.pos++;
    }

    nextContentLine(from = this.pos) {
        for (let i = from; i < this.lines.length; i++) {
            if (!this.lines[i].blank) return this.lines[i];
        }
        return null;
    }

    // parseObject reads key lines at exactly `indent`.
    parseObject(indent) {
        const obj = {};
        const seen = new Set();

        for (;;) {
            const line = this.peek();
            if (line === null) return obj;
            if (line.blank) {
                this.consume();
                continue;
            }
            if (line.indent < indent) return obj;
            if (line.indent > indent) {
                throw new PimlSyntaxError(
                    `unexpected indentation, expected ${indent} spaces, got ${line.indent}`, line.num);
            }

            if (line.text[0] !== "(") {
                throw new PimlSyntaxError(`expected (key), got ${JSON.stringify(line.text)}`, line.num);
            }
            const closeParen = line.text.indexOf(")");
            if (closeParen === -1) {
                throw new PimlSyntaxError("invalid key format, missing ')'", line.num);
            }
            const key = line.text.slice(1, closeParen);
            if (key === "") throw new PimlSyntaxError("empty key", line.num);
            if (key.includes("(")) {
                throw new PimlSyntaxError(`key ${JSON.stringify(key)} contains '('`, line.num);
            }
            if (seen.has(key)) {
                throw new PimlSyntaxError(`duplicate key ${JSON.stringify(key)}`, line.num);
            }
            seen.add(key);

            const val = parseScalar(line.text.slice(closeParen + 1), line.num);
            this.consume();

            if (!val.empty) {
                const next = this.nextContentLine();
                if (next !== null && next.indent > indent) {
                    throw new PimlSyntaxError(
                        `key ${JSON.stringify(key)} has both a value and an indented block`, next.num);
                }
                obj[key] = scalarValue(val);
            } else {
                obj[key] = this.parseBlock(indent);
            }
        }
    }

    // parseBlock handles a bare key (or bare '>'): the first content line
    // of the following block decides its type.
    parseBlock(keyIndent) {
        const next = this.nextContentLine();
        if (next === null || next.indent <= keyIndent) return null;
        if (next.indent !== keyIndent + 2) {
            throw new PimlSyntaxError(
                `expected ${keyIndent + 2} spaces of indentation, got ${next.indent}`, next.num);
        }
        if (next.text.startsWith("\\(") || next.text.startsWith("\\>")) {
            return this.parseMultiline(keyIndent);
        }
        if (next.text[0] === "(") return this.parseObject(keyIndent + 2);
        if (next.text[0] === ">") return this.parseArray(keyIndent + 2);
        return this.parseMultiline(keyIndent);
    }

    // parseArray reads '>' item lines at exactly `indent`.
    parseArray(indent) {
        const arr = [];

        for (;;) {
            const line = this.peek();
            if (line === null) return arr;
            if (line.blank) {
                this.consume();
                continue;
            }
            if (line.indent < indent) return arr;
            if (line.indent > indent) {
                throw new PimlSyntaxError("unexpected indentation in array", line.num);
            }
            if (line.text[0] !== ">") {
                throw new PimlSyntaxError(`expected array item '>', got ${JSON.stringify(line.text)}`, line.num);
            }

            const val = parseScalar(line.text.slice(1), line.num);

            if (!val.empty) {
                // "> (label)" followed by a deeper block is an object item;
                // the label is metadata and is ignored.
                const isLabel = !val.quoted && val.text.length > 2 &&
                    val.text[0] === "(" && val.text.indexOf(")") === val.text.length - 1;
                if (isLabel) {
                    const next = this.nextContentLine(this.pos + 1);
                    if (next !== null && next.indent > indent) {
                        this.consume();
                        arr.push(this.parseObject(indent + 2));
                        continue;
                    }
                }
                this.consume();
                const next = this.nextContentLine();
                if (next !== null && next.indent > indent) {
                    throw new PimlSyntaxError("array item has both a value and an indented block", next.num);
                }
                arr.push(scalarValue(val));
            } else {
                this.consume();
                arr.push(this.parseBlock(indent));
            }
        }
    }

    // parseMultiline reads a multi-line string block owned by a key or item
    // at keyIndent. Base indent is keyIndent + 2; deeper indentation is
    // content; interior blanks are preserved; the end of the value is
    // trimmed of trailing whitespace.
    parseMultiline(keyIndent) {
        const base = keyIndent + 2;
        const parts = [];
        let pendingBlanks = 0;
        let started = false;

        for (;;) {
            const line = this.peek();
            if (line === null) break;
            if (line.blank) {
                this.consume();
                if (started) pendingBlanks++;
                continue;
            }
            if (line.indent <= keyIndent) break;
            if (line.indent < base) {
                throw new PimlSyntaxError("multi-line string content indented less than its base", line.num);
            }
            this.consume();

            let content = " ".repeat(line.indent - base) + line.text;
            content = unescapeContentLine(content, !started);

            for (; pendingBlanks > 0; pendingBlanks--) parts.push("");
            parts.push(content);
            started = true;
        }

        return parts.join("\n").replace(/[ \t]+$/, "");
    }
}

function parse(pimlString) {
    const p = new Parser(scan(pimlString));
    // The document root is an implicit object at indentation level 0.
    return p.parseObject(0);
}

// ---------------------------------------------------------------------------
// Stringifying
// ---------------------------------------------------------------------------

function indentOf(level) {
    return level <= 0 ? "" : "  ".repeat(level);
}

// needsQuoting reports whether a single-line string value must be quoted
// to parse back as the same string.
function needsQuoting(s) {
    if (s === "") return true;
    if (s !== s.trim()) return true;
    if (s === "nil" || s === "true" || s === "false") return true;
    if (INT_RE.test(s) || FLOAT_RE.test(s)) return true;
    if (s[0] === '"' || s[0] === "#") return true;
    if (s.includes("\\#")) return true;
    for (let i = 1; i < s.length; i++) {
        if (s[i] === "#" && (s[i - 1] === " " || s[i - 1] === "\t")) return true;
    }
    return false;
}

// escapeContentLine applies the positional escapes a multi-line content
// line needs: a leading '#' always, a leading '(' or '>' on the first line.
function escapeContentLine(line, firstLine) {
    let i = 0;
    while (i < line.length && line[i] === " ") i++;
    const rest = line.slice(i);
    if (rest.startsWith("#")) return line.slice(0, i) + "\\" + rest;
    if (firstLine && (rest.startsWith("(") || rest.startsWith(">"))) {
        return line.slice(0, i) + "\\" + rest;
    }
    return line;
}

function isNilOrEmpty(value) {
    if (value === null || value === undefined) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (value instanceof Date) return false;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
}

function encodeString(s, indent, inArray) {
    const indentStr = indentOf(indent);

    if (s.includes("\n")) {
        // --- Multi-line string block ---
        let result = inArray ? `${indentStr}>\n` : "\n";
        const lineIndentStr = indentOf(indent + 1);
        const lines = s.split("\n");
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === "") {
                result += "\n";
                continue;
            }
            result += `${lineIndentStr}${escapeContentLine(lines[i], i === 0)}\n`;
        }
        return result;
    }

    // --- Single-line string ---
    const out = needsQuoting(s) ? `"${s}"` : s;
    return inArray ? `${indentStr}> ${out}\n` : ` ${out}\n`;
}

function encodeValue(value, indent, inArray) {
    const indentStr = indentOf(indent);

    if (isNilOrEmpty(value)) {
        return inArray ? `${indentStr}> nil\n` : " nil\n";
    }

    if (value instanceof Date) {
        const s = value.toISOString();
        return inArray ? `${indentStr}> ${s}\n` : ` ${s}\n`;
    }

    if (Array.isArray(value)) {
        // A nested list inside an array: bare '>' with items one level deeper.
        let result = inArray ? `${indentStr}>\n` : "\n";
        for (const item of value) {
            result += encodeValue(item, indent + 1, true);
        }
        return result;
    }

    const type = typeof value;

    if (type === "object") {
        let result;
        if (inArray) {
            // The label is readability metadata; parsers ignore it.
            result = `${indentStr}> (item)\n`;
        } else {
            result = indent > -1 ? "\n" : "";
        }
        result += encodeFields(value, indent);
        return result;
    }

    if (type === "string") {
        return encodeString(value, indent, inArray);
    }

    if (type === "number") {
        if (!Number.isFinite(value)) {
            throw new Error(`piml: cannot stringify non-finite number: ${value}`);
        }
        const s = String(value);
        return inArray ? `${indentStr}> ${s}\n` : ` ${s}\n`;
    }

    if (type === "boolean") {
        const s = value ? "true" : "false";
        return inArray ? `${indentStr}> ${s}\n` : ` ${s}\n`;
    }

    throw new Error(`piml: unsupported type: ${type}`);
}

// encodeFields writes the keys of an object; `indent` is the level of the
// object's own key line, fields go one level deeper.
function encodeFields(obj, indent) {
    const fieldIndent = indent + 1;
    const indentStr = indentOf(fieldIndent);
    let result = "";
    for (const key of Object.keys(obj)) {
        if (key === "" || key.includes("(") || key.includes(")")) {
            throw new Error(`piml: key ${JSON.stringify(key)} may not be empty or contain parentheses`);
        }
        result += `${indentStr}(${key})`;
        result += encodeValue(obj[key], fieldIndent, false);
    }
    return result;
}

function stringify(obj) {
    return encodeValue(obj, -1, false);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

// Piml class kept for backwards compatibility with the pre-1.2.0 API.
class Piml {
    parse(pimlString) {
        return parse(pimlString);
    }

    stringify(obj) {
        return stringify(obj);
    }
}

module.exports = {
    Piml,
    PimlSyntaxError,
    stringify,
    parse,
};
