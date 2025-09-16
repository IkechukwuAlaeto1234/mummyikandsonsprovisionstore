import { currentConfig, nigerianConfig } from '../config/index.js';
import { EventEmitter } from '../utils/eventEmitter.js';

/**
 * Payment Service
 * Handles Nigerian payment methods integration
 * Solves: Payment Friction - 70% cart abandonment due to payment complexity
 */
export class PaymentService extends EventEmitter {
  constructor() {
    super();
    this.providers = {
      paystack: null,
      flutterwave: null,
    };
    this.initialized = false;
  }

  // Initialize payment providers
  async initialize() {
    try {
      await this.initializePaystack();
      await this.initializeFlutterwave();
      this.initialized = true;
      this.emit('initialized');
      console.log('Payment service initialized');
    } catch (error) {
      console.error('Failed to initialize payment service:', error);
      throw error;
    }
  }

  // Initialize Paystack
  async initializePaystack() {
    try {
      // Load Paystack script dynamically
      if (!window.PaystackPop) {
        await this.loadScript('https://js.paystack.co/v1/inline.js');
      }

      this.providers.paystack = {
        publicKey: currentConfig.PAYSTACK_PUBLIC_KEY,
        isLoaded: true,
      };

      console.log('Paystack initialized');
    } catch (error) {
      console.error('Failed to initialize Paystack:', error);
    }
  }

  // Initialize Flutterwave
  async initializeFlutterwave() {
    try {
      // Load Flutterwave script dynamically
      if (!window.FlutterwaveCheckout) {
        await this.loadScript('https://checkout.flutterwave.com/v3.js');
      }

      this.providers.flutterwave = {
        publicKey: currentConfig.FLUTTERWAVE_PUBLIC_KEY,
        isLoaded: true,
      };

      console.log('Flutterwave initialized');
    } catch (error) {
      console.error('Failed to initialize Flutterwave:', error);
    }
  }

  // Load external script
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Process payment
  async processPayment(paymentData) {
    try {
      const {
        method,
        amount,
        customer,
        reference,
        metadata = {},
      } = paymentData;

      // Validate payment data
      this.validatePaymentData(paymentData);

      switch (method) {
        case 'paystack':
          return await this.processPaystackPayment(paymentData);
        case 'flutterwave':
          return await this.processFlutterwavePayment(paymentData);
        case 'bank_transfer':
          return await this.processBankTransfer(paymentData);
        case 'ussd':
          return await this.processUSSDPayment(paymentData);
        case 'pay_on_delivery':
          return await this.processPayOnDelivery(paymentData);
        default:
          throw new Error(`Unsupported payment method: ${method}`);
      }
    } catch (error) {
      this.emit('paymentError', { error, paymentData });
      throw error;
    }
  }

  // Process Paystack payment
  async processPaystackPayment(paymentData) {
    return new Promise((resolve, reject) => {
      if (!window.PaystackPop) {
        reject(new Error('Paystack not loaded'));
        return;
      }

      const { amount, customer, reference, metadata = {} } = paymentData;

      const handler = window.PaystackPop.setup({
        key: this.providers.paystack.publicKey,
        email: customer.email,
        amount: amount * 100, // Paystack expects amount in kobo
        ref: reference,
        currency: 'NGN',
        metadata: {
          custom_fields: [
            {
              display_name: 'Customer Name',
              variable_name: 'customer_name',
              value: customer.name,
            },
            {
              display_name: 'Phone Number',
              variable_name: 'phone_number',
              value: customer.phone,
            },
          ],
          ...metadata,
        },
        callback: (response) => {
          this.emit('paymentSuccess', {
            provider: 'paystack',
            reference: response.reference,
            amount,
            customer,
          });
          resolve(response);
        },
        onClose: () => {
          this.emit('paymentCancelled', {
            provider: 'paystack',
            reference,
            amount,
            customer,
          });
          reject(new Error('Payment cancelled by user'));
        },
      });

      handler.openIframe();
    });
  }

  // Process Flutterwave payment
  async processFlutterwavePayment(paymentData) {
    return new Promise((resolve, reject) => {
      if (!window.FlutterwaveCheckout) {
        reject(new Error('Flutterwave not loaded'));
        return;
      }

      const { amount, customer, reference, metadata = {} } = paymentData;

      window.FlutterwaveCheckout({
        public_key: this.providers.flutterwave.publicKey,
        tx_ref: reference,
        amount,
        currency: 'NGN',
        country: 'NG',
        payment_options: 'card,banktransfer,ussd',
        customer: {
          email: customer.email,
          phone_number: customer.phone,
          name: customer.name,
        },
        meta: metadata,
        customizations: {
          title: 'Mummy IK & Sons Provision Store',
          description: 'Payment for your order',
          logo: '/images/logo.png',
        },
        callback: (response) => {
          this.emit('paymentSuccess', {
            provider: 'flutterwave',
            reference: response.tx_ref,
            transactionId: response.transaction_id,
            amount,
            customer,
          });
          resolve(response);
        },
        onclose: () => {
          this.emit('paymentCancelled', {
            provider: 'flutterwave',
            reference,
            amount,
            customer,
          });
          reject(new Error('Payment cancelled by user'));
        },
      });
    });
  }

  // Process bank transfer
  async processBankTransfer(paymentData) {
    const { amount, customer, reference } = paymentData;

    // Generate bank transfer details
    const transferDetails = {
      accountName: 'Mummy IK & Sons Provision Store',
      accountNumber: '1234567890',
      bankName: 'Access Bank',
      sortCode: '044',
      amount,
      reference,
      instructions: [
        'Transfer the exact amount to the account above',
        'Use the reference number as your transfer description',
        'Send proof of payment to info@mummyikandsons.com',
        'Your order will be processed once payment is confirmed',
      ],
    };

    this.emit('bankTransferInitiated', {
      transferDetails,
      customer,
      reference,
    });

    return {
      success: true,
      method: 'bank_transfer',
      transferDetails,
      reference,
    };
  }

  // Process USSD payment
  async processUSSDPayment(paymentData) {
    const { amount, customer, reference } = paymentData;

    // Generate USSD codes for major banks
    const ussdCodes = {
      gtb: `*737*1*${amount}*${reference}#`,
      access: `*901*0*${amount}*${reference}#`,
      zenith: `*966*6*${amount}*${reference}#`,
      firstbank: `*894*0*${amount}*${reference}#`,
      uba: `*919*4*${amount}*${reference}#`,
    };

    this.emit('ussdInitiated', {
      ussdCodes,
      amount,
      customer,
      reference,
    });

    return {
      success: true,
      method: 'ussd',
      ussdCodes,
      reference,
      instructions: [
        "Dial your bank's USSD code from your registered phone number",
        'Follow the prompts to complete the payment',
        'You will receive an SMS confirmation',
        'Your order will be processed automatically',
      ],
    };
  }

  // Process pay on delivery
  async processPayOnDelivery(paymentData) {
    const { amount, customer, reference } = paymentData;

    this.emit('payOnDeliveryInitiated', {
      amount,
      customer,
      reference,
    });

    return {
      success: true,
      method: 'pay_on_delivery',
      reference,
      instructions: [
        'Your order has been confirmed',
        'Payment will be collected upon delivery',
        'Please have the exact amount ready',
        'Cash or POS payment accepted',
      ],
    };
  }

  // Validate payment data
  validatePaymentData(paymentData) {
    const { method, amount, customer, reference } = paymentData;

    if (!nigerianConfig.paymentMethods.includes(method)) {
      throw new Error(`Invalid payment method: ${method}`);
    }

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    if (!customer || !customer.email || !customer.phone) {
      throw new Error('Invalid customer information');
    }

    if (!reference) {
      throw new Error('Payment reference is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      throw new Error('Invalid email format');
    }

    // Validate Nigerian phone number
    const phoneRegex = /^\+?234[0-9]{10}$/;
    if (!phoneRegex.test(customer.phone.replace(/\s/g, ''))) {
      throw new Error('Invalid Nigerian phone number');
    }
  }

  // Verify payment status
  async verifyPayment(reference, provider = 'paystack') {
    try {
      // This would typically make an API call to verify payment
      // For now, we'll simulate the verification

      const verification = {
        reference,
        status: 'success', // success, failed, pending
        amount: 0,
        currency: 'NGN',
        paidAt: new Date(),
        provider,
      };

      this.emit('paymentVerified', verification);
      return verification;
    } catch (error) {
      console.error('Payment verification failed:', error);
      throw error;
    }
  }

  // Format amount for display
  formatAmount(amount) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  }

  // Generate payment reference
  generateReference(prefix = 'MIK') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`.toUpperCase();
  }

  // Get available payment methods
  getAvailablePaymentMethods() {
    return nigerianConfig.paymentMethods.map((method) => ({
      id: method,
      name: this.getPaymentMethodName(method),
      description: this.getPaymentMethodDescription(method),
      isAvailable: this.isPaymentMethodAvailable(method),
    }));
  }

  // Get payment method display name
  getPaymentMethodName(method) {
    const names = {
      paystack: 'Card Payment',
      flutterwave: 'Flutterwave',
      bank_transfer: 'Bank Transfer',
      ussd: 'USSD Payment',
      pay_on_delivery: 'Pay on Delivery',
    };
    return names[method] || method;
  }

  // Get payment method description
  getPaymentMethodDescription(method) {
    const descriptions = {
      paystack: 'Pay securely with your debit/credit card',
      flutterwave: 'Multiple payment options including cards and bank transfer',
      bank_transfer: 'Direct bank transfer to our account',
      ussd: 'Pay using your mobile phone USSD code',
      pay_on_delivery: 'Pay cash when your order is delivered',
    };
    return descriptions[method] || '';
  }

  // Check if payment method is available
  isPaymentMethodAvailable(method) {
    switch (method) {
      case 'paystack':
        return this.providers.paystack?.isLoaded === true;
      case 'flutterwave':
        return this.providers.flutterwave?.isLoaded === true;
      case 'bank_transfer':
      case 'ussd':
      case 'pay_on_delivery':
        return true;
      default:
        return false;
    }
  }
}
