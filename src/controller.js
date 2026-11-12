class Controller {
    /**
     * Take a model & view, then act as controller between them
     * @param  {object} model The model instance
     * @param  {object} view  The view instance
     */
    constructor(model, view) {
        this.model = model;
        this.view = view;

        // The raw search query, as typed. It is trimmed when matching.
        this._searchQuery = "";

        this.view.bindCallback("newTodo", (title) => this.addItem(title));
        this.view.bindCallback("searchInput", (query) => this.search(query));
        this.view.bindCallback("searchClear", () => this.clearSearch());
        this.view.bindCallback("itemEdit", (item) => this.editItem(item.id));
        this.view.bindCallback("itemEditDone", (item) => this.editItemSave(item.id, item.title));
        this.view.bindCallback("itemEditCancel", (item) => this.editItemCancel(item.id));
        this.view.bindCallback("itemRemove", (item) => this.removeItem(item.id));
        this.view.bindCallback("itemToggle", (item) => this.toggleComplete(item.id, item.completed));
        this.view.bindCallback("removeCompleted", () => this.removeCompletedItems());
        this.view.bindCallback("toggleAll", (status) => this.toggleAll(status.completed));
    }

    /**
     * Load & Initialize the view
     * @param {string}  '' | 'active' | 'completed'
     */
    setView(hash) {
        const route = hash.split("/")[1];
        const page = route || "";
        this._updateFilter(page);
    }

    /**
     * Event fires on load. Gets all items & displays them
     */
    showAll() {
        this.model.read((data) => this._showEntries(data));
    }

    /**
     * Renders all active tasks
     */
    showActive() {
        this.model.read({ completed: false }, (data) => this._showEntries(data));
    }

    /**
     * Renders all completed tasks
     */
    showCompleted() {
        this.model.read({ completed: true }, (data) => this._showEntries(data));
    }

    /**
     * Stores the current search query and repaints the matching tasks.
     * The active status filter (All | Active | Completed) is left untouched,
     * so both filters apply at the same time.
     *
     * @param {string} query The query as typed in the search box
     */
    search(query) {
        this._searchQuery = query;
        this._filter(true);
    }

    /**
     * Empties the search box and shows every task of the active status filter.
     */
    clearSearch() {
        this._searchQuery = "";
        this.view.render("clearSearch");
        this._filter(true);
    }

    /**
     * An event to fire whenever you want to add an item. Simply pass in the event
     * object and it'll handle the DOM insertion and saving of the new item.
     */
    addItem(title) {
        if (title.trim() === "")
            return;

        this.model.create(title, () => {
            this.view.render("clearNewTodo");
            this._filter(true);
        });
    }

    /*
     * Triggers the item editing mode.
     */
    editItem(id) {
        this.model.read(id, (data) => {
            let title = data[0].title;
            this.view.render("editItem", { id, title });
        });
    }

    /*
     * Finishes the item editing mode successfully.
     */
    editItemSave(id, title) {
        title = title.trim();

        if (title.length !== 0) {
            this.model.update(id, { title }, () => {
                this.view.render("editItemDone", { id, title });
                // The new title may no longer match the active search query.
                this._refreshSearch();
            });
        } else {
            this.removeItem(id);
        }
    }

    /*
     * Cancels the item editing mode.
     */
    editItemCancel(id) {
        this.model.read(id, (data) => {
            const title = data[0].title;
            this.view.render("editItemDone", { id, title });
        });
    }

    /**
     * Find the DOM element with given ID,
     * Then remove it from DOM & Storage
     */
    removeItem(id) {
        this.model.remove(id, () => this.view.render("removeItem", id));
        this._filter();
    }

    /**
     * Will remove all completed items from the DOM and storage.
     */
    removeCompletedItems() {
        this.model.read({ completed: true }, (data) => {
            for (let item of data)
                this.removeItem(item.id);
        });

        this._filter();
    }

    /**
     * Give it an ID of a model and a checkbox and it will update the item
     * in storage based on the checkbox's state.
     *
     * @param {number} id The ID of the element to complete or uncomplete
     * @param {object} checkbox The checkbox to check the state of complete
     *                          or not
     * @param {boolean|undefined} silent Prevent re-filtering the todo items
     */
    toggleComplete(id, completed, silent) {
        this.model.update(id, { completed }, () => {
            this.view.render("elementComplete", { id, completed });
        });

        if (!silent)
            this._filter();
    }

    /**
     * Will toggle ALL checkboxes' on/off state and completeness of models.
     * Just pass in the event object.
     */
    toggleAll(completed) {
        this.model.read({ completed: !completed }, (data) => {
            for (let item of data)
                this.toggleComplete(item.id, completed, true);
        });

        this._filter();
    }

    /**
     * The query used for matching: trimmed and lowercased.
     * @returns {string} The normalized query, "" when not searching
     */
    _searchTerm() {
        return this._searchQuery.trim().toLowerCase();
    }

    /**
     * Renders the tasks of the active status filter whose title contains the
     * search query, plus the feedback describing the result.
     *
     * @param {array} data The tasks of the active status filter
     */
    _showEntries(data) {
        const term = this._searchTerm();
        const matches = term === "" ? data : data.filter((todo) => todo.title.toLowerCase().includes(term));

        this.view.render("showEntries", matches);
        this.view.render("searchFeedback", {
            query: this._searchQuery.trim(),
            matched: matches.length,
            total: data.length,
        });
    }

    /**
     * Repaints the list when a search is running, so results stay in sync with
     * changes that do not repaint the list on their own.
     */
    _refreshSearch() {
        if (this._searchTerm() !== "")
            this._filter(true);
    }

    /**
     * Updates the pieces of the page which change depending on the remaining
     * number of todos.
     */
    _updateCount() {
        this.model.getCount((todos) => {
            const completed = todos.completed;
            const visible = completed > 0;
            const checked = completed === todos.total;

            this.view.render("updateElementCount", todos.active);
            this.view.render("clearCompletedButton", { completed, visible });
            this.view.render("toggleAll", { checked });
            this.view.render("contentBlockVisibility", { visible: todos.total > 0 });
        });
    }

    /**
     * Re-filters the todo items, based on the active route.
     * @param {boolean|undefined} force  forces a re-painting of todo items.
     */
    _filter(force) {
        const active = this._activeRoute;
        const activeRoute = active.charAt(0).toUpperCase() + active.substr(1);

        // Update the elements on the page, which change with each completed todo
        this._updateCount();

        // If the last active route isn't "All", or we're switching routes, we
        // re-create the todo item elements, calling:
        //   this.show[All|Active|Completed]()
        // A running search also repaints, since adding, deleting or completing
        // a task changes which titles are shown and the result count.
        if (force || this._searchTerm() !== "" || this._lastActiveRoute !== "All" || this._lastActiveRoute !== activeRoute)
            this[`show${activeRoute}`]();

        this._lastActiveRoute = activeRoute;
    }

    /**
     * Simply updates the filter nav's selected states
     */
    _updateFilter(currentPage) {
        // Store a reference to the active route, allowing us to re-filter todo
        // items as they are marked complete or incomplete.
        this._activeRoute = currentPage;

        if (currentPage === "")
            this._activeRoute = "All";

        this._filter();

        this.view.render("setFilter", currentPage);
    }
}

export default Controller;
