/* eslint no-invalid-this: 0, complexity:[2, 9] */
import { qs, qsa, $on, $parent, $delegate } from "./helpers";

const ENTER_KEY = 13;
const ESCAPE_KEY = 27;

const _setFilter = (currentPage) => {
    qs(".filters .selected").className = "";
    qs(`.filters [href="#/${currentPage}"]`).className = "selected";
};

const _elementComplete = (id, completed) => {
    const listItem = qs(`[data-id="${id}"]`);

    if (!listItem)
        return;

    listItem.className = completed ? "completed" : "";

    // In case it was toggled from an event and not by clicking the checkbox
    qs("input", listItem).checked = completed;
};

const _editItem = (id, title) => {
    const listItem = qs(`[data-id="${id}"]`);

    if (!listItem)
        return;

    listItem.className = `${listItem.className} editing`;

    const input = document.createElement("input");
    input.className = "edit";

    listItem.appendChild(input);
    input.focus();
    input.value = title;
};

const _editItemDone = (id, title) => {
    const listItem = qs(`[data-id="${id}"]`);

    if (!listItem)
        return;

    const input = qs("input.edit", listItem);
    listItem.removeChild(input);

    listItem.className = listItem.className.replace(" editing", "");

    qsa("label", listItem).forEach((label) => {
        label.textContent = title;
    });
};

const _itemId = (element) => {
    const li = $parent(element, "li");
    return parseInt(li.dataset.id, 10);
};

const _removeItem = (id, list) => {
    const elem = qs(`[data-id="${id}"]`);

    if (elem)
        list.removeChild(elem);
};

/**
 * View that abstracts away the browser's DOM completely.
 * It has two simple entry points:
 *
 *   - bind(eventName, handler)
 *     Takes a todo application event and registers the handler
 *   - render(command, parameterObject)
 *     Renders the given command with the options
 */
export default class View {
    constructor(template) {
        this.template = template;

        this.$todoList = qs(".todo-list");
        this.$todoItemCounter = qs(".todo-count");
        this.$clearCompleted = qs(".clear-completed");
        this.$main = qs(".main");
        this.$toggleAllContainer = qs(".toggle-all-container");
        this.$footer = qs(".footer");
        this.$toggleAllInput = qs(".toggle-all");
        this.$toggleAll = qs(".toggle-all-label");
        this.$newTodo = qs(".new-todo");
        this.$search = qs(".search-input");
        this.$searchClear = qs(".search-clear");
        this.$searchStatus = qs(".search-status");

        this.render = this.render.bind(this);
        this.bindCallback = this.bindCallback.bind(this);
    }

    /**
     * Reports the search results in the live region next to the search box.
     * textContent is used on purpose: the query is user input and is echoed
     * back verbatim.
     */
    _searchFeedback(query, matched, total) {
        const noMatches = query !== "" && matched === 0;

        this.$searchClear.disabled = this.$search.value === "";
        this.$searchStatus.classList.toggle("search-status--empty", noMatches);
        this.$searchStatus.textContent = this.template.searchStatus(query, matched, total);
    }

    _clearSearch() {
        this.$search.value = "";
        this.$search.focus();
    }

    _clearCompletedButton(completedCount, visible) {
        this.$clearCompleted.innerHTML = this.template.clearCompletedButton(completedCount);
        this.$clearCompleted.style.display = visible ? "block" : "none";
    }

    // eslint-disable-next-line complexity
    render(viewCmd, parameter) {
        switch (viewCmd) {
            case "showEntries":
                this.$todoList.innerHTML = this.template.show(parameter);
                break;
            case "updateElementCount":
                this.$todoItemCounter.innerHTML = this.template.itemCounter(parameter);
                break;
            case "contentBlockVisibility":
                this.$main.style.display = this.$footer.style.display = this.$toggleAllContainer.style.display = parameter.visible ? "block" : "none";
                break;
            case "toggleAll":
                this.$toggleAllInput.checked = parameter.checked;
                break;
            case "clearNewTodo":
                this.$newTodo.value = "";
                break;
            case "removeItem":
                _removeItem(parameter, this.$todoList);
                break;
            case "setFilter":
                _setFilter(parameter);
                break;
            case "elementComplete":
                _elementComplete(parameter.id, parameter.completed);
                break;
            case "editItem":
                _editItem(parameter.id, parameter.title);
                break;
            case "editItemDone":
                _editItemDone(parameter.id, parameter.title);
                break;
            case "searchFeedback":
                this._searchFeedback(parameter.query, parameter.matched, parameter.total);
                break;
            case "clearSearch":
                this._clearSearch();
                break;
            case "clearCompletedButton":
                this._clearCompletedButton(parameter.completed, parameter.visible, this.clearCompletedButton);
                break;
        }
    }

    bindCallback(event, handler) {
        switch (event) {
            case "newTodo":
                $on(this.$newTodo, "change", () => handler(this.$newTodo.value));
                break;
            case "searchInput":
                $on(this.$search, "input", () => handler(this.$search.value));
                break;
            case "searchClear":
                $on(this.$searchClear, "click", () => handler());
                $on(this.$search, "keyup", (e) => {
                    if (e.keyCode === ESCAPE_KEY)
                        handler();
                });
                break;
            case "removeCompleted":
                $on(this.$clearCompleted, "click", handler);
                break;
            case "toggleAll":
                $on(this.$toggleAll, "click", () => {
                    this.$toggleAllInput.click();
                    handler({ completed: this.$toggleAllInput.checked });
                });
                break;
            case "itemEdit":
                $delegate(this.$todoList, "li label", "dblclick", (e) => handler({ id: _itemId(e.target) }));
                break;
            case "itemRemove":
                $delegate(this.$todoList, ".destroy", "click", (e) => handler({ id: _itemId(e.target) }));
                break;
            case "itemToggle":
                $delegate(this.$todoList, ".toggle", "click", (e) => handler({ id: _itemId(e.target), completed: e.target.checked }));
                break;
            case "itemEditDone":
                $delegate(this.$todoList, "li .edit", "blur", function (e) {
                    if (!e.target.dataset.iscanceled) {
                        handler({
                            id: _itemId(e.target),
                            title: e.target.value,
                        });
                    }
                });
                $delegate(this.$todoList, "li .edit", "keypress", function (e) {
                    if (e.keyCode === ENTER_KEY)
                        e.target.blur();
                });
                break;
            case "itemEditCancel":
                $delegate(this.$todoList, "li .edit", "keyup", (e) => {
                    if (e.keyCode === ESCAPE_KEY) {
                        e.target.dataset.iscanceled = true;
                        e.target.blur();
                        handler({ id: _itemId(e.target) });
                    }
                });
                break;
        }
    }
}
