const $ = id => document.getElementById(id);
const surfleCheckbox   = $('surfleMode');
const bookmarksCheckbox= $('bookmarksMode');
const randomCheckbox   = $('randomMode');
const folderSelect     = $('bookmarksFolderSelect');
const startBtn         = $('startBtn');
const prevBtn          = $('prevBtn');
const nextBtn          = $('nextBtn');

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

function loadFolders() {
  folderSelect.innerHTML = '<option>Loading folders...</option>';
  chrome.runtime.sendMessage({ action: 'getWebringFolders' }, res => {
    const folders = res && res.folders ? res.folders : [];
    folderSelect.innerHTML = '';
    if (folders.length) {
      folders.forEach(f => {
        const o = document.createElement('option');
        o.value = f.id; o.textContent = f.title;
        folderSelect.appendChild(o);
      });
      chrome.storage.sync.get('selectedFolderId', data => {
        if (data.selectedFolderId && folders.some(f => f.id === data.selectedFolderId)) {
          folderSelect.value = data.selectedFolderId;
        } else {
          folderSelect.value = folders[0].id;
          chrome.runtime.sendMessage({ action: 'setSelectedFolder', folderId: folders[0].id });
        }
      });
    } else {
      const o = document.createElement('option');
      o.textContent = 'No webring folders'; o.disabled = true;
      folderSelect.appendChild(o);
    }
  });
}

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
  chrome.runtime.sendMessage({ action: 'setSelectedFolder', folderId: folderSelect.value });
});

startBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'toggleStart' }, res => {
    if (res && typeof res.started !== 'undefined') {
      updateUI(res.started);
    }
  });
});

prevBtn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'goPrev' }));
nextBtn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'goNext' }));

chrome.storage.sync.get(['surfleMode', 'started', 'randomMode'], data => {
  const mode = data.surfleMode !== false;
  surfleCheckbox.checked    = mode;
  bookmarksCheckbox.checked = !mode;
  randomCheckbox.checked    = data.randomMode || false;
  updateUI(data.started || false);
  if (bookmarksCheckbox.checked) loadFolders();
});
