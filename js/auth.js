
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            this.currentUser = {
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata.full_name || session.user.email.split('@')[0],
                initials: this.getInitials(session.user.user_metadata.full_name || session.user.email)
            };
            this.updateUI();
        } else {
            this.updateUI();
        }

        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                this.currentUser = {
                    id: session.user.id,
                    email: session.user.email,
                    name: session.user.user_metadata.full_name || session.user.email.split('@')[0],
                    initials: this.getInitials(session.user.user_metadata.full_name || session.user.email)
                };
                this.updateUI();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.updateUI();
            }
        });


        this.setupEventListeners();
    }

    setupEventListeners() {

        const authOverlay = document.getElementById('authOverlay');
        const loginBtn = document.getElementById('loginBtn');
        const authClose = document.getElementById('authClose');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showAuthModal());
        }

        if (authClose) {
            authClose.addEventListener('click', () => this.hideAuthModal());
        }

        if (authOverlay) {
            authOverlay.addEventListener('click', (e) => {
                if (e.target === authOverlay) {
                    this.hideAuthModal();
                }
            });
        }


        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });


        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }


        const userButton = document.getElementById('userButton');
        const userDropdown = document.getElementById('userDropdown');

        if (userButton) {
            userButton.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });
        }


        document.addEventListener('click', () => {
            if (userDropdown) {
                userDropdown.classList.remove('show');
            }
        });


        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }


        document.querySelectorAll('.auth-social-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const provider = btn.dataset.provider;
                this.socialLogin(provider);
            });
        });


        const signupPassword = document.getElementById('signupPassword');
        if (signupPassword) {
            signupPassword.addEventListener('input', (e) => this.checkPasswordStrength(e.target.value));
        }


        const confirmPassword = document.getElementById('signupConfirmPassword');
        if (confirmPassword) {
            confirmPassword.addEventListener('input', () => this.checkPasswordMatch());
        }
        if (signupPassword) {
            signupPassword.addEventListener('input', () => {
                if (confirmPassword && confirmPassword.value) {
                    this.checkPasswordMatch();
                }
            });
        }


        const togglePassword = document.getElementById('togglePassword');
        const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

        if (togglePassword) {
            togglePassword.addEventListener('click', (e) => {
                e.preventDefault();
                const input = document.getElementById('signupPassword');
                this.togglePasswordVisibility(input, togglePassword);
            });
        }

        if (toggleConfirmPassword) {
            toggleConfirmPassword.addEventListener('click', (e) => {
                e.preventDefault();
                const input = document.getElementById('signupConfirmPassword');
                this.togglePasswordVisibility(input, toggleConfirmPassword);
            });
        }
    }

    switchTab(tab) {

        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');


        document.querySelectorAll('.auth-form').forEach(f => {
            f.classList.remove('active');
        });
        document.getElementById(`${tab}Form`).classList.add('active');


        const header = document.querySelector('.auth-header h2');
        header.textContent = tab === 'login' ? 'Welcome Back' : 'Create Account';
    }

    showAuthModal() {
        const overlay = document.getElementById('authOverlay');
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    hideAuthModal() {
        const overlay = document.getElementById('authOverlay');
        overlay.classList.remove('show');
        document.body.style.overflow = '';
        this.hideError();
    }

    showError(message) {
        const errorEl = document.querySelector('.auth-error');
        errorEl.textContent = message;
        errorEl.classList.add('show');
    }

    hideError() {
        const errorEl = document.querySelector('.auth-error');
        errorEl.classList.remove('show');
    }

    async handleLogin(e) {
        e.preventDefault();
        this.hideError();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const remember = document.getElementById('rememberMe').checked;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;


            this.currentUser = {
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata.full_name || data.user.email.split('@')[0],
                initials: this.getInitials(data.user.user_metadata.full_name || data.user.email)
            };


            this.triggerPasswordSave(email, password);

            this.updateUI();
            this.hideAuthModal();


            this.showNotification('Welcome back, ' + this.currentUser.name + '!');

        } catch (error) {
            console.error('Login error:', error);
            this.showError(error.message || 'Invalid email or password');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        this.hideError();

        const name = document.getElementById('signupName').value;
        const business = document.getElementById('signupBusiness').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;


        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }


        const strength = this.getPasswordStrength(password);
        if (strength.score < 2) {
            this.showError('Please choose a stronger password that meets all requirements');
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: name,
                        business_name: business || null
                    }
                }
            });

            if (error) throw error;


            this.triggerPasswordSave(email, password);


            if (data.session) {
                this.currentUser = {
                    id: data.user.id,
                    email: data.user.email,
                    name: name,
                    initials: this.getInitials(name)
                };


                this.showNotification('Account created successfully! Welcome, ' + name + '!');

                this.updateUI();
                this.hideAuthModal();
            } else {

                this.showNotification('Account created! Please check your email (' + email + ') to verify your account before logging in.');


                setTimeout(() => {
                    this.switchTab('login');
                }, 3000);
            }

        } catch (error) {
            console.error('Signup error:', error);
            this.showError(error.message || 'Failed to create account');
        }
    }

    async socialLogin(provider) {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider
            });

            if (error) throw error;
        } catch (error) {
            console.error('Social login error:', error);
            this.showNotification(`${provider} login failed. Please try again.`);
        }
    }

    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            this.currentUser = null;
            this.updateUI();
            this.showNotification('Logged out successfully');
        } catch (error) {
            console.error('Logout error:', error);
            this.showNotification('Error logging out');
        }
    }

    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const userMenu = document.getElementById('userMenu');

        if (this.currentUser) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (signupBtn) signupBtn.style.display = 'none';
            if (userMenu) {
                userMenu.style.display = 'block';
                const userNameEl = document.getElementById('userName');
                const userAvatarEl = document.getElementById('userAvatar');
                if (userNameEl) userNameEl.textContent = this.currentUser.name;
                if (userAvatarEl) userAvatarEl.textContent = this.currentUser.initials;
            }
        } else {
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (signupBtn) signupBtn.style.display = 'inline-block';
            if (userMenu) userMenu.style.display = 'none';
        }
    }

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    checkPasswordStrength(password) {
        const strength = this.getPasswordStrength(password);
        const bar = document.getElementById('passwordStrengthBar');
        const text = document.getElementById('passwordStrengthText');


        bar.className = 'password-strength-bar';
        if (strength.score === 0) {
            bar.className = 'password-strength-bar';
        } else if (strength.score === 1) {
            bar.classList.add('weak');
        } else if (strength.score === 2) {
            bar.classList.add('medium');
        } else {
            bar.classList.add('strong');
        }


        text.className = 'password-strength-text';
        if (strength.score === 0) {
            text.textContent = '';
        } else if (strength.score === 1) {
            text.textContent = 'Weak password';
            text.classList.add('weak');
        } else if (strength.score === 2) {
            text.textContent = 'Medium password';
            text.classList.add('medium');
        } else {
            text.textContent = 'Strong password';
            text.classList.add('strong');
        }


        document.getElementById('req-length').classList.toggle('met', strength.requirements.length);
        document.getElementById('req-uppercase').classList.toggle('met', strength.requirements.uppercase);
        document.getElementById('req-lowercase').classList.toggle('met', strength.requirements.lowercase);
        document.getElementById('req-number').classList.toggle('met', strength.requirements.number);
    }

    getPasswordStrength(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password)
        };

        const metCount = Object.values(requirements).filter(Boolean).length;

        let score = 0;
        if (password.length === 0) {
            score = 0;
        } else if (metCount <= 2) {
            score = 1;
        } else if (metCount === 3) {
            score = 2;
        } else {
            score = 3;
        }

        return { score, requirements };
    }

    checkPasswordMatch() {
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        const messageEl = document.getElementById('passwordMatchMessage');

        if (confirmPassword === '') {
            messageEl.textContent = '';
            messageEl.className = 'password-match-message';
            return;
        }

        if (password === confirmPassword) {
            messageEl.textContent = '✓ Passwords match';
            messageEl.className = 'password-match-message match';
        } else {
            messageEl.textContent = '✗ Passwords do not match';
            messageEl.className = 'password-match-message no-match';
        }
    }

    togglePasswordVisibility(input, button) {
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;


        if (type === 'text') {
            button.style.color = 'var(--primary)';
        } else {
            button.style.color = 'var(--text-secondary)';
        }
    }

    showNotification(message) {

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: linear-gradient(135deg, var(--primary), var(--primary-dark));
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 102, 255, 0.4);
            z-index: 3000;
            font-weight: 600;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);


        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    triggerPasswordSave(email, password) {

        const form = document.createElement('form');
        form.style.display = 'none';
        form.method = 'post';
        form.action = window.location.href;

        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.name = 'email';
        emailInput.value = email;
        emailInput.autocomplete = 'username';

        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.name = 'password';
        passwordInput.value = password;
        passwordInput.autocomplete = 'current-password';

        form.appendChild(emailInput);
        form.appendChild(passwordInput);
        document.body.appendChild(form);


        setTimeout(() => {
            form.submit();
            setTimeout(() => {
                document.body.removeChild(form);
            }, 100);
        }, 0);
    }
}


const authStyle = document.createElement('style');
authStyle.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(authStyle);


document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();


    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileMenuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });


        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.classList.remove('menu-open');
            });
        });


        document.addEventListener('click', (e) => {
            if (navLinks.classList.contains('active') &&
                !navLinks.contains(e.target) &&
                !mobileMenuToggle.contains(e.target)) {
                mobileMenuToggle.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });


        const userButton = document.getElementById('userButton');
        if (userButton) {
            userButton.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }
});

console.log('%c✓ auth.js loaded successfully', 'color: #10b981; font-weight: 500');
