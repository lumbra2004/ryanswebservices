        document.getElementById('togglePassword').addEventListener('click', function() {
            const password = document.getElementById('password');
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            this.textContent = type === 'password' ? '👁️' : '🙈';
        });

        const forgotLink = document.querySelector('.forgot-link');
        const modal = document.getElementById('forgotPasswordModal');
        const closeModal = document.getElementById('closeModal');
        const forgotForm = document.getElementById('forgotPasswordForm');
        const resetMessage = document.getElementById('resetMessage');

        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            modal.classList.add('active');
            document.getElementById('resetEmail').value = document.getElementById('email').value || '';
        });

        closeModal.addEventListener('click', () => {
            modal.classList.remove('active');
            resetMessage.className = 'modal-message';
            resetMessage.textContent = '';
            forgotForm.reset();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                resetMessage.className = 'modal-message';
                resetMessage.textContent = '';
                forgotForm.reset();
            }
        });

        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const resetBtn = document.getElementById('resetBtn');
            const email = document.getElementById('resetEmail').value;

            resetBtn.disabled = true;
            resetBtn.textContent = 'Sending...';
            resetMessage.className = 'modal-message';
            resetMessage.textContent = '';

            try {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/reset-password.html'
                });

                if (error) throw error;

                resetMessage.className = 'modal-message success';
                resetMessage.textContent = 'Password reset link sent! Check your email inbox.';
                forgotForm.reset();

            } catch (error) {
                resetMessage.className = 'modal-message error';
                resetMessage.textContent = error.message || 'Failed to send reset email. Please try again.';
            } finally {
                resetBtn.disabled = false;
                resetBtn.textContent = 'Send Reset Link';
            }
        });

        document.getElementById('googleLogin').addEventListener('click', async () => {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google'
            });
            if (error) {
                document.getElementById('errorMessage').textContent = error.message;
                document.getElementById('errorMessage').style.display = 'block';
            }
        });

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.style.display = 'none';

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect');

                if (redirect === 'pricing') {
                    window.location.href = '/pricing/';
                } else {
                    window.location.href = '/';
                }

            } catch (error) {
                errorDiv.textContent = error.message || 'Invalid email or password';
                errorDiv.style.display = 'block';
            }
        });

console.log('%c✓ login.js loaded successfully', 'color: #10b981; font-weight: 500');