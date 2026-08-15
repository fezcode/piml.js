const { stringify, parse } = require("../piml.js");

describe("Piml Large Scale & Performance Tests", () => {
    
    // Helper to generate a large random object
    function generateLargeObject(size = 1000) {
        const result = {
            id: "root",
            createdAt: "2026-08-15T12:00:00.000Z",
            items: []
        };

        for (let i = 0; i < size; i++) {
            result.items.push({
                index: i,
                active: i % 2 === 0,
                score: (i * 997 % 100000) / 100,
                name: `Item ${i}`,
                description: `This is item number ${i}.\nIt has some multiline text.\n# And a fake comment line.`,
                tags: ["tag1", "tag2", "complex tag with spaces"],
                meta: {
                    x: i * 2,
                    y: i * 3,
                    flag: i % 5 === 0 ? "special" : null
                }
            });
        }
        return result;
    }

    // Helper for deep nesting
    function generateDeepObject(depth = 100) {
        let root = { level: 0, leaf: "start" };
        let current = root;
        for (let i = 1; i <= depth; i++) {
            current.next = { level: i, padding: "some string data" };
            current = current.next;
        }
        current.leaf = "end";
        return root;
    }

    test("should round-trip a large array of objects (1000 items)", () => {
        const largeObj = generateLargeObject(1000);
        
        const startStringify = performance.now();
        const pimlString = stringify(largeObj);
        const endStringify = performance.now();
        
        const startParse = performance.now();
        const parsedObj = parse(pimlString);
        const endParse = performance.now();

        console.log(`Stringify (1000 items): ${(endStringify - startStringify).toFixed(2)}ms`);
        console.log(`Parse (1000 items): ${(endParse - startParse).toFixed(2)}ms`);

        expect(parsedObj).toEqual(largeObj);
    });

    test("should round-trip a deeply nested object (Depth 200)", () => {
        const deepObj = generateDeepObject(200);
        
        const startStringify = performance.now();
        const pimlString = stringify(deepObj);
        const endStringify = performance.now();
        
        const startParse = performance.now();
        const parsedObj = parse(pimlString);
        const endParse = performance.now();

        console.log(`Stringify (Depth 200): ${(endStringify - startStringify).toFixed(2)}ms`);
        console.log(`Parse (Depth 200): ${(endParse - startParse).toFixed(2)}ms`);

        expect(parsedObj).toEqual(deepObj);
    });

    test("should round-trip a wide object (2000 keys)", () => {
        const wideObj = {};
        for(let i=0; i<2000; i++) {
            wideObj[`key_${i}`] = `value_${i}`;
        }
        
        const startStringify = performance.now();
        const pimlString = stringify(wideObj);
        const endStringify = performance.now();
        
        const startParse = performance.now();
        const parsedObj = parse(pimlString);
        const endParse = performance.now();

        console.log(`Stringify (2000 keys): ${(endStringify - startStringify).toFixed(2)}ms`);
        console.log(`Parse (2000 keys): ${(endParse - startParse).toFixed(2)}ms`);

        expect(parsedObj).toEqual(wideObj);
    });
});
