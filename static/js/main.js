// Global state
let releaseNotes = [];
let filteredNotes = [];
let selectedNote = null;

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const spinner = document.getElementById('spinner');
const btnText = document.getElementById('btn-text');
const lastUpdatedTimeEl = document.getElementById('last-updated-time');
const notesCountEl = document.getElementById('notes-count');
const searchInput = document.getElementById('search-input');
const typeFilter = document.getElementById('type-filter');
const exportCsvBtn = document.getElementById('export-csv-btn');
const themeCheckbox = document.getElementById('theme-checkbox');
const themeText = document.getElementById('theme-text');

const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const emptyState = document.getElementById('empty-state');
const clearFiltersBtn = document.getElementById('clear-filters-btn');
const notesGrid = document.getElementById('notes-grid');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const progressCircle = document.getElementById('progress-circle');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const composerTweetBtn = document.getElementById('composer-tweet-btn');

// Toast Element
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

/* ==========================================================================
   Data Fetching & Rendering
   ========================================================================== */

async function fetchNotes(refresh = false) {
    showState('loading');
    
    try {
        const url = refresh ? '/api/notes/refresh' : '/api/notes';
        const method = refresh ? 'POST' : 'GET';
        
        const response = await fetch(url, { method });
        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }
        
        const data = await response.json();
        
        releaseNotes = data.notes || [];
        
        // Format last updated time
        if (data.last_fetched) {
            const date = new Date(data.last_fetched);
            lastUpdatedTimeEl.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
        }
        
        applyFilters();
    } catch (error) {
        console.error('Error fetching release notes:', error);
        errorMessage.textContent = error.message || 'Something went wrong while fetching the release notes feed.';
        showState('error');
    }
}

function showState(state) {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    notesGrid.classList.add('hidden');
    
    if (state === 'loading') {
        loadingState.classList.remove('hidden');
        refreshBtn.disabled = true;
        spinner.classList.remove('hidden');
        btnText.textContent = 'Updating...';
    } else if (state === 'error') {
        errorState.classList.remove('hidden');
        resetRefreshBtn();
    } else if (state === 'empty') {
        emptyState.classList.remove('hidden');
        resetRefreshBtn();
    } else if (state === 'grid') {
        notesGrid.classList.remove('hidden');
        resetRefreshBtn();
    }
}

function resetRefreshBtn() {
    refreshBtn.disabled = false;
    spinner.classList.add('hidden');
    btnText.textContent = 'Refresh Feed';
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const filterType = typeFilter.value;
    
    filteredNotes = releaseNotes.filter(note => {
        // Search Term Filter
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = note.content_html;
        const textContent = (tempDiv.textContent || tempDiv.innerText || '').toLowerCase();
        const dateContent = note.date.toLowerCase();
        const matchesSearch = textContent.includes(searchTerm) || dateContent.includes(searchTerm) || note.type.toLowerCase().includes(searchTerm);
        
        // Category Filter
        const matchesCategory = filterType === 'ALL' || note.type.toLowerCase() === filterType.toLowerCase();
        
        return matchesSearch && matchesCategory;
    });
    
    notesCountEl.textContent = filteredNotes.length;
    renderNotesGrid();
}

function renderNotesGrid() {
    if (filteredNotes.length === 0) {
        showState('empty');
        return;
    }
    
    notesGrid.innerHTML = '';
    
    filteredNotes.forEach(note => {
        const card = document.createElement('article');
        
        // Assign categories class for border highlight styling
        const catClass = `cat-${note.type.toLowerCase().replace(/\s+/g, '-')}`;
        card.className = `note-card ${catClass}`;
        
        // Render content
        card.innerHTML = `
            <div class="card-header">
                <span class="badge badge-${note.type.toLowerCase().replace(/\s+/g, '-')}" id="badge-${note.id}">${note.type}</span>
                <span class="card-date">${note.date}</span>
            </div>
            <div class="card-content">
                ${note.content_html}
            </div>
            <div class="card-actions">
                <a href="${note.link}" class="link-source" target="_blank" rel="noopener noreferrer" id="source-link-${note.id}">Source Link ↗</a>
                <div class="card-buttons">
                    <button class="btn-copy-card" data-id="${note.id}" id="copy-btn-${note.id}">
                        <span class="copy-icon">📋</span> Copy
                    </button>
                    <button class="btn-share" data-id="${note.id}" id="share-btn-${note.id}">
                        <span class="share-icon">🐦</span> Share
                    </button>
                </div>
            </div>
        `;
        
        // Ensure all rendered links open in a new tab
        card.querySelectorAll('.card-content a').forEach(link => {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        });
        
        // Add event listeners to card buttons
        card.querySelector('.btn-copy-card').addEventListener('click', () => {
            copyCardContent(note);
        });
        
        card.querySelector('.btn-share').addEventListener('click', () => {
            openTweetModal(note);
        });
        
        notesGrid.appendChild(card);
    });
    
    showState('grid');
}

/* ==========================================================================
   Tweet Composition & Sharing
   ========================================================================== */

function stripHtml(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    // Replace multiple spaces or newlines with a single space
    return (tempDiv.textContent || tempDiv.innerText || "").replace(/\s+/g, ' ').trim();
}

function generateInitialTweetText(note) {
    const cleanText = stripHtml(note.content_html);
    
    // Construct tweet
    const prefix = `🚀 [BigQuery ${note.type}] (${note.date}): `;
    const suffix = `\n\nRead more: ${note.link}`;
    
    const maxTextLen = 280 - prefix.length - suffix.length;
    
    let text = cleanText;
    if (text.length > maxTextLen) {
        text = text.substring(0, maxTextLen - 3) + '...';
    }
    
    return `${prefix}${text}${suffix}`;
}

function openTweetModal(note) {
    selectedNote = note;
    const initialText = generateInitialTweetText(note);
    tweetTextarea.value = initialText;
    updateCharCounter();
    
    tweetModal.classList.remove('hidden');
    tweetTextarea.focus();
}

function closeTweetModal() {
    tweetModal.classList.add('hidden');
    selectedNote = null;
}

function updateCharCounter() {
    const textLen = tweetTextarea.value.length;
    const remaining = 280 - textLen;
    
    charCounter.textContent = remaining;
    
    // Progress Ring styling and percentage calculations
    const radius = 11;
    const circumference = 2 * Math.PI * radius; // 69.115
    const offset = circumference - (Math.min(textLen, 280) / 280) * circumference;
    progressCircle.style.strokeDashoffset = offset;
    
    // Color warnings based on remaining characters
    if (remaining < 0) {
        charCounter.className = 'char-counter danger';
        progressCircle.style.stroke = '#ef4444';
        composerTweetBtn.disabled = true;
    } else if (remaining <= 20) {
        charCounter.className = 'char-counter warning';
        progressCircle.style.stroke = '#f59e0b';
        composerTweetBtn.disabled = false;
    } else {
        charCounter.className = 'char-counter';
        progressCircle.style.stroke = '#1d9bf0';
        composerTweetBtn.disabled = false;
    }
}

function postToTwitter() {
    const text = tweetTextarea.value;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420');
}

function copyTweetToClipboard() {
    navigator.clipboard.writeText(tweetTextarea.value)
        .then(() => {
            showToast('Draft copied to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            showToast('Failed to copy text.');
        });
}

function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    // Allow animation to play
    setTimeout(() => {
        toast.classList.add('show');
    }, 50);
    
    // Hide toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 2500);
}

function copyCardContent(note) {
    const cleanText = stripHtml(note.content_html);
    const formattedText = `[BigQuery ${note.type}] (${note.date})\n\n${cleanText}\n\nRead more: ${note.link}`;
    navigator.clipboard.writeText(formattedText)
        .then(() => {
            showToast('Copied release note to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            showToast('Failed to copy text.');
        });
}

function exportToCSV() {
    if (filteredNotes.length === 0) {
        showToast('No notes to export.');
        return;
    }
    
    const headers = ['ID', 'Date', 'Category', 'Content', 'Link'];
    const rows = filteredNotes.map(note => [
        note.id,
        note.date,
        note.type,
        stripHtml(note.content_html),
        note.link
    ]);
    
    // Convert array values into CSV format with escaping
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery_release_notes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported to CSV successfully!');
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */

refreshBtn.addEventListener('click', () => fetchNotes(true));
retryBtn.addEventListener('click', () => fetchNotes(true));

searchInput.addEventListener('input', applyFilters);
typeFilter.addEventListener('change', applyFilters);
exportCsvBtn.addEventListener('click', exportToCSV);

clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    typeFilter.value = 'ALL';
    applyFilters();
});

// Modal Events
closeModalBtn.addEventListener('click', closeTweetModal);
tweetModal.addEventListener('click', (e) => {
    if (e.target === tweetModal) {
        closeTweetModal();
    }
});

tweetTextarea.addEventListener('input', updateCharCounter);
composerTweetBtn.addEventListener('click', postToTwitter);
copyTweetBtn.addEventListener('click', copyTweetToClipboard);

// Theme Switcher Events
themeCheckbox.addEventListener('change', () => {
    if (themeCheckbox.checked) {
        document.body.classList.add('light-theme');
        themeText.textContent = 'Light Mode';
        localStorage.setItem('theme', 'light');
    } else {
        document.body.classList.remove('light-theme');
        themeText.textContent = 'Dark Mode';
        localStorage.setItem('theme', 'dark');
    }
});

// Keyboard Events
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !tweetModal.classList.contains('hidden')) {
        closeTweetModal();
    }
    
    // Press '/' to focus the search input box
    if (e.key === '/' && document.activeElement !== searchInput && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInput.focus();
    }
});

// Load Feed & Theme on init
window.addEventListener('DOMContentLoaded', () => {
    // Initialize Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        themeCheckbox.checked = true;
        document.body.classList.add('light-theme');
        themeText.textContent = 'Light Mode';
    } else {
        themeCheckbox.checked = false;
        document.body.classList.remove('light-theme');
        themeText.textContent = 'Dark Mode';
    }
    
    fetchNotes();
});

