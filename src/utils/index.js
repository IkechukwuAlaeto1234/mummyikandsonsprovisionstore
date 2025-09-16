/**
 * Simple Event Emitter implementation
 * Used for decoupled component communication
 */
export class EventEmitter {
  constructor() {
    this.events = {};
  }

  // Add event listener
  on(event, listener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  // Remove event listener
  off(event, listenerToRemove) {
    if (!this.events[event]) return this;

    this.events[event] = this.events[event].filter(
      (listener) => listener !== listenerToRemove
    );
    return this;
  }

  // Emit event
  emit(event, ...args) {
    if (!this.events[event]) return false;

    this.events[event].forEach((listener) => {
      try {
        listener.apply(this, args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
    return true;
  }

  // Add one-time event listener
  once(event, listener) {
    const onceWrapper = (...args) => {
      listener.apply(this, args);
      this.off(event, onceWrapper);
    };
    return this.on(event, onceWrapper);
  }
}

/**
 * Performance utilities
 * Helps maintain <3s page load times for Nigerian network conditions
 */
export class PerformanceUtils {
  // Debounce function calls
  static debounce(func, delay) {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // Throttle function calls
  static throttle(func, delay) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), delay);
      }
    };
  }

  // Lazy load images
  static lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });

    images.forEach((img) => imageObserver.observe(img));
  }

  // Preload critical resources
  static preloadCriticalResources() {
    const criticalResources = ['/css/styles.css', '/images/logo.png'];

    criticalResources.forEach((resource) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.endsWith('.css') ? 'style' : 'image';
      document.head.appendChild(link);
    });
  }

  // Measure and report performance metrics
  static measurePerformance() {
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const metrics = {
        pageLoadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded:
          timing.domContentLoadedEventEnd - timing.navigationStart,
        firstPaint: timing.responseStart - timing.navigationStart,
      };

      console.log('Performance Metrics:', metrics);

      // Report to analytics if needed
      if (metrics.pageLoadTime > 3000) {
        console.warn('Page load time exceeds 3 seconds:', metrics.pageLoadTime);
      }

      return metrics;
    }
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  // Validate email
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate Nigerian phone number
  static isValidNigerianPhone(phone) {
    const phoneRegex = /^\+?234[0-9]{10}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  // Validate required fields
  static validateRequiredFields(data, requiredFields) {
    const errors = [];

    requiredFields.forEach((field) => {
      if (
        !data[field] ||
        (typeof data[field] === 'string' && data[field].trim() === '')
      ) {
        errors.push(`${field} is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Sanitize input
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '');
  }
}

/**
 * Currency utilities for Nigerian Naira
 */
export class CurrencyUtils {
  // Format amount in Nigerian Naira
  static formatNaira(amount) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  }

  // Parse formatted currency string to number
  static parseNaira(formattedAmount) {
    return parseFloat(formattedAmount.replace(/[₦,\s]/g, ''));
  }

  // Add Nigerian currency symbol
  static addNairaSymbol(amount) {
    return `₦${parseFloat(amount).toLocaleString('en-NG')}`;
  }

  // Calculate VAT (7.5% in Nigeria)
  static calculateVAT(amount) {
    return amount * 0.075;
  }

  // Calculate total with VAT
  static calculateTotalWithVAT(amount) {
    return amount + this.calculateVAT(amount);
  }
}

/**
 * Local storage utilities with error handling
 */
export class StorageUtils {
  // Set item with error handling
  static setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }

  // Get item with error handling
  static getItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  }

  // Remove item
  static removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
      return false;
    }
  }

  // Check if localStorage is available
  static isAvailable() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, 'test');
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Network utilities for handling poor connectivity
 */
export class NetworkUtils {
  // Check if online
  static isOnline() {
    return navigator.onLine;
  }

  // Add online/offline event listeners
  static addNetworkListeners(onOnline, onOffline) {
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }

  // Retry failed requests
  static async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        if (attempt === maxRetries) throw error;

        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }
  }

  // Check connection quality
  static getConnectionInfo() {
    if (navigator.connection) {
      return {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData,
      };
    }
    return null;
  }
}

/**
 * Date utilities for Nigerian timezone
 */
export class DateUtils {
  // Format date for Nigerian locale
  static formatNigerianDate(date) {
    return new Intl.DateTimeFormat('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Africa/Lagos',
    }).format(date);
  }

  // Format datetime for Nigerian locale
  static formatNigerianDateTime(date) {
    return new Intl.DateTimeFormat('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Lagos',
    }).format(date);
  }

  // Get Nigerian current time
  static getNigerianTime() {
    return new Date().toLocaleString('en-NG', {
      timeZone: 'Africa/Lagos',
    });
  }

  // Calculate delivery date
  static calculateDeliveryDate(orderDate, estimatedDays) {
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + estimatedDays);
    return deliveryDate;
  }
}

/**
 * SEO and accessibility utilities
 */
export class SEOUtils {
  // Update page title
  static updatePageTitle(title) {
    document.title = `${title} | Mummy IK & Sons Provision Store`;
  }

  // Update meta description
  static updateMetaDescription(description) {
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = description;
  }

  // Add structured data
  static addStructuredData(data) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  // Generate breadcrumb structured data
  static generateBreadcrumbData(breadcrumbs) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    };
  }
}
