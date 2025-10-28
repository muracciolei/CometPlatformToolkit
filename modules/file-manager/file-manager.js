/* File Manager Module - sandboxed operations within comet-platform/ */
(function () {
  const ROOT_DIR = 'comet-platform';

  // Hooks for integration
  const hooks = {
    onOpenInEditor: null, // (path) => void
    onRevealInTerminal: null, // (path) => void
  };

  // Utilities
  function logActivity(message, data = null, level = 'info') {
    try {
      const event = { module: 'file-manager', level, message, data, timestamp: new Date().toISOString() };
      console[level === 'error' ? 'error' : 'log']('[FileManager]', message, data || '');
      // UI log bridge
      window.dispatchEvent(new CustomEvent('comet-log', { detail: event }));
      // Progress log bridge for roadmap
      window.dispatchEvent(new CustomEvent('comet-progress', { detail: event }));
    } catch (e) {
      console.error('[FileManager] logActivity failed', e);
    }
  }

  function isPathSafe(path) {
    if (typeof path !== 'string') return false;
    const normalized = path.replace(/\\/g, '/').replace(/\/+/g, '/');
    if (normalized.includes('..')) return false;
    return normalized === ROOT_DIR || normalized.startsWith(ROOT_DIR + '/');
  }

  // File system adapter (browser/VSCode web: use localStorage mock as fallback)
  const fs = (function () {
    const mem = new Map();
    function key(p) { return `fm:${p}`; }
    function ensureRoot() {
      if (!mem.has(ROOT_DIR)) mem.set(ROOT_DIR, { type: 'dir', children: new Set() });
    }
    ensureRoot();

    return {
      list(dirPath) {
        ensureRoot();
        const k = key(dirPath);
        const node = mem.get(dirPath) || JSON.parse(localStorage.getItem(k) || 'null');
        if (!node || node.type !== 'dir') throw new Error('Not a directory');
        return Array.from(node.children || []);
      },
      exists(p) {
        return mem.has(p) || !!localStorage.getItem(key(p));
      },
      readNode(p) {
        return mem.get(p) || JSON.parse(localStorage.getItem(key(p)) || 'null');
      },
      writeNode(p, node) {
        mem.set(p, node);
        localStorage.setItem(key(p), JSON.stringify(node));
      },
      deleteNode(p) {
        mem.delete(p);
        localStorage.removeItem(key(p));
      },
      mkdir(p) {
        if (this.exists(p)) throw new Error('Already exists');
        this.writeNode(p, { type: 'dir', children: new Set() });
        // Persist children set as array for storage
        const n = this.readNode(p);
        n.children = new Set();
        this.writeNode(p, { type: 'dir', children: [] });
      },
      touch(p) {
        if (this.exists(p)) throw new Error('Already exists');
        this.writeNode(p, { type: 'file', content: '' });
      },
      rename(oldPath, newPath) {
        const node = this.readNode(oldPath);
        if (!node) throw new Error('Source not found');
        if (this.exists(newPath)) throw new Error('Target exists');
        this.writeNode(newPath, node);
        this.deleteNode(oldPath);
      },
      rm(p) {
        const node = this.readNode(p);
        if (!node) return; // noop
        this.deleteNode(p);
      },
      writeFile(p, content) {
        this.writeNode(p, { type: 'file', content: String(content ?? '') });
      },
      readFile(p) {
        const n = this.readNode(p);
        if (!n || n.type !== 'file') throw new Error('Not a file');
        return n.content || '';
      }
    };
  })();

  // Core operations (sandboxed)
  const api = {
    list(dir = ROOT_DIR) {
      if (!isPathSafe(dir)) throw new Error('Unsafe path');
      try {
        const items = fs.list(dir);
        logActivity(`List: ${dir}`, { dir, items });
        return items;
      } catch (e) {
        logActivity(`List failed: ${dir}`, { error: e.message }, 'error');
        throw e;
      }
    },
    create({ type, name, parent = ROOT_DIR }) {
      if (!name) throw new Error('Name required');
      const path = `${parent}/${name}`.replace(/\/+/g, '/');
      if (!isPathSafe(path)) throw new Error('Unsafe path');
      try {
        if (type === 'folder') {
          fs.mkdir(path);
        } else {
          fs.touch(path);
        }
        logActivity(`Create ${type}: ${path}`, { type, path });
        return path;
      } catch (e) {
        logActivity(`Create failed: ${path}`, { error: e.message }, 'error');
        throw e;
      }
    },
    rename(oldPath, newName) {
      const parent = oldPath.split('/').slice(0, -1).join('/') || ROOT_DIR;
      const newPath = `${parent}/${newName}`.replace(/\/+/g, '/');
      if (!isPathSafe(oldPath) || !isPathSafe(newPath)) throw new Error('Unsafe path');
      try {
        fs.rename(oldPath, newPath);
        logActivity(`Rename: ${oldPath} -> ${newPath}`, { oldPath, newPath });
        return newPath;
      } catch (e) {
        logActivity(`Rename failed: ${oldPath}`, { error: e.message }, 'error');
        throw e;
      }
    },
    remove(path) {
      if (!isPathSafe(path)) throw new Error('Unsafe path');
      try {
        fs.rm(path);
        logActivity(`Delete: ${path}`, { path });
      } catch (e) {
        logActivity(`Delete failed: ${path}`, { error: e.message }, 'error');
        throw e;
      }
    },
    // Hooks usage
    openInEditor(path) {
      if (!isPathSafe(path)) throw new Error('Unsafe path');
      logActivity('Open in editor requested', { path });
      if (typeof hooks.onOpenInEditor === 'function') hooks.onOpenInEditor(path);
      // Also request hub to open in code-editor if hub is present
      try {
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: 'request', from: 'file-manager', target: 'code-editor', action: 'open', params: { path } }, '*');
          logActivity('Requested hub to open file in code-editor', { path });
        }
      } catch (e) {
        logActivity('Failed to request hub to open file in code-editor', { error: e.message }, 'error');
      }
    },
    revealInTerminal(path) {
      if (!isPathSafe(path)) throw new Error('Unsafe path');
      logActivity('Reveal in terminal requested', { path });
      if (typeof hooks.onRevealInTerminal === 'function') hooks.onRevealInTerminal(path);
    },
    hooks,
  };

  // UI wiring (expects elements in file-manager.html)
  function initUI() {
    const container = document.querySelector('#file-manager');
    if (!container) return;

    const tree = container.querySelector('[data-role="tree"]');
    const btnCreateFile = container.querySelector('[data-action="create-file"]');
    const btnCreateFolder = container.querySelector('[data-action="create-folder"]');
    const btnRename = container.querySelector('[data-action="rename"]');
    const btnDelete = container.querySelector('[data-action="delete"]');

    let selectedPath = null;

    function render() {
      // Simple flat render from storage for demo purposes
      tree.innerHTML = '';
      const ul = document.createElement('ul');
      ul.className = 'fm-list';

      // Gather nodes
      const keys = Object.keys(localStorage).filter(k => k.startsWith('fm:'));
      const paths = new Set([ROOT_DIR]);
      for (const k of keys) {
        const p = k.slice(3);
        if (isPathSafe(p)) paths.add(p);
      }

      Array.from(paths).sort().forEach(p => {
        const li = document.createElement('li');
        const node = fs.readNode(p);
        const isDir = node && node.type === 'dir';
        li.textContent = p;
        li.dataset.path = p;
        li.className = 'fm-item ' + (isDir ? 'dir' : 'file');
        if (p === selectedPath) li.classList.add('selected');
        li.tabIndex = 0;
        li.addEventListener('click', () => { selectedPath = p; render(); });
        li.addEventListener('dblclick', () => {
          if (node && node.type === 'file') api.openInEditor(p);
        });
        ul.appendChild(li);
      });

      tree.appendChild(ul);
      logActivity('UI render file tree', { count: ul.children.length });
    }

    btnCreateFile?.addEventListener('click', () => {
      const name = prompt('New file name');
      if (!name) return;
      try { api.create({ type: 'file', name }); render(); } catch (e) { alert(e.message); }
    });
    btnCreateFolder?.addEventListener('click', () => {
      const name = prompt('New folder name');
      if (!name) return;
      try { api.create({ type: 'folder', name }); render(); } catch (e) { alert(e.message); }
    });
    btnRename?.addEventListener('click', () => {
      if (!selectedPath) return alert('Select an item first');
      const newName = prompt('New name', selectedPath.split('/').pop());
      if (!newName) return;
      try { api.rename(selectedPath, newName); selectedPath = null; render(); } catch (e) { alert(e.message); }
    });
    btnDelete?.addEventListener('click', () => {
      if (!selectedPath) return alert('Select an item first');
      if (!confirm(`Delete ${selectedPath}?`)) return;
      try { api.remove(selectedPath); selectedPath = null; render(); } catch (e) { alert(e.message); }
    });

    // Initial render
    try { api.list(ROOT_DIR); } catch {}
    render();
  }

  // Expose API
  window.CometFileManager = { ...api, initUI };

  // Register with hub (main window) if available
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'register', module: 'file-manager' }, '*');
    }
  } catch (e) {
    console.warn('FileManager: failed to register with hub', e);
  }

  // Handle incoming routed requests from hub
  window.addEventListener('message', function(event) {
    const d = event.data || {};
    if (!d || d.type !== 'request') return;

    (async () => {
      const requestId = d.requestId || null;
      const replyTo = d._replyTo || null; // original requester module name

      try {
        let result = null;
        switch (d.action) {
          case 'list':
            result = api.list(d.params?.dir || ROOT_DIR);
            break;
          case 'read':
            result = api.hooks && api.hooks.readFile ? api.hooks.readFile(d.params.path) : (function(){
              try { return fs.readFile(d.params.path); } catch(e){ throw e; }
            })();
            break;
          case 'write':
            api.hooks && api.hooks.writeFile ? api.hooks.writeFile(d.params.path, d.params.content) : fs.writeFile(d.params.path, d.params.content);
            result = { success: true };
            break;
          case 'openInEditor':
            api.openInEditor(d.params.path);
            result = { opened: true };
            break;
          default:
            throw new Error('Unsupported action: ' + d.action);
        }

        // Reply via hub (post back to event.source which is hub)
        event.source.postMessage({ type: 'response', requestId, result, _replyTo: replyTo }, '*');
        logActivity(`Handled request: ${d.action}`, { action: d.action, params: d.params });
      } catch (err) {
        event.source.postMessage({ type: 'response', requestId, error: err.message, _replyTo: replyTo }, '*');
        logActivity(`Request failed: ${d.action}`, { action: d.action, error: err.message }, 'error');
      }
    })();
  });
  // Auto-init when file-manager view is present
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }

  logActivity('File Manager loaded and initialized', { root: ROOT_DIR });
})();