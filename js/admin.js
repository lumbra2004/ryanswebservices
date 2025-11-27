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

        // Search and filter inputs (these are in the dashboard)
        document.getElementById('userSearch')?.addEventListener('input', (e) => this.filterUsers(e.target.value));
        document.getElementById('userFilter')?.addEventListener('change', (e) => this.filterUsers(document.getElementById('userSearch').value, e.target.value));
        document.getElementById('orderSearch')?.addEventListener('input', (e) => this.filterOrders(e.target.value));
        document.getElementById('orderStatusFilter')?.addEventListener('change', (e) => this.filterOrders(document.getElementById('orderSearch').value, e.target.value));
        document.getElementById('fileSearch')?.addEventListener('input', (e) => this.filterFiles(e.target.value));
        document.getElementById('contactSearch')?.addEventListener('input', (e) => this.filterContacts(e.target.value));
        document.getElementById('contactStatusFilter')?.addEventListener('change', (e) => this.filterContacts(document.getElementById('contactSearch').value, e.target.value));
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
        
        const emailSpan = document.getElementById('adminUserEmail');
        if (emailSpan) {
            const roleBadge = this.userRole === 'owner' ? '👑' : '🛡️';
            emailSpan.textContent = `${roleBadge} ${this.currentUser.email} (${this.userRole})`;
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
                this.loadFiles()
            ]);

            this.updateStats();
            this.renderUsers();
            this.renderOrders();
            this.renderContacts();
            this.renderFiles();
        } catch (error) {
            console.error('Error loading data:', error);
        }
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
                    .select('id, email, full_name')
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
            filtered = filtered.filter(r => 
                r.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
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
        document.getElementById('totalOrders').textContent = this.orders.length;
        
        const totalRevenue = this.orders.reduce((sum, order) => {
            return sum + (parseFloat(order.total_amount) || 0);
        }, 0);
        document.getElementById('totalRevenue').textContent = '$' + totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        document.getElementById('totalFiles').textContent = this.files.length;
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
            filtered = filtered.filter(user => 
                (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (user.user_metadata?.full_name || user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filter === 'verified') {
            filtered = filtered.filter(user => user.email_confirmed_at || user.verified);
        } else if (filter === 'unverified') {
            filtered = filtered.filter(user => !user.email_confirmed_at && !user.verified);
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
}

// Initialize admin panel
let adminPanel;
document.addEventListener('DOMContentLoaded', () => {
    adminPanel = new AdminPanel();
});
