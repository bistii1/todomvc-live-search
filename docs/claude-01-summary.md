I read all six files. Here's the picture.

## Subsystems

**`app.js` — composition root + routing.** `Todo()` wires the five objects in a fixed order: `Store` → `Model` → (`Template` → `View`) → `Controller`. Two window listeners drive everything: `load` constructs the app, `hashchange` calls `controller.setView(document.location.hash)`. The hash *is* the only persistent UI state. There's also HMR glue (`module.hot`) that re-runs `onLoad` on hot reload.

**`store.js` — persistence.** Despite the name, it's an in-memory fake DB: `memoryStorage` is a module-level object holding a JSON **string** per DB name, deliberately hoisted outside the class so HMR doesn't wipe data. Every operation does a full `JSON.parse` / `JSON.stringify` round trip, and every read hands back a fresh deep copy. All methods are callback-style (synchronously invoked) to mimic AJAX. The critical method is `find(query, callback)`: it filters with `query[q] !== todo[q]` — **strict equality on whole property values only**. No operators, no predicates, no substring matching.

**`model.js` — thin query layer.** `read(query, cb)` overloads on `typeof query`: function → `findAll`, string/number → `find({id})` after `parseInt`, object → `find(query)` passthrough. `getCount` walks *all* todos via `findAll` and returns `{active, completed, total}` — it is never scoped to the current filter.

**`view.js` — DOM boundary.** Two entry points, both `switch` statements: `render(cmd, param)` over ~11 command names, and `bindCallback(event, handler)` over 8 event names. It caches element references in the constructor (`.todo-list`, `.todo-count`, `.filters`, `.new-todo`, …) and uses event delegation (`$delegate`) on the list so re-rendered `<li>`s keep working. Helpers (`qs`, `qsa`, `$on`, `$delegate`, `$parent`) come from `./helpers`, which I didn't read.

**`template.js` — HTML strings.** `show(data)` builds the `<li>` list, `itemCounter`, `clearCompletedButton`. Two things matter downstream: it HTML-escapes titles via a small escape map, and it calls `data.reverse()`, mutating the array it's given (harmless today only because `Store` hands out fresh copies).

**`controller.js` — orchestration and the filter state machine.** It holds `_activeRoute` / `_lastActiveRoute` and three parallel methods `showAll` / `showActive` / `showCompleted`, each of which is just `model.read(<query>, data => view.render("showEntries", data))`. `_updateFilter(page)` sets the route and re-filters; `_filter(force)` updates counts and then **dispatches by string concatenation**: `this[\`show${activeRoute}\`]()`. That dispatch is the seam everything else hangs off of.

Two pre-existing quirks worth knowing before touching this code: the guard in `_filter` (`_lastActiveRoute !== "All" || _lastActiveRoute !== activeRoute`, controller.js:184) is a tautology, so it always re-renders; and `removeCompletedItems`/`toggleAll` call `_filter()` outside the storage callback, which happens to work only because the "async" callbacks fire synchronously.

## How case-insensitive search composes with All/Active/Completed

The clean framing: **the status filter is a storage-level query; search cannot be.** `Store.find` only does `===` on whole values, so a `{title: "milk"}` query would demand an exact full-title match. Search must therefore be a *predicate applied to the result set*, not a query key. That makes the two orthogonal and gives a natural composition order:

```
findAll/find({completed}) → filter(title.toLowerCase().includes(term.toLowerCase())) → view.render("showEntries")
```

Status narrows at the data layer; search narrows the returned array. Because `Store` returns a fresh copy on every read, filtering that array in the controller is safe and doesn't disturb the `data.reverse()` mutation in `template.show`.

**Where to put the predicate.** The highest-leverage spot is a single private helper in `Controller` that the three `show*` methods funnel through — something like `_show(query)` that reads, applies `_matchesSearch`, and renders. The three methods collapse to one-liners, `_filter`'s `show${activeRoute}` dispatch keeps working untouched, and search term lives as `this._searchTerm` alongside `_activeRoute`. The alternative — teaching `Store.find` to accept predicate functions — is more general but changes a shared contract and leaks "search" into the fake-DB layer; I'd skip it. Normalize the term once (`trim().toLowerCase()`) when it's set rather than per item per render, and treat empty string as "match everything" so the no-search path is identical to today's behavior.

**Where search state lives.** Two viable options, and they differ in user-visible behavior:

- *In-memory only* (`this._searchTerm`): simplest, but a `hashchange` from clicking All/Active/Completed re-enters through `setView` → `_updateFilter` → `_filter`, which re-renders from the retained term. Search survives filter switches but not reload or back/forward.
- *In the hash* (`#/active?q=milk`): search becomes shareable and history-navigable, consistent with how the app already treats the hash as its state store. Cost: `setView` currently does `hash.split("/")[1]`, which would yield `"active?q=milk"` and break the `show${activeRoute}` dispatch *and* the `[href="#/${currentPage}"]` selector in `_setFilter`. You'd have to split route from query before both uses.

I'd start in-memory and only move to the hash if shareable/bookmarkable search is actually wanted.

**The wiring.** A search input needs a new `bindCallback` case in the view (an `input` listener on a cached `.search` element, debounced or not — the data set is tiny), a `Controller` handler that sets the term and calls `_filter(true)` (force, since the route hasn't changed), and nothing new in `Template` unless you want match highlighting. Highlighting would be the one genuinely delicate piece: `template.show` escapes titles before interpolation, so any `<mark>` insertion must happen *after* escaping, on the escaped string, or you reintroduce an injection hole.

**The one real design decision for you.** `_updateCount` calls `model.getCount()`, which is unconditionally global. So you must choose whether "3 items left" and the Clear-completed button reflect all todos or only search matches. TodoMVC semantics treat the counter as a property of the whole list, and `Clear completed` deleting only *visible* matches versus *all* completed items is a meaningfully different feature. My recommendation: leave counts global and treat search as purely a display filter on the list — it requires no change to `Model.getCount` and matches how the existing Active/Completed routes already behave (the counter doesn't change when you switch routes). Worth confirming before implementation, since it's a product call rather than a technical one.

No files were modified.