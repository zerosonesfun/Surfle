// settings.js

const remoteList     = document.getElementById('remoteList');
const webringFolders = document.getElementById('webringFolders');
const exportBtn      = document.getElementById('exportBtn');
const downloadLink   = document.getElementById('downloadLink');
const importArea     = document.getElementById('importArea');
const importBtn      = document.getElementById('importBtn');
const backBtn        = document.getElementById('backBtn');
const importFile     = document.getElementById('importFile');
const importError    = document.getElementById('importError');

const GITHUB_API_URL = 'https://api.github.com/repos/zerosonesfun/Surfle/contents?ref=main';
const DEFAULT_FILE   = 'webring.json';

// Helper to promisify storage.get
function getStorage(key) {
  return new Promise(resolve => {
    chrome.storage.sync.get(key, resolve);
  });
}

async function loadRemoteList() {
  remoteList.textContent = 'Loading…';

  // 1. Get the currently selected filename
  const data    = await getStorage('webringFile');
  const current = data.webringFile || DEFAULT_FILE;

  // 2. Fetch the repo directory
  let items;
  try {
    const res = await fetch(GITHUB_API_URL);
    items = await res.json();
  } catch (e) {
    remoteList.textContent = 'Error loading remote list.';
    console.error(e);
    return;
  }

  // 3. Filter JSON files beginning with "webring"
  const ringFiles = items.filter(i =>
    i.name.toLowerCase().startsWith('webring') &&
    i.name.toLowerCase().endsWith('.json')
  );
  if (!ringFiles.length) {
    remoteList.textContent = 'No remote webring JSON found.';
    return;
  }

  // 4. Build the radio list
  remoteList.innerHTML = '';
  ringFiles.forEach(file => {
    const id = `remote-${file.name}`;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <label>
        <input
          type="radio"
          name="remoteWebring"
          id="${id}"
          value="${file.name}"
          ${file.name === current ? 'checked' : ''}
        />
        ${file.name}
      </label>`;
    remoteList.appendChild(wrapper);

    document.getElementById(id).addEventListener('change', async () => {
      // 5. When changed, save to storage and tell background
      await chrome.storage.sync.set({ webringFile: file.name });
      chrome.runtime.sendMessage({
        action: 'setWebringFile',
        filename: file.name
      });
    });
  });
}

function loadFolders() {
  chrome.runtime.sendMessage({ action: 'getWebringFolders' }, res => {
    webringFolders.innerHTML = '';
    const list = res.folders || [];
    if (list.length) {
      list.forEach(f => {
        const o = document.createElement('option');
        o.value = f.id; o.textContent = f.title;
        webringFolders.append(o);
      });
    } else {
      webringFolders.innerHTML = '<option disabled>No webring folders</option>';
    }
  });
}

// Helper function to dynamically find the bookmarks bar
async function findBookmarksBar() {
  return new Promise((resolve, reject) => {
    try {
      chrome.bookmarks.getTree(nodes => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Failed to get bookmarks tree'));
          return;
        }
        
        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
          reject(new Error('No bookmarks tree found'));
          return;
        }
        
        // Look for bookmarks bar in the root nodes
        for (const root of nodes) {
          if (root.children && Array.isArray(root.children)) {
            for (const child of root.children) {
              // The bookmarks bar is typically the first child with title "Bookmarks Bar"
              if (child.title === "Bookmarks Bar") {
                resolve(child.id);
                return;
              }
            }
          }
        }
        
        // Fallback: if no "Bookmarks Bar" found, use the first available root
        if (nodes[0] && nodes[0].children && nodes[0].children[0]) {
          resolve(nodes[0].children[0].id);
          return;
        }
        
        reject(new Error('No bookmarks bar found'));
      });
    } catch (error) {
      reject(new Error(`Unexpected error: ${error.message}`));
    }
  });
}

exportBtn.addEventListener('click', () => {
  const fid = webringFolders.value;
  if (!fid) return alert('Select a folder first');
  chrome.bookmarks.getSubTree(fid, nodes => {
    const json = JSON.stringify(nodes, null, 2);
    const safeTitle = nodes[0].title.replace(/[^\w\-]/g, '');
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    downloadLink.href        = url;
    downloadLink.download    = `${safeTitle}.json`;
    downloadLink.textContent = 'Download JSON';
    downloadLink.style.display = 'block';
  });
});

// Helper: Validate the structure of imported bookmarks JSON
function isValidBookmarkNode(node) {
  if (typeof node !== 'object' || !node) return false;
  if (typeof node.title !== 'string') return false;
  if ('url' in node && typeof node.url !== 'string') return false;
  if ('children' in node) {
    if (!Array.isArray(node.children)) return false;
    return node.children.every(isValidBookmarkNode);
  }
  return true;
}

function validateImportData(data) {
  if (!Array.isArray(data) || !data[0]) return 'Top-level JSON must be a non-empty array.';
  if (!isValidBookmarkNode(data[0])) return 'Invalid bookmark structure in JSON.';
  return null;
}

// Handle file upload for import
importFile.addEventListener('change', () => {
  importError.style.display = 'none';
  importError.textContent = '';
  const file = importFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      const validationError = validateImportData(data);
      if (validationError) {
        importError.textContent = validationError;
        importError.style.display = 'block';
        return;
      }
      importArea.value = e.target.result; // Also update textarea for transparency
    } catch (err) {
      importError.textContent = 'Invalid JSON file.';
      importError.style.display = 'block';
    }
  };
  reader.readAsText(file);
});

importBtn.addEventListener('click', async () => {
  importError.style.display = 'none';
  importError.textContent = '';
  let data;
  // Prefer file input if file is selected
  if (importFile.files && importFile.files[0]) {
    try {
      data = JSON.parse(importArea.value);
    } catch {
      importError.textContent = 'Invalid JSON in file.';
      importError.style.display = 'block';
      return;
    }
  } else {
    try { data = JSON.parse(importArea.value); }
    catch { 
      importError.textContent = 'Invalid JSON in textarea.';
      importError.style.display = 'block';
      return;
    }
  }
  const validationError = validateImportData(data);
  if (validationError) {
    importError.textContent = validationError;
    importError.style.display = 'block';
    return;
  }
  const originalTitle = data[0].title || 'Imported Webring';
  try {
    const barId = await findBookmarksBar();
    chrome.bookmarks.create({ parentId: barId, title: originalTitle }, parent => {
      (function recurse(nodes, pid) {
        nodes.forEach(n => {
          if (n.url) {
            chrome.bookmarks.create({ parentId: pid, title: n.title||n.url, url: n.url });
          } else if (n.children) {
            chrome.bookmarks.create({ parentId: pid, title: n.title }, nf => recurse(n.children, nf.id));
          }
        });
      })(data[0].children||[], parent.id);
      alert(`Imported "${originalTitle}" into Bookmarks Bar`);
      loadFolders();
    });
  } catch (error) {
    importError.textContent = `Error finding bookmarks bar: ${error.message}`;
    importError.style.display = 'block';
    console.error('Import error:', error);
  }
});

backBtn.addEventListener('click', () => {
  window.location.href = 'popup.html';
});

// Initialize
loadRemoteList();
loadFolders();