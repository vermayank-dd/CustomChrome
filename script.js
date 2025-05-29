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

// Load saved data
document.addEventListener('DOMContentLoaded', () => {
    loadEditorContent();
    loadTodos();
    loadFrequentSites();
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

// Todo List Functions
function loadTodos() {
    chrome.storage.local.get(['activeTodos', 'archivedTodos'], (result) => {
        if (result.activeTodos) {
            activeTodosList.innerHTML = result.activeTodos;
        }
        if (result.archivedTodos) {
            archivedTodosList.innerHTML = result.archivedTodos;
        }
        attachTodoEventListeners();
    });
}

function saveTodos() {
    chrome.storage.local.set({
        activeTodos: activeTodosList.innerHTML,
        archivedTodos: archivedTodosList.innerHTML
    });
}

function createTodoElement(text) {
    const todoDiv = document.createElement('div');
    todoDiv.className = 'todo-item';
    todoDiv.innerHTML = `
        <input type="checkbox" class="todo-checkbox">
        <span class="todo-text">${text}</span>
        <button class="archive-todo">Archive</button>
        <button class="delete-todo">×</button>
    `;
    return todoDiv;
}

function addTodo() {
    const text = newTodoInput.value.trim();
    if (text) {
        const todoElement = createTodoElement(text);
        activeTodosList.appendChild(todoElement);
        newTodoInput.value = '';
        saveTodos();
        attachTodoEventListeners();
    }
}

function attachTodoEventListeners() {
    // Checkbox listeners
    document.querySelectorAll('.todo-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const todoItem = e.target.closest('.todo-item');
            todoItem.classList.toggle('completed');
            saveTodos();
        });
    });

    // Archive button listeners
    document.querySelectorAll('.archive-todo').forEach(button => {
        button.addEventListener('click', (e) => {
            const todoItem = e.target.closest('.todo-item');
            if (isArchiveVisible) {
                activeTodosList.appendChild(todoItem);
            } else {
                archivedTodosList.appendChild(todoItem);
            }
            saveTodos();
        });
    });

    // Delete button listeners
    document.querySelectorAll('.delete-todo').forEach(button => {
        button.addEventListener('click', (e) => {
            const todoItem = e.target.closest('.todo-item');
            todoItem.remove();
            saveTodos();
        });
    });
}

addTodoBtn.addEventListener('click', addTodo);
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