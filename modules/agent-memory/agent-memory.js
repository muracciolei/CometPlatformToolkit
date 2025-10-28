/**
 * Agent Memory Module
 * Provides persistent and retrievable state management for agents
 * in the Comet Platform.
 */

class AgentMemory {
  constructor(storageKey = 'comet_agent_memory') {
    this.storageKey = storageKey;
    this.memory = new Map();
    this.sessions = new Map();
    this.currentSessionId = null;
    this.eventBus = null;
    this._loadFromStorage();
  }

  /**
   * Initialize with event bus
   * @param {Object} eventBus - Event bus instance
   */
  init(eventBus) {
    this.eventBus = eventBus;
    console.log('[AgentMemory] Initialized');
  }

  /**
   * Start a new session
   * @param {Object} metadata - Session metadata
   * @returns {string} Session ID
   */
  startSession(metadata = {}) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session = {
      id: sessionId,
      startTime: Date.now(),
      metadata,
      memories: [],
      context: {}
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;

    if (this.eventBus) {
      this.eventBus.emit('memory:session:started', { sessionId });
    }

    console.log(`[AgentMemory] Started session: ${sessionId}`);
    return sessionId;
  }

  /**
   * End the current session
   */
  endSession() {
    if (!this.currentSessionId) {
      console.warn('[AgentMemory] No active session to end');
      return;
    }

    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      session.endTime = Date.now();
      session.duration = session.endTime - session.startTime;
    }

    if (this.eventBus) {
      this.eventBus.emit('memory:session:ended', { sessionId: this.currentSessionId });
    }

    console.log(`[AgentMemory] Ended session: ${this.currentSessionId}`);
    this.currentSessionId = null;
    this._saveToStorage();
  }

  /**
   * Store a memory item
   * @param {string} key - Memory key
   * @param {*} value - Memory value
   * @param {Object} options - Storage options
   */
  store(key, value, options = {}) {
    const memory = {
      key,
      value,
      timestamp: Date.now(),
      sessionId: this.currentSessionId,
      ttl: options.ttl || null,
      metadata: options.metadata || {}
    };

    this.memory.set(key, memory);

    // Add to current session if one is active
    if (this.currentSessionId) {
      const session = this.sessions.get(this.currentSessionId);
      if (session) {
        session.memories.push(key);
      }
    }

    if (this.eventBus) {
      this.eventBus.emit('memory:stored', { key, sessionId: this.currentSessionId });
    }

    if (!options.skipSave) {
      this._saveToStorage();
    }

    console.log(`[AgentMemory] Stored memory: ${key}`);
  }

  /**
   * Retrieve a memory item
   * @param {string} key - Memory key
   * @returns {*} Memory value or null
   */
  recall(key) {
    const memory = this.memory.get(key);
    
    if (!memory) {
      return null;
    }

    // Check TTL
    if (memory.ttl && (Date.now() - memory.timestamp) > memory.ttl) {
      this.forget(key);
      return null;
    }

    return memory.value;
  }

  /**
   * Remove a memory item
   * @param {string} key - Memory key
   */
  forget(key) {
    const deleted = this.memory.delete(key);
    
    if (deleted) {
      if (this.eventBus) {
        this.eventBus.emit('memory:forgotten', { key });
      }
      this._saveToStorage();
      console.log(`[AgentMemory] Forgot memory: ${key}`);
    }
  }

  /**
   * Search memories by criteria
   * @param {Function|Object} criteria - Search criteria
   * @returns {Array} Matching memories
   */
  search(criteria) {
    const results = [];

    for (const [key, memory] of this.memory.entries()) {
      let matches = false;

      if (typeof criteria === 'function') {
        matches = criteria(memory);
      } else if (typeof criteria === 'object') {
        matches = this._matchesCriteria(memory, criteria);
      }

      if (matches) {
        results.push({ key, ...memory });
      }
    }

    return results;
  }

  /**
   * Get session context
   * @param {string} sessionId - Session ID (defaults to current)
   * @returns {Object} Session context
   */
  getContext(sessionId = null) {
    const sid = sessionId || this.currentSessionId;
    if (!sid) return {};

    const session = this.sessions.get(sid);
    return session ? session.context : {};
  }

  /**
   * Update session context
   * @param {string} key - Context key
   * @param {*} value - Context value
   * @param {string} sessionId - Session ID (defaults to current)
   */
  updateContext(key, value, sessionId = null) {
    const sid = sessionId || this.currentSessionId;
    if (!sid) {
      console.warn('[AgentMemory] No session to update context');
      return;
    }

    const session = this.sessions.get(sid);
    if (session) {
      session.context[key] = value;
      this._saveToStorage();
    }
  }

  /**
   * Get all memories for a session
   * @param {string} sessionId - Session ID
   * @returns {Array} Session memories
   */
  getSessionMemories(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return session.memories
      .map(key => ({
        key,
        ...this.memory.get(key)
      }))
      .filter(m => m.value !== undefined);
  }

  /**
   * Get memory statistics
   * @returns {Object} Memory statistics
   */
  getStats() {
    return {
      totalMemories: this.memory.size,
      totalSessions: this.sessions.size,
      activeSessions: this.currentSessionId ? 1 : 0,
      currentSessionId: this.currentSessionId,
      storageSize: this._estimateStorageSize()
    };
  }

  /**
   * Clear all memories
   * @param {boolean} includeSessions - Also clear sessions
   */
  clear(includeSessions = false) {
    this.memory.clear();
    
    if (includeSessions) {
      this.sessions.clear();
      this.currentSessionId = null;
    }

    this._saveToStorage();
    console.log('[AgentMemory] Cleared memories');

    if (this.eventBus) {
      this.eventBus.emit('memory:cleared', { includeSessions });
    }
  }

  /**
   * Export all data
   * @returns {Object} Exported data
   */
  export() {
    return {
      memories: Array.from(this.memory.entries()),
      sessions: Array.from(this.sessions.entries()),
      currentSessionId: this.currentSessionId,
      exportTime: Date.now()
    };
  }

  /**
   * Import data
   * @param {Object} data - Data to import
   */
  import(data) {
    if (data.memories) {
      this.memory = new Map(data.memories);
    }
    if (data.sessions) {
      this.sessions = new Map(data.sessions);
    }
    if (data.currentSessionId) {
      this.currentSessionId = data.currentSessionId;
    }

    this._saveToStorage();
    console.log('[AgentMemory] Imported data');
  }

  // Private methods

  _matchesCriteria(memory, criteria) {
    for (const [key, value] of Object.entries(criteria)) {
      if (memory[key] !== value) {
        return false;
      }
    }
    return true;
  }

  _loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.memories) {
          this.memory = new Map(data.memories);
        }
        if (data.sessions) {
          this.sessions = new Map(data.sessions);
        }
        console.log('[AgentMemory] Loaded from storage');
      }
    } catch (error) {
      console.error('[AgentMemory] Failed to load from storage:', error);
    }
  }

  _saveToStorage() {
    try {
      const data = {
        memories: Array.from(this.memory.entries()),
        sessions: Array.from(this.sessions.entries())
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('[AgentMemory] Failed to save to storage:', error);
    }
  }

  _estimateStorageSize() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? data.length : 0;
    } catch (error) {
      return 0;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AgentMemory;
} else {
  window.AgentMemory = AgentMemory;
}
