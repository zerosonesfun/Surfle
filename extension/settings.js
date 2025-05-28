// settings.js

const remoteList     = document.getElementById('remoteList');
const webringFolders = document.getElementById('webringFolders');
const exportBtn      = document.getElementById('exportBtn');
const downloadLink   = document.getElementById('downloadLink');
const importArea     = document.getElementById('importArea');
const importBtn      = document.getElementById('importBtn');
const backBtn        = document.getElementById('backBtn');

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

  // 3. Filter JSON files beginning with “webring”
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

exportBtn.addEventListener('click', () => {
  const fid = webringFolders.value;
  if (!fid) return alert('Select a folder first');
  chrome.bookmarks.getSubTree(fid, nodes => {
    const json = JSON.stringify(nodes, null, 2);
    const safeTitle = nodes[0].title.replace(/[^\w\-]/g, '');
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    downloadLink.href        = url;
    downloadLink.download    = `${safeTitle}-webring.json`;
    downloadLink.textContent = 'Download JSON';
    downloadLink.style.display = 'block';
  });
});

importBtn.addEventListener('click', () => {
  let data;
  try { data = JSON.parse(importArea.value); }
  catch { return alert('Invalid JSON'); }
  if (!Array.isArray(data) || !data[0]) return alert('Bad JSON');

  const originalTitle = data[0].title || 'Imported Webring';
  const barId = '1';  // Bookmarks Bar
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
});

backBtn.addEventListener('click', () => {
  window.location.href = 'popup.html';
});

// Initialize
loadRemoteList();
loadFolders();