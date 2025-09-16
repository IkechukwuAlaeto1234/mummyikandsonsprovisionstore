// Main application entry point
import { InventoryService } from './services/inventory.service.js';
import { CartService } from './services/cart.service.js';
import { PaymentService } from './services/payment.service.js';
import { StorageService } from './services/storage.service.js';
import { Product } from './models/index.js';
import { 
  PerformanceUtils, 
  ValidationUtils, 
  CurrencyUtils, 
  NetworkUtils,
  SEOUtils 
} from './utils/index.js';
import { currentConfig } from './config/index.js';

/**
 * Main Application Class
 * Orchestrates all services and components
 */
class MummyIKApp {
  constructor() {
    this.services = {
      inventory: new InventoryService(),
      cart: new CartService(),
      payment: new PaymentService(),
    };
    
    this.state = {
      isOnline: true,
      currentPage: 'home',
      isLoading: false,
    };
    
    this.initialized = false;
  }

  // Initialize the application
  async initialize() {
    try {
      this.showLoader();
      
      // Initialize performance monitoring
      this.initializePerformanceMonitoring();
      
      // Initialize network monitoring
      this.initializeNetworkMonitoring();
      
      // Initialize services
      await this.initializeServices();
      
      // Load sample data if needed
      await this.loadSampleData();
      
      // Initialize UI components
      this.initializeUI();
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.initialized = true;
      this.hideLoader();
      
      console.log('Mummy IK & Sons app initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to load application. Please refresh the page.');
    }
  }

  // Initialize all services
  async initializeServices() {
    try {
      await Promise.all([
        this.services.inventory.initialize(),
        this.services.cart.initialize(),
        this.services.payment.initialize(),
      ]);
      
      console.log('All services initialized');
    } catch (error) {
      console.error('Service initialization failed:', error);
      throw error;
    }
  }

  // Load sample data for demonstration
  async loadSampleData() {
    try {
      const existingProducts = this.services.inventory.getAllProducts();
      
      if (existingProducts.length === 0) {
        const sampleProducts = [
          {
            id: 'rice_001',
            name: 'Premium Rice (5kg)',
            description: 'High-quality rice perfect for your daily meals.',
            price: 3500,
            category: 'Grains',
            stock: 50,
            images: ['images/royal-aroma-rics.jpeg'],
            tags: ['rice', 'grains', 'staple'],
            weight: 5,
            supplier: 'Royal Aroma',
            sku: 'RA-RICE-5KG',
            rating: 4.5,
            reviewCount: 125,
          },
          {
            id: 'oil_001',
            name: 'Vegetable Oil (5L)',
            description: 'Pure vegetable oil for all your cooking needs.',
            price: 4200,
            category: 'Cooking Oil',
            stock: 30,
            images: ['images/ktc-vegetable-oil.jpeg'],
            tags: ['oil', 'cooking', 'vegetable'],
            weight: 5,
            supplier: 'KTC',
            sku: 'KTC-OIL-5L',
            rating: 5.0,
            reviewCount: 89,
          },
          {
            id: 'beans_001',
            name: 'Honey Beans (2kg)',
            description: 'Nutritious beans, perfect for your protein needs.',
            price: 2800,
            category: 'Legumes',
            stock: 25,
            images: ['images/honey-beans.jpeg'],
            tags: ['beans', 'protein', 'legumes'],
            weight: 2,
            supplier: 'Local Farmers',
            sku: 'LF-BEANS-2KG',
            rating: 4.0,
            reviewCount: 67,
          },
          {
            id: 'spaghetti_001',
            name: 'Spaghetti Pack (500g)',
            description: 'Quick and easy to prepare for a delicious meal.',
            price: 650,
            category: 'Pasta',
            stock: 75,
            images: ['images/golden-penny-spaghetti.jpeg'],
            tags: ['pasta', 'spaghetti', 'quick-meal'],
            weight: 0.5,
            supplier: 'Golden Penny',
            sku: 'GP-SPAG-500G',
            rating: 4.7,
            reviewCount: 203,
            discount: 10, // 10% discount
          },
        ];

        for (const productData of sampleProducts) {
          await this.services.inventory.addProduct(productData);
        }
        
        console.log('Sample products loaded');
      }
    } catch (error) {
      console.error('Failed to load sample data:', error);
    }
  }

  // Initialize UI components
  initializeUI() {
    this.updateCartDisplay();
    this.updateProductDisplay();
    this.setupMobileMenu();
    this.setupCartDropdown();
    this.setupProductCards();
    this.setupCheckoutProcess();
    
    // Initialize lazy loading for better performance
    PerformanceUtils.lazyLoadImages();
  }

  // Setup event listeners
  setupEventListeners() {
    // Cart service events
    this.services.cart.on('itemAdded', (data) => {
      this.updateCartDisplay();
      this.showNotification(`${data.product.name} added to cart!`, 'success');
    });

    this.services.cart.on('itemRemoved', (data) => {
      this.updateCartDisplay();
      this.showNotification('Item removed from cart', 'info');
    });

    this.services.cart.on('cartCleared', () => {
      this.updateCartDisplay();
      this.showNotification('Cart cleared', 'info');
    });

    // Inventory service events
    this.services.inventory.on('lowStock', (data) => {
      console.warn(`Low stock alert: ${data.product.name}`);
    });

    this.services.inventory.on('stockOut', (data) => {
      console.error(`Stock out: ${data.product.name}`);
      this.updateProductDisplay();
    });

    // Payment service events
    this.services.payment.on('paymentSuccess', (data) => {
      this.handlePaymentSuccess(data);
    });

    this.services.payment.on('paymentError', (data) => {
      this.showNotification('Payment failed. Please try again.', 'error');
    });
  }

  // Update cart display
  updateCartDisplay() {
    const cartSummary = this.services.cart.getCartSummary();
    
    // Update cart count
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(element => {
      element.textContent = cartSummary.itemCount;
      
      // Add animation
      element.style.transform = 'scale(1.2)';
      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 200);
    });

    // Update cart dropdown
    this.updateCartDropdown(cartSummary);
  }

  // Update cart dropdown content
  updateCartDropdown(cartSummary) {
    const cartDropdown = document.getElementById('cart-dropdown');
    if (!cartDropdown) return;

    const cartItems = cartDropdown.querySelector('.cart-items');
    const cartTotal = cartDropdown.querySelector('.cart-total-amount');
    
    if (cartSummary.items.length === 0) {
      cartItems.innerHTML = `
        <div class="empty-cart">
          <i class="fas fa-shopping-basket"></i>
          <p>Your cart is empty</p>
          <a href="#products" class="btn">Shop Now</a>
        </div>
      `;
    } else {
      cartItems.innerHTML = cartSummary.items.map(item => `
        <div class="cart-item" data-product-id="${item.product.id}">
          <img src="${item.product.images[0]}" alt="${item.product.name}" class="cart-item-img">
          <div class="cart-item-details">
            <div class="cart-item-title">${item.product.name}</div>
            <div class="cart-item-price">${item.getFormattedTotalPrice()}</div>
            <div class="cart-item-quantity">
              <button class="quantity-btn decrease-qty" data-product-id="${item.product.id}">-</button>
              <span class="quantity-value">${item.quantity}</span>
              <button class="quantity-btn increase-qty" data-product-id="${item.product.id}">+</button>
            </div>
          </div>
          <button class="cart-item-remove" data-product-id="${item.product.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `).join('');
      
      // Setup quantity controls
      this.setupCartQuantityControls();
    }
    
    if (cartTotal) {
      cartTotal.textContent = cartSummary.formattedTotal;
    }
  }

  // Setup cart quantity controls
  setupCartQuantityControls() {
    document.querySelectorAll('.increase-qty').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const productId = e.target.dataset.productId;
        const currentItem = this.services.cart.items.get(productId);
        if (currentItem) {
          try {
            await this.services.cart.updateItemQuantity(productId, currentItem.quantity + 1);
          } catch (error) {
            this.showNotification(error.message, 'error');
          }
        }
      });
    });

    document.querySelectorAll('.decrease-qty').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const productId = e.target.dataset.productId;
        const currentItem = this.services.cart.items.get(productId);
        if (currentItem) {
          try {
            await this.services.cart.updateItemQuantity(productId, currentItem.quantity - 1);
          } catch (error) {
            this.showNotification(error.message, 'error');
          }
        }
      });
    });

    document.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const productId = e.target.dataset.productId;
        try {
          await this.services.cart.removeItem(productId);
        } catch (error) {
          this.showNotification(error.message, 'error');
        }
      });
    });
  }

  // Update product display
  updateProductDisplay() {
    const products = this.services.inventory.getAllProducts();
    this.renderProducts(products);
  }

  // Render products
  renderProducts(products) {
    const productsGrid = document.querySelector('.products-grid');
    if (!productsGrid) return;

    productsGrid.innerHTML = products.map(product => `
      <div class="product-card scale-up" data-product-id="${product.id}">
        <div class="product-img-container">
          <img src="${product.images[0]}" alt="${product.name}" class="product-img" loading="lazy">
          ${product.discount > 0 ? `<span class="product-tag">Sale ${product.discount}% Off</span>` : ''}
          ${!product.isInStock() ? '<span class="product-tag out-of-stock">Out of Stock</span>' : ''}
        </div>
        <div class="product-info">
          <span class="product-category">${product.category}</span>
          <h3 class="product-title">${product.name}</h3>
          <div class="product-price">
            ${product.discount > 0 ? `
              <span class="original-price">₦${product.price.toLocaleString()}</span>
              <span class="discounted-price">₦${product.getDiscountedPrice().toLocaleString()}</span>
            ` : `
              <span class="currency">₦</span>${product.getDiscountedPrice().toLocaleString()}
            `}
          </div>
          <p class="product-description">${product.description}</p>
          <div class="product-stock">Stock: ${product.stock} available</div>
          <div class="add-to-cart">
            <button class="add-to-cart-btn" data-product-id="${product.id}" ${!product.isInStock() ? 'disabled' : ''}>
              <i class="fas fa-shopping-cart"></i> ${product.isInStock() ? 'Add to Cart' : 'Out of Stock'}
            </button>
            <div class="product-rating">
              ${this.renderStarRating(product.rating)}
              <span>(${product.rating})</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Setup add to cart buttons
    this.setupProductCards();
  }

  // Render star rating
  renderStarRating(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
      stars += '<i class="fas fa-star"></i>';
    }
    
    if (hasHalfStar) {
      stars += '<i class="fas fa-star-half-alt"></i>';
    }
    
    for (let i = 0; i < emptyStars; i++) {
      stars += '<i class="far fa-star"></i>';
    }
    
    return stars;
  }

  // Setup product card interactions
  setupProductCards() {
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const productId = e.target.closest('[data-product-id]').dataset.productId;
        const product = this.services.inventory.getProduct(productId);
        
        if (product && product.isInStock()) {
          try {
            await this.services.cart.addItem(product, 1);
          } catch (error) {
            this.showNotification(error.message, 'error');
          }
        }
      });
    });
  }

  // Setup mobile menu
  setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');
    
    if (mobileMenuBtn && navMenu) {
      mobileMenuBtn.addEventListener('click', () => {
        navMenu.classList.toggle('open');
        const icon = mobileMenuBtn.querySelector('i');
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
      });
    }
  }

  // Setup cart dropdown
  setupCartDropdown() {
    const cartIcon = document.getElementById('cart-icon');
    const cartDropdown = document.getElementById('cart-dropdown');
    const cartClose = document.getElementById('cart-close');
    
    if (cartIcon && cartDropdown) {
      cartIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        cartDropdown.classList.toggle('active');
      });
    }
    
    if (cartClose) {
      cartClose.addEventListener('click', () => {
        cartDropdown.classList.remove('active');
      });
    }
    
    document.addEventListener('click', (e) => {
      if (cartDropdown && !cartDropdown.contains(e.target) && e.target !== cartIcon) {
        cartDropdown.classList.remove('active');
      }
    });
  }

  // Setup checkout process
  setupCheckoutProcess() {
    const checkoutBtn = document.querySelector('.cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.startCheckoutProcess();
      });
    }
  }

  // Start checkout process
  startCheckoutProcess() {
    const cartSummary = this.services.cart.getCartSummary();
    
    if (cartSummary.itemCount === 0) {
      this.showNotification('Your cart is empty', 'warning');
      return;
    }
    
    // For now, show a simple checkout modal
    this.showCheckoutModal();
  }

  // Show checkout modal
  showCheckoutModal() {
    const modal = document.createElement('div');
    modal.className = 'checkout-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Checkout</h3>
          <button class="close-modal">&times;</button>
        </div>
        <div class="modal-body">
          <p>Checkout functionality is being implemented with:</p>
          <ul>
            <li>Customer information form</li>
            <li>Delivery address selection</li>
            <li>Payment method selection</li>
            <li>Order confirmation</li>
          </ul>
          <p>This will include integration with Paystack, Flutterwave, and other Nigerian payment methods.</p>
        </div>
        <div class="modal-footer">
          <button class="btn close-modal">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Setup close functionality
    modal.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        document.body.removeChild(modal);
      });
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  // Initialize performance monitoring
  initializePerformanceMonitoring() {
    // Measure initial load performance
    setTimeout(() => {
      PerformanceUtils.measurePerformance();
    }, 1000);
    
    // Preload critical resources
    PerformanceUtils.preloadCriticalResources();
  }

  // Initialize network monitoring
  initializeNetworkMonitoring() {
    this.state.isOnline = NetworkUtils.isOnline();
    
    NetworkUtils.addNetworkListeners(
      () => {
        this.state.isOnline = true;
        this.showNotification('Connection restored', 'success');
      },
      () => {
        this.state.isOnline = false;
        this.showNotification('Connection lost. Working offline.', 'warning');
      }
    );
  }

  // Handle payment success
  handlePaymentSuccess(data) {
    this.showNotification('Payment successful! Your order is being processed.', 'success');
    this.services.cart.clearCart();
    
    // Here you would typically:
    // 1. Create order record
    // 2. Send confirmation email
    // 3. Update inventory
    // 4. Initiate fulfillment process
  }

  // Show notification
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas ${this.getNotificationIcon(type)}"></i>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  // Get notification icon
  getNotificationIcon(type) {
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle',
    };
    return icons[type] || icons.info;
  }

  // Show loader
  showLoader() {
    this.state.isLoading = true;
    const loader = document.createElement('div');
    loader.id = 'app-loader';
    loader.className = 'app-loader';
    loader.innerHTML = `
      <div class="loader-content">
        <div class="spinner"></div>
        <p>Loading Mummy IK & Sons...</p>
      </div>
    `;
    document.body.appendChild(loader);
  }

  // Hide loader
  hideLoader() {
    this.state.isLoading = false;
    const loader = document.getElementById('app-loader');
    if (loader) {
      loader.classList.add('fade-out');
      setTimeout(() => {
        if (document.body.contains(loader)) {
          document.body.removeChild(loader);
        }
      }, 500);
    }
  }

  // Show error
  showError(message) {
    this.hideLoader();
    this.showNotification(message, 'error');
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.mummyIKApp = new MummyIKApp();
  window.mummyIKApp.initialize();
});

// Expose for debugging in development
if (currentConfig.ENABLE_LOGGING) {
  window.services = window.mummyIKApp?.services;
}

export default MummyIKApp;