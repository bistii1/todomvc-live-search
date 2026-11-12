// Standalone sanity check for the search feature: `node search-check.mjs`.
// It loads the DOM-free modules as source, so it needs no bundler, no DOM and
// no extra dependency. The todo order below is storage order, since the fake
// view skips Template.show (which reverses the list for rendering).
import { readFileSync } from "node:fs";

const strip = (file) =>
    readFileSync(new URL(`./src/${file}`, import.meta.url), "utf8")
        .replace(/^export default .*;$/gm, "")
        .replace(/^export class/gm, "class");

const harness = `
const log = [];
const view = {
    entries: [],
    status: "",
    cleared: 0,
    bindCallback() {},
    render(cmd, param) {
        if (cmd === "showEntries") view.entries = param.map((t) => t.title);
        if (cmd === "searchFeedback") view.status = new Template().searchStatus(param.query, param.matched, param.total);
        if (cmd === "clearSearch") view.cleared++;
    },
};
const model = new Model(new Store("check"));
const controller = new Controller(model, view);

const assert = (name, actual, expected) => {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    log.push(\`\${ok ? "PASS" : "FAIL"} \${name}\${ok ? "" : \` -> got \${JSON.stringify(actual)} want \${JSON.stringify(expected)}\`}\`);
};

const idOf = (title) => {
    let found;
    model.read((data) => { found = data.find((t) => t.title === title); });
    return found.id;
};
const counts = () => { let stats; model.getCount((s) => { stats = s; }); return stats; };

controller.setView("#/");
["Buy Milk", "milk the cow", "Walk dog"].forEach((t) => controller.addItem(t));

assert("no query shows all", view.entries, ["Buy Milk", "milk the cow", "Walk dog"]);
assert("no query leaves the status empty", view.status, "");

controller.search("MILK");
assert("case-insensitive substring match", view.entries, ["Buy Milk", "milk the cow"]);
assert("result count", view.status, 'Showing 2 of 3 tasks matching "MILK"');

controller.search("   milk  ");
assert("query is trimmed for matching", view.entries, ["Buy Milk", "milk the cow"]);
assert("trimmed query is echoed", view.status, 'Showing 2 of 3 tasks matching "milk"');

controller.search("zzz");
assert("no matches empties the list", view.entries, []);
assert("no matches feedback", view.status, 'No tasks match "zzz"');

controller.search("milk");
controller.setView("#/active");
assert("query survives a status switch", view.entries, ["Buy Milk", "milk the cow"]);

controller.toggleComplete(idOf("Buy Milk"), true);
assert("completing refreshes the results", view.entries, ["milk the cow"]);
assert("count is scoped to the status filter", view.status, 'Showing 1 of 2 tasks matching "milk"');

controller.setView("#/completed");
assert("completed composed with the query", view.entries, ["Buy Milk"]);
assert("singular total wording", view.status, 'Showing 1 of 1 task matching "milk"');

controller.setView("#/");
controller.addItem("Milkshake");
assert("adding refreshes the results", view.entries, ["Buy Milk", "milk the cow", "Milkshake"]);
assert("global counts ignore the query", counts(), { active: 3, completed: 1, total: 4 });

controller.editItemSave(idOf("milk the cow"), "feed the cow");
assert("edited title that stops matching drops out", view.entries, ["Buy Milk", "Milkshake"]);

controller.removeItem(idOf("Milkshake"));
assert("deleting refreshes the results", view.entries, ["Buy Milk"]);

controller.toggleAll(true);
assert("toggle-all stays global", counts(), { active: 0, completed: 3, total: 3 });

controller.removeCompletedItems();
assert("clear-completed stays global", counts(), { active: 0, completed: 0, total: 0 });
assert("feedback after everything is gone", view.status, 'No tasks match "milk"');

controller.clearSearch();
assert("clear search empties the box", view.cleared, 1);
assert("clear search empties the feedback", view.status, "");

console.log(log.join("\\n"));
if (log.some((line) => line.startsWith("FAIL"))) process.exitCode = 1;
`;

const source = [strip("store.js"), strip("model.js"), strip("template.js"), strip("controller.js"), harness].join("\n");
await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
