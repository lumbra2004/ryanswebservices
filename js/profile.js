// Profile Page JavaScript
class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.isEditMode = false;
        this.originalValues = {};
        this.stripeHandler = null;
        this.currentPaymentData = null;
        this.init();
    }

    async init() {
        try {
            // Check authentication
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                // Redirect to home if not logged in
                window.location.href = 'index.html';
                return;
            }

            this.currentUser = session.user;
            console.log('Profile init - Current user:', this.currentUser.id);
            
            // Check if returning from Stripe payment
            await this.handleStripeReturn();
            
            await this.loadProfile();
            await this.loadOrders();
            await this.loadRequests();
            await this.loadInvoices();
            
            console.log('About to load documents...');
            await this.loadDocuments();
            console.log('Documents loaded successfully');
            
            await this.updateStats();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error in profile init:', error);
        }
    }

    async handleStripeReturn() {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentIntentId = urlParams.get('payment_intent');
        const redirectStatus = urlParams.get('redirect_status');

        console.log('Checking Stripe return:', { paymentIntentId, redirectStatus });

        if (paymentIntentId && redirectStatus === 'succeeded') {
            // Get the request ID from localStorage
            const requestId = localStorage.getItem('pending_payment_request_id');
            const customerId = localStorage.getItem('pending_customer_id');
            const priceId = localStorage.getItem('pending_price_id');

            console.log('Payment data from localStorage:', { requestId, customerId, priceId });

            if (requestId && customerId && priceId) {
                try {
                    console.log('Creating subscription...');
                    // Create subscription
                    const response = await fetch('/api/stripe/create-subscription', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            customerId: customerId,
                            priceId: priceId,
                            metadata: {
                                requestId: requestId,
                                userId: this.currentUser.id,
                            },
                        }),
                    });

                    const subscriptionData = await response.json();
                    console.log('Subscription response:', subscriptionData);

                    if (response.ok) {
                        console.log('Updating database...');
                        // Update request status to 'paid'
                        const { data, error } = await supabase
                            .from('service_requests')
                            .update({ 
                                status: 'paid',
                                paid_at: new Date().toISOString(),
                                stripe_customer_id: customerId,
                                stripe_subscription_id: subscriptionData.subscriptionId
                            })
                            .eq('id', requestId);

                        if (error) {
                            console.error('Database update error:', error);
                        } else {
                            console.log('Database updated successfully');
                        }

                        // Clear localStorage
                        localStorage.removeItem('pending_payment_request_id');
                        localStorage.removeItem('pending_customer_id');
                        localStorage.removeItem('pending_price_id');

                        this.showNotification('Payment successful! 🎉', 'success');
                        
                        // Reload requests to show updated status
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        console.error('Subscription creation failed:', subscriptionData);
                    }
                } catch (error) {
                    console.error('Error completing payment:', error);
                }
            } else {
                console.log('Missing payment data in localStorage');
            }

            // Clean up URL
            window.history.replaceState({}, document.title, '/profile.html');
        }
    }

    async updateStats() {
        try {
            // Get order stats
            const { data: orders } = await supabase
                .from('orders')
                .select('amount')
                .eq('user_id', this.currentUser.id);

            // Update stat cards (with null checks)
            const totalOrdersEl = document.getElementById('totalOrders');
            if (totalOrdersEl) totalOrdersEl.textContent = orders?.length || 0;
            
            const totalSpent = orders?.reduce((sum, order) => sum + parseFloat(order.amount), 0) || 0;
            const totalSpentEl = document.getElementById('totalSpent');
            if (totalSpentEl) totalSpentEl.textContent = '$' + totalSpent.toFixed(2);
            
            const memberSince = new Date(this.currentUser.created_at).getFullYear();
            const memberSinceEl = document.getElementById('memberSince');
            if (memberSinceEl) memberSinceEl.textContent = memberSince;

            // Update badges (with null checks)
            const orderCountEl = document.getElementById('orderCount');
            if (orderCountEl) orderCountEl.textContent = `${orders?.length || 0} Orders`;

        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    async loadRequests() {
        try {
            const container = document.getElementById('requestsContainer');
            if (!container) return;

            // Get service requests for current user
            const { data: requests, error } = await supabase
                .from('service_requests')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Update request count
            const requestCountEl = document.getElementById('requestCount');
            if (requestCountEl) {
                requestCountEl.textContent = `${requests.length} Service${requests.length !== 1 ? 's' : ''}`;
            }

            if (requests.length === 0) {
                container.innerHTML = `
                    <div class="no-documents">
                        <div class="no-documents-icon">🛠️</div>
                        <p>No services yet</p>
                        <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 0.5rem;">Request a service from the <a href="pricing.html" style="color: var(--primary);">pricing page</a></p>
                    </div>
                `;
                return;
            }

            this.renderRequests(requests);

        } catch (error) {
            console.error('Error loading requests:', error);
            const container = document.getElementById('requestsContainer');
            if (container) {
                container.innerHTML = '<p class="error">Error loading requests</p>';
            }
        }
    }

    renderRequests(requests) {
        const container = document.getElementById('requestsContainer');
        if (!container) return;

        const statusColors = {
            'pending': '#fbbf24',
            'in_progress': '#3b82f6',
            'active': '#10b981',
            'ready_to_purchase': '#10b981',
            'paid': '#22c55e',
            'cancelled': '#ef4444'
        };

        const statusLabels = {
            'pending': '⏳ Pending Review',
            'in_progress': '🔧 In Progress',
            'active': '✨ Active',
            'ready_to_purchase': '💳 Ready to Purchase',
            'paid': '✅ Paid',
            'cancelled': '❌ Cancelled'
        };

        let html = '<div style="display: grid; gap: 1.5rem;">';

        requests.forEach((request, index) => {
            const statusColor = statusColors[request.status] || '#6b7280';
            const statusLabel = statusLabels[request.status] || request.status;
            const date = new Date(request.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            
            // Calculate monthly cost
            const maintenanceCost = request.package_details?.maintenance_plan?.monthly_cost || 0;
            const workspaceCost = request.package_details?.google_workspace?.monthly_cost || 0;
            const monthlyTotal = maintenanceCost + workspaceCost;

            const statusIcon = {
                'pending': '⏳',
                'in_progress': '🔧',
                'active': '✨',
                'ready_to_purchase': '💳',
                'paid': '✅',
                'cancelled': '❌'
            }[request.status] || '📋';

            html += `
                <div style="border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 16px; overflow: hidden; background: linear-gradient(135deg, rgba(99, 102, 241, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Card Header -->
                    <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); padding: 1.5rem; border-bottom: 1px solid rgba(99, 102, 241, 0.2);">
                        <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 1rem;">
                            <div style="flex: 1; min-width: 200px;">
                                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);">${statusIcon}</div>
                                    <div>
                                        <h3 style="margin: 0; font-size: 1.2rem; font-weight: 600;">${request.service_name}</h3>
                                        <div style="font-size: 0.85rem; opacity: 0.7; margin-top: 0.25rem;">${date}</div>
                                    </div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                                <div style="text-align: right;">
                                    <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.6; margin-bottom: 0.25rem;">Status</div>
                                    <span style="display: inline-block; background: ${statusColor}22; color: ${statusColor}; padding: 0.5rem 1rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600; border: 1px solid ${statusColor}44;">${statusLabel}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Card Body -->
                    <div style="padding: 1.5rem;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                            <div style="background: rgba(99, 102, 241, 0.05); padding: 1rem; border-radius: 12px; border: 1px solid rgba(99, 102, 241, 0.1);">
                                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.6; margin-bottom: 0.5rem;">💵 One-Time Cost</div>
                                <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">$${parseFloat(request.total_amount).toFixed(2)}</div>
                            </div>
                            ${monthlyTotal > 0 ? `
                                <div style="background: rgba(139, 92, 246, 0.05); padding: 1rem; border-radius: 12px; border: 1px solid rgba(139, 92, 246, 0.1);">
                                    <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.6; margin-bottom: 0.5rem;">🔄 Monthly Cost</div>
                                    <div style="font-size: 1.5rem; font-weight: 700; color: #a78bfa;">$${monthlyTotal.toFixed(2)}<span style="font-size: 1rem; opacity: 0.7;">/mo</span></div>
                                </div>
                            ` : ''}
                        </div>
                        
                        <!-- Expandable Details -->
                        <div id="details-${index}" style="display: none; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid rgba(99, 102, 241, 0.2);">
                            ${request.package_details ? `
                                <div style="display: grid; gap: 1.25rem;">
                                    ${request.package_details.package || request.package_details.details ? `
                                        <div>
                                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                                                <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem;">📦</div>
                                                <h4 style="margin: 0; font-weight: 600; font-size: 0.95rem;">Package Details</h4>
                                            </div>
                                            <div style="padding-left: 32px; opacity: 0.9;">
                                                ${request.package_details.package ? `<div style="margin-bottom: 0.5rem;"><strong>Package:</strong> ${request.package_details.package}</div>` : ''}
                                                ${request.package_details.details ? `<div><strong>Details:</strong> ${request.package_details.details}</div>` : ''}
                                            </div>
                                        </div>
                                    ` : ''}
                                    
                                    ${maintenanceCost > 0 ? `
                                        <div>
                                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                                                <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem;">🔧</div>
                                                <h4 style="margin: 0; font-weight: 600; font-size: 0.95rem;">Maintenance Plan</h4>
                                            </div>
                                            <div style="padding-left: 32px; opacity: 0.9; display: grid; gap: 0.5rem;">
                                                <div><strong>Plan:</strong> ${request.package_details.maintenance_plan?.name || request.package_details.maintenance_plan?.type || 'N/A'}</div>
                                                <div><strong>Monthly Cost:</strong> $${maintenanceCost.toFixed(2)}/month</div>
                                                <div style="font-size: 0.85rem; opacity: 0.7;"><em>Includes 1 Google Workspace user</em></div>
                                            </div>
                                        </div>
                                    ` : ''}
                                    
                                    ${workspaceCost > 0 ? `
                                        <div>
                                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                                                <div style="width: 24px; height: 24px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem;">📧</div>
                                                <h4 style="margin: 0; font-weight: 600; font-size: 0.95rem;">Google Workspace</h4>
                                            </div>
                                            <div style="padding-left: 32px; opacity: 0.9; display: grid; gap: 0.5rem;">
                                                <div><strong>Plan:</strong> ${request.package_details.google_workspace?.name || request.package_details.google_workspace?.plan || 'N/A'}</div>
                                                <div><strong>Additional Users:</strong> ${request.package_details.google_workspace?.additional_users || 0}</div>
                                                <div><strong>Unit Price:</strong> $${(request.package_details.google_workspace?.unit_price || 0).toFixed(2)}/user/month</div>
                                                <div><strong>Monthly Cost:</strong> $${workspaceCost.toFixed(2)}/month</div>
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            ` : '<div style="opacity: 0.6; text-align: center; padding: 2rem;">No additional details available</div>'}
                        </div>
                        
                        <!-- Action Buttons -->
                        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1.5rem;">
                            <button class="expand-btn" data-index="${index}" style="flex: 1; min-width: 120px; padding: 0.75rem 1.25rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); color: #a78bfa; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.3s;"onmouseover="this.style.background='linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'; this.style.transform='translateY(0)'">
                                <span class="expand-text">📋 Show Details</span>
                            </button>
                            ${request.contract_file_id ? `
                                <button class="btn-view-contract" data-file-id="${request.contract_file_id}" style="flex: 1; min-width: 120px; padding: 0.75rem 1.25rem; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 10px; cursor: pointer; font-size: 0.9rem; font-weight: 500; transition: all 0.3s;" onmouseover="this.style.background='linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)'; this.style.transform='translateY(0)'">📄 View Contract</button>
                            ` : ''}
                            ${request.status === 'ready_to_purchase' ? `
                                <button class="btn-pay-now" data-request-id="${request.id}" data-service-name="${request.service_name}" data-onetime="${request.total_amount}" data-monthly="${monthlyTotal}" style="flex: 1; min-width: 140px; padding: 0.75rem 1.25rem; background: linear-gradient(135deg, #10b981 0%, #22c55e 100%); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 0.95rem; font-weight: 600; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(16, 185, 129, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)'">💳 Pay Now</button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';

        container.innerHTML = html;

        // Add event listeners for expand buttons
        container.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.currentTarget;
                const index = button.dataset.index;
                const detailsDiv = document.getElementById(`details-${index}`);
                const textSpan = button.querySelector('.expand-text');
                const isExpanded = detailsDiv.style.display !== 'none';
                
                if (isExpanded) {
                    detailsDiv.style.display = 'none';
                    if (textSpan) textSpan.textContent = '📋 Show Details';
                } else {
                    detailsDiv.style.display = 'block';
                    if (textSpan) textSpan.textContent = '📋 Hide Details';
                }
            });
        });

        // Add event listeners for view contract buttons
        container.querySelectorAll('.btn-view-contract').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const fileId = e.target.dataset.fileId;
                // Scroll to documents section
                const docsSection = document.getElementById('documentsContainer');
                if (docsSection) {
                    docsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    
                    // Highlight the contract row after scrolling
                    setTimeout(() => {
                        const contractRow = docsSection.querySelector(`[data-file-id="${fileId}"]`);
                        if (contractRow) {
                            const row = contractRow.closest('tr');
                            if (row) {
                                row.style.background = 'rgba(0, 102, 255, 0.2)';
                                row.style.transition = 'background 2s';
                                setTimeout(() => {
                                    row.style.background = '';
                                }, 2000);
                            }
                        }
                    }, 500);
                }
            });
        });

        // Add event listeners for pay now buttons
        container.querySelectorAll('.btn-pay-now').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const requestId = e.target.dataset.requestId;
                const serviceName = e.target.dataset.serviceName;
                const onetimeCost = parseFloat(e.target.dataset.onetime);
                const monthlyCost = parseFloat(e.target.dataset.monthly);
                this.openPaymentModal(requestId, serviceName, onetimeCost, monthlyCost);
            });
        });
    }

    async loadProfile() {
        try {
            console.log('Loading profile...');
            // Try to get user profile from database, but don't fail if table doesn't exist
            let profile = null;
            try {
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', this.currentUser.id)
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                    console.warn('user_profiles table issue (non-critical):', error.message);
                }
                profile = data;
            } catch (profileError) {
                console.warn('Could not load from user_profiles, using auth metadata instead');
            }

            // Update UI with profile data
            const name = profile?.full_name || this.currentUser.user_metadata?.full_name || this.currentUser.email?.split('@')[0] || 'User';
            const email = this.currentUser.email;

            const profileNameEl = document.getElementById('profileName');
            const profileEmailEl = document.getElementById('profileEmail');
            const profileAvatarEl = document.getElementById('profileAvatar');
            
            if (profileNameEl) profileNameEl.textContent = name;
            if (profileEmailEl) profileEmailEl.textContent = email;
            if (profileAvatarEl) profileAvatarEl.textContent = this.getInitials(name);
            
            // Fill form
            const fullNameInput = document.getElementById('fullName');
            const emailInput = document.getElementById('email');
            const phoneInput = document.getElementById('phone');
            const companyInput = document.getElementById('company');
            
            if (fullNameInput) fullNameInput.value = profile?.full_name || '';
            if (emailInput) emailInput.value = email;
            if (phoneInput) phoneInput.value = profile?.phone || '';
            if (companyInput) companyInput.value = profile?.company || '';
            
            console.log('Profile loaded successfully');

        } catch (error) {
            console.error('Error in loadProfile:', error);
            // Don't throw - allow init to continue
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

    async loadInvoices() {
        const container = document.getElementById('invoicesContainer');
        const invoiceCountEl = document.getElementById('invoiceCount');
        
        try {
            // Get all paid service requests with Stripe data
            const { data: paidRequests, error } = await supabase
                .from('service_requests')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('status', 'paid')
                .not('stripe_customer_id', 'is', null)
                .order('paid_at', { ascending: false });

            if (error) throw error;

            if (invoiceCountEl) {
                invoiceCountEl.textContent = `${paidRequests.length} Invoice${paidRequests.length !== 1 ? 's' : ''}`;
            }

            if (paidRequests.length === 0) {
                container.innerHTML = `
                    <div class="no-documents">
                        <div class="no-documents-icon">💳</div>
                        <p>No invoices yet</p>
                        <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 0.5rem;">Your payment history will appear here</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = paidRequests.map(request => {
                const packageDetails = request.package_details || {};
                const oneTimeCost = packageDetails.oneTimeCost || request.total_amount || 0;
                
                // Calculate total monthly cost from all subscription components
                const maintenanceCost = packageDetails.maintenance_plan?.monthly_cost || 0;
                const workspaceCost = packageDetails.google_workspace?.monthly_cost || 0;
                const monthlyCost = maintenanceCost + workspaceCost;
                
                // Debug logging
                console.log('Invoice item:', {
                    serviceName: request.service_name,
                    packageDetails: request.package_details,
                    oneTimeCost,
                    maintenanceCost,
                    workspaceCost,
                    monthlyCost,
                    hasSubscription: !!request.stripe_subscription_id
                });
                
                return `
                <div class="invoice-item" style="padding: 0; border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 16px; margin-bottom: 1.5rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%); overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header with gradient -->
                    <div style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%); padding: 1.5rem; border-bottom: 1px solid rgba(99, 102, 241, 0.2);">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                                    <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);">💼</div>
                                    <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600; background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${request.service_name}</h3>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-left: 52px;">
                                    <span style="font-size: 0.85rem; opacity: 0.7;">✓</span>
                                    <p style="margin: 0; opacity: 0.8; font-size: 0.9rem;">
                                        ${new Date(request.paid_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            <div style="text-align: right; background: rgba(16, 185, 129, 0.1); padding: 0.75rem 1.25rem; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.2);">
                                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; margin-bottom: 0.25rem;">Amount Paid</div>
                                <div style="font-size: 1.75rem; font-weight: 700; color: #10b981; line-height: 1;">
                                    $${parseFloat(oneTimeCost).toFixed(2)}
                                </div>
                                ${monthlyCost > 0 ? `
                                    <div style="font-size: 0.85rem; opacity: 0.9; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid rgba(16, 185, 129, 0.2);">
                                        <span style="color: #818cf8; font-weight: 600;">+ $${parseFloat(monthlyCost).toFixed(2)}</span>
                                        <span style="opacity: 0.7;">/month</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Body -->
                    <div style="padding: 1.5rem;">
                        <!-- Renewal Info Section -->
                        ${request.stripe_subscription_id ? `
                            <div id="renewal-info-${request.id}" style="margin-bottom: 1.25rem; padding: 1rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%); border-radius: 12px; border: 1px solid rgba(99, 102, 241, 0.2);">
                                <div style="display: flex; align-items: center; gap: 0.5rem; opacity: 0.7;">
                                    <div style="width: 20px; height: 20px; border: 2px solid rgba(99, 102, 241, 0.3); border-top-color: #818cf8; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                                    <span style="font-size: 0.9rem;">Loading renewal information...</span>
                                </div>
                            </div>
                        ` : ''}
                        
                        <!-- IDs Section -->
                        <div style="display: grid; grid-template-columns: ${request.stripe_subscription_id ? '1fr 1fr' : '1fr'}; gap: 1rem; margin-bottom: 1.25rem;">
                            <div style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                                <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.5; margin-bottom: 0.5rem;">👤 Customer ID</div>
                                <div style="font-family: 'Courier New', monospace; font-size: 0.85rem; color: #818cf8; word-break: break-all;">${request.stripe_customer_id}</div>
                            </div>
                            ${request.stripe_subscription_id ? `
                                <div style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05);">
                                    <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.5; margin-bottom: 0.5rem;">🔄 Subscription ID</div>
                                    <div style="font-family: 'Courier New', monospace; font-size: 0.85rem; color: #a78bfa; word-break: break-all;">${request.stripe_subscription_id}</div>
                                </div>
                            ` : ''}
                        </div>
                        
                        <!-- Action Buttons -->
                        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                            <a href="https://dashboard.stripe.com/test/customers/${request.stripe_customer_id}" 
                               target="_blank" 
                               style="flex: 1; min-width: 140px; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem 1.25rem; background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%); color: #a78bfa; border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 10px; text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: all 0.3s; box-shadow: 0 2px 4px rgba(99, 102, 241, 0.1);"
                               onmouseover="this.style.background='linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(99, 102, 241, 0.2)'"
                               onmouseout="this.style.background='linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(99, 102, 241, 0.1)'">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                                </svg>
                                <span>View in Stripe</span>
                            </a>
                            ${request.stripe_subscription_id ? `
                                <button onclick="profileManager.showCancelModal('${request.id}', '${request.stripe_subscription_id}')"
                                        class="cancel-subscription-btn"
                                        data-request-id="${request.id}"
                                        data-subscription-id="${request.stripe_subscription_id}"
                                        style="flex: 1; min-width: 140px; padding: 0.75rem 1.25rem; background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.1);"
                                        onmouseover="this.style.background='linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.2) 100%)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.2)'"
                                        onmouseout="this.style.background='linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(239, 68, 68, 0.1)'">
                                    Cancel Subscription
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `}).join('');

            // Load renewal information for each subscription
            for (const request of paidRequests) {
                if (request.stripe_subscription_id) {
                    this.loadRenewalInfo(request.id, request.stripe_subscription_id);
                }
            }

        } catch (error) {
            console.error('Error loading invoices:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <p>Error loading invoices. Please try again later.</p>
                </div>
            `;
        }
    }

    async loadRenewalInfo(requestId, subscriptionId) {
        try {
            const response = await fetch('/api/stripe/get-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriptionId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Subscription fetch error:', errorData);
                throw new Error('Failed to get subscription');
            }

            const subscription = await response.json();
            console.log('Subscription data received:', subscription);

            if (!subscription.current_period_end) {
                console.error('Missing current_period_end in subscription:', subscription);
                throw new Error('Invalid subscription data');
            }

            const renewalDate = new Date(subscription.current_period_end * 1000);
            const now = new Date();
            const daysUntilRenewal = Math.ceil((renewalDate - now) / (1000 * 60 * 60 * 24));

            const renewalInfoEl = document.getElementById(`renewal-info-${requestId}`);
            if (renewalInfoEl) {
                renewalInfoEl.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);">🔄</div>
                                <div style="font-weight: 600; font-size: 0.95rem; color: #a78bfa;">Next Renewal</div>
                            </div>
                            <div style="margin-left: 40px; font-size: 0.95rem; opacity: 0.9;">${renewalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>
                        <div style="text-align: center; background: linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%); padding: 0.75rem 1.25rem; border-radius: 12px; border: 1px solid rgba(99, 102, 241, 0.3); min-width: 100px;">
                            <div style="font-size: 2rem; font-weight: 700; background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1;">${daysUntilRenewal}</div>
                            <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; margin-top: 0.25rem;">days left</div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading renewal info:', error);
            const renewalInfoEl = document.getElementById(`renewal-info-${requestId}`);
            if (renewalInfoEl) {
                renewalInfoEl.style.display = 'none';
            }
        }
    }

    async showCancelModal(requestId, subscriptionId) {
        try {
            // Get subscription details
            const response = await fetch('/api/stripe/get-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriptionId })
            });

            if (!response.ok) throw new Error('Failed to get subscription');

            const subscription = await response.json();
            const renewalDate = new Date(subscription.current_period_end * 1000);
            const formattedDate = renewalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            // Create modal
            const modal = document.createElement('div');
            modal.id = 'cancelModal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;';
            
            modal.innerHTML = `
                <div style="background: #1a1a2e; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%;">
                    <h2 style="margin: 0 0 1rem 0; color: #ef4444;">⚠️ Cancel Subscription</h2>
                    <div style="background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <p style="margin: 0 0 0.5rem 0; font-size: 0.95rem;">Your service will remain active until:</p>
                        <p style="margin: 0; font-size: 1.2rem; font-weight: bold; color: #818cf8;">${formattedDate}</p>
                    </div>
                    <p style="margin: 0 0 1.5rem 0; opacity: 0.9;">After this date, your subscription will end and you will no longer be charged. You can reactivate anytime before then.</p>
                    <div style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <label style="display: flex; align-items: start; cursor: pointer;">
                            <input type="checkbox" id="confirmCancelCheckbox" style="margin-right: 0.75rem; margin-top: 0.25rem; width: 18px; height: 18px; cursor: pointer;">
                            <span style="font-size: 0.95rem;">I understand that my service will end on ${formattedDate} and I want to cancel my subscription.</span>
                        </label>
                    </div>
                    <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
                        <button onclick="document.getElementById('cancelModal').remove()" 
                                style="padding: 0.75rem 1.5rem; background: rgba(255,255,255,0.1); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.95rem;">
                            Keep Subscription
                        </button>
                        <button id="confirmCancelBtn" disabled
                                style="padding: 0.75rem 1.5rem; background: rgba(239, 68, 68, 0.3); color: #ef4444; border: none; border-radius: 6px; cursor: not-allowed; font-size: 0.95rem; transition: all 0.2s;"
                                onclick="profileManager.confirmCancellation('${requestId}', '${subscriptionId}')">
                            Cancel Subscription
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Enable cancel button when checkbox is checked
            const checkbox = document.getElementById('confirmCancelCheckbox');
            const confirmBtn = document.getElementById('confirmCancelBtn');
            
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    confirmBtn.disabled = false;
                    confirmBtn.style.background = 'rgba(239, 68, 68, 0.8)';
                    confirmBtn.style.cursor = 'pointer';
                } else {
                    confirmBtn.disabled = true;
                    confirmBtn.style.background = 'rgba(239, 68, 68, 0.3)';
                    confirmBtn.style.cursor = 'not-allowed';
                }
            });
        } catch (error) {
            console.error('Error showing cancel modal:', error);
            this.showNotification('Failed to load subscription details', 'error');
        }
    }

    async confirmCancellation(requestId, subscriptionId) {
        const modal = document.getElementById('cancelModal');
        if (modal) modal.remove();

        try {
            this.showNotification('Cancelling subscription...', 'info');
            
            const response = await fetch('/api/stripe/cancel-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ subscriptionId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to cancel subscription');
            }

            const data = await response.json();
            
            // Update the service request status
            const { error: updateError } = await supabase
                .from('service_requests')
                .update({ 
                    status: 'cancelled',
                    stripe_subscription_id: null
                })
                .eq('id', requestId);

            if (updateError) throw updateError;

            this.showNotification('Subscription cancelled successfully', 'success');
            await this.loadInvoices(); // Reload to remove the cancel button
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            this.showNotification('Failed to cancel subscription: ' + error.message, 'error');
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
        console.log('Setting up event listeners...');
        
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        console.log('Found tab buttons:', tabBtns.length);
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Tab clicked:', btn.dataset.tab);
                const tabName = btn.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Profile form submission
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            console.log('Profile form found');
            profileForm.addEventListener('submit', (e) => this.updateProfile(e));
        } else {
            console.warn('Profile form not found');
        }

        // Edit profile button
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) {
            console.log('Edit button found');
            editBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleEditMode();
            });
        } else {
            console.warn('Edit button not found');
        }

        // Cancel edit button
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) {
            console.log('Cancel button found');
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.cancelEdit();
            });
        } else {
            console.warn('Cancel button not found');
        }

        // Setup payment modal listeners
        this.setupPaymentListeners();
        
        console.log('Event listeners setup complete');
    }

    switchTab(tabName) {
        // Update button styles
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            const isActive = btn.dataset.tab === tabName;
            if (isActive) {
                btn.style.background = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
                btn.style.color = 'white';
                btn.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
                btn.style.border = 'none';
            } else {
                btn.style.background = 'rgba(99, 102, 241, 0.1)';
                btn.style.color = '#a78bfa';
                btn.style.boxShadow = 'none';
                btn.style.border = '1px solid rgba(99, 102, 241, 0.2)';
            }
        });

        // Show/hide tab content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.style.display = 'none';
        });
        
        const activeTab = document.getElementById(`tab-${tabName}`);
        if (activeTab) {
            activeTab.style.display = 'block';
        }
    }

    async updateStats() {
        try {
            // Count active services
            const { data: services } = await supabase
                .from('service_requests')
                .select('id', { count: 'exact' })
                .eq('user_id', this.currentUser.id)
                .in('status', ['active', 'paid', 'in_progress']);

            const statServices = document.getElementById('stat-services');
            if (statServices) {
                statServices.textContent = services?.length || 0;
            }

            // Count invoices
            const { data: invoices } = await supabase
                .from('service_requests')
                .select('id', { count: 'exact' })
                .eq('user_id', this.currentUser.id)
                .eq('status', 'paid')
                .not('stripe_customer_id', 'is', null);

            const statInvoices = document.getElementById('stat-invoices');
            if (statInvoices) {
                statInvoices.textContent = invoices?.length || 0;
            }

            // Count pending documents
            const { data: docs } = await supabase
                .from('customer_files')
                .select('id', { count: 'exact' })
                .eq('user_id', this.currentUser.id)
                .eq('status', 'pending_signature');

            const statDocuments = document.getElementById('stat-documents');
            if (statDocuments) {
                statDocuments.textContent = docs?.length || 0;
            }
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    toggleEditMode() {
        this.isEditMode = !this.isEditMode;
        
        const fullNameInput = document.getElementById('fullName');
        const phoneInput = document.getElementById('phone');
        const companyInput = document.getElementById('company');
        const editBtn = document.getElementById('editProfileBtn');
        const profileActions = document.getElementById('profileActions');
        
        if (this.isEditMode) {
            // Store original values
            this.originalValues = {
                fullName: fullNameInput.value,
                phone: phoneInput.value,
                company: companyInput.value
            };
            
            // Enable inputs
            fullNameInput.disabled = false;
            phoneInput.disabled = false;
            companyInput.disabled = false;
            
            // Show save/cancel buttons, hide edit button
            editBtn.style.display = 'none';
            profileActions.style.display = 'flex';
            
            // Focus first input
            fullNameInput.focus();
        } else {
            // Disable inputs
            fullNameInput.disabled = true;
            phoneInput.disabled = true;
            companyInput.disabled = true;
            
            // Hide save/cancel buttons, show edit button
            editBtn.style.display = 'inline-block';
            profileActions.style.display = 'none';
        }
    }

    cancelEdit() {
        // Restore original values
        const fullNameInput = document.getElementById('fullName');
        const phoneInput = document.getElementById('phone');
        const companyInput = document.getElementById('company');
        
        if (this.originalValues) {
            fullNameInput.value = this.originalValues.fullName;
            phoneInput.value = this.originalValues.phone;
            companyInput.value = this.originalValues.company;
        }
        
        // Exit edit mode
        this.isEditMode = true; // Set to true so toggleEditMode will turn it off
        this.toggleEditMode();
    }

    async updateProfile(e) {
        e.preventDefault();

        const fullName = document.getElementById('fullName').value;
        const phone = document.getElementById('phone').value;
        const company = document.getElementById('company').value;

        try {
            // Update or insert profile in user_profiles table
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

            // Also update the profiles table for admin page
            const { error: profilesError } = await supabase
                .from('profiles')
                .update({
                    full_name: fullName,
                    business_name: company,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentUser.id);

            if (profilesError) console.warn('Could not update profiles table:', profilesError);

            // Update auth metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: { 
                    full_name: fullName,
                    business_name: company
                }
            });

            if (authError) throw authError;

            this.showNotification('Profile updated successfully!', 'success');
            
            // Reload profile to update display
            await this.loadProfile();
            
            // Exit edit mode
            this.isEditMode = true; // Set to true so toggleEditMode will turn it off
            this.toggleEditMode();

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

    async loadDocuments() {
        const container = document.getElementById('documentsContainer');
        if (!container) {
            console.error('documentsContainer not found in DOM');
            return;
        }
        
        try {
            console.log('Loading documents for user:', this.currentUser.id);
            const { data: documents, error } = await supabase
                .from('files')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading documents:', error);
                throw error;
            }

            console.log('Documents loaded:', documents);
            
            // Check for duplicate file IDs
            const fileIds = documents.map(d => d.id);
            const uniqueIds = [...new Set(fileIds)];
            if (fileIds.length !== uniqueIds.length) {
                console.warn('DUPLICATE FILES DETECTED!', documents);
            }
            
            this.renderDocuments(documents || []);
        } catch (error) {
            console.error('Error loading documents:', error);
            document.getElementById('documentsContainer').innerHTML = `
                <div class="no-documents">
                    <div class="no-documents-icon">⚠️</div>
                    <p>Error loading documents: ${error.message}</p>
                </div>
            `;
        }
    }

    renderDocuments(documents) {
        const container = document.getElementById('documentsContainer');
        const documentCountEl = document.getElementById('documentCount');
        
        if (!documents || documents.length === 0) {
            container.innerHTML = `
                <div class="no-documents">
                    <div class="no-documents-icon">📄</div>
                    <p>No documents at this time</p>
                </div>
            `;
            if (documentCountEl) documentCountEl.textContent = '0 Documents';
            return;
        }

        if (documentCountEl) {
            documentCountEl.textContent = `${documents.length} Document${documents.length !== 1 ? 's' : ''}`;
        }

        // Separate unsigned and signed documents
        const unsigned = documents.filter(doc => doc.status === 'pending');
        const signed = documents.filter(doc => doc.status === 'signed');

        let html = '<div style="display: grid; gap: 2rem;">';

        // Unsigned documents section
        if (unsigned.length > 0) {
            html += `
                <div>
                    <h3 style="color: #fbbf24; margin-bottom: 1.25rem; font-size: 1.2rem; display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);">📝</div>
                        Documents to Sign (${unsigned.length})
                    </h3>
                    <div style="display: grid; gap: 1.5rem;">
                        ${unsigned.map(doc => `
                            <div style="border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 16px; overflow: hidden; background: linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                <!-- Header -->
                                <div style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%); padding: 1.5rem; border-bottom: 1px solid rgba(251, 191, 36, 0.2);">
                                    <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 1rem;">
                                        <div style="flex: 1; min-width: 200px;">
                                            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                                                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3);">📄</div>
                                                <div>
                                                    <h4 style="margin: 0; font-size: 1.1rem; font-weight: 600;">${this.escapeHtml(doc.file_name)}</h4>
                                                    <div style="font-size: 0.85rem; opacity: 0.7; margin-top: 0.25rem;">Uploaded ${new Date(doc.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div style="text-align: right;">
                                            <span style="display: inline-block; background: rgba(251, 191, 36, 0.2); color: #fbbf24; padding: 0.5rem 1rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600; border: 1px solid rgba(251, 191, 36, 0.4);">⏳ Pending Signature</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Body -->
                                <div style="padding: 1.5rem;">
                                    ${doc.description ? `
                                        <div style="background: rgba(251, 191, 36, 0.05); padding: 1rem; border-radius: 12px; border: 1px solid rgba(251, 191, 36, 0.1); margin-bottom: 1.5rem;">
                                            <div style="font-size: 0.85rem; opacity: 0.7; margin-bottom: 0.5rem;">Description</div>
                                            <div style="opacity: 0.9;">${this.escapeHtml(doc.description)}</div>
                                        </div>
                                    ` : ''}
                                    
                                    <!-- Actions -->
                                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                                        <button onclick="profileManager.viewDocument('${doc.file_url}')" style="flex: 1; min-width: 140px; padding: 0.875rem 1.5rem; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 10px; cursor: pointer; font-size: 0.95rem; font-weight: 500; transition: all 0.3s;" onmouseover="this.style.background='linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)'; this.style.transform='translateY(0)'">
                                            👁️ View Document
                                        </button>
                                        <button onclick="profileManager.signDocument('${doc.id}')" style="flex: 1; min-width: 140px; padding: 0.875rem 1.5rem; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 0.95rem; font-weight: 600; box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3); transition: all 0.3s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(251, 191, 36, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(251, 191, 36, 0.3)'">
                                            ✍️ Sign Document
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Signed documents section
        if (signed.length > 0) {
            html += `
                <div>
                    <h3 style="color: #10b981; margin-bottom: 1.25rem; font-size: 1.2rem; display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);">✅</div>
                        Signed Documents (${signed.length})
                    </h3>
                    <div style="display: grid; gap: 1.5rem;">
                        ${signed.map(doc => `
                            <div style="border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 16px; overflow: hidden; background: linear-gradient(135deg, rgba(16, 185, 129, 0.03) 0%, rgba(5, 150, 105, 0.03) 100%); box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                                <!-- Header -->
                                <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); padding: 1.5rem; border-bottom: 1px solid rgba(16, 185, 129, 0.2);">
                                    <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 1rem;">
                                        <div style="flex: 1; min-width: 200px;">
                                            <div style="display: flex; align-items: center; gap: 0.75rem;">
                                                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);">📄</div>
                                                <div>
                                                    <h4 style="margin: 0; font-size: 1.1rem; font-weight: 600;">${this.escapeHtml(doc.file_name)}</h4>
                                                    <div style="font-size: 0.85rem; opacity: 0.7; margin-top: 0.25rem;">
                                                        Signed ${doc.signed_at ? new Date(doc.signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div style="text-align: right;">
                                            <span style="display: inline-block; background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 0.5rem 1rem; border-radius: 12px; font-size: 0.85rem; font-weight: 600; border: 1px solid rgba(16, 185, 129, 0.3);">✅ Signed</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Body -->
                                <div style="padding: 1.5rem;">
                                    ${doc.description ? `
                                        <div style="background: rgba(16, 185, 129, 0.05); padding: 1rem; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.1); margin-bottom: 1.5rem;">
                                            <div style="font-size: 0.85rem; opacity: 0.7; margin-bottom: 0.5rem;">Description</div>
                                            <div style="opacity: 0.9;">${this.escapeHtml(doc.description)}</div>
                                        </div>
                                    ` : ''}
                                    
                                    <!-- Action -->
                                    <button onclick="profileManager.viewDocument('${doc.file_url}')" style="width: 100%; padding: 0.875rem 1.5rem; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; cursor: pointer; font-size: 0.95rem; font-weight: 500; transition: all 0.3s;" onmouseover="this.style.background='linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.2) 100%)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'; this.style.transform='translateY(0)'">
                                        👁️ View Document
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        html += '</div>';

        container.innerHTML = html;
    }

    viewDocument(fileUrl) {
        window.open(fileUrl, '_blank');
    }

    async signDocument(documentId) {
        console.log('🔍 signDocument called with ID:', documentId);
        console.log('🔍 profileManager instance:', this);
        
        // Store the document ID and get document details
        this.currentDocumentToSign = documentId;
        const fileDocument = await this.getDocumentById(documentId);
        
        console.log('🔍 Document fetched:', fileDocument);
        
        if (!fileDocument) {
            this.showNotification('Document not found', 'error');
            return;
        }

        this.currentDocumentUrl = fileDocument.file_url;
        this.hasViewedDocument = false;

        // Show the signing modal
        const modal = document.getElementById('signContractModal');
        console.log('🔍 Modal element:', modal);
        
        if (modal) {
            modal.style.display = 'flex';
            this.setupSigningModal();
        } else {
            console.error('❌ Modal not found!');
        }
    }

    async getDocumentById(docId) {
        try {
            const { data, error } = await supabase
                .from('files')
                .select('*')
                .eq('id', docId)
                .eq('user_id', this.currentUser.id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching document:', error);
            return null;
        }
    }

    setupSigningModal() {
        const viewBtn = document.getElementById('viewDocumentBtn');
        const agreeCheckbox = document.getElementById('agreeCheckbox');
        const confirmBtn = document.getElementById('confirmSignBtn');
        const cancelBtn = document.getElementById('cancelSignBtn');
        const closeBtn = document.getElementById('closeSignModalBtn');
        const viewStatus = document.getElementById('viewStatus');

        // Reset state
        this.hasViewedDocument = false;
        agreeCheckbox.checked = false;
        agreeCheckbox.disabled = true;
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
        confirmBtn.style.cursor = 'not-allowed';
        viewStatus.innerHTML = '<span style="display: inline-block;">📋 You must view the document before signing</span>';

        // View document button
        viewBtn.onclick = () => {
            window.open(this.currentDocumentUrl, '_blank');
            this.hasViewedDocument = true;
            
            // Enable checkbox after viewing with animation
            agreeCheckbox.disabled = false;
            viewStatus.innerHTML = '<span style="display: inline-block; color: #10b981;">✅ Document viewed - you may now proceed</span>';
            viewStatus.style.background = 'rgba(16, 185, 129, 0.1)';
            viewBtn.innerHTML = '<span style="display: flex; align-items: center; justify-content: center; gap: 0.75rem;"><span>✅</span><span>View Again</span></span>';
            viewBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        };

        // Agreement checkbox
        agreeCheckbox.onchange = (e) => {
            if (e.target.checked && this.hasViewedDocument) {
                confirmBtn.disabled = false;
                confirmBtn.style.opacity = '1';
                confirmBtn.style.cursor = 'pointer';
            } else {
                confirmBtn.disabled = true;
                confirmBtn.style.opacity = '0.5';
                confirmBtn.style.cursor = 'not-allowed';
            }
        };

        // Confirm sign button
        confirmBtn.onclick = async () => {
            if (!this.hasViewedDocument || !agreeCheckbox.checked) {
                this.showNotification('Please view the document and agree to the terms before signing.', 'error');
                return;
            }
            await this.confirmSignDocument();
        };

        // Cancel and close buttons
        const closeModal = () => this.closeSigningModal();
        cancelBtn.onclick = closeModal;
        closeBtn.onclick = closeModal;
    }

    closeSigningModal() {
        const modal = document.getElementById('signContractModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentDocumentToSign = null;
        this.currentDocumentUrl = null;
        this.hasViewedDocument = false;
    }

    async confirmSignDocument() {
        if (!this.currentDocumentToSign) return;

        try {
            const { error } = await supabase
                .from('files')
                .update({
                    status: 'signed',
                    signed_at: new Date().toISOString()
                })
                .eq('id', this.currentDocumentToSign)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            this.showNotification('Document signed successfully!');
            this.closeSigningModal();
            await this.loadDocuments();
        } catch (error) {
            console.error('Error signing document:', error);
            this.showNotification('Error signing document', 'error');
        }
    }

    openPaymentModal(requestId, serviceName, onetimeCost, monthlyCost) {
        this.currentRequestToPay = requestId;
        this.currentPaymentData = {
            requestId,
            serviceName,
            onetimeCost,
            monthlyCost
        };
        
        // Populate payment details
        document.getElementById('paymentServiceName').textContent = serviceName;
        document.getElementById('paymentOneTime').textContent = '$' + onetimeCost.toFixed(2);
        document.getElementById('paymentMonthly').textContent = '$' + monthlyCost.toFixed(2) + '/month';
        document.getElementById('recurringAmount').textContent = '$' + monthlyCost.toFixed(2) + '/month';
        
        // Show modal
        const modal = document.getElementById('paymentModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Initialize Stripe payment
        this.initializeStripePayment(onetimeCost, monthlyCost, serviceName);
    }

    async initializeStripePayment(onetimeCost, monthlyCost, serviceName) {
        try {
            // Initialize Stripe handler if not already done
            if (!this.stripeHandler) {
                this.stripeHandler = new StripePaymentHandler();
                await this.stripeHandler.init();
            }

            // Get user profile data
            const { data: profile } = await supabase.auth.getUser();
            const email = profile.user.email;
            const name = profile.user.user_metadata?.full_name || email;

            // Create payment intent and subscription
            const paymentData = await this.stripeHandler.processPayment(
                email,
                name,
                onetimeCost,
                monthlyCost,
                {
                    requestId: this.currentRequestToPay,
                    serviceName: serviceName,
                    userId: this.currentUser.id
                }
            );

            // Create Stripe payment UI
            await this.stripeHandler.createPaymentUI(paymentData.clientSecret);

            // Store price ID for subscription
            this.currentPriceId = paymentData.priceId;
            this.currentCustomerId = paymentData.customerId;

        } catch (error) {
            console.error('Error initializing Stripe payment:', error);
            this.showNotification('Error loading payment form. Please try again.', 'error');
            this.closePaymentModal();
        }
    }

    closePaymentModal() {
        const modal = document.getElementById('paymentModal');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        
        // Destroy Stripe elements
        if (this.stripeHandler) {
            this.stripeHandler.destroy();
        }
        
        // Reset consent checkbox
        const consentCheckbox = document.getElementById('recurringConsent');
        if (consentCheckbox) {
            consentCheckbox.checked = false;
        }
    }

    setupPaymentListeners() {
        // Close button
        const closeBtn = document.getElementById('closePaymentModalBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closePaymentModal());
        }

        // Cancel button
        const cancelBtn = document.getElementById('cancelPaymentBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closePaymentModal());
        }

        // Confirm payment button
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', (e) => this.handleStripePayment(e));
        }
    }

    async handleStripePayment(e) {
        e.preventDefault();

        // Check consent checkbox
        const consentCheckbox = document.getElementById('recurringConsent');
        if (!consentCheckbox.checked) {
            this.showNotification('Please agree to recurring payments', 'error');
            return;
        }

        const confirmBtn = document.getElementById('confirmPaymentBtn');
        const originalText = confirmBtn.innerHTML;
        
        try {
            // Disable button and show loading
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '⏳ Processing Payment...';

            // Save data to localStorage before redirect
            localStorage.setItem('pending_payment_request_id', this.currentRequestToPay);
            localStorage.setItem('pending_customer_id', this.currentCustomerId);
            localStorage.setItem('pending_price_id', this.currentPriceId);

            // Confirm payment with Stripe (this will redirect to Stripe's payment page)
            // The rest of the flow is handled by handleStripeReturn() after redirect
            await this.stripeHandler.confirmPayment();

        } catch (error) {
            console.error('Error processing payment:', error);
            
            // Re-enable button on error
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalText;
            
            // Check if error is from Stripe validation
            if (error.type === 'validation_error') {
                this.showNotification('Please complete all payment fields', 'error');
            } else {
                this.showNotification('Error: ' + (error.message || 'Payment failed'), 'error');
            }
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Initialize profile manager when page loads
let profileManager;
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing ProfileManager...');
    profileManager = new ProfileManager();
    window.profileManager = profileManager; // Make explicitly global
    console.log('✅ ProfileManager initialized:', profileManager);
    console.log('✅ window.profileManager:', window.profileManager);
});
