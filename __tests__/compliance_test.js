const fs = require('fs');
const path = require('path');
const { stringify, parse } = require("../piml.js");

// The compliance suite lives in the piml spec repository and is shared by
// every implementation. It is expected as a sibling checkout; the tests
// are skipped when it is not present.
const complianceTestsPath = path.join(__dirname, '../../piml/tests/compliance.json');

const available = fs.existsSync(complianceTestsPath);
const suite = available ? JSON.parse(fs.readFileSync(complianceTestsPath, 'utf8')) : { tests: [], errors: [] };
const d = available ? describe : describe.skip;

d("PIML compliance suite", () => {
    describe("valid documents", () => {
        suite.tests.forEach(testCase => {
            it(testCase.name, () => {
                // Schemaless parse must produce the expected JSON value.
                const parsed = parse(testCase.piml);
                expect(parsed).toEqual(testCase.json);

                // Round-trip: stringify the parsed value and parse again.
                const roundTripped = parse(stringify(parsed));
                expect(roundTripped).toEqual(testCase.json);
            });
        });
    });

    describe("invalid documents", () => {
        suite.errors.forEach(testCase => {
            it(testCase.name, () => {
                expect(() => parse(testCase.piml)).toThrow();
            });
        });
    });
});
