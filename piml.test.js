const { stringify, parse } = require("./piml.js")

describe("Piml", () => {
    describe("stringify", () => {
        it("should stringify a simple object", () => {
            const obj = {
                site_name: "PIML Demo",
                port: 8080,
                is_production: false,
                version: 1.2,
            }
            const expected = `
(site_name) PIML Demo
(port) 8080
(is_production) false
(version) 1.2
`
            expect(stringify(obj).trim()).toBe(expected.trim())
        })

        it("should handle null and undefined values", () => {
            const obj = {
                admin: null,
                features: [],
                aliases: undefined,
                site_name: "Test",
            }
            const expected = `
(admin) nil
(features)
(aliases) nil
(site_name) Test
`
            expect(stringify(obj).trim()).toBe(expected.trim())
        })

        it("should stringify a complex object", () => {
            const obj = {
                description: "This is a\nmulti-line description.",
                database: {
                    host: "localhost",
                    port: 5432,
                },
                admins: [
                    { id: 1, name: "Alice" },
                    { id: 2, name: "Bob" },
                ],
                features: ["auth", "logging", "metrics"],
            }
            const expected = `
(description)
  This is a
  multi-line description.
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
`
            expect(stringify(obj).trim()).toBe(expected.trim())
        })

        it("should stringify a multiline string", () => {
            const obj = {
                message: "Hello\nWorld",
            };
            const expected = `
(message)
  Hello
  World
`;
            expect(stringify(obj).trim()).toBe(expected.trim());
        });
    })

    describe("parse", () => {
        it("should parse a simple PIML string", () => {
            const pimlString = `
(site_name) PIML Demo
(port) 8080
(is_production) false
(version) 1.2
`
            const expected = {
                site_name: "PIML Demo",
                port: 8080,
                is_production: false,
                version: 1.2,
            }
            expect(parse(pimlString)).toEqual(expected)
        })

        it("should handle nil values", () => {
            const pimlString = `
(admin) nil
(features) nil
(aliases) nil
(site_name) Test
`
            const expected = {
                admin: null,
                features: null,
                aliases: null,
                site_name: "Test",
            }
            expect(parse(pimlString)).toEqual(expected)
        })

        it("should be semantically equivalent to JSON", () => {
            const pimlData = `
(id) 12345
(title) Moderately Complex JSON Example
(is_published) true
(last_updated) nil
(product manager) Alice Smith
(description)
  This is a sample product.
  It includes various data types
  to demonstrate PIML conversion.
(author)
  (name) Bob Johnson
  (email) bob.j@example.com
(tags)
  > json
  > piml
  > example
(revisions)
  > (item)
    (timestamp) 2023-10-27T10:00:00Z
    (notes) Initial draft.
  > (item)
    (timestamp) 2023-10-28T14:30:00Z
    (notes) Added author info and tags.
(metadata) nil
(related_ids) nil
`
            const jsonData = `
{
  "id": 12345,
  "title": "Moderately Complex JSON Example",
  "is_published": true,
  "last_updated": null,
  "product manager": "Alice Smith",
  "description": "This is a sample product.\\nIt includes various data types\\nto demonstrate PIML conversion.",
  "author": {
    "name": "Bob Johnson",
    "email": "bob.j@example.com"
  },
  "tags": [
    "json",
    "piml",
    "example"
  ],
  "revisions": [
    {
      "timestamp": "2023-10-27T10:00:00Z",
      "notes": "Initial draft."
    },
    {
      "timestamp": "2023-10-28T14:30:00Z",
      "notes": "Added author info and tags."
    }
  ],
  "metadata": {},
  "related_ids": []
}
`
            const pimlObject = parse(pimlData)
            const jsonObject = JSON.parse(jsonData)

            // Normalize pimlObject to match jsonObject
            if (pimlObject.metadata === null) {
                pimlObject.metadata = {}
            }
            if (pimlObject.related_ids === null) {
                pimlObject.related_ids = []
            }
            if (pimlObject.revisions) {
                pimlObject.revisions = pimlObject.revisions.map(r => r.item || r);
            }


            expect(pimlObject).toEqual(jsonObject)
        })

        it("should handle maps", () => {
            const pimlString = `
(headers)
  (Content-Type) application/piml
  (X-Test) true
`
            const expected = {
                headers: {
                    "Content-Type": "application/piml",
                    "X-Test": true,
                },
            }
            expect(parse(pimlString)).toEqual(expected)
        })

        it("should handle deeply nested objects", () => {
            const pimlString = `
(level1)
  (level2)
    (level3)
      (name) Deep
`
            const expected = {
                level1: {
                    level2: {
                        level3: {
                            name: "Deep",
                        },
                    },
                },
            }
            expect(parse(pimlString)).toEqual(expected)
        })

        it("should handle comments", () => {
            const pimlString = `
# This is a full-line comment
(host) localhost # This is an inline comment
# Another comment
(port) 5432
(description)
  This is a multi-line string. # Comments are allowed here
  # And on their own line.
  Even with weird indentation.
`
            const expected = {
                host: "localhost",
                port: 5432,
                description: "This is a multi-line string. # Comments are allowed here\n# And on their own line.\nEven with weird indentation.",
            }
            expect(parse(pimlString)).toEqual(expected)
        })

        it("should empty lines in multiline comments", () => {
            const pimlString = `
# This is a full-line comment
(host) localhost # This is an inline comment
# Another comment
(port) 5432
(description)
  First line.
  
  Third line.
`
            const expected = {
                host: "localhost",
                port: 5432,
                description: "First line.\nThird line.",
            }
            expect(parse(pimlString)).toEqual(expected)
        })

        it("should handle keys with spaces", () => {
            const pimlString = `
(first name) John
(last name) Doe
`
            const expected = {
                "first name": "John",
                "last name": "Doe",
            }
            expect(parse(pimlString)).toEqual(expected)
        })

        it("should parse a complex PIML string", () => {
            const pimlString = `
(description)
  This is a multi-line
  description for the site.
(database)
  (host) localhost
  (port) 5432
(admins)
  > (User)
    (id) 1
    (name) Admin One
  > (User)
    (id) 2
    (name) Admin Two
(features)
  > auth
  > logging
  > metrics
`
            const expected = {
                description: "This is a multi-line\ndescription for the site.",
                database: {
                    host: "localhost",
                    port: 5432,
                },
                admins: [
                    { id: 1, name: "Admin One" },
                    { id: 2, name: "Admin Two" },
                ],
                features: ["auth", "logging", "metrics"],
            }
            expect(parse(pimlString)).toEqual(expected)
        })
    })
})