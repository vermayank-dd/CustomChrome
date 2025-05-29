// DOM Elements
const editor = document.getElementById('editor');
const boldBtn = document.getElementById('boldBtn');
const fontSizeSelect = document.getElementById('fontSize');
const newTodoInput = document.getElementById('newTodo');
const addTodoBtn = document.getElementById('addTodo');
const activeTodosList = document.getElementById('activeTodos');
const archivedTodosList = document.getElementById('archivedTodos');
const archiveBtn = document.getElementById('archiveBtn');
const frequentSitesContainer = document.getElementById('frequentSites');
const searchTodoInput = document.getElementById('searchTodo');
const sortTodoInput = document.getElementById('sortTodo');
const toggleFavoritesBtn = document.getElementById('toggleFavorites');

// State
let isArchiveVisible = false;
let showFavoritesOnly = false;

// --- Todo Model and State ---
let todos = [];
let archivedTodos = [];
let categories = [
    { name: 'Work', color: '#007AFF' },
    { name: 'Personal', color: '#FF9500' },
    { name: 'Errands', color: '#34C759' },
    { name: 'Kids', color: '#AF52DE' },
    { name: 'Shopping', color: '#FF2D55' },
    { name: 'Returns', color: '#5AC8FA' }
];

// --- DOM Elements for new fields ---
const todoDueDate = document.getElementById('todoDueDate');
const todoPriority = document.getElementById('todoPriority');
const starTodo = document.getElementById('starTodo');

let isStarred = false;
let defaultCategory = 'Work';

const customCategoryDropdown = document.getElementById('customCategoryDropdown');
const selectedCategoryInput = document.getElementById('selectedCategory');
const categoryDropdownList = document.getElementById('categoryDropdownList');

let searchQuery = '';
let sortOption = 'order';

// Load saved data
document.addEventListener('DOMContentLoaded', () => {
    loadEditorContent();
    loadTodos();
    loadFrequentSites();
    // Enable drag-and-drop sorting
    new Sortable(activeTodosList, {
        handle: '.drag-handle',
        animation: 150,
        onEnd: function (evt) {
            // Reorder todos array based on new DOM order
            const newOrder = Array.from(activeTodosList.children).map(child => {
                const text = child.querySelector('.todo-text').textContent.trim();
                return todos.find(t => t.text === text);
            });
            // Remove undefined (in case of mismatch)
            todos = newOrder.filter(Boolean);
            // Update order property
            todos.forEach((t, i) => t.order = i);
            saveTodos();
            renderTodos();
        }
    });
    loadDefaultCategory();
});

// Text Editor Functions
function loadEditorContent() {
    chrome.storage.local.get(['editorContent'], (result) => {
        if (result.editorContent) {
            editor.innerHTML = result.editorContent;
        }
    });
}

function saveEditorContent() {
    chrome.storage.local.set({ editorContent: editor.innerHTML });
}

editor.addEventListener('input', saveEditorContent);

boldBtn.addEventListener('click', () => {
    document.execCommand('bold', false, null);
    saveEditorContent();
});

fontSizeSelect.addEventListener('change', () => {
    document.execCommand('fontSize', false, fontSizeSelect.value);
    saveEditorContent();
});

// --- Category logic ---
// (No longer needed)

// categoryColor logic for custom dropdown
categoryColor.addEventListener('input', (e) => {
    const customName = selectedCategoryInput.value;
    const cat = categories.find(c => c.name === customName);
    if (cat) cat.color = e.target.value;
    saveTodos();
    renderCategoryDropdown();
    renderTodos();
});

starTodo.addEventListener('click', () => {
    isStarred = !isStarred;
    starTodo.textContent = isStarred ? '★' : '☆';
});

// --- Todo CRUD ---
function saveTodos() {
    chrome.storage.local.set({
        todos,
        archivedTodos,
        categories
    });
}

function loadTodos() {
    chrome.storage.local.get(['todos', 'archivedTodos', 'categories'], (result) => {
        todos = result.todos || [];
        archivedTodos = result.archivedTodos || [];
        if (result.categories) categories = result.categories;
        renderTodos();
        renderArchivedTodos();
        renderCategoryDropdown();
    });
}

function capitalizeWords(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
}

function saveDefaultCategory(cat) {
    defaultCategory = cat;
    chrome.storage.local.set({ defaultCategory: cat });
}

function loadDefaultCategory() {
    chrome.storage.local.get(['defaultCategory'], (result) => {
        if (result.defaultCategory) {
            defaultCategory = result.defaultCategory;
        }
        selectedCategoryInput.value = defaultCategory;
    });
}

function renderCategoryDropdown() {
    categoryDropdownList.innerHTML = '';
    categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'dropdown-category-item';
        item.innerHTML = `
            <span><span class="color-dot" style="background:${cat.color}"></span>${cat.name}</span>
            <button class="def-btn${cat.name === defaultCategory ? ' selected' : ''}">def</button>
        `;
        item.querySelector('.def-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            saveDefaultCategory(cat.name);
            selectedCategoryInput.value = cat.name;
            renderCategoryDropdown();
        });
        item.addEventListener('click', () => {
            selectedCategoryInput.value = cat.name;
            categoryDropdownList.style.display = 'none';
        });
        categoryDropdownList.appendChild(item);
    });
    // Add custom option
    const customItem = document.createElement('div');
    customItem.className = 'dropdown-category-item';
    customItem.innerHTML = '<span>+ Add Category</span>';
    customItem.addEventListener('click', () => {
        const customName = prompt('Enter new category name:');
        if (customName) {
            const color = '#888888';
            categories.push({ name: customName, color });
            saveTodos();
            renderCategoryDropdown();
            selectedCategoryInput.value = customName;
            categoryColor.style.display = 'inline-block';
            categoryColor.value = color;
        }
    });
    categoryDropdownList.appendChild(customItem);
}

selectedCategoryInput.addEventListener('click', () => {
    categoryDropdownList.style.display = categoryDropdownList.style.display === 'none' ? 'block' : 'none';
    renderCategoryDropdown();
});
document.addEventListener('click', (e) => {
    if (!customCategoryDropdown.contains(e.target)) {
        categoryDropdownList.style.display = 'none';
    }
});

// Update addTodo to use selectedCategoryInput.value
function addTodo() {
    const text = newTodoInput.value.trim();
    if (!text) return;
    let category = selectedCategoryInput.value;
    let catColor = (categories.find(c => c.name === category) || { color: '#888' }).color;
    if (!category) {
        alert('Please select or create a valid category.');
        return;
    }
    const dueDate = todoDueDate.value || null;
    const priority = todoPriority.value !== 'none' ? todoPriority.value : null;
    const todo = {
        id: Date.now(),
        text: capitalizeWords(text),
        category,
        color: catColor,
        dueDate,
        priority,
        favorite: isStarred,
        completed: false,
        order: todos.length
    };
    todos.push(todo);
    newTodoInput.value = '';
    todoDueDate.value = '';
    todoPriority.value = 'none';
    selectedCategoryInput.value = defaultCategory;
    isStarred = false;
    starTodo.textContent = '☆';
    categoryColor.style.display = 'none';
    saveTodos();
    renderTodos();
}

searchTodoInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderTodos();
    renderArchivedTodos();
});

function highlightMatch(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'ig');
    return text.replace(regex, '<mark>$1</mark>');
}

function sortTodos(arr) {
    let sorted = [...arr];
    if (sortOption === 'due') {
        sorted.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
    } else if (sortOption === 'priority') {
        const priorityOrder = { high: 1, medium: 2, low: 3, none: 4, null: 4, undefined: 4 };
        sorted.sort((a, b) => (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4));
    } else if (sortOption === 'category') {
        sorted.sort((a, b) => a.category.localeCompare(b.category));
    } else if (sortOption === 'favorite') {
        sorted.sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
    } else {
        sorted.sort((a, b) => a.order - b.order);
    }
    return sorted;
}

function renderTodos() {
    activeTodosList.innerHTML = '';
    let filtered = todos;
    if (searchQuery) {
        filtered = todos.filter(todo => todo.text.toLowerCase().includes(searchQuery));
    }
    if (showFavoritesOnly) {
        filtered = filtered.filter(todo => todo.favorite);
    }
    let sorted = sortTodos(filtered);
    sorted.forEach(todo => {
        const div = document.createElement('div');
        div.className = 'todo-item' + (todo.completed ? ' completed' : '');
        div.style.setProperty('--category-color', todo.color);
        div.setAttribute('data-id', todo.id);
        div.innerHTML = `
            <div class="todo-main-row">
                <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
                <button class="star-todo" title="Favorite">${todo.favorite ? '★' : '☆'}</button>
                <span class="todo-text" contenteditable="false">${highlightMatch(capitalizeWords(todo.text), searchQuery)}</span>
                <span class="category-badge" style="background:${todo.color}">${todo.category}</span>
            </div>
            <div class="todo-tabs">
                <span class="tab due-tab">${todo.dueDate ? todo.dueDate : '<span style=\'color:#bbb\'>Set Due</span>'}</span>
                <span class="tab priority-tab priority-${todo.priority || 'none'}">${todo.priority ? capitalizeWords(todo.priority) : 'None'}</span>
                <span class="tab archive-tab">Archive</span>
                <span class="tab delete-tab">✕</span>
            </div>
        `;
        // Star logic
        div.querySelector('.star-todo').addEventListener('click', () => {
            todo.favorite = !todo.favorite;
            saveTodos();
            renderTodos();
        });
        // Inline editing logic for todo text
        const textSpan = div.querySelector('.todo-text');
        textSpan.addEventListener('click', () => {
            textSpan.contentEditable = true;
            textSpan.focus();
        });
        textSpan.addEventListener('blur', () => {
            textSpan.contentEditable = false;
            todo.text = capitalizeWords(textSpan.textContent.trim());
            saveTodos();
            renderTodos();
        });
        textSpan.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                textSpan.blur();
            }
        });
        // Due date tab
        div.querySelector('.due-tab').addEventListener('click', (e) => {
            e.stopPropagation();
            const input = document.createElement('input');
            input.type = 'date';
            input.value = todo.dueDate || '';
            input.style.margin = '0 8px';
            input.addEventListener('blur', () => {
                todo.dueDate = input.value || null;
                saveTodos();
                renderTodos();
            });
            input.addEventListener('change', () => {
                todo.dueDate = input.value || null;
                saveTodos();
                renderTodos();
            });
            e.target.replaceWith(input);
            input.focus();
        });
        // Priority tab
        div.querySelector('.priority-tab').addEventListener('click', (e) => {
            e.stopPropagation();
            const select = document.createElement('select');
            select.innerHTML = `
                <option value="none">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
            `;
            select.value = todo.priority || 'none';
            select.style.margin = '0 8px';
            select.style.borderRadius = '16px';
            select.style.padding = '4px 12px';
            select.addEventListener('blur', () => {
                todo.priority = select.value !== 'none' ? select.value : null;
                saveTodos();
                renderTodos();
            });
            select.addEventListener('change', () => {
                todo.priority = select.value !== 'none' ? select.value : null;
                saveTodos();
                renderTodos();
            });
            e.target.replaceWith(select);
            select.focus();
        });
        // Archive tab
        div.querySelector('.archive-tab').addEventListener('click', () => {
            // Set completedAt if not already set
            if (!todo.completedAt) todo.completedAt = new Date().toISOString().slice(0, 10);
            todos = todos.filter(t => t.id !== todo.id);
            todo.completed = true;
            archivedTodos.push(todo);
            saveTodos();
            renderTodos();
            renderArchivedTodos();
        });
        // Delete tab
        div.querySelector('.delete-tab').addEventListener('click', () => {
            todos = todos.filter(t => t.id !== todo.id);
            saveTodos();
            renderTodos();
        });
        div.querySelector('.todo-checkbox').addEventListener('change', (e) => {
            todo.completed = e.target.checked;
            if (todo.completed) {
                // Move to archive and set completedAt
                todo.completedAt = new Date().toISOString().slice(0, 10);
                todos = todos.filter(t => t.id !== todo.id);
                archivedTodos.push(todo);
                saveTodos();
                renderTodos();
                renderArchivedTodos();
            } else {
                saveTodos();
                renderTodos();
            }
        });
        activeTodosList.appendChild(div);
    });
    // Initialize SortableJS after rendering
    if (window.Sortable) {
        if (activeTodosList._sortable) {
            activeTodosList._sortable.destroy();
        }
        activeTodosList._sortable = new Sortable(activeTodosList, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: function (evt) {
                // Reorder todos array based on new DOM order using data-id
                const newOrder = Array.from(activeTodosList.children).map(child => {
                    const id = Number(child.getAttribute('data-id'));
                    return todos.find(t => t.id === id);
                });
                todos = newOrder.filter(Boolean);
                todos.forEach((t, i) => t.order = i);
                saveTodos();
                renderTodos();
            }
        });
    }
}

function renderArchivedTodos() {
    archivedTodosList.innerHTML = '';
    let filtered = archivedTodos;
    if (searchQuery) {
        filtered = archivedTodos.filter(todo => todo.text.toLowerCase().includes(searchQuery));
    }
    let sorted = sortTodos(filtered);
    sorted.forEach(todo => {
        const div = document.createElement('div');
        div.className = 'todo-item completed';
        div.style.setProperty('--category-color', todo.color);
        div.setAttribute('data-id', todo.id);
        div.innerHTML = `
            <div class="todo-main-row">
                <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
                <input type="checkbox" class="todo-checkbox" checked disabled>
                <button class="star-todo" title="Favorite">${todo.favorite ? '★' : '☆'}</button>
                <span class="todo-text">${highlightMatch(capitalizeWords(todo.text), searchQuery)}</span>
                <span class="category-badge" style="background:${todo.color}">${todo.category}</span>
            </div>
            <div class="todo-tabs">
                <span class="tab due-tab">${todo.dueDate ? todo.dueDate : '<span style=\'color:#bbb\'>Set Due</span>'}</span>
                <span class="tab priority-tab priority-${todo.priority || 'none'}">${todo.priority ? capitalizeWords(todo.priority) : 'None'}</span>
                ${todo.completedAt ? `<span class='tab completed-date-tab' style='background:#e0e0e0;color:#333;'>Completed on: ${todo.completedAt}</span>` : ''}
                <span class="tab unarchive-tab">Unarchive</span>
                <span class="tab delete-tab">✕</span>
            </div>
        `;
        // Star logic
        div.querySelector('.star-todo').addEventListener('click', () => {
            todo.favorite = !todo.favorite;
            saveTodos();
            renderArchivedTodos();
        });
        // Unarchive tab
        div.querySelector('.unarchive-tab').addEventListener('click', () => {
            archivedTodos = archivedTodos.filter(t => t.id !== todo.id);
            todo.completed = false;
            todos.push(todo);
            saveTodos();
            renderTodos();
            renderArchivedTodos();
        });
        // Delete tab
        div.querySelector('.delete-tab').addEventListener('click', () => {
            archivedTodos = archivedTodos.filter(t => t.id !== todo.id);
            saveTodos();
            renderArchivedTodos();
        });
        archivedTodosList.appendChild(div);
    });
}

addTodoBtn.removeEventListener('click', addTodo); // Remove old
addTodoBtn.addEventListener('click', addTodo);
newTodoInput.removeEventListener('keypress', addTodo);
newTodoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

// Archive Toggle
archiveBtn.addEventListener('click', () => {
    isArchiveVisible = !isArchiveVisible;
    activeTodosList.style.display = isArchiveVisible ? 'none' : 'flex';
    archivedTodosList.style.display = isArchiveVisible ? 'flex' : 'none';
    archiveBtn.textContent = isArchiveVisible ? 'View Active' : 'View Archive';
});

// Quick Links Functions
function loadFrequentSites() {
    chrome.topSites.get((sites) => {
        const topSites = sites.slice(0, 8); // Get top 8 sites
        frequentSitesContainer.innerHTML = topSites.map(site => `
            <a href="${site.url}" class="site-link" target="_blank">
                <img src="https://www.google.com/s2/favicons?domain=${(new URL(site.url)).hostname}" alt="${site.title}">
                <span>${site.title}</span>
            </a>
        `).join('');
    });
}

sortTodoInput.addEventListener('change', (e) => {
    sortOption = e.target.value;
    renderTodos();
    renderArchivedTodos();
});

toggleFavoritesBtn.addEventListener('click', () => {
    showFavoritesOnly = !showFavoritesOnly;
    toggleFavoritesBtn.textContent = showFavoritesOnly ? 'Show All' : 'Show Favorites';
    renderTodos();
    renderArchivedTodos();
}); 