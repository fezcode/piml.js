# piml.js

`piml.js` is a JavaScript library that provides functionality to parse and stringify data to and from the PIML (Parenthesis Intended Markup Language) format. PIML is a human-readable, indentation-based data serialization format designed for configuration files and simple data structures.

## Features

-   **Intuitive Syntax:** Easy-to-read key-value pairs, supporting nested structures.
-   **Primitive Types:** Supports strings, numbers, and booleans.
-   **Complex Types:** Handles objects and arrays.
-   **Nil Handling:** Explicitly represents `null`.
-   **Multi-line Strings:** Supports multi-line string values with indentation.
-   **Comments:** Allows single-line and inline comments using `#`.
-   **Date Support:** Stringifies and parses `Date` objects using ISO 8601 format.

## PIML Format Overview

PIML uses a simple key-value structure. Keys are enclosed in parentheses `()`, and values follow. Indentation defines nesting.

```piml
(site_name) PIML Demo
(port) 8080
(is_production) false
(version) 1.2

(database)
  (host) localhost
  (port) 5432

(admins)
  > (item)
    (id) 1
    (name) Alice
  > (item)
    (id) 2
    (name) Bob

(features)
  > auth
  > logging
  > metrics

(description)
  This is a sample product description.
  It spans multiple lines.

  With an empty line in between.

(metadata)
(related_ids) nil
```

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