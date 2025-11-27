// Contact Form Handler - Submits to Supabase
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    
    if (!contactForm) return;

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form data
        const formData = new FormData(contactForm);
        const name = formData.get('name');
        const email = formData.get('email');
        const message = formData.get('message');
        const source = formData.get('source') || null;
        const honeypot = formData.get('honeypot');

        // Honeypot check (spam prevention)
        if (honeypot) {
            console.log('Spam detected');
            return false;
        }

        // Show sending message
        const submitButton = contactForm.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;"><span class="spinner" style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>Sending...</span>';

        try {
            // Submit to Supabase
            const { data, error } = await supabase
                .from('contact_submissions')
                .insert([
                    {
                        name: name,
                        email: email,
                        message: message,
                        source: source,
                        status: 'new'
                    }
                ]);

            if (error) throw error;

            // Success - redirect to thank you page
            window.location.href = 'thank-you.html';
        } catch (error) {
            console.error('Error submitting form:', error);
            
            // Show error message
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
            
            // Create or update error message
            let errorMsg = document.getElementById('formError');
            if (!errorMsg) {
                errorMsg = document.createElement('div');
                errorMsg.id = 'formError';
                errorMsg.style.cssText = 'background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; padding: 1rem; border-radius: 8px; margin-top: 1rem; text-align: center;';
                contactForm.appendChild(errorMsg);
            }
            errorMsg.textContent = 'Sorry, there was an error submitting your message. Please try again or email me directly at ryanlumbra@icloud.com';
            
            // Remove error after 5 seconds
            setTimeout(() => {
                if (errorMsg) errorMsg.remove();
            }, 5000);
        }
    });
});

// Add spinner animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
