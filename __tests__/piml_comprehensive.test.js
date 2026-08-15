const { stringify, parse } = require("../piml.js")

describe("Piml Comprehensive Tests", () => {
    describe("Date Handling", () => {
        it("should stringify Date objects as ISO strings (dates are strings by convention)", () => {
            const date = new Date("2023-11-10T15:30:00.000Z");
            const obj = { timestamp: date };
            const pimlStr = stringify(obj);
            const parsed = parse(pimlStr);
            // Per spec v1.2.0, parsers must not auto-convert date strings.
            expect(typeof parsed.timestamp).toBe("string");
            expect(parsed.timestamp).toBe(date.toISOString());
        });
    });

    describe("Empty Structures", () => {
        it("should round-trip empty arrays to null (spec compliance)", () => {
            const obj = { list: [] };
            const pimlStr = stringify(obj);
            const parsed = parse(pimlStr);
            expect(parsed.list).toBeNull();
        });

        it("should round-trip empty objects to null (spec compliance)", () => {
            const obj = { meta: {} };
            const pimlStr = stringify(obj);
            const parsed = parse(pimlStr);
            expect(parsed.meta).toBeNull();
        });
    });

    describe("Type Safety", () => {
        it("should round-trip the string 'true' via quoting", () => {
            const obj = { val: "true" };
            const pimlStr = stringify(obj);
            expect(pimlStr).toContain('"true"');
            const parsed = parse(pimlStr);
            expect(parsed.val).toBe("true");
        });

        it("should round-trip the string '123' via quoting", () => {
            const obj = { val: "123" };
            const pimlStr = stringify(obj);
            expect(pimlStr).toContain('"123"');
            const parsed = parse(pimlStr);
            expect(parsed.val).toBe("123");
        });

        it("should keep unquoted numbers and booleans typed", () => {
            const parsed = parse("(a) 123\n(b) true\n(c) 1.5");
            expect(parsed).toEqual({ a: 123, b: true, c: 1.5 });
        });
    });
});
