# piml.js

`piml.js` is a JavaScript library that provides functionality to parse and stringify data to and from the PIML (Parenthesis Intended Markup Language) format. PIML is a human-readable, indentation-based data serialization format designed for configuration files and simple data structures.

Implements **PIML spec v1.2.0** — see the [spec repository](https://github.com/fezcode/piml). Conformance is verified against the shared compliance suite.

## Features

-   **Intuitive Syntax:** Easy-to-read key-value pairs, supporting nested structures.
-   **Type Inference:** Unquoted values become numbers, booleans, or `null` per the spec's rules; everything else is a string.
-   **Quoted Strings:** `(zip) "08080"` forces a string where inference would produce another type; `stringify` quotes automatically when needed.
-   **Complex Types:** Handles objects, arrays, nested lists, and multi-line strings inside arrays.
-   **Nil Handling:** `nil` (and bare keys) represent `null`, empty arrays, and empty objects.
-   **Multi-line Strings:** Base indent is key + 2; deeper indentation is preserved; the end of the value is trimmed.
-   **Comments:** Full-line comments (`#` at line start, any indentation) and inline comments (whitespace + `#`). A `#` glued to text is literal; escape with `\#` where needed.
-   **Strict Indentation:** Exactly 2 spaces per level; tabs, skipped levels, and duplicate keys throw `PimlSyntaxError`.
-   **Date Stringifying:** `Date` objects stringify as ISO 8601 strings. Per the spec, `parse` returns them as strings — dates are a convention, not a type.

## PIML Format Overview

PIML uses a simple key-value structure. Keys are enclosed in parentheses `()`, and values follow. Indentation defines nesting: exactly 2 spaces per level.

### Comments

```piml
# This is a full-line comment
(host) localhost # inline comment; the value is "localhost"
(url) https://x.com/a#b # a glued hash is literal
(note) five \# six # escaped: the value is "five # six"
```

### Quoting

```piml
(port) 8080          # number 8080
(zip)  "08080"       # string "08080"
(word) "true"        # string "true"
```

### Multi-line Strings

```piml
(description)
  This is a multi-line string.
  \# An escaped hash line; unescaped it would be a dropped comment.

  Interior blank lines are preserved; trailing whitespace is trimmed.
```

### Breaking changes in v1.2.0

-   Inline comments are now stripped from values.
-   Duplicate keys, tabs, and non-2-space indentation now throw.
-   A bare `(key)` parses as `null` instead of `""`.
-   ISO date strings are no longer auto-converted to `Date` objects.
-   The out-of-spec `{}` / `[]` literals are no longer recognized.
-   `"123"` now round-trips as a string (previously collapsed to a number).

## Installation

To use `piml.js` in your Node.js project, simply run:

```bash
npm install piml
```

## Usage

### Stringifying JavaScript Objects to PIML

```javascript
const { Piml } = require('piml');

const piml = new Piml();

const cfg = {
    site_name: "My Awesome Site",
    port: 8080,
    is_production: true,
    admins: [
        { id: 1, name: "Admin One" },
        { id: 2, name: "Admin Two" },
    ],
    last_updated: new Date("2023-11-10T15:30:00Z"),
    description: "This is a multi-line\ndescription for the site.",
};

const pimlData = piml.stringify(cfg);
console.log(pimlData);
```

Output:

```piml
(site_name) My Awesome Site
(port) 8080
(is_production) true
(admins)
  > (item)
    (id) 1
    (name) Admin One
  > (item)
    (id) 2
    (name) Admin Two
(last_updated) 2023-11-10T15:30:00.000Z
(description)
  This is a multi-line
  description for the site.
```

### Parsing PIML to JavaScript Objects

```javascript
const { Piml } = require('piml');

const piml = new Piml();

const pimlData = `
(site_name) My Awesome Site
(port) 8080
(is_production) true
(admins)
  > (item)
    (id) 1
    (name) Admin One
  > (item)
    (id) 2
    (name) Admin Two
(last_updated) 2023-11-10T15:30:00Z
(description)
  This is a multi-line
  description for the site.
`;

const cfg = piml.parse(pimlData);
console.log(cfg);
```

Output:

```json
{
  "site_name": "My Awesome Site",
  "port": 8080,
  "is_production": true,
  "admins": [
    {
      "id": 1,
      "name": "Admin One"
    },
    {
      "id": 2,
      "name": "Admin Two"
    }
  ],
  "last_updated": "2023-11-10T15:30:00Z",
  "description": "This is a multi-line\ndescription for the site."
}
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.