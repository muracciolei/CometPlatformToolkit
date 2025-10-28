// Code Editor Module - Functional Implementation
// All file operations are sandboxed to comet-platform/ folder
// All actions are logged via logActivity() for supervisor monitoring

let currentFilePath = '';
let projectFiles = [];

// Initialize the Code Editor module
function initCodeEditor() {
    logActivity('Code Editor', 'Module initialized');
    loadProjectFiles();
}

// Log activity to UI and console for supervisor monitoring
function logActivity(module, action) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${module}: ${action}`;
    console.log(logMessage);
    
    // Send to main UI log if parent window exists
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({
            type: 'log',
            module: module,
            action: action,
            timestamp: timestamp
        }, '*');
    }
}

// Load list of project files (sandboxed to comet-platform/ folder)
function loadProjectFiles() {
    logActivity('Code Editor', 'Loading project files list');
    
    // Simulated project file list - in production this would use File System Access API
    projectFiles = [
        'roadmap.md',
        'public/index.html',
        'public/main.js',
        'modules/README.md',
        'modules/api-tester/api-tester.html',
        'modules/api-tester/api-tester.js',
        'modules/code-editor/editor.html',
        'modules/code-editor/editor.js',
        'modules/file-manager/file-manager.html',
        'modules/file-manager/file-manager.js',
        'modules/terminal/terminal.html',
        'modules/terminal/terminal.js'
    ];
    
    populateFileList();
    logActivity('Code Editor', `Loaded ${projectFiles.length} project files`);
}

// Populate the file selection dropdown
function populateFileList() {
    const fileSelect = document.getElementById('fileSelect');
    if (!fileSelect) return;
    
    fileSelect.innerHTML = '<option value="">-- Select a file --</option>';
    
    projectFiles.forEach(file => {
        const option = document.createElement('option');
        option.value = file;
        option.textContent = file;
        fileSelect.appendChild(option);
    });
}

// Open a file for editing
function openFile() {
    const fileSelect = document.getElementById('fileSelect');
    const filePath = fileSelect.value;
    
    if (!filePath) {
        alert('Please select a file to open');
        return;
    }
    
    logActivity('Code Editor', `Opening file: ${filePath}`);
    
    // In production, this would use File System Access API to read actual file content
    // For now, we simulate file content based on file type
    let fileContent = '';
    
    if (filePath.endsWith('.html')) {
        fileContent = `<!DOCTYPE html>\n<html>\n<head>\n    <title>${filePath}</title>\n</head>\n<body>\n    <!-- File: ${filePath} -->\n</body>\n</html>`;
    } else if (filePath.endsWith('.js')) {
        fileContent = `// File: ${filePath}\n// JavaScript module\n\nfunction init() {\n    console.log('${filePath} initialized');\n}\n\ninit();`;
    } else if (filePath.endsWith('.md')) {
        fileContent = `# ${filePath}\n\nThis is a markdown file for the Comet Platform project.\n\n## Section\n\nContent here.`;
    } else {
        fileContent = `File: ${filePath}\n\nContent goes here.`;
    }
    
    const editor = document.getElementById('codeEditor');
    if (editor) {
        editor.value = fileContent;
        currentFilePath = filePath;
        logActivity('Code Editor', `File opened successfully: ${filePath}`);
    }
}

// Save current file
function saveFile() {
    if (!currentFilePath) {
        alert('No file is currently open');
        return;
    }
    
    const editor = document.getElementById('codeEditor');
    if (!editor) return;
    
    const content = editor.value;
    
    logActivity('Code Editor', `Saving file: ${currentFilePath}`);
    logActivity('Code Editor', `File size: ${content.length} characters`);
    
    // In production, this would use File System Access API to write to actual file
    // For now, we simulate the save operation
    
    // Simulate a brief delay for save operation
    setTimeout(() => {
        logActivity('Code Editor', `File saved successfully: ${currentFilePath}`);
        // Notify File Manager via hub to write the file
        try {
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'request', from: 'code-editor', target: 'file-manager', action: 'write', params: { path: currentFilePath, content } }, '*');
            }
        } catch (e) {
            logActivity('Code Editor', `Failed to notify File Manager via hub: ${e.message}`);
        }
        alert(`File saved: ${currentFilePath}`);
    }, 100);
}

// Create a new file
function createNewFile() {
    const fileName = prompt('Enter new file name (e.g., newfile.js):\n\nNote: File will be created in comet-platform/ root');
    
    if (!fileName) return;
    
    // Validate filename - must not contain path traversal attempts
    if (fileName.includes('..') || fileName.includes('\\\\') || fileName.startsWith('/')) {
        alert('Invalid filename. Please use a simple filename without path separators.');
        logActivity('Code Editor', `Invalid filename attempt blocked: ${fileName}`);
        return;
    }
    
    logActivity('Code Editor', `Creating new file: ${fileName}`);
    
    // Add to project files list
    if (!projectFiles.includes(fileName)) {
        projectFiles.push(fileName);
        populateFileList();
    }
    
    // Set as current file with empty content
    currentFilePath = fileName;
    const editor = document.getElementById('codeEditor');
    if (editor) {
        editor.value = '';
    }
    
    // Update file selector
    const fileSelect = document.getElementById('fileSelect');
    if (fileSelect) {
        fileSelect.value = fileName;
    }
    
    logActivity('Code Editor', `New file created: ${fileName}`);
}

// Clear editor
function clearEditor() {
    const editor = document.getElementById('codeEditor');
    if (editor) {
        editor.value = '';
        currentFilePath = '';
        logActivity('Code Editor', 'Editor cleared');
    }
}

// Expose an API for hub and other modules
window.CometCodeEditor = {
    openFilePath(path) {
        try {
            // Attempt to open via existing UI list if present
            const fileSelect = document.getElementById('fileSelect');
            if (fileSelect) {
                // If the path exists in projectFiles, select it
                if (!projectFiles.includes(path)) {
                    projectFiles.push(path);
                    populateFileList();
                }
                fileSelect.value = path;
            }
            currentFilePath = path;
            // Simulate loading file content (in this sandbox we don't have FS access)
            const editor = document.getElementById('codeEditor');
            if (editor) {
                editor.value = `// Opened by hub: ${path}\n\n// (Simulated content)`;
            }
            logActivity('Code Editor', `Opened file via hub: ${path}`);
            return { success: true };
        } catch (e) {
            logActivity('Code Editor', `Failed to open file via hub: ${path}`, 'error');
            return { success: false, error: e.message };
        }
    },
    saveFileContent(path, content) {
        try {
            // If the current editor has content, update it
            const editor = document.getElementById('codeEditor');
            if (editor) editor.value = content;
            currentFilePath = path;
            logActivity('Code Editor', `Saved file via hub: ${path}`);
            // Notify hub via postMessage if available
            try { if (window.opener && !window.opener.closed) window.opener.postMessage({ type: 'comet-log', module: 'code-editor', message: `File saved: ${path}` }, '*'); } catch(e){}
            return { success: true };
        } catch (e) {
            logActivity('Code Editor', `Failed to save file via hub: ${path}`, 'error');
            return { success: false, error: e.message };
        }
    }
};

// Register with hub (main window) if available
try {
    if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: 'register', module: 'code-editor' }, '*');
    }
} catch (e) {
    console.warn('CodeEditor: failed to register with hub', e);
}

// Listen for routed requests from hub
window.addEventListener('message', function(event) {
    const d = event.data || {};
    if (!d || d.type !== 'request') return;
    const requestId = d.requestId || null;
    const replyTo = d._replyTo || null;
    (async () => {
        try {
            if (d.action === 'open') {
                const res = window.CometCodeEditor.openFilePath(d.params.path);
                // reply via hub
                event.source.postMessage({ type: 'response', requestId, result: res, _replyTo: replyTo }, '*');
            } else if (d.action === 'save') {
                const res = window.CometCodeEditor.saveFileContent(d.params.path, d.params.content);
                event.source.postMessage({ type: 'response', requestId, result: res, _replyTo: replyTo }, '*');
            }
        } catch (err) {
            event.source.postMessage({ type: 'response', requestId, error: err.message, _replyTo: replyTo }, '*');
        }
    })();
});

// Initialize when module is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCodeEditor);
} else {
    initCodeEditor();
}