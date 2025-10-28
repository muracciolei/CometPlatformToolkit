/**
 * Event Bus Module
 * Provides unified messaging and event management across all modules
 * in the Comet Platform.
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
    this.middlewares = [];
    this.history = [];
    this.historyLimit = 100;
  }

  /**
   * Subscribe to an event
   * @param {string} eventName - Event name to subscribe to
   * @param {Function} callback - Function to call when event fires
   * @param {Object} options - Additional options (priority, filter)
   * @returns {Function} Unsubscribe function
   */
  on(eventName, callback, options = {}) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    const listener = {
      callback,
      priority: options.priority || 0,
      filter: options.filter || null,
      id: `${eventName}_${Date.now()}_${Math.random()}`
    };

    const listeners = this.listeners.get(eventName);
    listeners.push(listener);
    
    // Sort by priority (higher priority first)
    listeners.sort((a, b) => b.priority - a.priority);

    console.log(`[EventBus] Subscribed to "${eventName}"`);

    // Return unsubscribe function
    return () => this.off(eventName, listener.id);
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first fire)
   * @param {string} eventName - Event name to subscribe to
   * @param {Function} callback - Function to call when event fires
   * @returns {Function} Unsubscribe function
   */
  once(eventName, callback) {
    if (!this.onceListeners.has(eventName)) {
      this.onceListeners.set(eventName, []);
    }

    const listener = {
      callback,
      id: `${eventName}_once_${Date.now()}_${Math.random()}`
    };

    this.onceListeners.get(eventName).push(listener);
    console.log(`[EventBus] Subscribed once to "${eventName}"`);

    return () => this.offOnce(eventName, listener.id);
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Event name
   * @param {string} listenerId - Listener ID to remove
   */
  off(eventName, listenerId) {
    if (this.listeners.has(eventName)) {
      const listeners = this.listeners.get(eventName);
      const index = listeners.findIndex(l => l.id === listenerId);
      if (index !== -1) {
        listeners.splice(index, 1);
        console.log(`[EventBus] Unsubscribed from "${eventName}"`);
      }
    }
  }

  /**
   * Unsubscribe from a once event
   * @param {string} eventName - Event name
   * @param {string} listenerId - Listener ID to remove
   */
  offOnce(eventName, listenerId) {
    if (this.onceListeners.has(eventName)) {
      const listeners = this.onceListeners.get(eventName);
      const index = listeners.findIndex(l => l.id === listenerId);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit an event
   * @param {string} eventName - Event name to emit
   * @param {*} data - Data to pass to listeners
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async emit(eventName, data, options = {}) {
    const event = {
      name: eventName,
      data,
      timestamp: Date.now(),
      options
    };

    // Add to history
    this._addToHistory(event);

    // Run through middlewares
    let processedEvent = event;
    for (const middleware of this.middlewares) {
      try {
        processedEvent = await middleware(processedEvent);
        if (!processedEvent) {
          console.log(`[EventBus] Event "${eventName}" blocked by middleware`);
          return;
        }
      } catch (error) {
        console.error(`[EventBus] Middleware error for "${eventName}":`, error);
      }
    }

    // Fire regular listeners
    if (this.listeners.has(eventName)) {
      const listeners = this.listeners.get(eventName);
      for (const listener of listeners) {
        // Check filter
        if (listener.filter && !listener.filter(processedEvent.data)) {
          continue;
        }

        try {
          await listener.callback(processedEvent.data, processedEvent);
        } catch (error) {
          console.error(`[EventBus] Error in listener for "${eventName}":`, error);
        }
      }
    }

    // Fire once listeners and remove them
    if (this.onceListeners.has(eventName)) {
      const listeners = this.onceListeners.get(eventName);
      const listenersCopy = [...listeners];
      this.onceListeners.set(eventName, []);

      for (const listener of listenersCopy) {
        try {
          await listener.callback(processedEvent.data, processedEvent);
        } catch (error) {
          console.error(`[EventBus] Error in once listener for "${eventName}":`, error);
        }
      }
    }

    // Emit wildcard listeners
    if (this.listeners.has('*')) {
      const wildcardListeners = this.listeners.get('*');
      for (const listener of wildcardListeners) {
        try {
          await listener.callback(processedEvent.data, processedEvent);
        } catch (error) {
          console.error(`[EventBus] Error in wildcard listener:`, error);
        }
      }
    }
  }

  /**
   * Add middleware to process events before delivery
   * @param {Function} middleware - Middleware function
   */
  use(middleware) {
    this.middlewares.push(middleware);
    console.log('[EventBus] Middleware added');
  }

  /**
   * Remove all listeners for an event or all events
   * @param {string} eventName - Event name (optional)
   */
  clear(eventName) {
    if (eventName) {
      this.listeners.delete(eventName);
      this.onceListeners.delete(eventName);
      console.log(`[EventBus] Cleared listeners for "${eventName}"`);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
      console.log('[EventBus] Cleared all listeners');
    }
  }

  /**
   * Get event history
   * @param {string} eventName - Filter by event name (optional)
   * @param {number} limit - Max number of events to return
   * @returns {Array} Event history
   */
  getHistory(eventName, limit = 10) {
    let events = this.history;
    
    if (eventName) {
      events = events.filter(e => e.name === eventName);
    }

    return events.slice(-limit);
  }

  /**
   * Get statistics about listeners
   * @returns {Object} Listener statistics
   */
  getStats() {
    const stats = {
      totalEvents: this.listeners.size,
      totalListeners: 0,
      totalOnceListeners: 0,
      eventDetails: {}
    };

    for (const [eventName, listeners] of this.listeners.entries()) {
      stats.totalListeners += listeners.length;
      stats.eventDetails[eventName] = {
        listeners: listeners.length,
        onceListeners: this.onceListeners.get(eventName)?.length || 0
      };
    }

    for (const listeners of this.onceListeners.values()) {
      stats.totalOnceListeners += listeners.length;
    }

    return stats;
  }

  // Private methods

  _addToHistory(event) {
    this.history.push({
      name: event.name,
      timestamp: event.timestamp,
      dataType: typeof event.data
    });

    // Keep history within limit
    if (this.history.length > this.historyLimit) {
      this.history.shift();
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventBus;
} else {
  window.EventBus = EventBus;
}
