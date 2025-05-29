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

// State
let isArchiveVisible = false;

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
const todoCategory = document.getElementById('todoCategory');
const categoryColor = document.getElementById('categoryColor');
const todoDueDate = document.getElementById('todoDueDate');
const todoPriority = document.getElementById('todoPriority');
const starTodo = document.getElementById('starTodo');

let isStarred = false;

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
todoCategory.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        const customName = prompt('Enter new category name:');
        if (customName) {
            // Show color picker
            categoryColor.style.display = 'inline-block';
            categoryColor.value = '#888888';
            todoCategory.insertBefore(new Option(customName, customName, true, true), todoCategory.lastElementChild);
            categories.push({ name: customName, color: categoryColor.value });
        } else {
            todoCategory.value = 'Work';
            categoryColor.style.display = 'none';
        }
    } else {
        categoryColor.style.display = 'none';
    }
});

categoryColor.addEventListener('input', (e) => {
    const customName = todoCategory.value;
    const cat = categories.find(c => c.name === customName);
    if (cat) cat.color = e.target.value;
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
        renderCategoryOptions();
    });
}

function renderCategoryOptions() {
    // Remove all except last (custom)
    while (todoCategory.options.length > 1) todoCategory.remove(0);
    categories.forEach(cat => {
        const opt = new Option(cat.name, cat.name);
        todoCategory.add(opt, todoCategory.options.length - 1);
    });
}

function capitalizeWords(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
}

function addTodo() {
    const text = newTodoInput.value.trim();
    if (!text) return;
    let category = todoCategory.value;
    let catColor = (categories.find(c => c.name === category) || { color: '#888' }).color;
    if (category === 'custom') {
        // Should not allow adding with 'custom' as category
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
    todoCategory.value = 'Work';
    isStarred = false;
    starTodo.textContent = '☆';
    categoryColor.style.display = 'none';
    saveTodos();
    renderTodos();
}

function renderTodos() {
    activeTodosList.innerHTML = '';
    todos.sort((a, b) => a.order - b.order).forEach(todo => {
        const div = document.createElement('div');
        div.className = 'todo-item' + (todo.completed ? ' completed' : '');
        div.style.borderColor = todo.color;
        div.setAttribute('data-id', todo.id);
        div.innerHTML = `
            <span class="drag-handle" title="Drag to reorder">⋮⋮</span>
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <span class="todo-text" contenteditable="false">${capitalizeWords(todo.text)}</span>
            <span class="category-badge" style="background:${todo.color}">${todo.category}</span>
            ${todo.dueDate ? `<span class="due-date">${todo.dueDate}</span>` : ''}
            ${todo.priority ? `<span class="priority priority-${todo.priority}">${todo.priority}</span>` : ''}
            <button class="star-todo" title="Favorite">${todo.favorite ? '★' : '☆'}</button>
            <button class="archive-todo">Archive</button>
            <button class="delete-todo">×</button>
        `;
        // Inline editing logic
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
        // Event listeners
        div.querySelector('.todo-checkbox').addEventListener('change', (e) => {
            todo.completed = e.target.checked;
            saveTodos();
            renderTodos();
        });
        div.querySelector('.star-todo').addEventListener('click', () => {
            todo.favorite = !todo.favorite;
            saveTodos();
            renderTodos();
        });
        div.querySelector('.archive-todo').addEventListener('click', () => {
            todos = todos.filter(t => t.id !== todo.id);
            archivedTodos.push(todo);
            saveTodos();
            renderTodos();
            renderArchivedTodos();
        });
        div.querySelector('.delete-todo').addEventListener('click', () => {
            todos = todos.filter(t => t.id !== todo.id);
            saveTodos();
            renderTodos();
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
    archivedTodos.forEach(todo => {
        const div = document.createElement('div');
        div.className = 'todo-item completed';
        div.innerHTML = `
            <span class="todo-text">${capitalizeWords(todo.text)}</span>
            <span class="category-badge" style="background:${todo.color}">${todo.category}</span>
            ${todo.dueDate ? `<span class="due-date">${todo.dueDate}</span>` : ''}
            ${todo.priority ? `<span class="priority priority-${todo.priority}">${todo.priority}</span>` : ''}
            <button class="star-todo" title="Favorite">${todo.favorite ? '★' : '☆'}</button>
            <button class="unarchive-todo">Unarchive</button>
            <button class="delete-todo">×</button>
        `;
        div.querySelector('.star-todo').addEventListener('click', () => {
            todo.favorite = !todo.favorite;
            saveTodos();
            renderArchivedTodos();
        });
        div.querySelector('.unarchive-todo').addEventListener('click', () => {
            archivedTodos = archivedTodos.filter(t => t.id !== todo.id);
            todos.push(todo);
            saveTodos();
            renderTodos();
            renderArchivedTodos();
        });
        div.querySelector('.delete-todo').addEventListener('click', () => {
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
                <img src="chrome://favicon/${site.url}" alt="${site.title}">
                <span>${site.title}</span>
            </a>
        `).join('');
    });
} 