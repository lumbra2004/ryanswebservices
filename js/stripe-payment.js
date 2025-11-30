

class StripePaymentHandler {
    constructor() {
        this.stripe = null;
        this.elements = null;
        this.paymentElement = null;
        this.init();
    }

    async init() {
        try {

            const response = await fetch('/api/stripe/config');
            const { publishableKey } = await response.json();


            this.stripe = Stripe(publishableKey);
        } catch (error) {
            console.error('Error initializing Stripe:', error);
        }
    }

    async createPaymentUI(clientSecret, containerId = 'stripe-payment-element') {
        if (!this.stripe) {
            await this.init();
        }

        const appearance = {
            theme: 'night',
            variables: {
                colorPrimary: '#0066ff',
                colorBackground: 'rgba(10, 15, 25, 0.8)',
                colorText: '#e2e8f0',
                colorDanger: '#ef4444',
                fontFamily: 'Inter, system-ui, sans-serif',
                borderRadius: '12px',
            },
        };

        this.elements = this.stripe.elements({
            clientSecret,
            appearance,
        });

        this.paymentElement = this.elements.create('payment');
        this.paymentElement.mount(`#${containerId}`);
    }

    async confirmPayment(returnUrl = window.location.origin + '/profile.html') {
        if (!this.stripe || !this.elements) {
            throw new Error('Stripe not initialized');
        }

        const { error } = await this.stripe.confirmPayment({
            elements: this.elements,
            confirmParams: {
                return_url: returnUrl,
            },
        });

        if (error) {
            throw error;
        }
    }

    async processPayment(email, name, onetimeAmount, recurringAmount, metadata) {
        try {

            const response = await fetch('/api/stripe/create-combined-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    name,
                    onetimeAmount,
                    recurringAmount,
                    metadata,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Payment failed');
            }

            return data;
        } catch (error) {
            console.error('Error processing payment:', error);
            throw error;
        }
    }

    destroy() {
        if (this.paymentElement) {
            this.paymentElement.destroy();
        }
    }
}


window.StripePaymentHandler = StripePaymentHandler;
