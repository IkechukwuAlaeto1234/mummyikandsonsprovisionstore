import localforage from 'localforage';

/**
 * Storage Service
 * Handles data persistence with fallback strategies
 * Supports offline functionality
 */
export class StorageService {
  constructor(namespace = 'mummyik') {
    this.namespace = namespace;
    this.store = localforage.createInstance({
      name: 'MummyIKStore',
      storeName: namespace,
      description: 'Local storage for Mummy IK & Sons Provision Store',
    });
    this.cache = new Map();
    this.initialized = false;
  }

  // Initialize storage
  async initialize() {
    try {
      await this.store.ready();
      this.initialized = true;
      console.log(`Storage initialized for namespace: ${this.namespace}`);
    } catch (error) {
      console.error('Storage initialization failed:', error);
      throw error;
    }
  }

  // Set item with caching
  async setItem(key, value) {
    try {
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        version: '1.0',
      });

      await this.store.setItem(key, serializedValue);
      this.cache.set(key, value);

      return true;
    } catch (error) {
      console.error(`Failed to set item ${key}:`, error);
      throw error;
    }
  }

  // Get item with caching
  async getItem(key) {
    try {
      // Check cache first
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }

      const serializedValue = await this.store.getItem(key);
      if (!serializedValue) {
        return null;
      }

      const parsed = JSON.parse(serializedValue);
      const value = parsed.data;

      // Update cache
      this.cache.set(key, value);

      return value;
    } catch (error) {
      console.error(`Failed to get item ${key}:`, error);
      return null;
    }
  }

  // Remove item
  async removeItem(key) {
    try {
      await this.store.removeItem(key);
      this.cache.delete(key);
      return true;
    } catch (error) {
      console.error(`Failed to remove item ${key}:`, error);
      throw error;
    }
  }

  // Clear all data
  async clear() {
    try {
      await this.store.clear();
      this.cache.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }

  // Get all keys
  async keys() {
    try {
      return await this.store.keys();
    } catch (error) {
      console.error('Failed to get keys:', error);
      return [];
    }
  }

  // Get storage size info
  async getStorageInfo() {
    try {
      const keys = await this.keys();
      let totalSize = 0;

      for (const key of keys) {
        const value = await this.store.getItem(key);
        totalSize += new Blob([value]).size;
      }

      return {
        itemCount: keys.length,
        totalSize,
        formattedSize: this.formatBytes(totalSize),
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }

  // Format bytes for display
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Export data for backup
  async exportData() {
    try {
      const keys = await this.keys();
      const data = {};

      for (const key of keys) {
        data[key] = await this.getItem(key);
      }

      return {
        namespace: this.namespace,
        exportedAt: new Date().toISOString(),
        version: '1.0',
        data,
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  // Import data from backup
  async importData(backupData) {
    try {
      if (backupData.namespace !== this.namespace) {
        throw new Error('Namespace mismatch');
      }

      for (const [key, value] of Object.entries(backupData.data)) {
        await this.setItem(key, value);
      }

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }
}
