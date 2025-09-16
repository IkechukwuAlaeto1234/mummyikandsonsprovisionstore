import { Product, CartItem, Customer, Order } from '../src/models/index.js';

describe('Product Model', () => {
  let product;

  beforeEach(() => {
    product = new Product({
      id: 'test_001',
      name: 'Test Product',
      description: 'A test product',
      price: 1000,
      category: 'Test',
      stock: 50,
      images: ['test.jpg'],
      tags: ['test'],
      weight: 1,
      supplier: 'Test Supplier',
      sku: 'TEST-001',
    });
  });

  test('should create a product with valid data', () => {
    expect(product.id).toBe('test_001');
    expect(product.name).toBe('Test Product');
    expect(product.price).toBe(1000);
    expect(product.stock).toBe(50);
  });

  test('should calculate discounted price correctly', () => {
    product.discount = 10; // 10% discount
    expect(product.getDiscountedPrice()).toBe(900);
  });

  test('should check stock availability', () => {
    expect(product.isInStock(10)).toBe(true);
    expect(product.isInStock(60)).toBe(false);
  });

  test('should update stock correctly', () => {
    product.updateStock(-10);
    expect(product.stock).toBe(40);
  });

  test('should throw error for insufficient stock', () => {
    expect(() => {
      product.updateStock(-60);
    }).toThrow('Insufficient stock');
  });

  test('should validate product data', () => {
    const validation = product.validate();
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('should fail validation for invalid data', () => {
    const invalidProduct = new Product({
      id: 'invalid',
      name: '', // Invalid: empty name
      price: -100, // Invalid: negative price
      category: '', // Invalid: empty category
      stock: -5, // Invalid: negative stock
    });

    const validation = invalidProduct.validate();
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});

describe('CartItem Model', () => {
  let product;
  let cartItem;

  beforeEach(() => {
    product = new Product({
      id: 'test_001',
      name: 'Test Product',
      price: 1000,
      stock: 50,
    });

    cartItem = new CartItem({
      product,
      quantity: 2,
    });
  });

  test('should create a cart item', () => {
    expect(cartItem.product).toBe(product);
    expect(cartItem.quantity).toBe(2);
  });

  test('should calculate total price correctly', () => {
    expect(cartItem.getTotalPrice()).toBe(2000);
  });

  test('should validate cart item', () => {
    const validation = cartItem.validate();
    expect(validation.isValid).toBe(true);
  });

  test('should fail validation for invalid quantity', () => {
    cartItem.quantity = 0;
    const validation = cartItem.validate();
    expect(validation.isValid).toBe(false);
  });
});

describe('Customer Model', () => {
  let customer;

  beforeEach(() => {
    customer = new Customer({
      id: 'cust_001',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+2348123456789',
    });
  });

  test('should create a customer', () => {
    expect(customer.firstName).toBe('John');
    expect(customer.lastName).toBe('Doe');
    expect(customer.email).toBe('john.doe@example.com');
  });

  test('should get full name', () => {
    expect(customer.getFullName()).toBe('John Doe');
  });

  test('should validate customer data', () => {
    const validation = customer.validate();
    expect(validation.isValid).toBe(true);
  });

  test('should fail validation for invalid email', () => {
    customer.email = 'invalid-email';
    const validation = customer.validate();
    expect(validation.isValid).toBe(false);
  });

  test('should fail validation for invalid phone', () => {
    customer.phone = 'invalid-phone';
    const validation = customer.validate();
    expect(validation.isValid).toBe(false);
  });
});

describe('Order Model', () => {
  let order;
  let product;
  let cartItem;

  beforeEach(() => {
    product = new Product({
      id: 'test_001',
      name: 'Test Product',
      price: 1000,
      stock: 50,
    });

    cartItem = new CartItem({
      product,
      quantity: 2,
    });

    order = new Order({
      id: 'order_001',
      customerId: 'cust_001',
      items: [cartItem],
      shippingAddress: {
        street: '123 Test St',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
      },
      paymentMethod: 'paystack',
    });
  });

  test('should create an order', () => {
    expect(order.id).toBe('order_001');
    expect(order.customerId).toBe('cust_001');
    expect(order.items).toHaveLength(1);
  });

  test('should calculate order totals', () => {
    const totals = order.calculateTotals();
    expect(totals.subtotal).toBe(2000);
    expect(totals.tax).toBe(150); // 7.5% VAT
    expect(totals.total).toBe(2150);
  });

  test('should update order status', () => {
    order.updateStatus('confirmed', 'Order confirmed by customer');
    expect(order.status).toBe('confirmed');
    expect(order.tracking.events).toHaveLength(1);
  });

  test('should validate order', () => {
    const validation = order.validate();
    expect(validation.isValid).toBe(true);
  });

  test('should fail validation for missing data', () => {
    order.customerId = null;
    order.items = [];
    const validation = order.validate();
    expect(validation.isValid).toBe(false);
  });
});