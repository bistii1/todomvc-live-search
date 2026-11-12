# Open-source feature implementation: TodoMVC live search

## Program and repository

**Program:** TodoMVC, JavaScript ES6 / Webpack example  
**Repository:** https://github.com/tastejs/todomvc  
**Example:** https://github.com/tastejs/todomvc/tree/master/examples/javascript-es6  
**Upstream commit:** `ff43b02e59dfa604386bb382034b2cd07c2bcd8a`  
**License:** MIT (upstream license included in source archive).

TodoMVC is a small task manager used to demonstrate application frameworks and architectures. This example uses plain JavaScript and an explicit Model–View–Controller structure. It is small enough to build and understand locally, while providing existing filters that can be extended.

## Computer, tools and resource check

The implementation was built on an Apple Silicon Mac (`arm64`) with 16 GiB RAM and about 264 GiB free disk space at the start. Installed tools were Git, Node.js 22.21.0 and npm 10.9.4. This example declares Node.js ≥18.13.0 and npm ≥8.19.3; the repository root has separate requirements, which were not needed to build this example.

After `npm ci --no-audit --no-fund`, the entire shallow checkout plus this example's dependencies occupied about 180 MiB. This example's `node_modules` occupied about 64 MiB. The original production build occupied 84 KiB on disk, took 1.42 seconds end-to-end and reached 209,453,056 bytes (about 200 MiB) maximum resident memory as reported by macOS `/usr/bin/time -l`. These are measurements on this computer, not official minimum requirements. Browser and operating-system memory are additional.

## Download, build and initial use

```sh
git clone --depth 1 https://github.com/tastejs/todomvc.git
cd todomvc/examples/javascript-es6
npm ci
npm run build
npm run serve
```

Open http://localhost:7002. I exercised the original app by creating four tasks, marking one completed and selecting Active and Completed. Automated browser checks confirmed the expected counts. The original interface appears in `01-before.png`.

## Chosen feature and closest existing feature

**New feature:** live, case-insensitive substring search over task titles.

**Closest existing feature:** the All / Active / Completed navigation filters. These already select which stored tasks appear in the list. Search adds a second condition: the title must contain the search query. With Active selected and `search` entered, only unfinished tasks containing that word should appear.

The query is trimmed and normalized for matching. It remains in place when switching status filters. A clear button and Escape reset it. Result feedback distinguishes an empty result from an empty app. Counts and bulk actions continue to refer to the whole task collection.

## Architecture and implementation approach

- `app.js` constructs the application objects and handles hash-based status navigation.
- `store.js` stores tasks in memory using synchronous callback APIs.
- `model.js` exposes task creation, reading, updating, deletion and global counts.
- `controller.js` coordinates events and combines status filtering with search.
- `view.js` binds browser events and updates the DOM.
- `template.js` generates the task-list markup.
- Webpack bundles the JavaScript, HTML and CSS into `dist`.

Status filtering selects the candidate tasks; the search predicate then narrows that list. Search is presentation state and does not change saved task titles or the storage API. No research-paper algorithm was needed: substring matching is implemented with JavaScript string operations.

## Claude workflow and prompts

Claude Desktop and Claude Code 2.1.251 were already installed. `claude auth status` reported an authenticated setup. A new Claude Code request was run from the selected example folder, followed by an implementation request with access to the same folder. This used Claude Code's command-line interface rather than the Desktop folder picker; there was no need to create another account.

Exact prompts appear in `prompts.md`; Claude's responses are included as Markdown. Raw JSON records are also preserved in the local output folder with session IDs and reported outcomes. The record does not present any private reasoning as a deliverable. Ctrl-O was not used because the requests ran non-interactively.

The architecture response was reviewed rather than accepted uncritically. In particular, its claim that the original `_filter` condition is a tautology is incorrect: when the current and previous routes are both All and `force` is false, the condition is false. Search must explicitly trigger a refresh when needed.

## Screenshots and validation

The final production build passed; its generated output occupies about 92 KiB on disk. See the included build logs for final timing and memory measurements. Independent Chrome/Playwright browser checks passed 18 scenarios, including matching, status composition, mutation refresh, global bulk actions, special-character queries, mobile layout, clearing whitespace and deleting the final task. Claude's standalone controller check also passed 22 assertions. See `test-results.txt` and `controller-test-results.txt`.

| Screenshot | What it demonstrates |
| --- | --- |
| `01-before.png` | Original app before implementation |
| `02-search-all.png` | Case-insensitive search across all tasks |
| `03-search-active.png` | Search combined with Active status |
| `04-no-matches.png` | Accessible no-match feedback |
| `05-mobile.png` | Search toolbar at a 390-pixel viewport |

Claude's review identified the whitespace-clear and hidden-toolbar issues. Codex made the final fixes: the clear button uses the raw input value; the toolbar stays outside the hideable list area. Codex also restored the missing opening `<head>` tag identified during review. The final browser checks cover both search edge cases.

**Public GitHub repository:** https://github.com/bistii1/todomvc-live-search

To run the submitted repository: clone it, then run `npm ci`, `npm run build`, and `npm run serve` from its root. The source archive includes the production `dist` directory for immediate local preview, as well as source files for rebuilding.

## Limitations

Upstream tasks use in-memory storage: reloading the page loses tasks. Search state also resets on reload. Search is literal substring matching, not fuzzy matching or stemming. Bulk actions intentionally affect all tasks, including tasks hidden by search. This is a local implementation, not an upstream pull request.
