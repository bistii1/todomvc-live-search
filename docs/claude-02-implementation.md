Implementation is complete and `npm run build` compiles cleanly. Here's what changed, all inside `examples/javascript-es6`:

**`src/index.html`** — a search toolbar inside `.main`, between the toggle-all container and the list: a visible `<label>Search</label>` bound to the input, a `type="search"` box (`aria-describedby="search-status"`), an explicit `Clear search` button (disabled while the query is empty) and a `<p role="status" aria-live="polite">` feedback line.

**`src/controller.js`** — owns the query state:
- `_searchQuery` (raw as typed), `_searchTerm()` (trimmed + lowercased) for matching.
- `search(query)` and `clearSearch()`, wired through two new view callbacks.
- `showAll/showActive/showCompleted` now funnel into `_showEntries(data)`, which filters the status-filtered set by substring and renders both the list and the feedback payload (`query`, `matched`, `total`), so query and status compose. The query lives in the controller, not the route, so it survives All/Active/Completed switches.
- `_filter()` also repaints when a query is active, so adds, deletes and completions re-run the search; `editItemSave` calls `_refreshSearch()` so a title edited out of the match set disappears immediately.
- `_updateCount`, `toggleAll` and `removeCompletedItems` are untouched: counts, toggle-all and clear-completed still act on all todos.

**`src/view.js`** — refs for the three new elements, `searchFeedback` / `clearSearch` render commands, and `searchInput` (live `input` event) / `searchClear` (button click + Escape keyup) bindings. Feedback is written with `textContent`; clearing also refocuses the box.

**`src/template.js`** — `searchStatus(query, matched, total)` returning plain text: `""` when idle, `No tasks match "x"` when empty, otherwise `Showing 2 of 5 tasks matching "x"` (total is scoped to the current status filter).

**`src/app.css`** — a compact flex toolbar matching TodoMVC's palette and 1px dividers, wrapping to stacked layout under 430px; the status line collapses to zero height when empty rather than `display:none`, so the live region stays rendered.

**`README.md`** — new "Search" section covering the feature and its behavior, plus production-build run instructions (`npm run build` + `npm run serve` on :7002) alongside the existing dev flow.

Limitations and notes:
- No dependencies added and `store.js` is untouched; the query is in-memory, so a reload clears it (as it already clears the todos).
- The toolbar lives inside `.main`, which the app hides when there are zero todos, so the search box hides with the empty state. Documented in the README.
- Matching is plain `includes` on the title — no diacritic folding, token splitting or highlighting — and the list repaints fully on each keystroke while a query is active, which is fine at TodoMVC scale.
- Verification was the successful production build plus code review: I wrote a zero-dependency check script, `search-check.mjs`, exercising matching, trimming, composition with status, refresh-on-mutation and the unchanged global counts — but `node` execution was not approved in this session, so **it has not been run**, and `rm` was also blocked, so the file is still in the working tree. Run it with `node search-check.mjs`, then delete it.