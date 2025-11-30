

        document.getElementById('togglePassword').addEventListener('click', function() {
            const password = document.getElementById('password');
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            this.textContent = type === 'password' ? '👁️' : '🙈';
        });

        document.getElementById('toggleConfirmPassword').addEventListener('click', function() {
            const password = document.getElementById('confirmPassword');
            const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
            password.setAttribute('type', type);
            this.textContent = type === 'password' ? '👁️' : '🙈';
        });


        document.getElementById('password').addEventListener('input', function() {
            const password = this.value;
            const strengthBar = document.getElementById('strengthBar');
            const requirements = document.getElementById('requirements');

            let strength = 0;
            if (password.length >= 8) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[a-z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;

            const colors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e'];
            const widths = ['25%', '50%', '75%', '100%'];

            strengthBar.style.width = widths[strength - 1] || '0%';
            strengthBar.style.background = colors[strength - 1] || '#ef4444';

            if (strength >= 3) {
                requirements.classList.add('met');
                requirements.textContent = 'Strong password';
            } else {
                requirements.classList.remove('met');
                requirements.textContent = 'Must be at least 8 characters with uppercase, lowercase, and number';
            }
        });


        document.getElementById('googleSignup').addEventListener('click', async () => {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google'
            });
            if (error) {
                document.getElementById('errorMessage').textContent = error.message;
                document.getElementById('errorMessage').style.display = 'block';
            }
        });


        document.getElementById('signupForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorDiv = document.getElementById('errorMessage');
            const successDiv = document.getElementById('successMessage');
            const submitBtn = document.getElementById('submitBtn');

            errorDiv.style.display = 'none';
            successDiv.style.display = 'none';

            const fullName = document.getElementById('fullName').value;
            const business = document.getElementById('business').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;


            if (password !== confirmPassword) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.style.display = 'block';
                return;
            }


            if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
                errorDiv.textContent = 'Password does not meet requirements';
                errorDiv.style.display = 'block';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';

            try {
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            full_name: fullName,
                            business_name: business || null
                        }
                    }
                });

                if (error) throw error;


                const urlParams = new URLSearchParams(window.location.search);
                const redirect = urlParams.get('redirect');
                const redirectUrl = redirect === 'pricing' ? '/pricing/' : '/';

                if (data.session) {

                    gtag('event', 'conversion', {
                        'send_to': 'AW-17751846529/ewA-CK-cvMgbEIHd3pBC'
                    });

                    successDiv.textContent = 'Account created! Redirecting...';
                    successDiv.style.display = 'block';
                    setTimeout(() => window.location.href = redirectUrl, 1500);
                } else {

                    gtag('event', 'conversion', {
                        'send_to': 'AW-17751846529/ewA-CK-cvMgbEIHd3pBC'
                    });

                    successDiv.textContent = 'Account created! Please check your email (' + email + ') to verify your account.';
                    successDiv.style.display = 'block';
                    setTimeout(() => window.location.href = 'login.html' + (redirect ? '?redirect=' + redirect : ''), 3000);
                }

            } catch (error) {
                errorDiv.textContent = error.message || 'Failed to create account';
                errorDiv.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Account';
            }
        });

console.log('%c✓ sign-up.js loaded successfully', 'color: #10b981; font-weight: 500');