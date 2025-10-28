// Terminal Module - Safe Command Execution Simulation
// This module simulates terminal command execution in a safe sandboxed environment
// NO REAL SYSTEM COMMANDS ARE EXECUTED

(function() {
    'use strict';

    // Command history for logging and display
    let commandHistory = [];
    // Pending hub requests (requestId -> { resolve })
    const pendingRequests = {};
    
    // Mock file system for simulation
    const mockFileSystem = {
        '/': ['home', 'var', 'etc', 'usr', 'tmp'],
        '/home': ['user', 'projects'],
        '/home/user': ['documents', 'downloads', 'CometPlatform'],
        '/home/user/CometPlatform': ['comet-platform', 'README.md'],
        '/home/user/CometPlatform/comet-platform': ['modules', 'public', 'roadmap.md'],
        '/home/user/CometPlatform/comet-platform/modules': ['terminal', 'code-editor', 'file-manager', 'api-tester']
    };
    
    let currentDirectory = '/home/user/CometPlatform/comet-platform';

    /**
     * Log activity to both UI and console
     * This function ensures all terminal activities are monitored and visible
     */
    function logActivity(type, message, details = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type,
            message,
            details
        };
        
        // Log to console
        console.log(`[Terminal ${type}] ${timestamp}: ${message}`, details);
        
        // Log to UI (if activity log element exists)
        const activityLog = document.getElementById('activity-log');
        if (activityLog) {
            const logElement = document.createElement('div');
            logElement.className = `log-entry log-${type.toLowerCase()}`;
            logElement.textContent = `[${timestamp}] ${type}: ${message}`;
            activityLog.appendChild(logElement);
            activityLog.scrollTop = activityLog.scrollHeight;
        }
        
        return logEntry;
    }

    /**
     * Simulate 'ls' command - list directory contents
     */
    function simulateLs(args) {
        const path = args[0] || currentDirectory;
        const contents = mockFileSystem[path];
        
        if (contents) {
            return contents.join('  ');
        } else {
            return `ls: cannot access '${path}': No such file or directory`;
        }
    }

    /**
     * Simulate 'pwd' command - print working directory
     */
    function simulatePwd() {
        return currentDirectory;
    }

    /**
     * Simulate 'cd' command - change directory
     */
    function simulateCd(args) {
        if (args.length === 0) {
            currentDirectory = '/home/user';
            return '';
        }
        
        const targetPath = args[0];
        if (mockFileSystem[targetPath]) {
            currentDirectory = targetPath;
            return '';
        } else {
            return `cd: no such file or directory: ${targetPath}`;
        }
    }

    /**
     * Simulate 'echo' command - display text
     */
    function simulateEcho(args) {
        return args.join(' ');
    }

    /**
     * Simulate 'date' command - display current date/time
     */
    function simulateDate() {
        return new Date().toString();
    }

    /**
     * Simulate 'whoami' command - display current user
     */
    function simulateWhoami() {
        return 'comet-user (simulated)';
    }

    /**
     * Simulate 'help' command - show available commands
     */
    function simulateHelp() {
        return `Available simulated commands:
  ls [path]       - List directory contents
  pwd             - Print working directory
  cd [path]       - Change directory
  echo [text]     - Display text
  date            - Show current date and time
  whoami          - Show current user
  clear           - Clear terminal output
  history         - Show command history
  help            - Show this help message

⚠️  SAFETY NOTICE: All commands are simulated in a safe sandbox.
No real system commands are executed.`;
    }

    /**
     * Main command execution function
     * Receives input, simulates output, and logs all activity
     */
    async function executeCommand(commandString) {
            // Log command input
            logActivity('INPUT', `Command received: ${commandString}`);

            // Parse command
            const parts = commandString.trim().split(/\s+/);
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);

            let output = '';

            // Helper to send request via hub and wait for response
            function sendHubRequest(payload) {
                return new Promise((resolve) => {
                    try {
                        const id = 'req-' + Math.random().toString(36).slice(2, 9);
                        payload.requestId = id;
                        // Store resolver
                        pendingRequests[id] = { resolve };
                        // Send to opener (hub)
                        if (window.opener && !window.opener.closed) {
                            window.opener.postMessage(payload, '*');
                        } else {
                            // No hub - immediate failure
                            resolve({ error: 'Hub not available' });
                            delete pendingRequests[id];
                        }
                    } catch (e) {
                        resolve({ error: e.message });
                    }
                });
            }

            // Execute simulated command
            switch (command) {
            case 'ls':
                                    // Attempt to list via File Manager through hub
                                    try {
                                            const dir = args[0] || currentDirectory;
                                            // request routed to file-manager
                                            // eslint-disable-next-line no-await-in-loop
                                            const resp = await sendHubRequest({ type: 'request', from: 'terminal', target: 'file-manager', action: 'list', params: { dir } });
                                            if (resp && resp.error) {
                                                    output = `ls: error: ${resp.error}`;
                                            } else if (resp && resp.result) {
                                                    output = Array.isArray(resp.result) ? resp.result.join('  ') : String(resp.result);
                                            } else {
                                                    output = simulateLs(args);
                                            }
                                    } catch (e) {
                                            output = simulateLs(args);
                                    }
                break;
            case 'pwd':
                output = simulatePwd();
                break;
            case 'cd':
                output = simulateCd(args);
                break;
            case 'echo':
                output = simulateEcho(args);
                break;
            case 'date':
                output = simulateDate();
                break;
            case 'whoami':
                output = simulateWhoami();
                break;
            case 'clear':
                output = '__CLEAR__';
                break;
            case 'history':
                output = commandHistory.map((cmd, idx) => `${idx + 1}  ${cmd}`).join('\n');
                break;
            case 'cat':
                if (args.length === 0) {
                    output = 'cat: missing file operand';
                    break;
                }
                try {
                    const path = args[0];
                    const resp = await sendHubRequest({ type: 'request', from: 'terminal', target: 'file-manager', action: 'read', params: { path } });
                    if (resp && resp.error) {
                        output = `cat: ${resp.error}`;
                    } else if (resp && resp.result) {
                        output = String(resp.result);
                    } else {
                        output = `cat: could not read ${path}`;
                    }
                } catch (e) {
                    output = `cat: error: ${e.message}`;
                }
                break;
            case 'help':
                output = simulateHelp();
                break;
            case '':
                output = '';
                break;
            default:
                output = `Command not found: ${command}\nType 'help' for available commands.`;
                break;
        }
        
        // Log command output
        logActivity('OUTPUT', `Command executed: ${command}`, { args, output });

        // Add to history
        if (commandString.trim()) {
            commandHistory.push(commandString);
        }

        return {
            command: commandString,
            output: output,
            directory: currentDirectory
        };
    }

    /**
     * Initialize terminal module
     */
    function initTerminal() {
        logActivity('SYSTEM', 'Terminal module initialized');
        logActivity('WARNING', '⚠️ SAFETY MODE: All commands are simulated. No real system operations.');
        logActivity('SUPERVISOR', 'Supervisor monitoring enabled: All terminal activities are logged and visible.');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', setupTerminalUI);
        } else {
            setupTerminalUI();
        }
    }

    /**
     * Setup terminal UI interactions
     */
    function setupTerminalUI() {
        const commandInput = document.getElementById('terminal-input');
        const outputDisplay = document.getElementById('terminal-output');
        const terminalForm = document.getElementById('terminal-form');
        
        if (!commandInput || !outputDisplay) {
            console.warn('Terminal UI elements not found. Ensure terminal.html is properly loaded.');
            return;
        }
        
        // Handle form submission
        if (terminalForm) {
            terminalForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const commandString = commandInput.value;
                if (!commandString.trim()) return;
                
                // Display command in output
                const commandLine = document.createElement('div');
                commandLine.className = 'terminal-command-line';
                commandLine.textContent = `$ ${commandString}`;
                outputDisplay.appendChild(commandLine);
                
                // Execute command
                const result = await executeCommand(commandString);
                
                // Display output (unless it's a clear command)
                if (result.output === '__CLEAR__') {
                    outputDisplay.innerHTML = '';
                } else if (result.output) {
                    const outputLine = document.createElement('div');
                    outputLine.className = 'terminal-output-line';
                    outputLine.textContent = result.output;
                    outputDisplay.appendChild(outputLine);
                }
                
                // Clear input
                commandInput.value = '';
                
                // Scroll to bottom
                outputDisplay.scrollTop = outputDisplay.scrollHeight;
            });
        }
        
        // Display welcome message
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'terminal-welcome';
        welcomeMessage.textContent = `CometPlatform Terminal [Simulation Mode]\nType 'help' for available commands.\n⚠️ All commands are simulated. No real system operations.\n`;
        outputDisplay.appendChild(welcomeMessage);
        
        logActivity('UI', 'Terminal UI initialized and ready for input');
    }

    // Export functions for external use
    window.TerminalModule = {
        executeCommand,
        logActivity,
        initTerminal
    };

    // Register with hub (main window) if available
    try {
        if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'register', module: 'terminal' }, '*');
        }
    } catch (e) {
        console.warn('Terminal: failed to register with hub', e);
    }

    // Handle responses from hub
    window.addEventListener('message', function(event) {
        const d = event.data || {};
        if (!d) return;
        if (d.type === 'response' && d.requestId) {
            const p = pendingRequests[d.requestId];
            if (p && typeof p.resolve === 'function') {
                p.resolve(d);
                delete pendingRequests[d.requestId];
            }
        }
    });
    // Auto-initialize when script loads
    initTerminal();

    logActivity('MODULE', 'Terminal module loaded successfully');
})();