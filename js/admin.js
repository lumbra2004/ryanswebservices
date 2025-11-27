// Admin Panel JavaScript
const SUPABASE_URL = 'https://ujludleswiuqlvosbpyg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqbHVkbGVzd2l1cWx2b3NicHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTU0NDIsImV4cCI6MjA3OTU5MTQ0Mn0.VNvo4tjz_HafmQsvVkCBRiq8WmLrlhkPavNaB_3Exig';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.userRole = null;
        this.users = [];
        this.orders = [];
        this.requests = [];
        this.contacts = [];
        this.files = [];
        this.payments = [];
        this.promoCodes = [];
        this.blogPosts = [];
        this.pageVisits = [];
        this.customQuotes = [];
        this.currentEditingQuote = null;
        this.visitorPage = 1;
        this.visitorsPerPage = 50;
        this.currentSection = 'overview';
        this.currentRefundOrder = null;
        this.currentEditingPost = null;
        
        this.init();
    }

    async init() {
        // Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
            await this.verifyAdmin(session.user);
        } else {
            this.showLoginScreen();
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('adminLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Reload button
        const reloadBtn = document.getElementById('reloadBtn');
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => this.reloadData());
        }

        // Mobile menu
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.getElementById('adminSidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar?.classList.toggle('open');
                sidebarOverlay?.classList.toggle('active');
            });
        }
        
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                sidebar?.classList.remove('open');
                sidebarOverlay.classList.remove('active');
            });
        }

        // Global search
        const globalSearchInput = document.getElementById('globalSearchInput');
        if (globalSearchInput) {
            globalSearchInput.addEventListener('input', (e) => this.handleGlobalSearch(e.target.value));
            globalSearchInput.addEventListener('focus', () => {
                if (globalSearchInput.value.length >= 2) {
                    document.getElementById('globalSearchResults')?.classList.add('active');
                }
            });
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.global-search')) {
                    document.getElementById('globalSearchResults')?.classList.remove('active');
                }
            });
        }

        // Sidebar navigation
        document.querySelectorAll('.nav-item[data-section]').forEach(item => {
            item.addEventListener('click', () => {
                const section = item.dataset.section;
                this.switchSection(section);
                
                // Close mobile sidebar
                sidebar?.classList.remove('open');
                sidebarOverlay?.classList.remove('active');
            });
        });

        // Search and filter inputs
        document.getElementById('userSearch')?.addEventListener('input', (e) => this.filterUsers(e.target.value));
        document.getElementById('userFilter')?.addEventListener('change', (e) => this.filterUsers(document.getElementById('userSearch').value, e.target.value));
        document.getElementById('orderSearch')?.addEventListener('input', (e) => this.filterOrders(e.target.value));
        document.getElementById('orderStatusFilter')?.addEventListener('change', (e) => this.filterOrders(document.getElementById('orderSearch').value, e.target.value));
        document.getElementById('fileSearch')?.addEventListener('input', (e) => this.filterFiles(e.target.value));
        document.getElementById('contactSearch')?.addEventListener('input', (e) => this.filterContacts(e.target.value));
        document.getElementById('contactStatusFilter')?.addEventListener('change', (e) => this.filterContacts(document.getElementById('contactSearch').value, e.target.value));
        document.getElementById('paymentSearch')?.addEventListener('input', (e) => this.filterPayments(e.target.value));
        document.getElementById('paymentStatusFilter')?.addEventListener('change', (e) => this.filterPayments(document.getElementById('paymentSearch')?.value, e.target.value));
        document.getElementById('quoteSearch')?.addEventListener('input', (e) => this.filterQuotes(e.target.value));
        document.getElementById('quoteStatusFilter')?.addEventListener('change', (e) => this.filterQuotes(document.getElementById('quoteSearch')?.value, e.target.value));
        
        // Create promo code button
        document.getElementById('createPromoBtn')?.addEventListener('click', () => this.openPromoModal());
        
        // Create blog post button
        document.getElementById('createPostBtn')?.addEventListener('click', () => this.openBlogModal());
        
        // Create quote button
        document.getElementById('createQuoteBtn')?.addEventListener('click', () => this.openQuoteModal());
    }

    switchSection(sectionName) {
        // Update nav items
        document.querySelectorAll('.nav-item[data-section]').forEach(item => {
            item.classList.toggle('active', item.dataset.section === sectionName);
        });
        
        // Update sections
        document.querySelectorAll('.admin-section').forEach(section => {
            section.classList.toggle('active', section.id === `section-${sectionName}`);
        });
        
        this.currentSection = sectionName;
        
        // Re-render data when switching to certain sections
        if (sectionName === 'payments') {
            this.renderPayments();
            this.renderSubscriptions();
        } else if (sectionName === 'analytics') {
            this.loadAnalytics();
        } else if (sectionName === 'quotes') {
            this.loadCustomQuotes();
        }
    }

    handleGlobalSearch(query) {
        const resultsContainer = document.getElementById('globalSearchResults');
        if (!resultsContainer) return;
        
        if (query.length < 2) {
            resultsContainer.classList.remove('active');
            return;
        }
        
        const queryLower = query.toLowerCase();
        let html = '';
        
        // Search users
        const matchedUsers = this.users.filter(u => 
            u.email?.toLowerCase().includes(queryLower) ||
            u.full_name?.toLowerCase().includes(queryLower) ||
            u.business_name?.toLowerCase().includes(queryLower)
        ).slice(0, 5);
        
        if (matchedUsers.length > 0) {
            html += `<div class="search-result-group">
                <div class="search-result-group-title">👥 Users</div>
                ${matchedUsers.map(u => `
                    <div class="search-result-item" onclick="adminPanel.switchSection('users'); adminPanel.filterUsers('${u.email}');">
                        <div class="result-icon">👤</div>
                        <div class="result-info">
                            <div class="result-title">${this.escapeHtml(u.full_name || u.email)}</div>
                            <div class="result-subtitle">${this.escapeHtml(u.business_name || u.email)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>`;
        }
        
        // Search requests
        const matchedRequests = this.requests.filter(r => 
            r.service_name?.toLowerCase().includes(queryLower) ||
            r.profiles?.email?.toLowerCase().includes(queryLower) ||
            r.profiles?.full_name?.toLowerCase().includes(queryLower) ||
            r.profiles?.business_name?.toLowerCase().includes(queryLower)
        ).slice(0, 5);
        
        if (matchedRequests.length > 0) {
            html += `<div class="search-result-group">
                <div class="search-result-group-title">📋 Service Requests</div>
                ${matchedRequests.map(r => `
                    <div class="search-result-item" onclick="adminPanel.switchSection('requests'); adminPanel.filterRequests('${r.profiles?.email || ''}');">
                        <div class="result-icon">📋</div>
                        <div class="result-info">
                            <div class="result-title">${this.escapeHtml(r.service_name)}</div>
                            <div class="result-subtitle">${this.escapeHtml(r.profiles?.full_name || r.profiles?.email || 'Unknown')}</div>
                        </div>
                    </div>
                `).join('')}
            </div>`;
        }
        
        // Search contacts
        const matchedContacts = this.contacts.filter(c => 
            c.name?.toLowerCase().includes(queryLower) ||
            c.email?.toLowerCase().includes(queryLower) ||
            c.message?.toLowerCase().includes(queryLower)
        ).slice(0, 3);
        
        if (matchedContacts.length > 0) {
            html += `<div class="search-result-group">
                <div class="search-result-group-title">📬 Contacts</div>
                ${matchedContacts.map(c => `
                    <div class="search-result-item" onclick="adminPanel.switchSection('contacts'); adminPanel.filterContacts('${c.email}');">
                        <div class="result-icon">📬</div>
                        <div class="result-info">
                            <div class="result-title">${this.escapeHtml(c.name)}</div>
                            <div class="result-subtitle">${this.escapeHtml(c.email)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>`;
        }
        
        if (html === '') {
            html = '<div class="empty-state" style="padding: 1rem;">No results found</div>';
        }
        
        resultsContainer.innerHTML = html;
        resultsContainer.classList.add('active');
    }

    filterRequests(searchTerm) {
        const searchInput = document.getElementById('requestSearch');
        if (searchInput) {
            searchInput.value = searchTerm;
        }
        this.renderRequests('all', searchTerm);
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        // Hide previous errors
        errorDiv.style.display = 'none';

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            await this.verifyAdmin(data.user);

        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = error.message || 'Login failed';
            
            // More specific error messages
            if (error.message?.includes('Invalid login credentials')) {
                errorMessage = 'Invalid email or password';
            } else if (error.message?.includes('Email not confirmed')) {
                errorMessage = 'Please verify your email address first';
            } else if (error.message?.includes('Failed to fetch')) {
                errorMessage = 'Connection error. Please check your internet connection and try again.';
            }
            
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
        }
    }

    async verifyAdmin(user) {
        // Check user role from profiles table
        const errorDiv = document.getElementById('loginError');
        
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Profile fetch error:', error);
                
                // Check if table doesn't exist
                if (error.message?.includes('relation "public.profiles" does not exist')) {
                    errorDiv.textContent = 'Database not configured. Please run the SQL setup in Supabase first.';
                    errorDiv.style.display = 'block';
                } else if (error.code === 'PGRST116') {
                    errorDiv.textContent = 'No profile found. Please contact the administrator.';
                    errorDiv.style.display = 'block';
                } else {
                    errorDiv.textContent = 'Error checking permissions: ' + error.message;
                    errorDiv.style.display = 'block';
                }
                
                await supabase.auth.signOut();
                this.showLoginScreen();
                return;
            }

            // Only allow 'admin' and 'owner' roles
            if (!profile || !['admin', 'owner'].includes(profile.role)) {
                errorDiv.textContent = 'Access denied. You are not authorized to access this page.';
                errorDiv.style.display = 'block';
                await supabase.auth.signOut();
                this.showLoginScreen();
                return;
            }

            this.currentUser = user;
            this.userRole = profile.role;
            this.showDashboard();
            await this.loadAllData();
        } catch (error) {
            console.error('Error verifying admin:', error);
            errorDiv.textContent = 'Error verifying permissions. Please try again.';
            errorDiv.style.display = 'block';
            await supabase.auth.signOut();
            this.showLoginScreen();
        }
    }

    async handleLogout() {
        await supabase.auth.signOut();
        this.currentUser = null;
        this.showLoginScreen();
    }

    async reloadData() {
        const reloadBtn = document.getElementById('reloadBtn');
        const originalText = reloadBtn.textContent;
        
        try {
            // Show loading state
            reloadBtn.textContent = '⏳ Loading...';
            reloadBtn.disabled = true;
            
            // Reload all data
            await this.loadAllData();
            
            // Show success feedback
            reloadBtn.textContent = '✅ Reloaded!';
            setTimeout(() => {
                reloadBtn.textContent = originalText;
                reloadBtn.disabled = false;
            }, 1000);
        } catch (error) {
            console.error('Error reloading data:', error);
            reloadBtn.textContent = '❌ Error';
            setTimeout(() => {
                reloadBtn.textContent = originalText;
                reloadBtn.disabled = false;
            }, 2000);
        }
    }

    showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('adminDashboard').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        
        const emailSpan = document.getElementById('sidebarUserEmail');
        if (emailSpan) {
            const roleBadge = this.userRole === 'owner' ? '👑' : '🛡️';
            emailSpan.textContent = `${roleBadge} ${this.currentUser.email}`;
        }

        // Setup event listeners for dashboard elements now that they're visible
        this.setupDashboardEventListeners();
    }

    setupDashboardEventListeners() {
        // Upload file button
        const uploadFileBtn = document.getElementById('uploadFileBtn');
        if (uploadFileBtn) {
            // Remove any existing listeners by cloning the element
            const newUploadBtn = uploadFileBtn.cloneNode(true);
            uploadFileBtn.parentNode.replaceChild(newUploadBtn, uploadFileBtn);
            
            newUploadBtn.addEventListener('click', () => {
                console.log('Upload file button clicked');
                this.openUploadModal();
            });
        }

        // Upload file form - clone first, then add listeners
        const uploadFileForm = document.getElementById('uploadFileForm');
        if (uploadFileForm) {
            const newForm = uploadFileForm.cloneNode(true);
            uploadFileForm.parentNode.replaceChild(newForm, uploadFileForm);
            
            newForm.addEventListener('submit', (e) => this.handleFileUpload(e));
            
            // Add close button listener AFTER form is cloned
            const closeBtn = newForm.querySelector('#closeUploadModal');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Cancel button clicked - closing modal');
                    this.closeUploadModal();
                });
            }
        }

        // Close modal when clicking outside
        const uploadModal = document.getElementById('uploadModal');
        if (uploadModal) {
            uploadModal.addEventListener('click', (e) => {
                if (e.target === uploadModal) {
                    console.log('Clicked outside modal - closing');
                    this.closeUploadModal();
                }
            });
        }
    }

    async loadAllData() {
        try {
            // Load all data in parallel
            await Promise.all([
                this.loadUsers(),
                this.loadOrders(),
                this.loadRequests(),
                this.loadContacts(),
                this.loadFiles(),
                this.loadPayments(),
                this.loadPromoCodes(),
                this.loadBlogPosts()
            ]);

            this.updateStats();
            this.renderUsers();
            this.renderOrders();
            this.renderContacts();
            this.renderFiles();
            this.renderPayments();
            this.renderSubscriptions();
            this.renderRecentActivity();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async loadPayments() {
        try {
            // Get all service requests for payment tracking
            const { data: paidRequests, error } = await supabase
                .from('service_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            // Fetch user profiles separately
            if (paidRequests && paidRequests.length > 0) {
                const userIds = [...new Set(paidRequests.map(r => r.user_id).filter(Boolean))];
                if (userIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, email, full_name, business_name')
                        .in('id', userIds);

                    // Merge profiles into payments
                    paidRequests.forEach(payment => {
                        const profile = profiles?.find(p => p.id === payment.user_id);
                        payment.profiles = profile || null;
                    });
                }
            }
            
            this.payments = paidRequests || [];
            console.log('Loaded payments:', this.payments.length, this.payments);
            // Debug: log package details of first payment
            if (this.payments.length > 0) {
                console.log('First payment package_details:', this.payments[0].package_details);
            }
        } catch (error) {
            console.error('Error loading payments:', error);
            this.payments = [];
        }
    }

    renderPayments(filteredPayments = null) {
        const container = document.getElementById('paymentsTableContainer');
        console.log('renderPayments called, container:', container, 'payments:', this.payments?.length);
        if (!container) return;

        const paymentsToRender = filteredPayments || this.payments;

        if (paymentsToRender.length === 0) {
            container.innerHTML = '<div class="empty-state">No orders found</div>';
            return;
        }

        const statusColors = {
            'paid': '#10b981',
            'ready_to_purchase': '#fbbf24',
            'pending': '#6b7280',
            'refunded': '#ef4444',
            'partial_refund': '#f97316'
        };

        const statusLabels = {
            'paid': '✅ Paid',
            'ready_to_purchase': '⏳ Awaiting Payment',
            'pending': '📋 Quote Pending',
            'refunded': '💸 Refunded',
            'partial_refund': '💸 Partial Refund'
        };

        const html = `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Service</th>
                        <th>One-Time</th>
                        <th>Monthly</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${paymentsToRender.map(payment => {
                        const customer = payment.profiles || {};
                        // Use status field primarily, payment_status only if it indicates refund
                        const displayStatus = (payment.payment_status === 'refunded' || payment.payment_status === 'partial_refund') 
                            ? payment.payment_status 
                            : payment.status;
                        const statusColor = statusColors[displayStatus] || '#6b7280';
                        const statusLabel = statusLabels[displayStatus] || displayStatus;
                        const packageDetails = payment.package_details || {};
                        const monthlyCost = (packageDetails.maintenance_plan?.monthly_cost || 0) + (packageDetails.google_workspace?.monthly_cost || 0);
                        const canRefund = payment.status === 'paid' && (payment.stripe_payment_intent_id || payment.stripe_subscription_id);
                        
                        return `
                            <tr>
                                <td>${new Date(payment.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div style="font-weight: 500;">${this.escapeHtml(customer.full_name || 'N/A')}</div>
                                    <div style="font-size: 0.8rem; color: #94a3b8;">${this.escapeHtml(customer.business_name || customer.email || '')}</div>
                                </td>
                                <td>${this.escapeHtml(payment.service_name)}</td>
                                <td>$${parseFloat(payment.total_amount || 0).toLocaleString()}</td>
                                <td>${monthlyCost > 0 ? `$${monthlyCost}/mo` : '-'}</td>
                                <td>
                                    <span style="display: inline-block; padding: 0.375rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}44;">
                                        ${statusLabel}
                                    </span>
                                </td>
                                <td>
                                    <div class="table-actions">
                                        <button class="table-btn view" onclick="adminPanel.viewOrderDetails('${payment.id}')">View</button>
                                        ${canRefund ? `<button class="table-btn refund" onclick="adminPanel.openRefundModal('${payment.id}')">Refund</button>` : ''}
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    renderSubscriptions() {
        const container = document.getElementById('subscriptionsTableContainer');
        console.log('renderSubscriptions called, container:', container, 'payments:', this.payments?.length);
        if (!container) return;

        // Use payments data which has profiles attached
        const activeSubscriptions = this.payments.filter(r => r.stripe_subscription_id && r.status === 'paid');
        console.log('Active subscriptions found:', activeSubscriptions.length, activeSubscriptions);

        if (activeSubscriptions.length === 0) {
            container.innerHTML = '<div class="empty-state">No active subscriptions</div>';
            return;
        }

        const html = `
            <table>
                <thead>
                    <tr>
                        <th>Customer</th>
                        <th>Service</th>
                        <th>Plan Details</th>
                        <th>Monthly Amount</th>
                        <th>Started</th>
                    </tr>
                </thead>
                <tbody>
                    ${activeSubscriptions.map(sub => {
                        const customer = sub.profiles || {};
                        const packageDetails = sub.package_details || {};
                        const maintenancePlan = packageDetails.maintenance_plan;
                        const googleWorkspace = packageDetails.google_workspace;
                        const monthlyCost = (maintenancePlan?.monthly_cost || 0) + (googleWorkspace?.monthly_cost || 0);
                        
                        // Build plan details string
                        let planDetails = [];
                        if (maintenancePlan?.name || maintenancePlan?.type) {
                            planDetails.push(`${maintenancePlan.name || maintenancePlan.type} Maintenance`);
                        }
                        if (googleWorkspace?.name || googleWorkspace?.plan) {
                            const users = googleWorkspace.additional_users || googleWorkspace.users || 1;
                            planDetails.push(`Google Workspace: ${googleWorkspace.name || googleWorkspace.plan} (${users} user${users > 1 ? 's' : ''})`);
                        }
                        
                        return `
                            <tr>
                                <td>
                                    <div style="font-weight: 500;">${this.escapeHtml(customer.full_name || customer.email || 'Unknown')}</div>
                                    <div style="font-size: 0.8rem; color: #94a3b8;">${this.escapeHtml(customer.business_name || '')}</div>
                                </td>
                                <td>${this.escapeHtml(sub.service_name)}</td>
                                <td style="font-size: 0.85rem;">${planDetails.length > 0 ? planDetails.join('<br>') : 'N/A'}</td>
                                <td style="color: #10b981; font-weight: 600;">$${monthlyCost}/mo</td>
                                <td>${new Date(sub.created_at).toLocaleDateString()}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    renderRecentActivity() {
        const container = document.getElementById('recentActivityContainer');
        if (!container) return;

        // Combine recent items from all sources
        const activities = [];
        
        // Recent requests
        this.requests.slice(0, 5).forEach(r => {
            activities.push({
                type: 'request',
                icon: '📋',
                title: `New request: ${r.service_name}`,
                subtitle: r.profiles?.full_name || r.profiles?.email || 'Unknown user',
                date: new Date(r.created_at),
                color: '#8b5cf6'
            });
        });
        
        // Recent contacts
        this.contacts.slice(0, 3).forEach(c => {
            activities.push({
                type: 'contact',
                icon: '📬',
                title: `Contact from ${c.name}`,
                subtitle: c.email,
                date: new Date(c.created_at),
                color: '#f59e0b'
            });
        });
        
        // Recent users
        this.users.slice(0, 3).forEach(u => {
            activities.push({
                type: 'user',
                icon: '👤',
                title: `New user: ${u.full_name || u.email}`,
                subtitle: u.business_name || 'No business',
                date: new Date(u.created_at),
                color: '#3b82f6'
            });
        });
        
        // Sort by date
        activities.sort((a, b) => b.date - a.date);
        
        if (activities.length === 0) {
            container.innerHTML = '<div class="empty-state">No recent activity</div>';
            return;
        }
        
        const html = activities.slice(0, 10).map(activity => `
            <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div style="width: 40px; height: 40px; background: ${activity.color}22; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                    ${activity.icon}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${this.escapeHtml(activity.title)}</div>
                    <div style="font-size: 0.8rem; color: #94a3b8;">${this.escapeHtml(activity.subtitle)}</div>
                </div>
                <div style="font-size: 0.8rem; color: #64748b;">
                    ${this.formatTimeAgo(activity.date)}
                </div>
            </div>
        `).join('');
        
        container.innerHTML = html;
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    filterPayments(searchTerm = '', statusFilter = 'all') {
        let filtered = this.payments;

        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.service_name?.toLowerCase().includes(query) ||
                p.profiles?.email?.toLowerCase().includes(query) ||
                p.profiles?.full_name?.toLowerCase().includes(query) ||
                p.profiles?.business_name?.toLowerCase().includes(query)
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(p => p.status === statusFilter);
        }

        this.renderPayments(filtered);
    }

    async loadUsers() {
        try {
            // Disable RLS temporarily for this query by using rpc or direct select
            const { data: profiles, error } = await supabase
                .rpc('get_all_profiles')
                .order('created_at', { ascending: false });
            
            // Fallback to direct query if RPC doesn't exist
            if (error && error.message?.includes('function public.get_all_profiles() does not exist')) {
                const { data: fallbackProfiles, error: fallbackError } = await supabase
                    .from('profiles')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (fallbackError) throw fallbackError;
                this.users = fallbackProfiles || [];
            } else if (error) {
                throw error;
            } else {
                this.users = profiles || [];
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.users = [];
        }
    }

    async loadOrders() {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.orders = data || [];
        } catch (error) {
            console.error('Error loading orders:', error);
            this.orders = [];
        }
    }

    async loadRequests() {
        try {
            const { data: requests, error } = await supabase
                .from('service_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch user profiles separately
            if (requests && requests.length > 0) {
                const userIds = [...new Set(requests.map(r => r.user_id))];
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, email, full_name, business_name')
                    .in('id', userIds);

                // Merge profiles into requests
                requests.forEach(request => {
                    const profile = profiles?.find(p => p.id === request.user_id);
                    request.profiles = profile || null;
                });
            }

            this.requests = requests || [];
            this.renderRequests();
            this.setupRequestFilters();
        } catch (error) {
            console.error('Error loading requests:', error);
            const container = document.getElementById('requestsTableContainer');
            if (container) {
                container.innerHTML = '<p class="error">Error loading requests</p>';
            }
        }
    }

    renderRequests(filter = 'all', searchTerm = '') {
        const container = document.getElementById('requestsTableContainer');
        if (!container) return;

        let filtered = this.requests;

        if (filter !== 'all') {
            filtered = filtered.filter(r => r.status === filter);
        }

        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            filtered = filtered.filter(r => 
                r.service_name?.toLowerCase().includes(query) ||
                r.profiles?.email?.toLowerCase().includes(query) ||
                r.profiles?.full_name?.toLowerCase().includes(query) ||
                r.profiles?.business_name?.toLowerCase().includes(query)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 2rem; opacity: 0.6;">No requests found</p>';
            return;
        }

        const statusColors = {
            'pending': '#fbbf24',
            'in_progress': '#3b82f6',
            'active': '#10b981',
            'ready_to_purchase': '#10b981',
            'paid': '#22c55e',
            'cancelled': '#ef4444'
        };

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Service</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Contract</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        filtered.forEach(request => {
            const userEmail = request.profiles?.email || 'Unknown User';
            const userName = request.profiles?.full_name || userEmail;
            const date = new Date(request.created_at).toLocaleDateString();
            const statusColor = statusColors[request.status] || '#6b7280';

            html += `
                <tr>
                    <td>
                        <div style="font-weight: 500;">${userName}</div>
                        <div style="font-size: 0.85rem; opacity: 0.7;">${userEmail}</div>
                    </td>
                    <td>
                        <strong>${request.service_name}</strong>
                        ${request.package_details?.details ? `<br><small style="opacity: 0.7;">${request.package_details.details.substring(0, 40)}...</small>` : ''}
                    </td>
                    <td>$${request.total_amount}</td>
                    <td>
                        <select class="status-select" data-request-id="${request.id}" style="background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}44; padding: 0.5rem; border-radius: 0.375rem; font-weight: 500;">
                            <option value="pending" ${request.status === 'pending' ? 'selected' : ''} style="background: #1a1f2e; color: white;">⏳ Pending</option>
                            <option value="in_progress" ${request.status === 'in_progress' ? 'selected' : ''} style="background: #1a1f2e; color: white;">🔧 In Progress</option>
                            <option value="active" ${request.status === 'active' ? 'selected' : ''} style="background: #1a1f2e; color: white;">✨ Active</option>
                            <option value="ready_to_purchase" ${request.status === 'ready_to_purchase' ? 'selected' : ''} style="background: #1a1f2e; color: white;">💳 Ready to Purchase</option>
                            <option value="paid" ${request.status === 'paid' ? 'selected' : ''} style="background: #1a1f2e; color: white;">✅ Paid</option>
                            <option value="cancelled" ${request.status === 'cancelled' ? 'selected' : ''} style="background: #1a1f2e; color: white;">❌ Cancelled</option>
                        </select>
                    </td>
                    <td>${date}</td>
                    <td>
                        ${request.contract_file_id ? 
                            `<button class="action-btn view-contract-btn" data-file-id="${request.contract_file_id}" style="font-size: 0.85rem; padding: 0.4rem 0.8rem; background: var(--primary);">View Contract</button>` : 
                            `<button class="action-btn small upload-contract-btn" data-request-id="${request.id}" data-user-id="${request.user_id}" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">Upload Contract</button>`
                        }
                    </td>
                    <td>
                        <button class="action-btn danger small delete-request-btn" data-request-id="${request.id}" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">Delete</button>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;

        console.log('Requests rendered, adding event listeners...');

        // Add event listeners for status changes
        container.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const requestId = e.target.dataset.requestId;
                const newStatus = e.target.value;
                await this.updateRequestStatus(requestId, newStatus);
            });
        });

        // Add event listeners for upload contract buttons
        const uploadButtons = container.querySelectorAll('.upload-contract-btn');
        console.log('Found upload buttons:', uploadButtons.length);
        uploadButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Upload contract clicked!');
                const requestId = e.target.dataset.requestId;
                const userId = e.target.dataset.userId;
                this.uploadContractForRequest(requestId, userId);
            });
        });

        // Add event listeners for view contract buttons
        const viewButtons = container.querySelectorAll('.view-contract-btn');
        console.log('Found view contract buttons:', viewButtons.length);
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fileId = e.target.dataset.fileId;
                this.scrollToFileInManager(fileId);
            });
        });

        // Add event listeners for delete buttons
        const deleteButtons = container.querySelectorAll('.delete-request-btn');
        console.log('Found delete buttons:', deleteButtons.length);
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                console.log('Delete clicked!');
                const requestId = e.target.dataset.requestId;
                this.deleteRequest(requestId);
            });
        });
    }

    setupRequestFilters() {
        const searchInput = document.getElementById('requestSearch');
        const statusFilter = document.getElementById('requestStatusFilter');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const filter = statusFilter?.value || 'all';
                this.renderRequests(filter, e.target.value);
            });
        }

        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                const search = searchInput?.value || '';
                this.renderRequests(e.target.value, search);
            });
        }
    }

    async updateRequestStatus(requestId, newStatus) {
        try {
            const { error } = await supabase
                .from('service_requests')
                .update({ status: newStatus })
                .eq('id', requestId);

            if (error) throw error;

            // Reload requests
            await this.loadRequests();
            
            // Show success message
            alert('Request status updated successfully!');
        } catch (error) {
            console.error('Error updating request status:', error);
            alert('Error updating status: ' + error.message);
        }
    }

    async uploadContractForRequest(requestId, userId) {
        console.log('uploadContractForRequest called with:', requestId, userId);
        // Store the request ID for later use
        this.currentRequestId = requestId;
        this.currentRequestUserId = userId;
        
        // Open the file upload modal with the user pre-selected
        const modal = document.getElementById('uploadModal');
        console.log('Modal element found:', modal);
        if (modal) {
            const userSelect = document.getElementById('userSelect');
            console.log('User select found:', userSelect);
            if (userSelect) {
                // Ensure users are loaded in the select
                if (userSelect.options.length <= 1) {
                    // Populate user select if not already done
                    this.populateUserSelect();
                }
                userSelect.value = userId;
                userSelect.disabled = true; // Disable since we're uploading for specific request
                console.log('User select value set to:', userId);
            }
            
            // Set default file name to "Contract"
            const fileNameInput = document.getElementById('fileName');
            if (fileNameInput) {
                fileNameInput.value = 'Contract';
            }
            
            modal.style.display = 'flex';
            console.log('Modal display set to flex');
        } else {
            console.error('Upload modal not found!');
        }
    }

    scrollToFileInManager(fileId) {
        // Scroll to Files Management section
        const filesSection = document.getElementById('filesTableContainer');
        if (filesSection) {
            filesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // Highlight the file row
            setTimeout(() => {
                const fileRow = filesSection.querySelector(`tr[data-file-id="${fileId}"]`);
                if (fileRow) {
                    fileRow.style.background = 'rgba(0, 102, 255, 0.2)';
                    fileRow.style.transition = 'background 2s';
                    setTimeout(() => {
                        fileRow.style.background = '';
                    }, 2000);
                }
            }, 500);
        }
    }

    async deleteRequest(requestId) {
        if (!confirm('Are you sure you want to delete this request?')) return;

        try {
            const { error } = await supabase
                .from('service_requests')
                .delete()
                .eq('id', requestId);

            if (error) throw error;

            await this.loadRequests();
            alert('Request deleted successfully!');
        } catch (error) {
            console.error('Error deleting request:', error);
            alert('Error deleting request: ' + error.message);
        }
    }

    async loadFiles() {
        try {
            console.log('Loading files...');
            const { data, error } = await supabase
                .from('files')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading files:', error);
                throw error;
            }
            
            console.log('Files loaded from database:', data);
            
            // Get user emails from auth.users via RPC or profiles
            if (data && data.length > 0) {
                const userIds = [...new Set(data.map(f => f.user_id))];
                
                // Try to get emails from profiles first
                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, email')
                    .in('id', userIds);
                
                console.log('Profiles query result:', profiles, 'Error:', profileError);
                
                // Create email map from profiles
                const emailMap = {};
                profiles?.forEach(p => {
                    emailMap[p.id] = p.email;
                });
                
                // For users not in profiles, show a helpful message
                const missingUserIds = userIds.filter(id => !emailMap[id]);
                if (missingUserIds.length > 0) {
                    console.warn('Users not found in profiles (run fix_missing_profiles.sql):', missingUserIds);
                }
                
                this.files = data.map(file => ({
                    ...file,
                    user_email: emailMap[file.user_id] || 'Unknown User'
                }));
            } else {
                this.files = [];
            }
            
            console.log('Files processed:', this.files.length, 'Files:', this.files);
        } catch (error) {
            console.error('Error loading files:', error);
            this.files = [];
        }
    }

    updateStats() {
        document.getElementById('totalUsers').textContent = this.users.length;
        document.getElementById('totalRequests').textContent = this.requests.length;
        
        // Calculate total revenue from paid requests
        const paidRequests = this.requests.filter(r => r.status === 'paid');
        const totalRevenue = paidRequests.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
        document.getElementById('totalRevenue').textContent = '$' + totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        
        document.getElementById('totalFiles').textContent = this.files.length;

        // Payment summary stats
        const totalPaidEl = document.getElementById('totalPaidRevenue');
        if (totalPaidEl) {
            totalPaidEl.textContent = '$' + totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        }

        const pendingRequests = this.requests.filter(r => r.status === 'ready_to_purchase');
        const pendingAmount = pendingRequests.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
        const pendingEl = document.getElementById('pendingPayments');
        if (pendingEl) {
            pendingEl.textContent = '$' + pendingAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        }

        // Calculate monthly recurring revenue
        const activeSubscriptions = this.requests.filter(r => r.stripe_subscription_id && r.status === 'paid');
        const monthlyRecurring = activeSubscriptions.reduce((sum, r) => {
            const pkg = r.package_details || {};
            return sum + (pkg.maintenance_plan?.monthly_cost || 0) + (pkg.google_workspace?.monthly_cost || 0);
        }, 0);
        const monthlyEl = document.getElementById('monthlyRecurring');
        if (monthlyEl) {
            monthlyEl.textContent = '$' + monthlyRecurring.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        }

        const subscriptionsEl = document.getElementById('activeSubscriptions');
        if (subscriptionsEl) {
            subscriptionsEl.textContent = activeSubscriptions.length;
        }

        // Update contacts badge in nav
        const newContacts = this.contacts.filter(c => c.status === 'new').length;
        const navBadge = document.getElementById('navContactsBadge');
        if (navBadge) {
            if (newContacts > 0) {
                navBadge.textContent = newContacts;
                navBadge.style.display = 'inline-block';
            } else {
                navBadge.style.display = 'none';
            }
        }
    }

    renderUsers(filteredUsers = null) {
        const container = document.getElementById('usersTableContainer');
        const usersToRender = filteredUsers || this.users;

        if (usersToRender.length === 0) {
            container.innerHTML = '<div class="empty-state">No users found</div>';
            return;
        }

        const html = `
            <table>
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Name</th>
                        <th>Business</th>
                        <th>Created</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${usersToRender.map(user => `
                        <tr>
                            <td>${user.email || 'N/A'}</td>
                            <td>${user.full_name || 'N/A'}</td>
                            <td>${user.business_name || '-'}</td>
                            <td>${new Date(user.created_at).toLocaleDateString()}</td>
                            <td>${this.getRoleBadge(user.role)}</td>
                            <td>
                                <button class="action-btn" onclick="adminPanel.viewUser('${user.id}')">View</button>
                                ${this.userRole === 'owner' ? `<button class="action-btn" onclick="adminPanel.changeUserRole('${user.id}')">Change Role</button>` : ''}
                                <button class="action-btn delete" onclick="adminPanel.deleteUser('${user.id}')">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    renderOrders(filteredOrders = null) {
        const container = document.getElementById('ordersTableContainer');
        const ordersToRender = filteredOrders || this.orders;

        if (ordersToRender.length === 0) {
            container.innerHTML = '<div class="empty-state">No orders found</div>';
            return;
        }

        const html = `
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>User</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${ordersToRender.map(order => `
                        <tr>
                            <td>#${order.id?.substring(0, 8)}</td>
                            <td>${order.user_email || order.user_id || 'N/A'}</td>
                            <td>$${parseFloat(order.total_amount || 0).toFixed(2)}</td>
                            <td><span style="color: ${this.getStatusColor(order.status)}">${order.status || 'pending'}</span></td>
                            <td>${new Date(order.created_at).toLocaleDateString()}</td>
                            <td>
                                <button class="action-btn" onclick="adminPanel.viewOrder('${order.id}')">View</button>
                                <button class="action-btn" onclick="adminPanel.updateOrderStatus('${order.id}')">Update</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    renderFiles(filteredFiles = null) {
        const container = document.getElementById('filesTableContainer');
        let filesToRender = filteredFiles || this.files;

        if (filesToRender.length === 0) {
            container.innerHTML = '<div class="empty-state">No files found</div>';
            return;
        }

        const html = `
            <table>
                <thead>
                    <tr>
                        <th>File Name</th>
                        <th>User</th>
                        <th>Description</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Size</th>
                        <th>Uploaded</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filesToRender.map(file => {
                        // Check if this file is a contract
                        const linkedRequest = this.requests?.find(r => r.contract_file_id === file.id);
                        const isContract = !!linkedRequest;
                        const isSigned = file.status === 'signed';
                        
                        return `
                        <tr data-file-id="${file.id}">
                            <td><strong>${file.file_name || file.name || 'N/A'}</strong></td>
                            <td>${file.user_email || file.user_id || 'N/A'}</td>
                            <td>${file.description || '-'}</td>
                            <td>
                                ${isContract ? 
                                    `<span style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem; border: 1px solid rgba(59, 130, 246, 0.3);">📄 Contract</span><br><small style="color: var(--text-secondary); font-size: 0.75rem;">${linkedRequest.service_name}</small>` : 
                                    '<span style="opacity: 0.6;">Document</span>'
                                }
                            </td>
                            <td>
                                <span class="status-badge" style="
                                    padding: 0.25rem 0.75rem;
                                    border-radius: 20px;
                                    font-size: 0.875rem;
                                    background: ${isSigned ? 'rgba(16, 185, 129, 0.1)' : 'rgba(251, 191, 36, 0.1)'};
                                    color: ${isSigned ? '#10b981' : '#fbbf24'};
                                    border: 1px solid ${isSigned ? 'rgba(16, 185, 129, 0.3)' : 'rgba(251, 191, 36, 0.3)'};
                                ">
                                    ${isSigned ? '✅ Signed' : '⏳ Pending'}
                                </span>
                                ${isSigned && file.signed_at ? `<br><small style="color: var(--text-secondary); font-size: 0.75rem;">Signed ${new Date(file.signed_at).toLocaleDateString()}</small>` : ''}
                            </td>
                            <td>${this.formatFileSize(file.file_size || file.size || 0)}</td>
                            <td>${new Date(file.created_at).toLocaleDateString()}</td>
                            <td>
                                ${file.file_url ? `<button class="action-btn" onclick="window.open('${file.file_url}', '_blank')">View</button>` : ''}
                                ${!isSigned ? 
                                    `<button class="action-btn delete" onclick="adminPanel.deleteFile('${file.id}')">Delete</button>` : 
                                    `<button class="action-btn" disabled style="opacity: 0.5; cursor: not-allowed;" title="Cannot delete signed documents">Delete</button>`
                                }
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    filterUsers(searchTerm = '', filter = 'all') {
        let filtered = this.users;

        if (searchTerm) {
            const query = searchTerm.toLowerCase();
            filtered = filtered.filter(user => 
                (user.email || '').toLowerCase().includes(query) ||
                (user.full_name || '').toLowerCase().includes(query) ||
                (user.business_name || '').toLowerCase().includes(query)
            );
        }

        if (filter === 'verified') {
            filtered = filtered.filter(user => user.email_confirmed_at || user.verified);
        } else if (filter === 'unverified') {
            filtered = filtered.filter(user => !user.email_confirmed_at && !user.verified);
        } else if (filter === 'admin') {
            filtered = filtered.filter(user => user.role === 'admin' || user.role === 'owner');
        }

        this.renderUsers(filtered);
    }

    filterOrders(searchTerm = '', statusFilter = 'all') {
        let filtered = this.orders;

        if (searchTerm) {
            filtered = filtered.filter(order => 
                (order.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.user_email || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(order => order.status === statusFilter);
        }

        this.renderOrders(filtered);
    }

    filterFiles(searchTerm = '') {
        let filtered = this.files;

        if (searchTerm) {
            filtered = filtered.filter(file => 
                (file.file_name || file.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (file.user_email || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        this.renderFiles(filtered);
    }

    // Contact Submissions Management
    async loadContacts() {
        try {
            const { data: contacts, error } = await supabase
                .from('contact_submissions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.contacts = contacts || [];
            this.renderContacts();
            
            // Update new contacts badge
            const newCount = contacts?.filter(c => c.status === 'new').length || 0;
            const badge = document.getElementById('newContactsBadge');
            if (badge) {
                if (newCount > 0) {
                    badge.textContent = `${newCount} New`;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error loading contacts:', error);
            const container = document.getElementById('contactsTableContainer');
            if (container) {
                container.innerHTML = '<p class="error">Error loading contact submissions</p>';
            }
        }
    }

    renderContacts(filter = 'all', searchTerm = '') {
        const container = document.getElementById('contactsTableContainer');
        if (!container) return;

        let filtered = this.contacts;

        if (filter !== 'all') {
            filtered = filtered.filter(c => c.status === filter);
        }

        if (searchTerm) {
            filtered = filtered.filter(c => 
                c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.source?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No contact submissions found</p>';
            return;
        }

        const statusColors = {
            'new': '#ef4444',
            'read': '#3b82f6',
            'replied': '#10b981',
            'archived': '#6b7280'
        };

        const statusIcons = {
            'new': '🆕',
            'read': '👁️',
            'replied': '✅',
            'archived': '📦'
        };

        const html = `
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Message</th>
                        <th>Source</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(contact => {
                        const statusColor = statusColors[contact.status] || '#6b7280';
                        const statusIcon = statusIcons[contact.status] || '📝';
                        
                        return `
                        <tr style="${contact.status === 'new' ? 'background: rgba(239, 68, 68, 0.05);' : ''}">
                            <td><strong>${this.escapeHtml(contact.name)}</strong></td>
                            <td>
                                <a href="mailto:${contact.email}" style="color: var(--primary); text-decoration: none;">
                                    ${this.escapeHtml(contact.email)}
                                </a>
                            </td>
                            <td>
                                <div style="max-width: 300px; max-height: 100px; overflow: auto; font-size: 0.875rem;">
                                    ${this.escapeHtml(contact.message)}
                                </div>
                            </td>
                            <td style="font-size: 0.875rem; color: var(--text-secondary);">
                                ${contact.source ? this.escapeHtml(contact.source) : '-'}
                            </td>
                            <td>
                                <select class="status-select" data-contact-id="${contact.id}" style="
                                    background: ${statusColor}22;
                                    color: ${statusColor};
                                    border: 1px solid ${statusColor}44;
                                    padding: 0.5rem;
                                    border-radius: 8px;
                                    font-size: 0.875rem;
                                    font-weight: 600;
                                    cursor: pointer;
                                ">
                                    <option value="new" ${contact.status === 'new' ? 'selected' : ''} style="background: #1a1f2e; color: white;">${statusIcons.new} New</option>
                                    <option value="read" ${contact.status === 'read' ? 'selected' : ''} style="background: #1a1f2e; color: white;">${statusIcons.read} Read</option>
                                    <option value="replied" ${contact.status === 'replied' ? 'selected' : ''} style="background: #1a1f2e; color: white;">${statusIcons.replied} Replied</option>
                                    <option value="archived" ${contact.status === 'archived' ? 'selected' : ''} style="background: #1a1f2e; color: white;">${statusIcons.archived} Archived</option>
                                </select>
                            </td>
                            <td>
                                <div style="font-size: 0.875rem;">
                                    ${new Date(contact.created_at).toLocaleDateString()}
                                </div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary);">
                                    ${new Date(contact.created_at).toLocaleTimeString()}
                                </div>
                            </td>
                            <td>
                                <button class="action-btn" onclick="adminPanel.viewContactDetails('${contact.id}')">View</button>
                                <button class="action-btn delete" onclick="adminPanel.deleteContact('${contact.id}')">Delete</button>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;

        // Setup status change listeners
        container.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const contactId = e.target.dataset.contactId;
                const newStatus = e.target.value;
                await this.updateContactStatus(contactId, newStatus);
            });
        });
    }

    filterContacts(searchTerm = '', filter = 'all') {
        this.renderContacts(filter, searchTerm);
    }

    async updateContactStatus(contactId, newStatus) {
        try {
            const { error } = await supabase
                .from('contact_submissions')
                .update({ status: newStatus })
                .eq('id', contactId);

            if (error) throw error;

            await this.loadContacts();
        } catch (error) {
            console.error('Error updating contact status:', error);
            alert('Error updating status: ' + error.message);
        }
    }

    async viewContactDetails(contactId) {
        const contact = this.contacts.find(c => c.id === contactId);
        if (!contact) return;

        // Mark as read if it's new
        if (contact.status === 'new') {
            await this.updateContactStatus(contactId, 'read');
        }

        const message = `
Name: ${contact.name}
Email: ${contact.email}
Source: ${contact.source || 'Not provided'}
Date: ${new Date(contact.created_at).toLocaleString()}

Message:
${contact.message}

${contact.admin_notes ? `\nAdmin Notes:\n${contact.admin_notes}` : ''}
        `;

        alert(message);
    }

    async deleteContact(contactId) {
        if (!confirm('Are you sure you want to delete this contact submission?')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('contact_submissions')
                .delete()
                .eq('id', contactId);

            if (error) throw error;

            await this.loadContacts();
            alert('Contact submission deleted successfully');
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('Error deleting contact: ' + error.message);
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getStatusColor(status) {
        const colors = {
            pending: '#fbbf24',
            processing: '#60a5fa',
            completed: '#34d399',
            cancelled: '#f87171'
        };
        return colors[status] || '#94a3b8';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    getRoleBadge(role) {
        const badges = {
            'owner': '👑 Owner',
            'admin': '🛡️ Admin',
            'user': '👤 User'
        };
        return badges[role] || '👤 User';
    }

    async viewUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            alert(`User Details:\n\nEmail: ${user.email}\nName: ${user.full_name || 'N/A'}\nBusiness: ${user.business_name || 'N/A'}\nRole: ${user.role}\nCreated: ${new Date(user.created_at).toLocaleString()}`);
        }
    }

    async changeUserRole(userId) {
        if (this.userRole !== 'owner') {
            alert('Only the owner can change user roles.');
            return;
        }

        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        const newRole = prompt(`Change role for ${user.email}\n\nCurrent role: ${user.role}\n\nEnter new role (user, admin, owner):`, user.role);
        if (!newRole) return;

        const validRoles = ['user', 'admin', 'owner'];
        if (!validRoles.includes(newRole.toLowerCase())) {
            alert('Invalid role. Please use: user, admin, or owner');
            return;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole.toLowerCase() })
                .eq('id', userId);

            if (error) throw error;

            alert('User role updated successfully!');
            await this.loadUsers();
            this.renderUsers();
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Error updating role: ' + error.message);
        }
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            const { data, error } = await supabase
                .rpc('admin_delete_user', { user_id_to_delete: userId });

            if (error) throw error;

            if (data && data.success) {
                alert(data.message || 'User deleted successfully!');
                await this.loadUsers();
                this.updateStats();
                this.renderUsers();
            } else if (data && !data.success) {
                alert('Error: ' + (data.error || 'Failed to delete user'));
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user: ' + error.message);
        }
    }

    async viewOrder(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            alert(`Order Details:\n\nOrder ID: ${order.id}\nAmount: $${parseFloat(order.total_amount || 0).toFixed(2)}\nStatus: ${order.status}\nCreated: ${new Date(order.created_at).toLocaleString()}`);
        }
    }

    async updateOrderStatus(orderId) {
        const newStatus = prompt('Enter new status (pending, processing, completed, cancelled):');
        if (!newStatus) return;

        const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
        if (!validStatuses.includes(newStatus.toLowerCase())) {
            alert('Invalid status. Please use: pending, processing, completed, or cancelled');
            return;
        }

        try {
            const { error } = await supabase
                .from('orders')
                .update({ status: newStatus.toLowerCase() })
                .eq('id', orderId);

            if (error) throw error;

            alert('Order status updated successfully!');
            await this.loadOrders();
            this.renderOrders();
        } catch (error) {
            console.error('Error updating order:', error);
            alert('Error updating order: ' + error.message);
        }
    }

    async deleteFile(fileId) {
        if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
            return;
        }

        try {
            // First get the file to delete from storage
            const file = this.files.find(f => f.id === fileId);
            
            if (file?.file_url) {
                // Extract file path from URL
                const urlParts = file.file_url.split('/');
                const bucketIndex = urlParts.indexOf('user-documents');
                if (bucketIndex !== -1) {
                    const filePath = urlParts.slice(bucketIndex + 1).join('/');
                    
                    // Delete from storage
                    await supabase.storage
                        .from('user-documents')
                        .remove([filePath]);
                }
            }

            // Delete from database
            const { error } = await supabase
                .from('files')
                .delete()
                .eq('id', fileId);

            if (error) throw error;

            alert('File deleted successfully!');
            await this.loadFiles();
            this.renderFiles();
        } catch (error) {
            console.error('Error deleting file:', error);
            alert('Error deleting file: ' + error.message);
        }
    }

    async openUploadModal() {
        const modal = document.getElementById('uploadModal');
        modal.style.display = 'flex';

        // Load users into select dropdown
        const userSelect = document.getElementById('userSelect');
        userSelect.innerHTML = '<option value="">Select a user...</option>';
        
        this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.full_name || 'No name'} (${user.email}) - ${user.business_name || 'No business'}`;
            userSelect.appendChild(option);
        });
    }

    populateUserSelect() {
        const userSelect = document.getElementById('userSelect');
        if (!userSelect || !this.users) return;

        userSelect.innerHTML = '<option value="" style="background: #1a1f2e; color: white;">Select a user...</option>';
        this.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.full_name || 'No name'} (${user.email}) - ${user.business_name || 'No business'}`;
            option.style.background = '#1a1f2e';
            option.style.color = 'white';
            userSelect.appendChild(option);
        });
    }

    closeUploadModal() {
        const modal = document.getElementById('uploadModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Re-enable user select and clear request context
        const userSelect = document.getElementById('userSelect');
        if (userSelect) {
            userSelect.disabled = false;
        }
        
        this.currentRequestId = null;
        this.currentRequestUserId = null;
        
        document.getElementById('uploadFileForm').reset();
    }

    async handleFileUpload(e) {
        e.preventDefault();
        
        console.log('=== FILE UPLOAD STARTED ===');
        console.log('Current request ID:', this.currentRequestId);

        const userId = document.getElementById('userSelect').value;
        const fileName = document.getElementById('fileName').value;
        const fileInput = document.getElementById('fileUpload');
        const description = document.getElementById('fileDescription').value;

        if (!userId || !fileName || !fileInput.files[0]) {
            alert('Please fill in all required fields');
            return;
        }

        const file = fileInput.files[0];
        
        console.log('Uploading file:', fileName, 'for user:', userId);

        try {
            // Upload file to Supabase Storage
            const fileExt = file.name.split('.').pop();
            const filePath = `${userId}/${Date.now()}_${fileName}.${fileExt}`;
            
            console.log('Storage path:', filePath);
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('user-documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;
            
            console.log('File uploaded to storage');

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('user-documents')
                .getPublicUrl(filePath);

            // Use proxied URL through our domain instead of direct Supabase URL
            const proxyUrl = `${window.location.origin}/files/${encodeURIComponent(urlData.publicUrl)}`;

            // Add contract marker to description if this is for a service request
            let finalDescription = description || null;
            if (this.currentRequestId) {
                finalDescription = (description ? description + ' | ' : '') + 'Service Request Contract';
            }
            
            console.log('Inserting file record into database...');

            // Create database record
            const { data: fileData, error: dbError } = await supabase
                .from('files')
                .insert({
                    user_id: userId,
                    file_name: fileName,
                    file_url: proxyUrl,
                    file_size: file.size,
                    status: 'pending',
                    uploaded_by: this.currentUser.id,
                    description: finalDescription
                })
                .select();

            if (dbError) {
                console.error('Database insert error:', dbError);
                throw dbError;
            }

            console.log('File record created:', fileData);

            // If this upload is for a service request, link the file
            if (this.currentRequestId && fileData && fileData.length > 0) {
                const fileId = fileData[0].id;
                console.log('Linking file to service request:', this.currentRequestId);
                
                const { error: linkError } = await supabase
                    .from('service_requests')
                    .update({ contract_file_id: fileId })
                    .eq('id', this.currentRequestId);

                if (linkError) {
                    console.error('Error linking file to request:', linkError);
                } else {
                    console.log('File linked to service request successfully');
                    // Reload requests to show the updated contract
                    await this.loadRequests();
                }
            }

            alert('File uploaded successfully!');
            this.closeUploadModal();
            await this.loadFiles();
            this.renderFiles();
            console.log('=== FILE UPLOAD COMPLETED ===');
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file: ' + error.message);
        }
    }

    // ==================== ORDER DETAILS ====================
    
    async viewOrderDetails(requestId) {
        const modal = document.getElementById('orderDetailsModal');
        const content = document.getElementById('orderDetailsContent');
        const refundBtn = document.getElementById('modalRefundBtn');
        
        if (!modal || !content) return;
        
        modal.style.display = 'flex';
        content.innerHTML = '<div class="loading">Loading order details...</div>';
        
        try {
            // Fetch the order data
            const { data: order, error } = await supabase
                .from('service_requests')
                .select('*')
                .eq('id', requestId)
                .single();
            
            if (error) throw error;
            
            // Fetch the profile separately
            let customer = {};
            if (order.user_id) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', order.user_id)
                    .single();
                customer = profile || {};
            }
            
            // Fetch contract file if exists
            let contractFile = null;
            if (order.contract_file_id) {
                const { data: file } = await supabase
                    .from('user_files')
                    .select('*')
                    .eq('id', order.contract_file_id)
                    .single();
                contractFile = file;
            }
            
            order.profiles = customer;
            order.contract_file = contractFile;
            const packageDetails = order.package_details || {};
            const monthlyCost = (packageDetails.maintenance_plan?.monthly_cost || 0) + (packageDetails.google_workspace?.monthly_cost || 0);
            
            // Show refund button if applicable
            const canRefund = order.status === 'paid' && (order.stripe_payment_intent_id || order.stripe_subscription_id);
            if (refundBtn) {
                refundBtn.style.display = canRefund ? 'block' : 'none';
                refundBtn.onclick = () => this.openRefundModal(requestId);
            }
            
            // Store current order for refund
            this.currentRefundOrder = order;
            
            content.innerHTML = `
                <div class="order-detail-section">
                    <h4>👤 Customer Information</h4>
                    <div class="order-detail-row">
                        <span class="label">Name</span>
                        <span class="value">${this.escapeHtml(customer.full_name || 'N/A')}</span>
                    </div>
                    <div class="order-detail-row">
                        <span class="label">Email</span>
                        <span class="value">${this.escapeHtml(customer.email || 'N/A')}</span>
                    </div>
                    <div class="order-detail-row">
                        <span class="label">Business</span>
                        <span class="value">${this.escapeHtml(customer.business_name || 'N/A')}</span>
                    </div>
                    <div class="order-detail-row">
                        <span class="label">Phone</span>
                        <span class="value">${this.escapeHtml(customer.phone || 'N/A')}</span>
                    </div>
                </div>
                
                <div class="order-detail-section">
                    <h4>📦 Order Details</h4>
                    <div class="order-detail-row">
                        <span class="label">Service</span>
                        <span class="value">${this.escapeHtml(order.service_name)}</span>
                    </div>
                    <div class="order-detail-row">
                        <span class="label">Order Date</span>
                        <span class="value">${new Date(order.created_at).toLocaleString()}</span>
                    </div>
                    <div class="order-detail-row">
                        <span class="label">Status</span>
                        <span class="value ${order.status === 'paid' ? 'success' : order.status === 'refunded' ? 'error' : 'warning'}">${order.status.toUpperCase()}</span>
                    </div>
                    ${order.paid_at ? `
                    <div class="order-detail-row">
                        <span class="label">Paid On</span>
                        <span class="value">${new Date(order.paid_at).toLocaleString()}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="order-detail-section">
                    <h4>💰 Payment Breakdown</h4>
                    ${order.original_amount && order.discount_amount ? `
                    <div class="order-detail-row">
                        <span class="label">Original Amount</span>
                        <span class="value">$${parseFloat(order.original_amount).toLocaleString()}</span>
                    </div>
                    <div class="order-detail-row">
                        <span class="label">Discount Applied</span>
                        <span class="value success">-$${parseFloat(order.discount_amount).toLocaleString()}</span>
                    </div>
                    ` : ''}
                    <div class="order-detail-row">
                        <span class="label">One-Time Total</span>
                        <span class="value" style="font-weight: 600;">$${parseFloat(order.total_amount || 0).toLocaleString()}</span>
                    </div>
                    ${monthlyCost > 0 ? `
                    <div class="order-detail-row">
                        <span class="label">Monthly Recurring</span>
                        <span class="value" style="color: #8b5cf6;">$${monthlyCost}/mo</span>
                    </div>
                    ` : ''}
                    ${order.promo_code ? `
                    <div class="order-detail-row">
                        <span class="label">Promo Code Used</span>
                        <span class="value success">🎟️ ${order.promo_code.code}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${order.payment_status === 'refunded' || order.payment_status === 'partial_refund' ? `
                <div class="order-detail-section">
                    <h4>💸 Refund Information</h4>
                    <div class="order-detail-row">
                        <span class="label">Refund Amount</span>
                        <span class="value error">$${parseFloat(order.refund_amount || 0).toLocaleString()}</span>
                    </div>
                    ${order.refund_reason ? `
                    <div class="order-detail-row">
                        <span class="label">Reason</span>
                        <span class="value">${order.refund_reason}</span>
                    </div>
                    ` : ''}
                    ${order.refunded_at ? `
                    <div class="order-detail-row">
                        <span class="label">Refunded On</span>
                        <span class="value">${new Date(order.refunded_at).toLocaleString()}</span>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                
                <div class="order-detail-section">
                    <h4>🔗 Stripe Information</h4>
                    <div class="order-detail-row">
                        <span class="label">Payment Intent</span>
                        <span class="value" style="font-family: monospace; font-size: 0.85rem;">${order.stripe_payment_intent_id || 'N/A'}</span>
                    </div>
                    ${order.stripe_subscription_id ? `
                    <div class="order-detail-row">
                        <span class="label">Subscription ID</span>
                        <span class="value" style="font-family: monospace; font-size: 0.85rem;">${order.stripe_subscription_id}</span>
                    </div>
                    ` : ''}
                    ${order.stripe_charge_id ? `
                    <div class="order-detail-row">
                        <span class="label">Charge ID</span>
                        <span class="value" style="font-family: monospace; font-size: 0.85rem;">${order.stripe_charge_id}</span>
                    </div>
                    ` : ''}
                </div>
                
                ${packageDetails && Object.keys(packageDetails).length > 0 ? `
                <div class="order-detail-section">
                    <h4>📋 Package Details</h4>
                    ${packageDetails.pages ? `
                    <div class="order-detail-row">
                        <span class="label">Pages</span>
                        <span class="value">${packageDetails.pages}</span>
                    </div>
                    ` : ''}
                    ${packageDetails.design_complexity ? `
                    <div class="order-detail-row">
                        <span class="label">Design Complexity</span>
                        <span class="value">${packageDetails.design_complexity}</span>
                    </div>
                    ` : ''}
                    ${packageDetails.cms_included ? `
                    <div class="order-detail-row">
                        <span class="label">CMS Included</span>
                        <span class="value success">Yes</span>
                    </div>
                    ` : ''}
                    ${packageDetails.ecommerce_included ? `
                    <div class="order-detail-row">
                        <span class="label">E-commerce</span>
                        <span class="value success">Yes (${packageDetails.num_products} products)</span>
                    </div>
                    ` : ''}
                    ${packageDetails.maintenance_plan ? `
                    <div class="order-detail-row">
                        <span class="label">Maintenance Plan</span>
                        <span class="value success">${packageDetails.maintenance_plan.name || packageDetails.maintenance_plan.type || 'Selected'} - $${packageDetails.maintenance_plan.monthly_cost || 0}/mo</span>
                    </div>
                    ` : ''}
                    ${packageDetails.google_workspace ? `
                    <div class="order-detail-row">
                        <span class="label">Google Workspace</span>
                        <span class="value success">${packageDetails.google_workspace.name || packageDetails.google_workspace.plan || 'Selected'} - ${packageDetails.google_workspace.additional_users || packageDetails.google_workspace.users || 1} user(s) - $${packageDetails.google_workspace.monthly_cost || 0}/mo</span>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                
                ${order.contract_file ? `
                <div class="order-detail-section">
                    <h4>📄 Contract</h4>
                    <div class="order-detail-row">
                        <span class="label">File Name</span>
                        <span class="value">${this.escapeHtml(order.contract_file.file_name)}</span>
                    </div>
                    <div class="order-detail-row">
                        <span class="label">Status</span>
                        <span class="value ${order.contract_file.status === 'signed' ? 'success' : 'warning'}">${order.contract_file.status}</span>
                    </div>
                    <button class="action-btn" style="margin-top: 0.5rem; padding: 0.5rem 1rem; font-size: 0.85rem;" onclick="window.open('${order.contract_file.file_url}', '_blank')">View Contract</button>
                </div>
                ` : ''}
            `;
        } catch (error) {
            console.error('Error loading order details:', error);
            content.innerHTML = `<div class="error-message" style="display: block;">Error loading order details: ${error.message}</div>`;
        }
    }
    
    closeOrderModal() {
        const modal = document.getElementById('orderDetailsModal');
        if (modal) modal.style.display = 'none';
    }

    // ==================== REFUND FUNCTIONALITY ====================
    
    openRefundModal(requestId) {
        const order = this.payments.find(p => p.id === requestId) || this.currentRefundOrder;
        if (!order) {
            alert('Order not found');
            return;
        }
        
        this.currentRefundOrder = order;
        
        const modal = document.getElementById('refundModal');
        const customer = order.profiles || {};
        
        document.getElementById('refundCustomer').textContent = customer.full_name || customer.email || 'Unknown';
        document.getElementById('refundService').textContent = order.service_name;
        document.getElementById('refundOriginalAmount').textContent = `$${parseFloat(order.total_amount || 0).toLocaleString()}`;
        
        // Reset form
        document.getElementById('refundType').value = 'full';
        document.getElementById('refundAmount').value = '';
        document.getElementById('partialAmountGroup').style.display = 'none';
        document.getElementById('refundReason').value = 'requested_by_customer';
        
        modal.style.display = 'flex';
        
        // Close order modal if open
        this.closeOrderModal();
    }
    
    closeRefundModal() {
        const modal = document.getElementById('refundModal');
        if (modal) modal.style.display = 'none';
    }
    
    toggleRefundAmount() {
        const type = document.getElementById('refundType').value;
        const amountGroup = document.getElementById('partialAmountGroup');
        amountGroup.style.display = type === 'partial' ? 'block' : 'none';
    }
    
    async processRefund() {
        if (!this.currentRefundOrder) {
            alert('No order selected for refund');
            return;
        }
        
        const refundType = document.getElementById('refundType').value;
        const refundReason = document.getElementById('refundReason').value;
        let refundAmount = null;
        
        if (refundType === 'partial') {
            refundAmount = parseFloat(document.getElementById('refundAmount').value);
            if (!refundAmount || refundAmount <= 0) {
                alert('Please enter a valid refund amount');
                return;
            }
            if (refundAmount > this.currentRefundOrder.total_amount) {
                alert('Refund amount cannot exceed the original payment amount');
                return;
            }
        }
        
        if (!confirm(`Are you sure you want to issue a ${refundType} refund for this order?`)) {
            return;
        }
        
        try {
            const response = await fetch('/api/stripe/refund', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentIntentId: this.currentRefundOrder.stripe_payment_intent_id,
                    chargeId: this.currentRefundOrder.stripe_charge_id,
                    amount: refundAmount,
                    reason: refundReason
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to process refund');
            }
            
            // Update the order in the database
            const refundedAmount = refundAmount || this.currentRefundOrder.total_amount;
            const newStatus = refundType === 'full' ? 'refunded' : 'partial_refund';
            
            const { error: updateError } = await supabase
                .from('service_requests')
                .update({
                    payment_status: newStatus,
                    refund_amount: refundedAmount,
                    refund_reason: refundReason,
                    refunded_at: new Date().toISOString()
                })
                .eq('id', this.currentRefundOrder.id);
            
            if (updateError) {
                console.error('Error updating order status:', updateError);
            }
            
            alert(`Refund of $${refundedAmount.toLocaleString()} processed successfully!`);
            
            this.closeRefundModal();
            await this.loadPayments();
            this.renderPayments();
            this.updateStats();
        } catch (error) {
            console.error('Error processing refund:', error);
            alert('Error processing refund: ' + error.message);
        }
    }

    // ==================== PROMO CODES ====================
    
    async loadPromoCodes() {
        try {
            const { data, error } = await supabase
                .from('promo_codes')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                // Table might not exist yet
                if (error.message?.includes('does not exist') || error.code === '42P01') {
                    console.log('Promo codes table not set up yet');
                    this.promoCodes = [];
                    this.renderPromoCodes();
                    return;
                }
                throw error;
            }
            this.promoCodes = data || [];
            this.renderPromoCodes();
        } catch (error) {
            console.error('Error loading promo codes:', error);
            this.promoCodes = [];
            this.renderPromoCodes();
        }
    }
    
    renderPromoCodes() {
        const container = document.getElementById('promoCodesContainer');
        if (!container) return;
        
        if (!this.promoCodes || this.promoCodes.length === 0) {
            container.innerHTML = '<div class="empty-state">No promo codes created yet. Run the setup_promo_codes.sql in Supabase to enable this feature.</div>';
            return;
        }
        
        const html = `
            <table>
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Discount</th>
                        <th>Usage</th>
                        <th>Valid Until</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.promoCodes.map(code => {
                        const now = new Date();
                        const validUntil = code.valid_until ? new Date(code.valid_until) : null;
                        const isExpired = validUntil && validUntil < now;
                        const isMaxedOut = code.max_uses && code.times_used >= code.max_uses;
                        
                        let statusClass = 'active';
                        let statusText = 'Active';
                        if (!code.is_active) {
                            statusClass = 'inactive';
                            statusText = 'Inactive';
                        } else if (isExpired) {
                            statusClass = 'expired';
                            statusText = 'Expired';
                        } else if (isMaxedOut) {
                            statusClass = 'inactive';
                            statusText = 'Maxed Out';
                        }
                        
                        const discountDisplay = code.discount_type === 'percentage' 
                            ? `${code.discount_value}% off`
                            : `$${code.discount_value} off`;
                        
                        return `
                            <tr>
                                <td><code style="background: rgba(139, 92, 246, 0.1); padding: 0.25rem 0.5rem; border-radius: 4px; color: #a78bfa;">${code.code}</code></td>
                                <td>${discountDisplay}</td>
                                <td>${code.times_used || 0}${code.max_uses ? `/${code.max_uses}` : ''}</td>
                                <td>${validUntil ? validUntil.toLocaleDateString() : 'No expiry'}</td>
                                <td><span class="promo-badge ${statusClass}">${statusText}</span></td>
                                <td>
                                    <button class="table-btn toggle" onclick="adminPanel.togglePromoCode('${code.id}', ${!code.is_active})">
                                        ${code.is_active ? 'Disable' : 'Enable'}
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
    }
    
    openPromoModal() {
        const modal = document.getElementById('promoCodeModal');
        if (modal) {
            // Reset form
            document.getElementById('promoCodeForm').reset();
            modal.style.display = 'flex';
        }
    }
    
    closePromoModal() {
        const modal = document.getElementById('promoCodeModal');
        if (modal) modal.style.display = 'none';
    }
    
    async createPromoCode() {
        const code = document.getElementById('promoCode').value.toUpperCase().trim();
        const description = document.getElementById('promoDescription').value.trim();
        const discountType = document.getElementById('promoDiscountType').value;
        const discountValue = parseFloat(document.getElementById('promoDiscountValue').value);
        const maxUses = document.getElementById('promoMaxUses').value ? parseInt(document.getElementById('promoMaxUses').value) : null;
        const minPurchase = parseFloat(document.getElementById('promoMinPurchase').value) || 0;
        const validFrom = document.getElementById('promoValidFrom').value || null;
        const validUntil = document.getElementById('promoValidUntil').value || null;
        
        if (!code || !discountValue) {
            alert('Please fill in the required fields');
            return;
        }
        
        try {
            const { data, error } = await supabase
                .from('promo_codes')
                .insert({
                    code,
                    description,
                    discount_type: discountType,
                    discount_value: discountValue,
                    max_uses: maxUses,
                    min_purchase: minPurchase,
                    valid_from: validFrom,
                    valid_until: validUntil,
                    is_active: true,
                    created_by: this.currentUser?.id
                })
                .select();
            
            if (error) {
                if (error.message.includes('unique') || error.message.includes('duplicate')) {
                    alert('A promo code with this name already exists');
                } else {
                    throw error;
                }
                return;
            }
            
            alert('Promo code created successfully!');
            this.closePromoModal();
            await this.loadPromoCodes();
        } catch (error) {
            console.error('Error creating promo code:', error);
            alert('Error creating promo code: ' + error.message);
        }
    }
    
    async togglePromoCode(codeId, newStatus) {
        try {
            const { error } = await supabase
                .from('promo_codes')
                .update({ is_active: newStatus })
                .eq('id', codeId);
            
            if (error) throw error;
            
            await this.loadPromoCodes();
        } catch (error) {
            console.error('Error toggling promo code:', error);
            alert('Error updating promo code: ' + error.message);
        }
    }

    // ==================== BLOG POSTS ====================
    
    async loadBlogPosts() {
        try {
            const { data, error } = await supabase
                .from('blog_posts')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                // Table might not exist yet
                if (error.message?.includes('does not exist') || error.code === '42P01') {
                    console.log('Blog posts table not set up yet');
                    this.blogPosts = [];
                    this.renderBlogPosts();
                    return;
                }
                throw error;
            }
            this.blogPosts = data || [];
            this.renderBlogPosts();
        } catch (error) {
            console.error('Error loading blog posts:', error);
            this.blogPosts = [];
            this.renderBlogPosts();
        }
    }
    
    renderBlogPosts() {
        const container = document.getElementById('blogPostsContainer');
        if (!container) return;
        
        if (!this.blogPosts || this.blogPosts.length === 0) {
            container.innerHTML = '<div class="empty-state">No blog posts yet. Click "+ Create Post" to write your first post!</div>';
            return;
        }
        
        const html = `
            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.blogPosts.map(post => {
                        const statusColor = post.published ? '#10b981' : '#6b7280';
                        const statusText = post.published ? 'Published' : 'Draft';
                        
                        return `
                            <tr>
                                <td>
                                    <div style="font-weight: 500;">${this.escapeHtml(post.title)}</div>
                                    <div style="font-size: 0.8rem; color: #94a3b8;">/blog.html?post=${this.escapeHtml(post.slug)}</div>
                                </td>
                                <td>${post.category ? `<span class="promo-badge active">${this.escapeHtml(post.category)}</span>` : '-'}</td>
                                <td>
                                    <span style="display: inline-block; padding: 0.375rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: 500; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}44;">
                                        ${statusText}
                                    </span>
                                </td>
                                <td>${new Date(post.created_at).toLocaleDateString()}</td>
                                <td>
                                    <div class="table-actions">
                                        <button class="table-btn view" onclick="adminPanel.editBlogPost('${post.id}')">Edit</button>
                                        <button class="table-btn toggle" onclick="adminPanel.togglePostPublish('${post.id}', ${!post.published})">
                                            ${post.published ? 'Unpublish' : 'Publish'}
                                        </button>
                                        <button class="table-btn refund" onclick="adminPanel.deleteBlogPost('${post.id}')">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        
        container.innerHTML = html;
    }
    
    openBlogModal(post = null) {
        const modal = document.getElementById('blogPostModal');
        const title = document.getElementById('blogModalTitle');
        
        if (!modal) return;
        
        // Reset form
        document.getElementById('blogPostForm').reset();
        document.getElementById('blogPostId').value = '';
        this.currentEditingPost = null;
        
        if (post) {
            // Editing existing post
            title.textContent = '✏️ Edit Blog Post';
            document.getElementById('blogPostId').value = post.id;
            document.getElementById('blogTitle').value = post.title || '';
            document.getElementById('blogSlug').value = post.slug || '';
            document.getElementById('blogCategory').value = post.category || '';
            document.getElementById('blogExcerpt').value = post.excerpt || '';
            document.getElementById('blogFeaturedImage').value = post.featured_image || '';
            document.getElementById('blogContent').value = post.content || '';
            document.getElementById('blogPublished').checked = post.published || false;
            this.currentEditingPost = post;
        } else {
            title.textContent = '📝 Create Blog Post';
        }
        
        modal.style.display = 'flex';
    }
    
    closeBlogModal() {
        const modal = document.getElementById('blogPostModal');
        if (modal) modal.style.display = 'none';
        this.currentEditingPost = null;
    }
    
    async editBlogPost(postId) {
        const post = this.blogPosts.find(p => p.id === postId);
        if (post) {
            this.openBlogModal(post);
        }
    }
    
    generateSlug(title) {
        return title
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }
    
    async saveBlogPost() {
        const postId = document.getElementById('blogPostId').value;
        const title = document.getElementById('blogTitle').value.trim();
        let slug = document.getElementById('blogSlug').value.trim();
        const category = document.getElementById('blogCategory').value;
        const excerpt = document.getElementById('blogExcerpt').value.trim();
        const featuredImage = document.getElementById('blogFeaturedImage').value.trim();
        const content = document.getElementById('blogContent').value.trim();
        const published = document.getElementById('blogPublished').checked;
        
        if (!title || !content) {
            alert('Please fill in the required fields (Title and Content)');
            return;
        }
        
        // Generate slug if empty
        if (!slug) {
            slug = this.generateSlug(title);
        }
        
        const postData = {
            title,
            slug,
            category: category || null,
            excerpt: excerpt || null,
            featured_image: featuredImage || null,
            content,
            published,
            published_at: published ? new Date().toISOString() : null,
            author_id: this.currentUser?.id
        };
        
        try {
            if (postId) {
                // Update existing post
                const { error } = await supabase
                    .from('blog_posts')
                    .update(postData)
                    .eq('id', postId);
                
                if (error) throw error;
                alert('Post updated successfully!');
            } else {
                // Create new post
                const { error } = await supabase
                    .from('blog_posts')
                    .insert(postData);
                
                if (error) {
                    if (error.message.includes('unique') || error.message.includes('duplicate')) {
                        alert('A post with this slug already exists. Please choose a different title or slug.');
                    } else {
                        throw error;
                    }
                    return;
                }
                alert('Post created successfully!');
            }
            
            this.closeBlogModal();
            await this.loadBlogPosts();
        } catch (error) {
            console.error('Error saving blog post:', error);
            alert('Error saving post: ' + error.message);
        }
    }
    
    async togglePostPublish(postId, newStatus) {
        try {
            const updateData = {
                published: newStatus
            };
            
            if (newStatus) {
                updateData.published_at = new Date().toISOString();
            }
            
            const { error } = await supabase
                .from('blog_posts')
                .update(updateData)
                .eq('id', postId);
            
            if (error) throw error;
            
            await this.loadBlogPosts();
        } catch (error) {
            console.error('Error toggling post publish status:', error);
            alert('Error updating post: ' + error.message);
        }
    }
    
    async deleteBlogPost(postId) {
        if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) {
            return;
        }
        
        try {
            const { error } = await supabase
                .from('blog_posts')
                .delete()
                .eq('id', postId);
            
            if (error) throw error;
            
            await this.loadBlogPosts();
            alert('Post deleted successfully!');
        } catch (error) {
            console.error('Error deleting blog post:', error);
            alert('Error deleting post: ' + error.message);
        }
    }
    
    // =====================
    // ANALYTICS FUNCTIONS
    // =====================
    
    async loadAnalytics() {
        const days = parseInt(document.getElementById('analyticsDateRange')?.value || '7');
        
        try {
            // Load page visits
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const { data: visits, error } = await supabase
                .from('page_visits')
                .select('*')
                .gte('visited_at', startDate.toISOString())
                .order('visited_at', { ascending: false });
            
            if (error) {
                if (error.message?.includes('does not exist')) {
                    this.showAnalyticsSetupMessage();
                    return;
                }
                throw error;
            }
            
            this.pageVisits = visits || [];
            
            // Update stats
            this.updateAnalyticsStats(visits, days);
            
            // Update charts/lists
            this.renderTopPages(visits);
            this.renderTopLocations(visits);
            this.renderTrafficSources(visits);
            this.renderDevices(visits);
            this.renderVisitorsTable(visits);
            
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showAnalyticsError();
        }
    }
    
    showAnalyticsSetupMessage() {
        const containers = ['topPagesContainer', 'topLocationsContainer', 'trafficSourcesContainer', 'devicesContainer'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = `
                    <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
                        <p>📊 Analytics not set up yet</p>
                        <p style="font-size: 0.875rem; margin-top: 0.5rem;">Run <code>setup_analytics.sql</code> in Supabase SQL Editor</p>
                    </div>
                `;
            }
        });
        
        document.getElementById('visitorsTableBody').innerHTML = `
            <tr><td colspan="8" style="text-align: center; padding: 2rem;">
                Run <code>setup_analytics.sql</code> in Supabase to enable visitor tracking
            </td></tr>
        `;
    }
    
    showAnalyticsError() {
        document.getElementById('visitorsTableBody').innerHTML = `
            <tr><td colspan="8" style="text-align: center; padding: 2rem; color: #f87171;">
                Error loading analytics data. Please try again.
            </td></tr>
        `;
    }
    
    updateAnalyticsStats(visits, days) {
        // Total page views
        document.getElementById('totalPageViews').textContent = visits.length.toLocaleString();
        
        // Unique visitors (by session_id or IP)
        const uniqueSessions = new Set(visits.map(v => v.session_id || v.ip_address));
        document.getElementById('uniqueVisitors').textContent = uniqueSessions.size.toLocaleString();
        
        // Average time on site
        const validTimes = visits.filter(v => v.time_on_page > 0).map(v => v.time_on_page);
        const avgTime = validTimes.length > 0 
            ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
            : 0;
        document.getElementById('avgTimeOnSite').textContent = this.formatDuration(avgTime);
        
        // Bounce rate (sessions with only 1 page view)
        const sessionPageCounts = {};
        visits.forEach(v => {
            sessionPageCounts[v.session_id] = (sessionPageCounts[v.session_id] || 0) + 1;
        });
        const sessions = Object.values(sessionPageCounts);
        const bounces = sessions.filter(count => count === 1).length;
        const bounceRate = sessions.length > 0 ? Math.round((bounces / sessions.length) * 100) : 0;
        document.getElementById('bounceRate').textContent = bounceRate + '%';
    }
    
    formatDuration(seconds) {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    }
    
    renderTopPages(visits) {
        const container = document.getElementById('topPagesContainer');
        if (!container) return;
        
        // Count pages
        const pageCounts = {};
        visits.forEach(v => {
            const page = v.page_url || '/';
            pageCounts[page] = (pageCounts[page] || 0) + 1;
        });
        
        // Sort by count
        const sorted = Object.entries(pageCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        if (sorted.length === 0) {
            container.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">No data yet</div>';
            return;
        }
        
        const maxCount = sorted[0][1];
        container.innerHTML = sorted.map(([page, count]) => {
            const percentage = Math.round((count / maxCount) * 100);
            const displayPage = page.length > 30 ? page.substring(0, 30) + '...' : page;
            return `
                <div style="margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span style="font-size: 0.875rem;" title="${page}">${displayPage}</span>
                        <span style="font-size: 0.875rem; color: var(--text-secondary);">${count}</span>
                    </div>
                    <div style="height: 6px; background: var(--bg-secondary); border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${percentage}%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 3px;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderTopLocations(visits) {
        const container = document.getElementById('topLocationsContainer');
        if (!container) return;
        
        // Count locations
        const locationCounts = {};
        visits.forEach(v => {
            if (v.country) {
                const location = v.city ? `${v.city}, ${v.country}` : v.country;
                locationCounts[location] = (locationCounts[location] || 0) + 1;
            }
        });
        
        const sorted = Object.entries(locationCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        if (sorted.length === 0) {
            container.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">No location data yet</div>';
            return;
        }
        
        const maxCount = sorted[0][1];
        container.innerHTML = sorted.map(([location, count]) => {
            const percentage = Math.round((count / maxCount) * 100);
            return `
                <div style="margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span style="font-size: 0.875rem;">🌍 ${location}</span>
                        <span style="font-size: 0.875rem; color: var(--text-secondary);">${count}</span>
                    </div>
                    <div style="height: 6px; background: var(--bg-secondary); border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${percentage}%; background: linear-gradient(90deg, #10b981, #059669); border-radius: 3px;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderTrafficSources(visits) {
        const container = document.getElementById('trafficSourcesContainer');
        if (!container) return;
        
        // Count referrers
        const sourceCounts = { 'Direct': 0 };
        visits.forEach(v => {
            if (v.utm_source) {
                sourceCounts[v.utm_source] = (sourceCounts[v.utm_source] || 0) + 1;
            } else if (v.referrer) {
                try {
                    const url = new URL(v.referrer);
                    const domain = url.hostname.replace('www.', '');
                    sourceCounts[domain] = (sourceCounts[domain] || 0) + 1;
                } catch {
                    sourceCounts['Other'] = (sourceCounts['Other'] || 0) + 1;
                }
            } else {
                sourceCounts['Direct']++;
            }
        });
        
        const sorted = Object.entries(sourceCounts)
            .filter(([_, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        if (sorted.length === 0) {
            container.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">No data yet</div>';
            return;
        }
        
        const maxCount = sorted[0][1];
        container.innerHTML = sorted.map(([source, count]) => {
            const percentage = Math.round((count / maxCount) * 100);
            const icon = source === 'Direct' ? '🔗' : 
                        source.includes('google') ? '🔍' : 
                        source.includes('facebook') ? '📘' : 
                        source.includes('instagram') ? '📷' : 
                        source.includes('twitter') || source.includes('x.com') ? '🐦' : '🌐';
            return `
                <div style="margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span style="font-size: 0.875rem;">${icon} ${source}</span>
                        <span style="font-size: 0.875rem; color: var(--text-secondary);">${count}</span>
                    </div>
                    <div style="height: 6px; background: var(--bg-secondary); border-radius: 3px; overflow: hidden;">
                        <div style="height: 100%; width: ${percentage}%; background: linear-gradient(90deg, #f59e0b, #d97706); border-radius: 3px;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderDevices(visits) {
        const container = document.getElementById('devicesContainer');
        if (!container) return;
        
        // Count devices and browsers
        const deviceCounts = {};
        const browserCounts = {};
        
        visits.forEach(v => {
            if (v.device_type) {
                deviceCounts[v.device_type] = (deviceCounts[v.device_type] || 0) + 1;
            }
            if (v.browser) {
                browserCounts[v.browser] = (browserCounts[v.browser] || 0) + 1;
            }
        });
        
        const deviceIcon = { desktop: '💻', mobile: '📱', tablet: '📟' };
        
        let html = '<div style="margin-bottom: 1rem;"><strong style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-secondary);">Devices</strong></div>';
        
        const sortedDevices = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1]);
        const totalDevices = sortedDevices.reduce((sum, [_, count]) => sum + count, 0);
        
        html += sortedDevices.map(([device, count]) => {
            const percentage = Math.round((count / totalDevices) * 100);
            return `
                <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                    <span style="font-size: 1.25rem; margin-right: 0.5rem;">${deviceIcon[device] || '📟'}</span>
                    <span style="flex: 1; font-size: 0.875rem; text-transform: capitalize;">${device}</span>
                    <span style="font-size: 0.875rem; color: var(--text-secondary);">${percentage}%</span>
                </div>
            `;
        }).join('');
        
        html += '<div style="margin: 1rem 0;"><strong style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-secondary);">Browsers</strong></div>';
        
        const sortedBrowsers = Object.entries(browserCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const totalBrowsers = sortedBrowsers.reduce((sum, [_, count]) => sum + count, 0);
        
        html += sortedBrowsers.map(([browser, count]) => {
            const percentage = Math.round((count / totalBrowsers) * 100);
            return `
                <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                    <span style="flex: 1; font-size: 0.875rem;">${browser}</span>
                    <span style="font-size: 0.875rem; color: var(--text-secondary);">${percentage}%</span>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html || '<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">No data yet</div>';
    }
    
    renderVisitorsTable(visits) {
        const tbody = document.getElementById('visitorsTableBody');
        if (!tbody) return;
        
        const start = (this.visitorPage - 1) * this.visitorsPerPage;
        const end = start + this.visitorsPerPage;
        const pageVisits = visits.slice(start, end);
        
        if (pageVisits.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No visitors recorded yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = pageVisits.map(visit => {
            const time = new Date(visit.visited_at).toLocaleString();
            const location = visit.city && visit.country 
                ? `${visit.city}, ${visit.country}`
                : visit.country || 'Unknown';
            const duration = visit.time_on_page ? this.formatDuration(visit.time_on_page) : '-';
            const referrer = visit.referrer 
                ? (visit.referrer.length > 30 ? visit.referrer.substring(0, 30) + '...' : visit.referrer)
                : 'Direct';
            const page = visit.page_url?.length > 25 
                ? visit.page_url.substring(0, 25) + '...' 
                : visit.page_url || '/';
                
            return `
                <tr>
                    <td style="white-space: nowrap;">${time}</td>
                    <td title="${visit.page_url || '/'}">${page}</td>
                    <td>
                        <span title="${visit.ip_address || 'Unknown IP'}">
                            ${location}
                        </span>
                    </td>
                    <td>
                        <span style="text-transform: capitalize;">${visit.device_type || 'Unknown'}</span>
                    </td>
                    <td>${visit.browser || 'Unknown'} ${visit.browser_version || ''}</td>
                    <td title="${visit.referrer || 'Direct'}">${referrer}</td>
                    <td>${duration}</td>
                    <td>
                        <button class="action-btn small" onclick="adminPanel.viewVisitorDetails('${visit.id}')" title="View Details">
                            👁️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Render pagination
        this.renderVisitorsPagination(visits.length);
    }
    
    renderVisitorsPagination(totalVisits) {
        const container = document.getElementById('visitorsPagination');
        if (!container) return;
        
        const totalPages = Math.ceil(totalVisits / this.visitorsPerPage);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Previous button
        html += `<button class="pagination-btn" ${this.visitorPage === 1 ? 'disabled' : ''} 
            onclick="adminPanel.goToVisitorPage(${this.visitorPage - 1})">← Prev</button>`;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.visitorPage - 2 && i <= this.visitorPage + 2)) {
                html += `<button class="pagination-btn ${i === this.visitorPage ? 'active' : ''}" 
                    onclick="adminPanel.goToVisitorPage(${i})">${i}</button>`;
            } else if (i === this.visitorPage - 3 || i === this.visitorPage + 3) {
                html += '<span style="padding: 0 0.5rem;">...</span>';
            }
        }
        
        // Next button
        html += `<button class="pagination-btn" ${this.visitorPage === totalPages ? 'disabled' : ''} 
            onclick="adminPanel.goToVisitorPage(${this.visitorPage + 1})">Next →</button>`;
        
        container.innerHTML = html;
    }
    
    goToVisitorPage(page) {
        this.visitorPage = page;
        this.renderVisitorsTable(this.pageVisits);
    }
    
    filterVisitors() {
        const search = document.getElementById('visitorSearch')?.value?.toLowerCase() || '';
        
        if (!search) {
            this.renderVisitorsTable(this.pageVisits);
            return;
        }
        
        const filtered = this.pageVisits.filter(v => 
            v.page_url?.toLowerCase().includes(search) ||
            v.country?.toLowerCase().includes(search) ||
            v.city?.toLowerCase().includes(search) ||
            v.browser?.toLowerCase().includes(search) ||
            v.device_type?.toLowerCase().includes(search) ||
            v.ip_address?.includes(search) ||
            v.referrer?.toLowerCase().includes(search)
        );
        
        this.visitorPage = 1;
        this.renderVisitorsTable(filtered);
    }
    
    async viewVisitorDetails(visitId) {
        const visit = this.pageVisits.find(v => v.id === visitId);
        if (!visit) return;
        
        const modal = document.getElementById('visitorModal');
        const content = document.getElementById('visitorModalContent');
        
        if (!modal || !content) return;
        
        // Get other visits from same session
        const sessionVisits = this.pageVisits.filter(v => v.session_id === visit.session_id);
        
        content.innerHTML = `
            <div class="visitor-details">
                <div class="detail-section">
                    <h4 style="margin-bottom: 1rem; color: var(--primary);">📍 Location & Network</h4>
                    <div class="detail-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">IP Address</label>
                            <p style="font-weight: 500;">${visit.ip_address || 'Unknown'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Location</label>
                            <p style="font-weight: 500;">${[visit.city, visit.region, visit.country].filter(Boolean).join(', ') || 'Unknown'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Postal Code</label>
                            <p style="font-weight: 500;">${visit.postal_code || 'Unknown'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Timezone</label>
                            <p style="font-weight: 500;">${visit.timezone || 'Unknown'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">ISP</label>
                            <p style="font-weight: 500;">${visit.isp || 'Unknown'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Coordinates</label>
                            <p style="font-weight: 500;">${visit.latitude && visit.longitude ? `${visit.latitude}, ${visit.longitude}` : 'Unknown'}</p>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section" style="margin-top: 1.5rem;">
                    <h4 style="margin-bottom: 1rem; color: var(--primary);">💻 Device & Browser</h4>
                    <div class="detail-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Device Type</label>
                            <p style="font-weight: 500; text-transform: capitalize;">${visit.device_type || 'Unknown'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Browser</label>
                            <p style="font-weight: 500;">${visit.browser || 'Unknown'} ${visit.browser_version || ''}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Operating System</label>
                            <p style="font-weight: 500;">${visit.os || 'Unknown'} ${visit.os_version || ''}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Screen Size</label>
                            <p style="font-weight: 500;">${visit.screen_width && visit.screen_height ? `${visit.screen_width}x${visit.screen_height}` : 'Unknown'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Viewport</label>
                            <p style="font-weight: 500;">${visit.viewport_width && visit.viewport_height ? `${visit.viewport_width}x${visit.viewport_height}` : 'Unknown'}</p>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section" style="margin-top: 1.5rem;">
                    <h4 style="margin-bottom: 1rem; color: var(--primary);">📊 Engagement</h4>
                    <div class="detail-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Time on Page</label>
                            <p style="font-weight: 500;">${visit.time_on_page ? this.formatDuration(visit.time_on_page) : 'Still browsing'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Scroll Depth</label>
                            <p style="font-weight: 500;">${visit.scroll_depth ? visit.scroll_depth + '%' : '0%'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Referrer</label>
                            <p style="font-weight: 500; word-break: break-all;">${visit.referrer || 'Direct'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Visit Time</label>
                            <p style="font-weight: 500;">${new Date(visit.visited_at).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                
                ${visit.utm_source || visit.utm_medium || visit.utm_campaign ? `
                <div class="detail-section" style="margin-top: 1.5rem;">
                    <h4 style="margin-bottom: 1rem; color: var(--primary);">🎯 Campaign Data (UTM)</h4>
                    <div class="detail-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Source</label>
                            <p style="font-weight: 500;">${visit.utm_source || '-'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Medium</label>
                            <p style="font-weight: 500;">${visit.utm_medium || '-'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Campaign</label>
                            <p style="font-weight: 500;">${visit.utm_campaign || '-'}</p>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: var(--text-secondary);">Term</label>
                            <p style="font-weight: 500;">${visit.utm_term || '-'}</p>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                ${sessionVisits.length > 1 ? `
                <div class="detail-section" style="margin-top: 1.5rem;">
                    <h4 style="margin-bottom: 1rem; color: var(--primary);">📄 Session Pages (${sessionVisits.length} pages)</h4>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${sessionVisits.map((v, i) => `
                            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
                                <span>${i + 1}. ${v.page_url || '/'}</span>
                                <span style="color: var(--text-secondary); font-size: 0.875rem;">${new Date(v.visited_at).toLocaleTimeString()}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <div class="detail-section" style="margin-top: 1.5rem;">
                    <h4 style="margin-bottom: 1rem; color: var(--primary);">🔧 User Agent</h4>
                    <p style="font-size: 0.75rem; color: var(--text-secondary); word-break: break-all; background: var(--bg-secondary); padding: 0.75rem; border-radius: 4px;">${visit.user_agent || 'Not captured'}</p>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
    }
    
    closeVisitorModal() {
        const modal = document.getElementById('visitorModal');
        if (modal) modal.style.display = 'none';
    }
    
    exportAnalytics() {
        if (this.pageVisits.length === 0) {
            alert('No data to export');
            return;
        }
        
        const headers = ['Time', 'Page', 'IP', 'Country', 'City', 'Device', 'Browser', 'OS', 'Referrer', 'Duration (s)', 'Scroll %'];
        const rows = this.pageVisits.map(v => [
            new Date(v.visited_at).toISOString(),
            v.page_url || '/',
            v.ip_address || '',
            v.country || '',
            v.city || '',
            v.device_type || '',
            `${v.browser || ''} ${v.browser_version || ''}`.trim(),
            `${v.os || ''} ${v.os_version || ''}`.trim(),
            v.referrer || 'Direct',
            v.time_on_page || 0,
            v.scroll_depth || 0
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `analytics_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    // ==================== Custom Quotes ====================
    
    async loadCustomQuotes() {
        try {
            const { data, error } = await supabase
                .from('custom_quotes')
                .select(`
                    *,
                    creator:created_by(email, full_name),
                    assignee:assigned_to(email, full_name),
                    redemptions:quote_redemptions(
                        id,
                        redeemed_at,
                        user:user_id(email, full_name)
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            this.customQuotes = data || [];
            this.renderCustomQuotes();
            this.updateQuoteStats();
        } catch (error) {
            console.error('Error loading quotes:', error);
            this.showNotification('Failed to load quotes', 'error');
        }
    }
    
    renderCustomQuotes(quotesToRender = null) {
        const container = document.getElementById('quotesTableContainer');
        if (!container) return;
        
        const quotes = quotesToRender || this.customQuotes;
        
        if (quotes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="icon">🎟️</span>
                    <h3>No Custom Quotes</h3>
                    <p>Create your first custom quote to offer personalized pricing</p>
                    <button class="btn btn-primary" onclick="adminPanel.openQuoteModal()">Create Quote</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Description</th>
                        <th>Pricing</th>
                        <th>Assigned To</th>
                        <th>Status</th>
                        <th>Expires</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${quotes.map(quote => this.renderQuoteRow(quote)).join('')}
                </tbody>
            </table>
        `;
    }
    
    renderQuoteRow(quote) {
        const statusColors = {
            pending: 'secondary',
            viewed: 'info',
            redeemed: 'success',
            expired: 'warning',
            cancelled: 'danger'
        };
        
        const pricing = [];
        if (quote.upfront_cost) pricing.push(`Upfront: $${parseFloat(quote.upfront_cost).toLocaleString()}`);
        if (quote.monthly_fee) pricing.push(`Monthly: $${parseFloat(quote.monthly_fee).toLocaleString()}`);
        
        const validUntil = quote.valid_until ? new Date(quote.valid_until) : null;
        const isExpired = validUntil && validUntil < new Date();
        const displayStatus = isExpired && quote.status !== 'redeemed' && quote.status !== 'cancelled' ? 'expired' : quote.status;
        
        const clientInfo = quote.client_name || quote.client_email || '<span class="text-muted">Unassigned</span>';
        
        return `
            <tr>
                <td>
                    <div class="quote-code-cell">
                        <code class="quote-code">${quote.code}</code>
                        <button class="btn-icon btn-sm" onclick="adminPanel.copyQuoteCode('${quote.code}')" title="Copy Code">
                            📋
                        </button>
                    </div>
                </td>
                <td>
                    <div class="quote-description">
                        ${quote.service_description || '<span class="text-muted">No description</span>'}
                        ${quote.internal_notes ? '<span class="badge badge-info" title="Has internal notes">📝</span>' : ''}
                    </div>
                </td>
                <td>
                    <div class="quote-pricing">
                        ${pricing.length > 0 ? pricing.join('<br>') : '<span class="text-muted">No pricing set</span>'}
                    </div>
                </td>
                <td>${clientInfo}</td>
                <td>
                    <span class="badge badge-${statusColors[displayStatus] || 'secondary'}">
                        ${displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                    </span>
                </td>
                <td>
                    ${validUntil 
                        ? `<span class="${isExpired ? 'text-danger' : ''}">${validUntil.toLocaleDateString()}</span>` 
                        : '<span class="text-muted">Never</span>'}
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-secondary" onclick="adminPanel.openQuoteModal('${quote.id}')" title="Edit">
                            ✏️
                        </button>
                        ${quote.status === 'pending' || quote.status === 'viewed' ? `
                            <button class="btn btn-sm btn-warning" onclick="adminPanel.deactivateQuote('${quote.id}')" title="Cancel">
                                ⏸️
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }
    
    updateQuoteStats() {
        const activeQuotes = this.customQuotes.filter(q => q.status === 'pending' || q.status === 'viewed').length;
        const totalValue = this.customQuotes.reduce((sum, q) => {
            return sum + (parseFloat(q.upfront_cost) || 0);
        }, 0);
        const redeemedQuotes = this.customQuotes.filter(q => q.status === 'redeemed').length;
        const expiredQuotes = this.customQuotes.filter(q => {
            if (q.status === 'expired' || q.status === 'cancelled') return true;
            if (q.valid_until && new Date(q.valid_until) < new Date() && q.status !== 'redeemed') return true;
            return false;
        }).length;
        
        document.getElementById('activeQuotesCount')?.textContent && 
            (document.getElementById('activeQuotesCount').textContent = activeQuotes);
        document.getElementById('totalQuoteValue')?.textContent && 
            (document.getElementById('totalQuoteValue').textContent = '$' + totalValue.toLocaleString());
        document.getElementById('redeemedQuotesCount')?.textContent && 
            (document.getElementById('redeemedQuotesCount').textContent = redeemedQuotes);
        document.getElementById('expiredQuotesCount')?.textContent && 
            (document.getElementById('expiredQuotesCount').textContent = expiredQuotes);
    }
    
    filterQuotes(query = '', status = '') {
        let filtered = this.customQuotes;
        
        if (query) {
            const q = query.toLowerCase();
            filtered = filtered.filter(quote => 
                quote.code?.toLowerCase().includes(q) ||
                quote.service_description?.toLowerCase().includes(q) ||
                quote.client_email?.toLowerCase().includes(q) ||
                quote.client_name?.toLowerCase().includes(q)
            );
        }
        
        if (status) {
            if (status === 'expired') {
                filtered = filtered.filter(q => 
                    q.status === 'expired' || q.status === 'cancelled' ||
                    (q.valid_until && new Date(q.valid_until) < new Date() && q.status !== 'redeemed')
                );
            } else {
                filtered = filtered.filter(q => q.status === status);
            }
        }
        
        this.renderCustomQuotes(filtered);
    }
    
    async openQuoteModal(quoteId = null) {
        const modal = document.getElementById('quoteModal');
        const title = document.getElementById('quoteModalTitle');
        const generatedCodeDisplay = document.getElementById('generatedCodeDisplay');
        const form = document.getElementById('quoteForm');
        
        if (!modal) return;
        
        // Reset form
        form?.reset();
        
        if (quoteId) {
            // Edit mode
            const quote = this.customQuotes.find(q => q.id === quoteId);
            if (!quote) {
                this.showNotification('Quote not found', 'error');
                return;
            }
            
            this.currentEditingQuote = quote;
            title.textContent = 'Edit Custom Quote';
            
            // Show the code
            if (generatedCodeDisplay) {
                generatedCodeDisplay.style.display = 'block';
                document.getElementById('generatedCode').textContent = quote.code;
            }
            
            // Fill form fields
            document.getElementById('quoteClientName').value = quote.client_name || '';
            document.getElementById('quoteClientEmail').value = quote.client_email || '';
            document.getElementById('quoteClientPhone').value = quote.client_phone || '';
            document.getElementById('quoteUpfrontCost').value = quote.upfront_cost || '';
            document.getElementById('quoteMonthlyFee').value = quote.monthly_fee || '';
            document.getElementById('quoteServiceType').value = quote.service_type || 'website';
            document.getElementById('quoteTimeline').value = quote.estimated_timeline || '';
            document.getElementById('quoteServiceDescription').value = quote.service_description || '';
            document.getElementById('quoteDeliverables').value = quote.deliverables || '';
            document.getElementById('quoteClientNotes').value = quote.client_notes || '';
            document.getElementById('quoteInternalNotes').value = quote.internal_notes || '';
            document.getElementById('quoteContractUrl').value = quote.contract_url || '';
            document.getElementById('quoteValidUntil').value = quote.valid_until ? quote.valid_until.split('T')[0] : '';
            document.getElementById('quoteRequiresContract').checked = quote.requires_contract !== false;
        } else {
            // Create mode
            this.currentEditingQuote = null;
            title.textContent = 'Create Custom Quote';
            if (generatedCodeDisplay) {
                generatedCodeDisplay.style.display = 'none';
            }
        }
        
        modal.style.display = 'flex';
    }
    
    closeQuoteModal() {
        const modal = document.getElementById('quoteModal');
        if (modal) {
            modal.style.display = 'none';
            this.currentEditingQuote = null;
        }
    }
    
    async saveQuote() {
        const clientName = document.getElementById('quoteClientName')?.value?.trim() || null;
        const clientEmail = document.getElementById('quoteClientEmail')?.value?.trim() || null;
        const clientPhone = document.getElementById('quoteClientPhone')?.value?.trim() || null;
        const upfrontCost = parseFloat(document.getElementById('quoteUpfrontCost')?.value) || 0;
        const monthlyFee = parseFloat(document.getElementById('quoteMonthlyFee')?.value) || 0;
        const serviceType = document.getElementById('quoteServiceType')?.value || 'website';
        const estimatedTimeline = document.getElementById('quoteTimeline')?.value?.trim() || null;
        const serviceDescription = document.getElementById('quoteServiceDescription')?.value?.trim() || null;
        const deliverables = document.getElementById('quoteDeliverables')?.value?.trim() || null;
        const clientNotes = document.getElementById('quoteClientNotes')?.value?.trim() || null;
        const internalNotes = document.getElementById('quoteInternalNotes')?.value?.trim() || null;
        const contractUrl = document.getElementById('quoteContractUrl')?.value?.trim() || null;
        const validUntil = document.getElementById('quoteValidUntil')?.value || null;
        const requiresContract = document.getElementById('quoteRequiresContract')?.checked ?? true;
        
        if (upfrontCost <= 0) {
            this.showNotification('Please set an upfront cost', 'error');
            return;
        }
        
        try {
            if (this.currentEditingQuote) {
                // Update existing quote
                const { error } = await supabase
                    .from('custom_quotes')
                    .update({
                        client_name: clientName,
                        client_email: clientEmail,
                        client_phone: clientPhone,
                        upfront_cost: upfrontCost,
                        monthly_fee: monthlyFee,
                        service_type: serviceType,
                        estimated_timeline: estimatedTimeline,
                        service_description: serviceDescription,
                        deliverables,
                        client_notes: clientNotes,
                        internal_notes: internalNotes,
                        contract_url: contractUrl,
                        valid_until: validUntil,
                        requires_contract: requiresContract,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', this.currentEditingQuote.id);
                
                if (error) throw error;
                
                this.showNotification('Quote updated successfully', 'success');
            } else {
                // Create new quote
                const code = this.generateQuoteCode();
                
                const { data: user } = await supabase.auth.getUser();
                
                const { error } = await supabase
                    .from('custom_quotes')
                    .insert({
                        code,
                        client_name: clientName,
                        client_email: clientEmail,
                        client_phone: clientPhone,
                        upfront_cost: upfrontCost,
                        monthly_fee: monthlyFee,
                        service_type: serviceType,
                        estimated_timeline: estimatedTimeline,
                        service_description: serviceDescription,
                        deliverables,
                        client_notes: clientNotes,
                        internal_notes: internalNotes,
                        contract_url: contractUrl,
                        valid_until: validUntil,
                        requires_contract: requiresContract,
                        created_by: user?.user?.id || null,
                        status: 'pending'
                    });
                
                if (error) throw error;
                
                // Show the generated code
                const generatedCodeDisplay = document.getElementById('generatedCodeDisplay');
                const generatedCode = document.getElementById('generatedCode');
                if (generatedCodeDisplay && generatedCode) {
                    generatedCodeDisplay.style.display = 'block';
                    generatedCode.textContent = code;
                }
                
                this.showNotification(`Quote created! Code: ${code}`, 'success');
            }
            
            await this.loadCustomQuotes();
            
            // Only close modal on edit, keep open on create to show code
            if (this.currentEditingQuote) {
                this.closeQuoteModal();
            }
        } catch (error) {
            console.error('Error saving quote:', error);
            this.showNotification('Failed to save quote: ' + error.message, 'error');
        }
    }
    
    generateQuoteCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'RWS-';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    
    copyQuoteCode(code) {
        navigator.clipboard.writeText(code).then(() => {
            this.showNotification('Code copied to clipboard!', 'success');
        }).catch(() => {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = code;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Code copied to clipboard!', 'success');
        });
    }
    
    async deactivateQuote(quoteId) {
        if (!confirm('Are you sure you want to cancel this quote? This cannot be undone.')) return;
        
        try {
            const { error } = await supabase
                .from('custom_quotes')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('id', quoteId);
            
            if (error) throw error;
            
            this.showNotification('Quote cancelled', 'success');
            await this.loadCustomQuotes();
        } catch (error) {
            console.error('Error cancelling quote:', error);
            this.showNotification('Failed to cancel quote', 'error');
        }
    }
}

// Initialize admin panel
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});
