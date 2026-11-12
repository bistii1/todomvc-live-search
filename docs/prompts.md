# Claude Code prompt record

Claude Code 2.1.251 was already installed and authenticated. Commands ran from `work/todomvc/examples/javascript-es6`, giving Claude access to that project. This record distinguishes actual prompts from suggested follow-ups.

## 1. Architecture and design (sent)

Give me a summary of the most important subsystems of this project. Read src/app.js, src/controller.js, src/model.js, src/view.js, src/store.js and src/template.js in this directory only. Then explain how case-insensitive text search could compose with the existing All/Active/Completed filters. Do not edit files.

An earlier request from the repository root was stopped after no response; the request above narrows the scope to the chosen app.

## 2. Implementation (sent)

Implement a live case-insensitive substring search for todo titles in this JavaScript ES6 TodoMVC app, based on its existing All/Active/Completed filtering. Work only in this example directory. Add a visibly labeled search input, an explicit Clear search button and Escape-to-clear behavior, a result count and accessible no-matches feedback. Trim the query for matching. Compose the query with the status filter and preserve the query when switching status. Keep global item counts, toggle-all and clear-completed semantics unchanged. Refresh search results after adding, editing, deleting and completing tasks, including a matching title edited so it no longer matches. Use textContent for query-related feedback. Preserve the original styling with a compact responsive search toolbar. Do not add dependencies or change the upstream in-memory storage. Update the README with the feature, behavior and run instructions. Run npm run build after implementation. Do not use subagents. Explain what you changed and any limitations.

## 3. Review (sent)

What is missing from the live search implementation? Review src/controller.js, src/view.js and src/index.html only. Browser checks already passed for search, status composition, edits, additions, deletions, Escape, clear button and global bulk actions. Check edge cases such as a whitespace-only query and deleting the last task while searching. Do not edit files or run commands. Give a concise review with concrete issues and fixes, if any. Do not use subagents.

## Review outcomes and final edits

Claude identified a whitespace-only query disabling the clear button, a toolbar hidden after deleting the last task, and an upstream missing opening `<head>` tag. Codex applied the final edits and verified them in Chrome. The toolbar stays visible when the task list is empty. Both the 18 browser scenarios and Claude's 22 controller assertions passed. Claude's implementation response says its check script was not run in its restricted session; Codex subsequently ran it successfully.
