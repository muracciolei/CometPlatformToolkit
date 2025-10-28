/**
 * Plugin Manager Module
 * Provides dynamic plugin/extension loading and lifecycle management
 * for the Comet Platform.
 */

class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
    this.eventBus = null; // Will be injected
  }

  /**
   * Initialize the plugin manager with event bus reference
   * @param {Object} eventBus - The global event bus instance
   */
  init(eventBus) {
    this.eventBus = eventBus;
    console.log('[PluginManager] Initialized');
  }

  /**
   * Register a new plugin
   * @param {string} pluginId - Unique identifier for the plugin
   * @param {Object} pluginDefinition - Plugin configuration and hooks
   * @returns {boolean} Success status
   */
  registerPlugin(pluginId, pluginDefinition) {
    if (this.plugins.has(pluginId)) {
      console.warn(`[PluginManager] Plugin "${pluginId}" already registered`);
      return false;
    }

    const plugin = {
      id: pluginId,
      name: pluginDefinition.name || pluginId,
      version: pluginDefinition.version || '1.0.0',
      enabled: false,
      hooks: pluginDefinition.hooks || {},
      init: pluginDefinition.init || (() => {}),
      destroy: pluginDefinition.destroy || (() => {}),
      metadata: pluginDefinition.metadata || {}
    };

    this.plugins.set(pluginId, plugin);
    console.log(`[PluginManager] Registered plugin: ${pluginId}`);
    return true;
  }

  /**
   * Enable and initialize a plugin
   * @param {string} pluginId - Plugin identifier
   * @returns {Promise<boolean>} Success status
   */
  async enablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.error(`[PluginManager] Plugin "${pluginId}" not found`);
      return false;
    }

    if (plugin.enabled) {
      console.warn(`[PluginManager] Plugin "${pluginId}" already enabled`);
      return true;
    }

    try {
      await plugin.init(this.eventBus);
      plugin.enabled = true;
      
      // Register plugin hooks
      this._registerPluginHooks(pluginId, plugin.hooks);
      
      if (this.eventBus) {
        this.eventBus.emit('plugin:enabled', { pluginId });
      }
      
      console.log(`[PluginManager] Enabled plugin: ${pluginId}`);
      return true;
    } catch (error) {
      console.error(`[PluginManager] Failed to enable plugin "${pluginId}":`, error);
      return false;
    }
  }

  /**
   * Disable and clean up a plugin
   * @param {string} pluginId - Plugin identifier
   * @returns {Promise<boolean>} Success status
   */
  async disablePlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.error(`[PluginManager] Plugin "${pluginId}" not found`);
      return false;
    }

    if (!plugin.enabled) {
      console.warn(`[PluginManager] Plugin "${pluginId}" already disabled`);
      return true;
    }

    try {
      await plugin.destroy();
      plugin.enabled = false;
      
      // Unregister plugin hooks
      this._unregisterPluginHooks(pluginId);
      
      if (this.eventBus) {
        this.eventBus.emit('plugin:disabled', { pluginId });
      }
      
      console.log(`[PluginManager] Disabled plugin: ${pluginId}`);
      return true;
    } catch (error) {
      console.error(`[PluginManager] Failed to disable plugin "${pluginId}":`, error);
      return false;
    }
  }

  /**
   * Execute a specific hook across all enabled plugins
   * @param {string} hookName - Name of the hook to execute
   * @param {*} data - Data to pass to the hook
   * @returns {Promise<Array>} Array of hook results
   */
  async executeHook(hookName, data) {
    const hookHandlers = this.hooks.get(hookName) || [];
    const results = [];

    for (const { pluginId, handler } of hookHandlers) {
      const plugin = this.plugins.get(pluginId);
      if (plugin && plugin.enabled) {
        try {
          const result = await handler(data);
          results.push({ pluginId, result });
        } catch (error) {
          console.error(`[PluginManager] Hook "${hookName}" failed in plugin "${pluginId}":`, error);
        }
      }
    }

    return results;
  }

  /**
   * Get list of all plugins
   * @returns {Array} Array of plugin info objects
   */
  getPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      name: p.name,
      version: p.version,
      enabled: p.enabled,
      metadata: p.metadata
    }));
  }

  /**
   * Get specific plugin info
   * @param {string} pluginId - Plugin identifier
   * @returns {Object|null} Plugin info or null
   */
  getPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return null;
    
    return {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      enabled: plugin.enabled,
      metadata: plugin.metadata
    };
  }

  /**
   * Unregister a plugin completely
   * @param {string} pluginId - Plugin identifier
   * @returns {Promise<boolean>} Success status
   */
  async unregisterPlugin(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.error(`[PluginManager] Plugin "${pluginId}" not found`);
      return false;
    }

    if (plugin.enabled) {
      await this.disablePlugin(pluginId);
    }

    this.plugins.delete(pluginId);
    console.log(`[PluginManager] Unregistered plugin: ${pluginId}`);
    return true;
  }

  // Private methods

  _registerPluginHooks(pluginId, hooks) {
    for (const [hookName, handler] of Object.entries(hooks)) {
      if (!this.hooks.has(hookName)) {
        this.hooks.set(hookName, []);
      }
      this.hooks.get(hookName).push({ pluginId, handler });
    }
  }

  _unregisterPluginHooks(pluginId) {
    for (const [hookName, handlers] of this.hooks.entries()) {
      this.hooks.set(
        hookName,
        handlers.filter(h => h.pluginId !== pluginId)
      );
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PluginManager;
} else {
  window.PluginManager = PluginManager;
}
