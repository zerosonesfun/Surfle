// popup.js

const $ = id => document.getElementById(id);

const surfleCheckbox    = $('surfleMode');
const bookmarksCheckbox = $('bookmarksMode');
const randomCheckbox    = $('randomMode');
const folderSelect      = $('bookmarksFolderSelect');
const startBtn          = $('startBtn');
const prevBtn           = $('prevBtn');
const nextBtn           = $('nextBtn');
const settingsBtn       = $('settingsBtn');

// Update UI based on whether Surfle is running
function updateUI(started) {
  surfleCheckbox.disabled    = started;
  bookmarksCheckbox.disabled = started;
  randomCheckbox.disabled    = started;
  folderSelect.disabled      = !bookmarksCheckbox.checked || started;
  startBtn.textContent       = started ? 'Stop Surfle' : 'Start Surfle';
  prevBtn.disabled           = !started;
  nextBtn.disabled           = !started;
  folderSelect.style.display = bookmarksCheckbox.checked ? 'block' : 'none';
}

// Load all bookmark folders whose title includes "webring"
function loadFolders() {
  folderSelect.innerHTML = '<option>Loading folders...</option>';
  chrome.runtime.sendMessage({ action: 'getWebringFolders' }, res => {
    const folders = res?.folders || [];
    folderSelect.innerHTML = '';
    if (folders.length) {
      folders.forEach(f => {
        const o = document.createElement('option');
        o.value = f.id;
        o.textContent = f.title;
        folderSelect.appendChild(o);
      });
      // Restore last-selected folder or default to first
      chrome.storage.sync.get('selectedFolderId', data => {
        if (data.selectedFolderId && folders.some(f => f.id === data.selectedFolderId)) {
          folderSelect.value = data.selectedFolderId;
        } else {
          const defaultId = folders[0].id;
          folderSelect.value = defaultId;
          chrome.runtime.sendMessage({ action: 'setSelectedFolder', folderId: defaultId });
        }
      });
    } else {
      const o = document.createElement('option');
      o.textContent = 'No webring folders';
      o.disabled = true;
      folderSelect.appendChild(o);
    }
  });
}

// Event listeners

surfleCheckbox.addEventListener('change', () => {
  if (surfleCheckbox.checked) bookmarksCheckbox.checked = false;
  chrome.runtime.sendMessage({ action: 'toggleSurfleMode', value: surfleCheckbox.checked });
  updateUI(false);
});

bookmarksCheckbox.addEventListener('change', () => {
  if (bookmarksCheckbox.checked) surfleCheckbox.checked = false;
  chrome.runtime.sendMessage({ action: 'toggleSurfleMode', value: !bookmarksCheckbox.checked });
  updateUI(false);
  if (bookmarksCheckbox.checked) loadFolders();
});

randomCheckbox.addEventListener('change', () => {
  chrome.runtime.sendMessage({ action: 'toggleRandomMode', value: randomCheckbox.checked });
});

folderSelect.addEventListener('change', () => {
  const fid = folderSelect.value;
  if (fid) {
    chrome.runtime.sendMessage({ action: 'setSelectedFolder', folderId: fid });
  }
});

startBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'toggleStart' }, res => {
    if (res && typeof res.started !== 'undefined') {
      updateUI(res.started);
    }
  });
});

prevBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'goPrev' });
});

nextBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'goNext' });
});

settingsBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
});

// Refresh folder list when bookmarks change
chrome.bookmarks.onCreated.addListener(() => {
  if (bookmarksCheckbox.checked) loadFolders();
});
chrome.bookmarks.onRemoved.addListener(() => {
  if (bookmarksCheckbox.checked) loadFolders();
});
chrome.bookmarks.onChanged.addListener(() => {
  if (bookmarksCheckbox.checked) loadFolders();
});
chrome.bookmarks.onMoved.addListener(() => {
  if (bookmarksCheckbox.checked) loadFolders();
});

// Initialize UI on load
chrome.storage.sync.get(['surfleMode', 'started', 'randomMode'], data => {
  const mode = data.surfleMode !== false;
  surfleCheckbox.checked    = mode;
  bookmarksCheckbox.checked = !mode;
  randomCheckbox.checked    = data.randomMode || false;
  updateUI(data.started || false);
  if (bookmarksCheckbox.checked) loadFolders();
});