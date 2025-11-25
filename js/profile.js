// Profile Page JavaScript
class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Check authentication
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            // Redirect to home if not logged in
            window.location.href = 'index.html';
            return;
        }

        this.currentUser = session.user;
        await this.loadProfile();
        await this.loadOrders();
        await this.loadFiles();
        await this.updateStats();
        this.setupEventListeners();
    }

    async updateStats() {
        try {
            // Get order stats
            const { data: orders } = await supabase
                .from('orders')
                .select('amount')
                .eq('user_id', this.currentUser.id);

            // Get file count
            const { data: files } = await supabase
                .from('customer_files')
                .select('id')
                .eq('user_id', this.currentUser.id);

            // Update stat cards
            document.getElementById('totalOrders').textContent = orders?.length || 0;
            
            const totalSpent = orders?.reduce((sum, order) => sum + parseFloat(order.amount), 0) || 0;
            document.getElementById('totalSpent').textContent = '$' + totalSpent.toFixed(2);
            
            document.getElementById('totalFiles').textContent = files?.length || 0;
            
            const memberSince = new Date(this.currentUser.created_at).getFullYear();
            document.getElementById('memberSince').textContent = memberSince;

            // Update badges
            document.getElementById('orderCount').textContent = `${orders?.length || 0} Orders`;
            document.getElementById('fileCount').textContent = `${files?.length || 0} Files`;

        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    async loadProfile() {
        try {
            // Get user profile from database
            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Error loading profile:', error);
            }

            // Update UI with profile data
            const name = profile?.full_name || this.currentUser.user_metadata.full_name || this.currentUser.email.split('@')[0];
            const email = this.currentUser.email;

            document.getElementById('profileName').textContent = name;
            document.getElementById('profileEmail').textContent = email;
            document.getElementById('profileAvatar').textContent = this.getInitials(name);
            
            // Fill form
            document.getElementById('fullName').value = profile?.full_name || '';
            document.getElementById('email').value = email;
            document.getElementById('phone').value = profile?.phone || '';
            document.getElementById('company').value = profile?.company || '';

        } catch (error) {
            console.error('Error in loadProfile:', error);
            this.showNotification('Error loading profile', 'error');
        }
    }

    async loadOrders() {
        const container = document.getElementById('ordersContainer');
        
        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!orders || orders.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📦</div>
                        <h3>No orders yet</h3>
                        <p>Your order history will appear here</p>
                        <a href="pricing.html" class="btn btn-primary" style="margin-top: 1rem; display: inline-block;">Browse Services</a>
                    </div>
                `;
                return;
            }

            // Create orders table
            let html = `
                <table class="orders-table">
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            orders.forEach(order => {
                const date = new Date(order.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                
                html += `
                    <tr>
                        <td><strong>${order.service_name}</strong></td>
                        <td>$${order.amount.toFixed(2)}</td>
                        <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                        <td>${date}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;

            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading orders:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <p>Error loading orders. Please try again later.</p>
                </div>
            `;
        }
    }

    async loadFiles() {
        const container = document.getElementById('filesContainer');
        
        try {
            const { data: files, error } = await supabase
                .from('customer_files')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('uploaded_at', { ascending: false });

            if (error) throw error;

            if (!files || files.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📄</div>
                        <h3>No files yet</h3>
                        <p>Your files and documents will appear here</p>
                    </div>
                `;
                return;
            }

            // Create file list
            let html = '';
            
            files.forEach(file => {
                const date = new Date(file.uploaded_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                const icon = this.getFileIcon(file.file_type);
                const sizeText = file.file_size ? this.formatFileSize(file.file_size) : '';

                html += `
                    <div class="file-item">
                        <div class="file-info">
                            <div class="file-icon">${icon}</div>
                            <div class="file-details">
                                <h4>${file.file_name}</h4>
                                <p>${file.file_type} ${sizeText ? '• ' + sizeText : ''} • ${date}</p>
                            </div>
                        </div>
                        <button class="file-download" onclick="profileManager.downloadFile('${file.file_path}', '${file.file_name}')">
                            Download
                        </button>
                    </div>
                `;
            });

            container.innerHTML = html;

        } catch (error) {
            console.error('Error loading files:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <p>Error loading files. Please try again later.</p>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Profile form submission
        const profileForm = document.getElementById('profileForm');
        profileForm.addEventListener('submit', (e) => this.updateProfile(e));
    }

    async updateProfile(e) {
        e.preventDefault();

        const fullName = document.getElementById('fullName').value;
        const phone = document.getElementById('phone').value;
        const company = document.getElementById('company').value;

        try {
            // Update or insert profile
            const { error } = await supabase
                .from('user_profiles')
                .upsert({
                    id: this.currentUser.id,
                    full_name: fullName,
                    phone: phone,
                    company: company,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            // Update auth metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { full_name: fullName }
            });

            if (authError) throw authError;

            this.showNotification('Profile updated successfully!', 'success');
            
            // Reload profile to update display
            await this.loadProfile();

        } catch (error) {
            console.error('Error updating profile:', error);
            this.showNotification('Error updating profile. Please try again.', 'error');
        }
    }

    async downloadFile(filePath, fileName) {
        try {
            const { data, error } = await supabase.storage
                .from('customer-files')
                .download(filePath);

            if (error) throw error;

            // Create download link
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification('File downloaded successfully!', 'success');

        } catch (error) {
            console.error('Error downloading file:', error);
            this.showNotification('Error downloading file. Please try again.', 'error');
        }
    }

    getInitials(name) {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    getFileIcon(fileType) {
        const icons = {
            'invoice': '📄',
            'deliverable': '📦',
            'report': '📊',
            'contract': '📋',
            'image': '🖼️',
            'video': '🎥',
            'document': '📝',
            'other': '📎'
        };
        return icons[fileType] || icons['other'];
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        const bgColor = type === 'error' ? '#ef4444' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))';
        
        notification.style.cssText = `
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: ${bgColor};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
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
}

// Initialize profile manager when page loads
let profileManager;
document.addEventListener('DOMContentLoaded', () => {
    profileManager = new ProfileManager();
});
