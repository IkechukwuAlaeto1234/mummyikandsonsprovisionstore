/**
 * Product Model
 * Represents a product in the inventory system
 */
export class Product {
  constructor({
    id,
    name,
    description,
    price,
    category,
    stock,
    images = [],
    tags = [],
    weight = 0,
    dimensions = {},
    supplier = '',
    sku = '',
    isActive = true,
    discount = 0,
    rating = 0,
    reviewCount = 0,
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.price = parseFloat(price);
    this.category = category;
    this.stock = parseInt(stock);
    this.images = images;
    this.tags = tags;
    this.weight = parseFloat(weight);
    this.dimensions = dimensions;
    this.supplier = supplier;
    this.sku = sku;
    this.isActive = isActive;
    this.discount = parseFloat(discount);
    this.rating = parseFloat(rating);
    this.reviewCount = parseInt(reviewCount);
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Calculate discounted price
  getDiscountedPrice() {
    if (this.discount > 0) {
      return this.price * (1 - this.discount / 100);
    }
    return this.price;
  }

  // Check if product is in stock
  isInStock(quantity = 1) {
    return this.stock >= quantity && this.isActive;
  }

  // Update stock quantity
  updateStock(quantity) {
    if (this.stock + quantity < 0) {
      throw new Error('Insufficient stock');
    }
    this.stock += quantity;
    this.updatedAt = new Date();
    return this.stock;
  }

  // Get formatted price in Nigerian Naira
  getFormattedPrice() {
    const price = this.getDiscountedPrice();
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  }

  // Validate product data
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length < 2) {
      errors.push('Product name must be at least 2 characters');
    }

    if (!this.price || this.price <= 0) {
      errors.push('Price must be greater than 0');
    }

    if (!this.category || this.category.trim().length === 0) {
      errors.push('Category is required');
    }

    if (this.stock < 0) {
      errors.push('Stock cannot be negative');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Cart Item Model
 */
export class CartItem {
  constructor({ product, quantity = 1, selectedOptions = {} }) {
    this.product = product;
    this.quantity = parseInt(quantity);
    this.selectedOptions = selectedOptions;
    this.addedAt = new Date();
  }

  // Calculate total price for this cart item
  getTotalPrice() {
    return this.product.getDiscountedPrice() * this.quantity;
  }

  // Get formatted total price
  getFormattedTotalPrice() {
    const total = this.getTotalPrice();
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(total);
  }

  // Validate cart item
  validate() {
    const errors = [];

    if (!this.product) {
      errors.push('Product is required');
    }

    if (this.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (this.product && !this.product.isInStock(this.quantity)) {
      errors.push('Insufficient stock for this quantity');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Customer Model
 */
export class Customer {
  constructor({
    id,
    firstName,
    lastName,
    email,
    phone,
    addresses = [],
    dateOfBirth = null,
    preferredLanguage = 'en',
    loyaltyPoints = 0,
    isActive = true,
  }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.phone = phone;
    this.addresses = addresses;
    this.dateOfBirth = dateOfBirth;
    this.preferredLanguage = preferredLanguage;
    this.loyaltyPoints = parseInt(loyaltyPoints);
    this.isActive = isActive;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  // Get full name
  getFullName() {
    return `${this.firstName} ${this.lastName}`.trim();
  }

  // Add address
  addAddress(address) {
    this.addresses.push({
      ...address,
      id: Date.now().toString(),
      createdAt: new Date(),
    });
    this.updatedAt = new Date();
  }

  // Get primary address
  getPrimaryAddress() {
    return this.addresses.find((addr) => addr.isPrimary) || this.addresses[0];
  }

  // Validate customer data
  validate() {
    const errors = [];

    if (!this.firstName || this.firstName.trim().length < 2) {
      errors.push('First name must be at least 2 characters');
    }

    if (!this.lastName || this.lastName.trim().length < 2) {
      errors.push('Last name must be at least 2 characters');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.email || !emailRegex.test(this.email)) {
      errors.push('Valid email address is required');
    }

    const phoneRegex = /^\+?234[0-9]{10}$/;
    if (!this.phone || !phoneRegex.test(this.phone.replace(/\s/g, ''))) {
      errors.push('Valid Nigerian phone number is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Order Model
 */
export class Order {
  constructor({
    id,
    customerId,
    items = [],
    shippingAddress,
    billingAddress,
    paymentMethod,
    status = 'pending',
    subtotal = 0,
    shippingFee = 0,
    tax = 0,
    total = 0,
    notes = '',
  }) {
    this.id = id;
    this.customerId = customerId;
    this.items = items;
    this.shippingAddress = shippingAddress;
    this.billingAddress = billingAddress;
    this.paymentMethod = paymentMethod;
    this.status = status;
    this.subtotal = parseFloat(subtotal);
    this.shippingFee = parseFloat(shippingFee);
    this.tax = parseFloat(tax);
    this.total = parseFloat(total);
    this.notes = notes;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.tracking = {
      number: '',
      carrier: '',
      events: [],
    };
  }

  // Calculate order totals
  calculateTotals() {
    this.subtotal = this.items.reduce(
      (sum, item) => sum + item.getTotalPrice(),
      0
    );
    this.tax = this.subtotal * 0.075; // 7.5% VAT in Nigeria
    this.total = this.subtotal + this.shippingFee + this.tax;
    this.updatedAt = new Date();
    return {
      subtotal: this.subtotal,
      shippingFee: this.shippingFee,
      tax: this.tax,
      total: this.total,
    };
  }

  // Update order status
  updateStatus(newStatus, note = '') {
    const validStatuses = [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid order status');
    }

    this.status = newStatus;
    this.updatedAt = new Date();

    // Add tracking event
    this.tracking.events.push({
      status: newStatus,
      timestamp: new Date(),
      note,
    });
  }

  // Get formatted total
  getFormattedTotal() {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(this.total);
  }

  // Validate order
  validate() {
    const errors = [];

    if (!this.customerId) {
      errors.push('Customer ID is required');
    }

    if (!this.items || this.items.length === 0) {
      errors.push('Order must contain at least one item');
    }

    if (!this.shippingAddress) {
      errors.push('Shipping address is required');
    }

    if (!this.paymentMethod) {
      errors.push('Payment method is required');
    }

    // Validate each item
    this.items.forEach((item, index) => {
      const itemValidation = item.validate();
      if (!itemValidation.isValid) {
        errors.push(`Item ${index + 1}: ${itemValidation.errors.join(', ')}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
