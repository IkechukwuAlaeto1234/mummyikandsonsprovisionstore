import { Product } from '../models/index.js';
import { StorageService } from './storage.service.js';
import { EventEmitter } from '../utils/eventEmitter.js';

/**
 * Inventory Management Service
 * Handles real-time stock tracking and management
 * Solves: Inventory Crisis - Manual stock management leads to overselling/stockouts
 */
export class InventoryService extends EventEmitter {
  constructor() {
    super();
    this.storage = new StorageService('inventory');
    this.products = new Map();
    this.lowStockThreshold = 10;
    this.reorderPoints = new Map();
    this.initialized = false;
  }

  // Initialize inventory system
  async initialize() {
    try {
      await this.loadInventory();
      this.setupStockMonitoring();
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize inventory:', error);
      throw error;
    }
  }

  // Load inventory from storage
  async loadInventory() {
    try {
      const savedProducts = (await this.storage.getItem('products')) || [];
      savedProducts.forEach((productData) => {
        const product = new Product(productData);
        this.products.set(product.id, product);
      });

      const reorderPoints = (await this.storage.getItem('reorderPoints')) || {};
      this.reorderPoints = new Map(Object.entries(reorderPoints));

      console.log(`Loaded ${this.products.size} products from storage`);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      throw error;
    }
  }

  // Save inventory to storage
  async saveInventory() {
    try {
      const productsArray = Array.from(this.products.values());
      await this.storage.setItem('products', productsArray);

      const reorderPointsObj = Object.fromEntries(this.reorderPoints);
      await this.storage.setItem('reorderPoints', reorderPointsObj);
    } catch (error) {
      console.error('Failed to save inventory:', error);
      throw error;
    }
  }

  // Add or update product
  async addProduct(productData) {
    try {
      const product = new Product(productData);
      const validation = product.validate();

      if (!validation.isValid) {
        throw new Error(
          `Invalid product data: ${validation.errors.join(', ')}`
        );
      }

      this.products.set(product.id, product);
      await this.saveInventory();

      this.emit('productAdded', product);
      this.checkStockLevels(product);

      return product;
    } catch (error) {
      console.error('Failed to add product:', error);
      throw error;
    }
  }

  // Remove product
  async removeProduct(productId) {
    try {
      const product = this.products.get(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      this.products.delete(productId);
      this.reorderPoints.delete(productId);
      await this.saveInventory();

      this.emit('productRemoved', productId);
      return true;
    } catch (error) {
      console.error('Failed to remove product:', error);
      throw error;
    }
  }

  // Get product by ID
  getProduct(productId) {
    return this.products.get(productId);
  }

  // Get all products
  getAllProducts() {
    return Array.from(this.products.values());
  }

  // Get products by category
  getProductsByCategory(category) {
    return Array.from(this.products.values()).filter(
      (product) => product.category === category
    );
  }

  // Search products
  searchProducts(query) {
    const searchTerm = query.toLowerCase();
    return Array.from(this.products.values()).filter(
      (product) =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
    );
  }

  // Update stock quantity
  async updateStock(productId, quantity, reason = 'manual_adjustment') {
    try {
      const product = this.products.get(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const previousStock = product.stock;
      const newStock = product.updateStock(quantity);

      await this.saveInventory();

      // Emit stock update event
      this.emit('stockUpdated', {
        productId,
        previousStock,
        newStock,
        quantity,
        reason,
        timestamp: new Date(),
      });

      // Check for low stock alerts
      this.checkStockLevels(product);

      return newStock;
    } catch (error) {
      console.error('Failed to update stock:', error);
      throw error;
    }
  }

  // Reserve stock for order
  async reserveStock(items) {
    const reservations = [];
    const errors = [];

    try {
      // Check availability for all items first
      for (const item of items) {
        const product = this.products.get(item.productId);
        if (!product) {
          errors.push(`Product ${item.productId} not found`);
          continue;
        }

        if (!product.isInStock(item.quantity)) {
          errors.push(
            `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
          );
        }
      }

      if (errors.length > 0) {
        throw new Error(`Stock reservation failed: ${errors.join(', ')}`);
      }

      // Reserve stock for each item
      for (const item of items) {
        const product = this.products.get(item.productId);
        await this.updateStock(
          item.productId,
          -item.quantity,
          'order_reservation'
        );

        reservations.push({
          productId: item.productId,
          quantity: item.quantity,
          reservedAt: new Date(),
        });
      }

      this.emit('stockReserved', reservations);
      return reservations;
    } catch (error) {
      // Rollback any successful reservations
      for (const reservation of reservations) {
        await this.updateStock(
          reservation.productId,
          reservation.quantity,
          'reservation_rollback'
        );
      }
      throw error;
    }
  }

  // Release reserved stock (e.g., when order is cancelled)
  async releaseStock(reservations) {
    try {
      for (const reservation of reservations) {
        await this.updateStock(
          reservation.productId,
          reservation.quantity,
          'stock_release'
        );
      }

      this.emit('stockReleased', reservations);
      return true;
    } catch (error) {
      console.error('Failed to release stock:', error);
      throw error;
    }
  }

  // Set reorder point for product
  setReorderPoint(productId, reorderPoint) {
    this.reorderPoints.set(productId, reorderPoint);
    this.saveInventory();

    const product = this.products.get(productId);
    if (product) {
      this.checkStockLevels(product);
    }
  }

  // Check stock levels and emit alerts
  checkStockLevels(product) {
    const reorderPoint =
      this.reorderPoints.get(product.id) || this.lowStockThreshold;

    if (product.stock <= 0) {
      this.emit('stockOut', {
        product,
        timestamp: new Date(),
      });
    } else if (product.stock <= reorderPoint) {
      this.emit('lowStock', {
        product,
        currentStock: product.stock,
        reorderPoint,
        timestamp: new Date(),
      });
    }
  }

  // Get low stock products
  getLowStockProducts() {
    return Array.from(this.products.values()).filter((product) => {
      const reorderPoint =
        this.reorderPoints.get(product.id) || this.lowStockThreshold;
      return product.stock <= reorderPoint && product.stock > 0;
    });
  }

  // Get out of stock products
  getOutOfStockProducts() {
    return Array.from(this.products.values()).filter(
      (product) => product.stock <= 0
    );
  }

  // Setup stock monitoring
  setupStockMonitoring() {
    // Check stock levels periodically
    setInterval(() => {
      this.products.forEach((product) => {
        this.checkStockLevels(product);
      });
    }, 60000); // Check every minute

    // Listen for stock events and log them
    this.on('lowStock', (data) => {
      console.warn(
        `Low stock alert: ${data.product.name} (${data.currentStock} remaining)`
      );
    });

    this.on('stockOut', (data) => {
      console.error(`Stock out alert: ${data.product.name} is out of stock`);
    });
  }

  // Get inventory analytics
  getInventoryAnalytics() {
    const totalProducts = this.products.size;
    const totalValue = Array.from(this.products.values()).reduce(
      (sum, product) => sum + product.price * product.stock,
      0
    );

    const lowStockCount = this.getLowStockProducts().length;
    const outOfStockCount = this.getOutOfStockProducts().length;

    const categoryBreakdown = {};
    this.products.forEach((product) => {
      if (!categoryBreakdown[product.category]) {
        categoryBreakdown[product.category] = {
          count: 0,
          value: 0,
          stock: 0,
        };
      }
      categoryBreakdown[product.category].count++;
      categoryBreakdown[product.category].value +=
        product.price * product.stock;
      categoryBreakdown[product.category].stock += product.stock;
    });

    return {
      totalProducts,
      totalValue,
      lowStockCount,
      outOfStockCount,
      categoryBreakdown,
      generatedAt: new Date(),
    };
  }

  // Bulk update products (for CSV imports, etc.)
  async bulkUpdateProducts(products) {
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const productData of products) {
      try {
        await this.addProduct(productData);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          product: productData,
          error: error.message,
        });
      }
    }

    this.emit('bulkUpdateCompleted', results);
    return results;
  }
}
