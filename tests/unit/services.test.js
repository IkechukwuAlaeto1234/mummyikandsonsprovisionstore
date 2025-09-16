import { InventoryService } from '../src/services/inventory.service.js';
import { CartService } from '../src/services/cart.service.js';
import { PaymentService } from '../src/services/payment.service.js';

// Mock localStorage for testing
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

describe('InventoryService', () => {
  let inventoryService;

  beforeEach(() => {
    inventoryService = new InventoryService();
    jest.clearAllMocks();
  });

  test('should initialize inventory service', async () => {
    // Mock storage methods
    inventoryService.storage.getItem = jest.fn().mockResolvedValue([]);
    
    await inventoryService.initialize();
    expect(inventoryService.initialized).toBe(true);
  });

  test('should add product to inventory', async () => {
    inventoryService.storage.setItem = jest.fn().mockResolvedValue(true);
    
    const productData = {
      id: 'test_001',
      name: 'Test Product',
      price: 1000,
      category: 'Test',
      stock: 50,
    };

    const product = await inventoryService.addProduct(productData);
    expect(product.name).toBe('Test Product');
    expect(inventoryService.products.has('test_001')).toBe(true);
  });

  test('should update stock quantity', async () => {
    inventoryService.storage.setItem = jest.fn().mockResolvedValue(true);
    
    // Add product first
    const productData = {
      id: 'test_001',
      name: 'Test Product',
      price: 1000,
      category: 'Test',
      stock: 50,
    };
    await inventoryService.addProduct(productData);

    // Update stock
    const newStock = await inventoryService.updateStock('test_001', -10);
    expect(newStock).toBe(40);
  });

  test('should search products', async () => {
    inventoryService.storage.setItem = jest.fn().mockResolvedValue(true);
    
    // Add products
    await inventoryService.addProduct({
      id: 'rice_001',
      name: 'Premium Rice',
      price: 3500,
      category: 'Grains',
      stock: 50,
      tags: ['rice', 'grains'],
    });

    await inventoryService.addProduct({
      id: 'oil_001',
      name: 'Vegetable Oil',
      price: 4200,
      category: 'Oil',
      stock: 30,
      tags: ['oil', 'cooking'],
    });

    const results = inventoryService.searchProducts('rice');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Premium Rice');
  });
});

describe('CartService', () => {
  let cartService;
  let mockProduct;

  beforeEach(() => {
    cartService = new CartService();
    cartService.storage.getItem = jest.fn().mockResolvedValue(null);
    cartService.storage.setItem = jest.fn().mockResolvedValue(true);
    
    mockProduct = {
      id: 'test_001',
      name: 'Test Product',
      price: 1000,
      stock: 50,
      isInStock: jest.fn().mockReturnValue(true),
      getDiscountedPrice: jest.fn().mockReturnValue(1000),
    };

    jest.clearAllMocks();
  });

  test('should add item to cart', async () => {
    await cartService.addItem(mockProduct, 2);
    
    expect(cartService.items.has('test_001')).toBe(true);
    expect(cartService.getItemCount()).toBe(2);
    expect(cartService.getSubtotal()).toBe(2000);
  });

  test('should remove item from cart', async () => {
    await cartService.addItem(mockProduct, 2);
    await cartService.removeItem('test_001');
    
    expect(cartService.items.has('test_001')).toBe(false);
    expect(cartService.getItemCount()).toBe(0);
  });

  test('should update item quantity', async () => {
    await cartService.addItem(mockProduct, 2);
    await cartService.updateItemQuantity('test_001', 5);
    
    const item = cartService.items.get('test_001');
    expect(item.quantity).toBe(5);
  });

  test('should calculate cart totals correctly', async () => {
    await cartService.addItem(mockProduct, 2);
    cartService.selectedRegion = 'Lagos'; // Delivery fee: 1500
    
    const summary = cartService.getCartSummary();
    expect(summary.subtotal).toBe(2000);
    expect(summary.shippingFee).toBe(1500);
    expect(summary.tax).toBe(150); // 7.5% VAT
    expect(summary.total).toBe(3650);
  });

  test('should apply discount code', async () => {
    await cartService.addItem(mockProduct, 2);
    cartService.applyDiscountCode('FIRST10'); // 10% discount
    
    const summary = cartService.getCartSummary();
    expect(summary.discount).toBe(200); // 10% of 2000
  });

  test('should validate cart for checkout', async () => {
    await cartService.addItem(mockProduct, 2);
    cartService.setCustomer({ id: 'cust_001', name: 'Test Customer' });
    cartService.setShippingAddress({ street: '123 Test St', city: 'Lagos' });
    cartService.setDeliveryRegion('Lagos');
    cartService.setPaymentMethod('paystack');
    
    const validation = cartService.validateForCheckout();
    expect(validation.isValid).toBe(true);
  });
});

describe('PaymentService', () => {
  let paymentService;

  beforeEach(() => {
    paymentService = new PaymentService();
    
    // Mock window objects
    global.window = {
      PaystackPop: {
        setup: jest.fn().mockReturnValue({
          openIframe: jest.fn(),
        }),
      },
      FlutterwaveCheckout: jest.fn(),
    };

    jest.clearAllMocks();
  });

  test('should validate payment data', () => {
    const validPaymentData = {
      method: 'paystack',
      amount: 1000,
      customer: {
        email: 'test@example.com',
        phone: '+2348123456789',
        name: 'Test Customer',
      },
      reference: 'TEST_REF_123',
    };

    expect(() => {
      paymentService.validatePaymentData(validPaymentData);
    }).not.toThrow();
  });

  test('should throw error for invalid payment data', () => {
    const invalidPaymentData = {
      method: 'invalid_method',
      amount: -100,
      customer: {
        email: 'invalid-email',
        phone: 'invalid-phone',
      },
      reference: '',
    };

    expect(() => {
      paymentService.validatePaymentData(invalidPaymentData);
    }).toThrow();
  });

  test('should generate payment reference', () => {
    const reference = paymentService.generateReference('TEST');
    expect(reference).toMatch(/^TEST_\d+_[A-Z0-9]+$/);
  });

  test('should get available payment methods', () => {
    const methods = paymentService.getAvailablePaymentMethods();
    expect(methods).toBeInstanceOf(Array);
    expect(methods.length).toBeGreaterThan(0);
    expect(methods[0]).toHaveProperty('id');
    expect(methods[0]).toHaveProperty('name');
  });

  test('should format amount correctly', () => {
    const formatted = paymentService.formatAmount(1000);
    expect(formatted).toMatch(/₦/);
    expect(formatted).toContain('1,000');
  });
});