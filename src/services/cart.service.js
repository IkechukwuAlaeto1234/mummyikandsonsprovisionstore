import { CartItem, Order } from '../models/index.js';
import { StorageService } from './storage.service.js';
import { EventEmitter } from '../utils/eventEmitter.js';
import { CurrencyUtils } from '../utils/index.js';
import { nigerianConfig } from '../config/index.js';

/**
 * Shopping Cart Service
 * Handles cart management and order processing
 * Solves: Order Chaos - No systematic order tracking/fulfillment process
 */
export class CartService extends EventEmitter {
  constructor() {
    super();
    this.storage = new StorageService('cart');
    this.items = new Map();
    this.customer = null;
    this.shippingAddress = null;
    this.selectedRegion = null;
    this.selectedPaymentMethod = null;
    this.discountCode = null;
    this.initialized = false;
  }

  // Initialize cart service
  async initialize() {
    try {
      await this.storage.initialize();
      await this.loadCart();
      this.setupAutoSave();
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize cart service:', error);
      throw error;
    }
  }

  // Load cart from storage
  async loadCart() {
    try {
      const cartData = (await this.storage.getItem('cartData')) || {};

      // Load cart items
      const items = cartData.items || [];
      items.forEach((itemData) => {
        const cartItem = new CartItem(itemData);
        this.items.set(cartItem.product.id, cartItem);
      });

      // Load other cart data
      this.customer = cartData.customer || null;
      this.shippingAddress = cartData.shippingAddress || null;
      this.selectedRegion = cartData.selectedRegion || null;
      this.selectedPaymentMethod = cartData.selectedPaymentMethod || null;
      this.discountCode = cartData.discountCode || null;

      this.emit('cartLoaded', this.getCartSummary());
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  }

  // Save cart to storage
  async saveCart() {
    try {
      const cartData = {
        items: Array.from(this.items.values()),
        customer: this.customer,
        shippingAddress: this.shippingAddress,
        selectedRegion: this.selectedRegion,
        selectedPaymentMethod: this.selectedPaymentMethod,
        discountCode: this.discountCode,
        lastUpdated: new Date(),
      };

      await this.storage.setItem('cartData', cartData);
      this.emit('cartSaved');
    } catch (error) {
      console.error('Failed to save cart:', error);
    }
  }

  // Setup auto-save functionality
  setupAutoSave() {
    // Auto-save cart every 30 seconds
    setInterval(() => {
      if (this.items.size > 0) {
        this.saveCart();
      }
    }, 30000);

    // Save cart when page is about to unload
    window.addEventListener('beforeunload', () => {
      this.saveCart();
    });
  }

  // Add item to cart
  async addItem(product, quantity = 1, options = {}) {
    try {
      if (!product || !product.id) {
        throw new Error('Invalid product');
      }

      if (quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      if (!product.isInStock(quantity)) {
        throw new Error(`Insufficient stock. Available: ${product.stock}`);
      }

      const existingItem = this.items.get(product.id);

      if (existingItem) {
        // Update existing item quantity
        const newQuantity = existingItem.quantity + quantity;

        if (!product.isInStock(newQuantity)) {
          throw new Error(
            `Cannot add ${quantity} more. Only ${product.stock - existingItem.quantity} available`
          );
        }

        existingItem.quantity = newQuantity;
        existingItem.selectedOptions = {
          ...existingItem.selectedOptions,
          ...options,
        };
      } else {
        // Add new item
        const cartItem = new CartItem({
          product,
          quantity,
          selectedOptions: options,
        });
        const validation = cartItem.validate();

        if (!validation.isValid) {
          throw new Error(`Invalid cart item: ${validation.errors.join(', ')}`);
        }

        this.items.set(product.id, cartItem);
      }

      await this.saveCart();

      this.emit('itemAdded', {
        product,
        quantity,
        cartSummary: this.getCartSummary(),
      });

      return this.items.get(product.id);
    } catch (error) {
      this.emit('addItemError', { error, product, quantity });
      throw error;
    }
  }

  // Remove item from cart
  async removeItem(productId) {
    try {
      const item = this.items.get(productId);
      if (!item) {
        throw new Error('Item not found in cart');
      }

      this.items.delete(productId);
      await this.saveCart();

      this.emit('itemRemoved', {
        item,
        cartSummary: this.getCartSummary(),
      });

      return true;
    } catch (error) {
      this.emit('removeItemError', { error, productId });
      throw error;
    }
  }

  // Update item quantity
  async updateItemQuantity(productId, quantity) {
    try {
      if (quantity <= 0) {
        return await this.removeItem(productId);
      }

      const item = this.items.get(productId);
      if (!item) {
        throw new Error('Item not found in cart');
      }

      if (!item.product.isInStock(quantity)) {
        throw new Error(`Insufficient stock. Available: ${item.product.stock}`);
      }

      item.quantity = quantity;
      await this.saveCart();

      this.emit('itemQuantityUpdated', {
        productId,
        quantity,
        cartSummary: this.getCartSummary(),
      });

      return item;
    } catch (error) {
      this.emit('updateQuantityError', { error, productId, quantity });
      throw error;
    }
  }

  // Clear cart
  async clearCart() {
    try {
      this.items.clear();
      this.discountCode = null;
      await this.saveCart();

      this.emit('cartCleared');
      return true;
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    }
  }

  // Get cart items
  getItems() {
    return Array.from(this.items.values());
  }

  // Get item count
  getItemCount() {
    return Array.from(this.items.values()).reduce(
      (total, item) => total + item.quantity,
      0
    );
  }

  // Calculate subtotal
  getSubtotal() {
    return Array.from(this.items.values()).reduce(
      (total, item) => total + item.getTotalPrice(),
      0
    );
  }

  // Calculate shipping fee
  getShippingFee() {
    if (!this.selectedRegion) {
      return 0;
    }

    const region = nigerianConfig.regions.find(
      (r) => r.name === this.selectedRegion
    );
    return region ? region.deliveryFee : 0;
  }

  // Calculate tax (VAT)
  getTax() {
    return CurrencyUtils.calculateVAT(this.getSubtotal());
  }

  // Apply discount
  getDiscountAmount() {
    if (!this.discountCode) {
      return 0;
    }

    // Simple discount logic (can be expanded)
    const discounts = {
      FIRST10: 0.1, // 10% off
      SAVE5: 0.05, // 5% off
      BULK20: 0.2, // 20% off for bulk orders
    };

    const discountRate = discounts[this.discountCode] || 0;
    const subtotal = this.getSubtotal();

    return subtotal * discountRate;
  }

  // Calculate total
  getTotal() {
    const subtotal = this.getSubtotal();
    const shippingFee = this.getShippingFee();
    const tax = this.getTax();
    const discount = this.getDiscountAmount();

    return subtotal + shippingFee + tax - discount;
  }

  // Get cart summary
  getCartSummary() {
    return {
      itemCount: this.getItemCount(),
      subtotal: this.getSubtotal(),
      shippingFee: this.getShippingFee(),
      tax: this.getTax(),
      discount: this.getDiscountAmount(),
      total: this.getTotal(),
      formattedSubtotal: CurrencyUtils.formatNaira(this.getSubtotal()),
      formattedShippingFee: CurrencyUtils.formatNaira(this.getShippingFee()),
      formattedTax: CurrencyUtils.formatNaira(this.getTax()),
      formattedDiscount: CurrencyUtils.formatNaira(this.getDiscountAmount()),
      formattedTotal: CurrencyUtils.formatNaira(this.getTotal()),
      items: this.getItems(),
    };
  }

  // Set customer information
  setCustomer(customer) {
    this.customer = customer;
    this.saveCart();
    this.emit('customerUpdated', customer);
  }

  // Set shipping address
  setShippingAddress(address) {
    this.shippingAddress = address;

    // Auto-select region based on address
    const region = nigerianConfig.regions.find(
      (r) =>
        address.state &&
        address.state.toLowerCase().includes(r.name.toLowerCase())
    );

    if (region) {
      this.selectedRegion = region.name;
    }

    this.saveCart();
    this.emit('shippingAddressUpdated', {
      address,
      region: this.selectedRegion,
    });
  }

  // Set delivery region
  setDeliveryRegion(regionName) {
    const region = nigerianConfig.regions.find((r) => r.name === regionName);
    if (!region) {
      throw new Error('Invalid delivery region');
    }

    this.selectedRegion = regionName;
    this.saveCart();
    this.emit('deliveryRegionUpdated', region);
  }

  // Set payment method
  setPaymentMethod(paymentMethod) {
    if (!nigerianConfig.paymentMethods.includes(paymentMethod)) {
      throw new Error('Invalid payment method');
    }

    this.selectedPaymentMethod = paymentMethod;
    this.saveCart();
    this.emit('paymentMethodUpdated', paymentMethod);
  }

  // Apply discount code
  applyDiscountCode(code) {
    // Validate discount code (this would typically check against a database)
    const validCodes = ['FIRST10', 'SAVE5', 'BULK20'];

    if (!validCodes.includes(code.toUpperCase())) {
      throw new Error('Invalid discount code');
    }

    this.discountCode = code.toUpperCase();
    this.saveCart();

    this.emit('discountApplied', {
      code: this.discountCode,
      discountAmount: this.getDiscountAmount(),
      cartSummary: this.getCartSummary(),
    });
  }

  // Remove discount code
  removeDiscountCode() {
    this.discountCode = null;
    this.saveCart();
    this.emit('discountRemoved', this.getCartSummary());
  }

  // Validate cart for checkout
  validateForCheckout() {
    const errors = [];

    if (this.items.size === 0) {
      errors.push('Cart is empty');
    }

    if (!this.customer) {
      errors.push('Customer information is required');
    }

    if (!this.shippingAddress) {
      errors.push('Shipping address is required');
    }

    if (!this.selectedRegion) {
      errors.push('Delivery region must be selected');
    }

    if (!this.selectedPaymentMethod) {
      errors.push('Payment method must be selected');
    }

    // Validate each cart item
    this.items.forEach((item) => {
      const itemValidation = item.validate();
      if (!itemValidation.isValid) {
        errors.push(
          `${item.product.name}: ${itemValidation.errors.join(', ')}`
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Create order from cart
  createOrder() {
    const validation = this.validateForCheckout();
    if (!validation.isValid) {
      throw new Error(`Cannot create order: ${validation.errors.join(', ')}`);
    }

    const order = new Order({
      id: this.generateOrderId(),
      customerId: this.customer.id,
      items: Array.from(this.items.values()),
      shippingAddress: this.shippingAddress,
      billingAddress: this.shippingAddress, // Same as shipping for now
      paymentMethod: this.selectedPaymentMethod,
      status: 'pending',
      notes: '',
    });

    // Calculate totals
    order.calculateTotals();
    order.shippingFee = this.getShippingFee();
    order.calculateTotals(); // Recalculate with shipping

    return order;
  }

  // Generate unique order ID
  generateOrderId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `ORD_${timestamp}_${random}`.toUpperCase();
  }

  // Get estimated delivery date
  getEstimatedDeliveryDate() {
    if (!this.selectedRegion) {
      return null;
    }

    const region = nigerianConfig.regions.find(
      (r) => r.name === this.selectedRegion
    );
    if (!region) {
      return null;
    }

    const orderDate = new Date();
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + region.estimatedDays);

    return deliveryDate;
  }

  // Get available delivery regions
  getAvailableDeliveryRegions() {
    return nigerianConfig.regions.map((region) => ({
      ...region,
      formattedDeliveryFee: CurrencyUtils.formatNaira(region.deliveryFee),
    }));
  }

  // Check if cart meets minimum order requirements
  meetsMinimumOrder(minimumAmount = 1000) {
    return this.getSubtotal() >= minimumAmount;
  }

  // Get cart analytics
  getCartAnalytics() {
    const items = this.getItems();
    const categories = {};

    items.forEach((item) => {
      const category = item.product.category;
      if (!categories[category]) {
        categories[category] = {
          count: 0,
          value: 0,
        };
      }
      categories[category].count += item.quantity;
      categories[category].value += item.getTotalPrice();
    });

    return {
      totalItems: this.getItemCount(),
      totalValue: this.getSubtotal(),
      averageItemValue: this.getSubtotal() / this.getItemCount() || 0,
      categories,
      hasMinimumOrder: this.meetsMinimumOrder(),
      estimatedDelivery: this.getEstimatedDeliveryDate(),
    };
  }
}
