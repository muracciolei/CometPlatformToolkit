// CometPlatform API Tester Module
// Allows safe HTTP requests to allowed external APIs
// All requests and responses are logged and supervised

(function() {
    'use strict';

    // Allowed API domains/URLs for safety (whitelist)
    const ALLOWED_DOMAINS = [
        'jsonplaceholder.typicode.com',
        'api.github.com',
        'httpbin.org',
        'reqres.in',
        'api.openweathermap.org',
        'api.coingecko.com',
        'dog.ceo',
        'cat-fact.herokuapp.com'
    ];

    // API Tester state
    let requestHistory = [];
    let requestCounter = 0;

    // Logging function (integrates with main UI)
    function logActivity(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [API-TESTER] [${level.toUpperCase()}] ${message}`;
        
        // Log to console
        console.log(logEntry);
        
        // Attempt to log to main UI if available
        try {
            if (window.parent && window.parent.logActivity) {
                window.parent.logActivity(`API-TESTER: ${message}`, level);
            } else if (window.logActivity) {
                window.logActivity(`API-TESTER: ${message}`, level);
            }
        } catch (e) {
            console.warn('Could not log to main UI:', e);
        }
        
        return logEntry;
    }

    // Validate URL against allowed domains
    function isUrlAllowed(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            
            // Check if hostname matches any allowed domain
            return ALLOWED_DOMAINS.some(domain => 
                hostname === domain || hostname.endsWith('.' + domain)
            );
        } catch (e) {
            logActivity(`Invalid URL format: ${url}`, 'error');
            return false;
        }
    }

    // Sanitize and validate request method
    function validateMethod(method) {
        const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
        const sanitized = method.toUpperCase().trim();
        
        if (!validMethods.includes(sanitized)) {
            logActivity(`Invalid HTTP method: ${method}`, 'error');
            return null;
        }
        
        return sanitized;
    }

    // Sanitize headers input
    function sanitizeHeaders(headersInput) {
        try {
            if (!headersInput || headersInput.trim() === '') {
                return {};
            }
            
            const headers = JSON.parse(headersInput);
            
            // Validate headers object
            if (typeof headers !== 'object' || Array.isArray(headers)) {
                throw new Error('Headers must be a JSON object');
            }
            
            // Remove potentially dangerous headers
            const dangerousHeaders = ['host', 'connection', 'origin'];
            const sanitized = {};
            
            for (const [key, value] of Object.entries(headers)) {
                if (!dangerousHeaders.includes(key.toLowerCase())) {
                    sanitized[key] = String(value);
                }
            }
            
            return sanitized;
        } catch (e) {
            logActivity(`Invalid headers JSON: ${e.message}`, 'error');
            throw new Error('Headers must be valid JSON object');
        }
    }

    // Sanitize request body
    function sanitizeBody(bodyInput, contentType) {
        try {
            if (!bodyInput || bodyInput.trim() === '') {
                return null;
            }
            
            // If content-type suggests JSON, validate it
            if (contentType && contentType.includes('application/json')) {
                JSON.parse(bodyInput); // Validate JSON
            }
            
            return bodyInput;
        } catch (e) {
            logActivity(`Invalid request body: ${e.message}`, 'error');
            throw new Error('Request body must be valid JSON for application/json content type');
        }
    }

    // Main function to send HTTP request
    async function sendRequest(url, method, headers, body) {
        requestCounter++;
        const requestId = `REQ-${requestCounter}-${Date.now()}`;
        
        logActivity(`Starting request ${requestId}: ${method} ${url}`, 'info');
        
        try {
            // Validate URL
            if (!isUrlAllowed(url)) {
                throw new Error(`URL not allowed. Only these domains are permitted: ${ALLOWED_DOMAINS.join(', ')}`);
            }
            
            // Validate method
            const validatedMethod = validateMethod(method);
            if (!validatedMethod) {
                throw new Error(`Invalid HTTP method: ${method}`);
            }
            
            // Sanitize headers
            const sanitizedHeaders = sanitizeHeaders(headers);
            
            // Sanitize body
            const contentType = sanitizedHeaders['Content-Type'] || sanitizedHeaders['content-type'];
            const sanitizedBody = sanitizeBody(body, contentType);
            
            // Prepare fetch options
            const fetchOptions = {
                method: validatedMethod,
                headers: sanitizedHeaders,
                mode: 'cors'
            };
            
            // Add body for methods that support it
            if (sanitizedBody && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(validatedMethod)) {
                fetchOptions.body = sanitizedBody;
            }
            
            logActivity(`Request ${requestId} validated. Sending...`, 'info');
            
            // Send request
            const startTime = Date.now();
            const response = await fetch(url, fetchOptions);
            const duration = Date.now() - startTime;
            
            // Get response headers
            const responseHeaders = {};
            response.headers.forEach((value, key) => {
                responseHeaders[key] = value;
            });
            
            // Get response body
            const contentTypeHeader = response.headers.get('content-type') || '';
            let responseBody;
            
            if (contentTypeHeader.includes('application/json')) {
                responseBody = await response.json();
            } else if (contentTypeHeader.includes('text/')) {
                responseBody = await response.text();
            } else {
                responseBody = await response.text();
            }
            
            // Create response object
            const result = {
                requestId,
                request: {
                    url,
                    method: validatedMethod,
                    headers: sanitizedHeaders,
                    body: sanitizedBody
                },
                response: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: responseHeaders,
                    body: responseBody
                },
                duration,
                timestamp: new Date().toISOString()
            };
            
            // Store in history
            requestHistory.push(result);
            
            // Log success
            logActivity(`Request ${requestId} completed: ${response.status} ${response.statusText} (${duration}ms)`, 'success');
            
            return result;
            
        } catch (error) {
            // Log error
            logActivity(`Request ${requestId} failed: ${error.message}`, 'error');
            
            const errorResult = {
                requestId,
                request: {
                    url,
                    method,
                    headers,
                    body
                },
                error: {
                    message: error.message,
                    name: error.name
                },
                timestamp: new Date().toISOString()
            };
            
            requestHistory.push(errorResult);
            throw error;
        }
    }

    // Get request history
    function getRequestHistory() {
        return [...requestHistory];
    }

    // Clear request history
    function clearHistory() {
        requestHistory = [];
        logActivity('Request history cleared', 'info');
    }

    // Export allowed domains for UI display
    function getAllowedDomains() {
        return [...ALLOWED_DOMAINS];
    }

    // Integration hooks for other modules
    const integrationHooks = {
        // Hook for File Manager to save responses
        onResponseReceived: [],
        
        // Hook for Terminal to log requests
        onRequestSent: [],
        
        // Hook for Code Editor to display formatted responses
        onDataFormatted: []
    };

    // Register integration hook
    function registerHook(hookName, callback) {
        if (integrationHooks[hookName]) {
            integrationHooks[hookName].push(callback);
            logActivity(`Hook registered: ${hookName}`, 'info');
        } else {
            logActivity(`Unknown hook: ${hookName}`, 'warn');
        }
    }

    // Trigger integration hooks
    function triggerHooks(hookName, data) {
        if (integrationHooks[hookName]) {
            integrationHooks[hookName].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    logActivity(`Hook error (${hookName}): ${e.message}`, 'error');
                }
            });
        }
    }

    // Initialize API Tester
    function init() {
        logActivity('API Tester Module initialized', 'info');
        logActivity(`Allowed domains: ${ALLOWED_DOMAINS.join(', ')}`, 'info');
    }

    // Public API
    window.APITester = {
        sendRequest,
        getRequestHistory,
        clearHistory,
        getAllowedDomains,
        isUrlAllowed,
        registerHook,
        logActivity,
        init
    };

    // Auto-initialize
    init();

})();