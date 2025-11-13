class Piml {
    constructor() {
        this.indentLevel = -1
    }

    stringify(obj) {
        return this.encodeValue(obj, -1, false)
    }

    encodeValue(value, indent, inArray) {
        if (value === null || value === undefined) {
            if (inArray) {
                return null
            }
            return " nil\n"
        }

        let indentStr = ""
        if (indent > 0) {
            indentStr = "  ".repeat(indent)
        }

        const type = typeof value
        if (type === "object") {
            if (Array.isArray(value)) {
                let result = ""
                if (!inArray) {
                    result += "\n"
                }
                result += this.encodeSlice(value, indent + 1)
                return result
            }

            if (value instanceof Date) {
                const s = value.toISOString()
                if (inArray) {
                    return `${indentStr}> ${s}\n`
                }
                return ` ${s}\n`
            }

            if (inArray) {
                let itemName = "item"
                let result = `${indentStr}> (${itemName})\n`
                result += this.encodeStruct(value, indent)
                return result
            } else {
                let result = ""
                if (indent > -1) {
                    result += "\n"
                }
                result += this.encodeStruct(value, indent)
                return result
            }
        } else if (
            type === "string" ||
            type === "number" ||
            type === "boolean"
        ) {
            const s = String(value)
            if (s.includes('\n')) {
                const lines = s.split('\n');
                let result = '\n';
                const multiLineIndentStr = "  ".repeat(indent + 1);
                for (const line of lines) {
                    result += `${multiLineIndentStr}${line}\n`;
                }
                return result;
            }
            if (inArray) {
                return `${indentStr}> ${s}\n`
            }
            return ` ${s}\n`
        } else {
            throw new Error(`Unsupported type: ${type}`)
        }
    }

    encodeStruct(obj, indent) {
        let result = ""
        const fieldIndent = indent + 1
        let indentStr = ""
        if (fieldIndent > 0) {
            indentStr = "  ".repeat(fieldIndent)
        }

        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = obj[key]
                result += `${indentStr}(${key})`
                result += this.encodeValue(value, fieldIndent, false)
            }
        }
        return result
    }

    encodeSlice(arr, indent) {
        if (arr.length === 0) {
            return ""
        }

        let result = ""
        for (const item of arr) {
            result += this.encodeValue(item, indent, true)
        }
        return result
    }

    parse(pimlString) {
        const lines = pimlString.split('\n');
        const root = {};
        const stack = [{ indent: -1, obj: root }];

        let i = 0;
        while (i < lines.length) {
            let line = lines[i];
            const commentIndex = line.indexOf('#');
            if (commentIndex !== -1) {
                line = line.substring(0, commentIndex);
            }
            const trimmedLine = line.trim();

            if (trimmedLine === '') {
                i++;
                continue;
            }

            const indent = line.length - line.trimStart().length;

            while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
                stack.pop();
            }

            const parent = stack[stack.length - 1].obj;

            if (trimmedLine.startsWith('>')) {
                const valueStr = trimmedLine.substring(1).trim();
                if (valueStr.startsWith('(')) {
                    const newObj = {};
                    if (!Array.isArray(parent)) {
                        i++;
                        continue;
                    }
                    parent.push(newObj);
                    stack.push({ indent: indent, obj: newObj });
                    i++;
                } else {
                    if (!Array.isArray(parent)) {
                        i++;
                        continue;
                    }
                    parent.push(this.parseValue(valueStr));
                    i++;
                }
            } else if (trimmedLine.startsWith('(')) {
                const keyMatch = trimmedLine.match(/^\((.*?)\)(.*)/);
                if (!keyMatch) {
                    i++;
                    continue;
                }
                const key = keyMatch[1];
                const valueStr = keyMatch[2].trim();

                if (valueStr === '') {
                    let j = i + 1;
                    let nextLine = j < lines.length ? lines[j] : '';
                    let nextIndent = nextLine.length - nextLine.trimStart().length;

                    if (j < lines.length && nextIndent > indent) {
                        if (nextLine.trim().startsWith('>')) {
                            const newArr = [];
                            parent[key] = newArr;
                            stack.push({ indent: indent, obj: newArr });
                        } else if (nextLine.trim().startsWith('(')) {
                            const newObj = {};
                            parent[key] = newObj;
                            stack.push({ indent: indent, obj: newObj });
                        } else {
                            const multiLineParts = [];
                            while (j < lines.length && (lines[j].length - lines[j].trimStart().length > indent || lines[j].trim() === '')) {
                                if (lines[j].trim() !== '') {
                                    multiLineParts.push(lines[j].substring(indent + 2));
                                }
                                j++;
                            }
                            parent[key] = multiLineParts.join('\n');
                            i = j - 1;
                        }
                    } else {
                        parent[key] = '';
                    }
                    i++;
                } else {
                    parent[key] = this.parseValue(valueStr);
                    i++;
                }
            } else {
                i++;
            }
        }

        return root;
    }

    parseValue(valueStr) {
        if (valueStr === 'nil') {
            return null;
        }
        if (!isNaN(valueStr) && valueStr.trim() !== '') {
            return Number(valueStr);
        }
        if (valueStr === 'true') {
            return true;
        }
        if (valueStr === 'false') {
            return false;
        }
        return valueStr;
    }

}

const piml = new Piml()

module.exports = {
    Piml,
    stringify: piml.stringify.bind(piml),
    parse: piml.parse.bind(piml),
}