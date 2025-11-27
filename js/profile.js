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

        let html = `
            <table class="documents-table services-table">
                <thead>
                    <tr>
                        <th style="width: 40px;"></th>
                        <th>Service</th>
                        <th>One-Time</th>
                        <th>Monthly</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Contract</th>
                    </tr>
                </thead>
                <tbody>
        `;

        requests.forEach((request, index) => {
            const statusColor = statusColors[request.status] || '#6b7280';
            const statusLabel = statusLabels[request.status] || request.status;
            const date = new Date(request.created_at).toLocaleDateString();
            
            // Calculate monthly cost
            const maintenanceCost = request.package_details?.maintenance_plan?.monthly_cost || 0;
            const workspaceCost = request.package_details?.google_workspace?.monthly_cost || 0;
            const monthlyTotal = maintenanceCost + workspaceCost;

            html += `
                <tr class="service-row" data-request-id="${request.id}">
                    <td>
                        <button class="expand-btn" data-index="${index}" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; padding: 0.25rem; color: var(--text-secondary); transition: transform 0.2s;">▶</button>
                    </td>
                    <td>
                        <strong>${request.service_name}</strong>
                    </td>
                    <td style="font-weight: 600;">$${parseFloat(request.total_amount).toFixed(2)}</td>
                    <td style="font-weight: 600; color: var(--secondary);">$${monthlyTotal.toFixed(2)}/mo</td>
                    <td>
                        <span style="background: ${statusColor}22; color: ${statusColor}; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.85rem; font-weight: 500; white-space: nowrap;">${statusLabel}</span>
                        ${request.status === 'ready_to_purchase' ? 
                            `<button class="btn-pay-now" data-request-id="${request.id}" data-service-name="${request.service_name}" data-onetime="${request.total_amount}" data-monthly="${monthlyTotal}" style="margin-left: 0.5rem; background: linear-gradient(135deg, #10b981, #22c55e); color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.85rem; font-weight: 600; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(16, 185, 129, 0.3)'">💳 Pay Now</button>` : 
                            ''
                        }
                    </td>
                    <td>${date}</td>
                    <td>
                        ${request.contract_file_id ? 
                            `<button class="btn-view-contract" data-file-id="${request.contract_file_id}" style="background: var(--primary); color: white; border: none; padding: 0.5rem 1rem; border-radius: 0.375rem; cursor: pointer; font-size: 0.9rem;">View</button>` : 
                            '<span style="opacity: 0.5;">No Contract Yet</span>'
                        }
                    </td>
                </tr>
                <tr class="service-details" id="details-${index}" style="display: none;">
                    <td></td>
                    <td colspan="6" style="padding: 1.5rem; background: rgba(0, 102, 255, 0.05); border-left: 3px solid var(--primary);">
                        <div style="display: grid; gap: 1rem;">
                            <div>
                                <h4 style="color: var(--primary); margin-bottom: 0.75rem; font-size: 1rem;">📦 Package Details</h4>
                                <div style="display: grid; gap: 0.5rem; font-size: 0.95rem;">
                                    <div><strong>Package:</strong> ${request.package_details?.package || 'N/A'}</div>
                                    ${request.package_details?.details ? `<div><strong>Details:</strong> ${request.package_details.details}</div>` : ''}
                                </div>
                            </div>
                            
                            ${request.package_details?.maintenance_plan ? `
                                <div>
                                    <h4 style="color: var(--primary); margin-bottom: 0.75rem; font-size: 1rem;">🔧 Maintenance Plan</h4>
                                    <div style="display: grid; gap: 0.5rem; font-size: 0.95rem;">
                                        <div><strong>Plan:</strong> ${request.package_details.maintenance_plan.name || request.package_details.maintenance_plan.type}</div>
                                        <div><strong>Monthly Cost:</strong> $${maintenanceCost.toFixed(2)}/month</div>
                                        <div style="opacity: 0.7;"><em>Includes 1 Google Workspace user</em></div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${request.package_details?.google_workspace ? `
                                <div>
                                    <h4 style="color: var(--primary); margin-bottom: 0.75rem; font-size: 1rem;">📧 Google Workspace</h4>
                                    <div style="display: grid; gap: 0.5rem; font-size: 0.95rem;">
                                        <div><strong>Plan:</strong> ${request.package_details.google_workspace.name || request.package_details.google_workspace.plan}</div>
                                        <div><strong>Additional Users:</strong> ${request.package_details.google_workspace.additional_users || 0}</div>
                                        <div><strong>Unit Price:</strong> $${(request.package_details.google_workspace.unit_price || 0).toFixed(2)}/user/month</div>
                                        <div><strong>Monthly Cost:</strong> $${workspaceCost.toFixed(2)}/month</div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 1rem; margin-top: 0.5rem;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="font-size: 0.9rem; opacity: 0.7;">Total Monthly Recurring</div>
                                        <div style="font-size: 1.5rem; font-weight: 800; color: var(--secondary);">$${monthlyTotal.toFixed(2)}/month</div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-size: 0.9rem; opacity: 0.7;">One-Time Setup</div>
                                        <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary);">$${parseFloat(request.total_amount).toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;

        // Add event listeners for expand buttons
        container.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = e.target.dataset.index;
                const detailsRow = document.getElementById(`details-${index}`);
                const isExpanded = detailsRow.style.display !== 'none';
                
                if (isExpanded) {
                    detailsRow.style.display = 'none';
                    e.target.style.transform = 'rotate(0deg)';
                } else {
                    detailsRow.style.display = 'table-row';
                    e.target.style.transform = 'rotate(90deg)';
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
                <div class="invoice-item" style="padding: 1.5rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; margin-bottom: 1rem; background: rgba(255,255,255,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <div>
                            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.1rem;">${request.service_name}</h3>
                            <p style="margin: 0; opacity: 0.7; font-size: 0.9rem;">
                                Paid on ${new Date(request.paid_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: #10b981;">
                                $${parseFloat(oneTimeCost).toFixed(2)}
                            </div>
                            ${monthlyCost > 0 ? `
                                <div style="font-size: 0.9rem; opacity: 0.7; margin-top: 0.25rem;">
                                    + $${parseFloat(monthlyCost).toFixed(2)}/month
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05);">
                        <div style="flex: 1;">
                            <div style="font-size: 0.85rem; opacity: 0.6; margin-bottom: 0.25rem;">Customer ID</div>
                            <div style="font-family: monospace; font-size: 0.9rem;">${request.stripe_customer_id}</div>
                        </div>
                        ${request.stripe_subscription_id ? `
                            <div style="flex: 1;">
                                <div style="font-size: 0.85rem; opacity: 0.6; margin-bottom: 0.25rem;">Subscription ID</div>
                                <div style="font-family: monospace; font-size: 0.9rem;">${request.stripe_subscription_id}</div>
                            </div>
                        ` : ''}
                    </div>
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                        <a href="https://dashboard.stripe.com/test/customers/${request.stripe_customer_id}" 
                           target="_blank" 
                           style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: rgba(99, 102, 241, 0.1); color: #818cf8; border-radius: 6px; text-decoration: none; font-size: 0.9rem; transition: all 0.2s;"
                           onmouseover="this.style.background='rgba(99, 102, 241, 0.2)'"
                           onmouseout="this.style.background='rgba(99, 102, 241, 0.1)'">
                            <span>View in Stripe</span>
                            <span>→</span>
                        </a>
                        ${request.stripe_subscription_id ? `
                            <button onclick="profileManager.cancelSubscription('${request.id}', '${request.stripe_subscription_id}')"
                                    style="padding: 0.5rem 1rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; border-radius: 6px; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;"
                                    onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'"
                                    onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'">
                                Cancel Subscription
                            </button>
                        ` : ''}
                    </div>
                </div>
            `}).join('');

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

    async cancelSubscription(requestId, subscriptionId) {
        if (!confirm('Are you sure you want to cancel this subscription? You will continue to have access until the end of your current billing period.')) {
            return;
        }

        try {
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
        // Profile form submission
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.updateProfile(e));
        }

        // Edit profile button
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.toggleEditMode());
        }

        // Cancel edit button
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelEdit());
        }

        // Setup payment modal listeners
        this.setupPaymentListeners();
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
        
        if (!documents || documents.length === 0) {
            container.innerHTML = `
                <div class="no-documents">
                    <div class="no-documents-icon">📄</div>
                    <p>No documents at this time</p>
                </div>
            `;
            return;
        }

        // Separate unsigned and signed documents
        const unsigned = documents.filter(doc => doc.status === 'pending');
        const signed = documents.filter(doc => doc.status === 'signed');

        let html = '';

        // Unsigned documents section
        if (unsigned.length > 0) {
            html += `
                <div style="margin-bottom: 2rem;">
                    <h3 style="color: var(--primary); margin-bottom: 1rem; font-size: 1.25rem;">📝 Documents to Sign (${unsigned.length})</h3>
                    <table class="documents-table">
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>Description</th>
                                <th>Uploaded</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${unsigned.map(doc => `
                                <tr data-file-id="${doc.id}">
                                    <td><strong>${this.escapeHtml(doc.file_name)}</strong></td>
                                    <td>${doc.description ? this.escapeHtml(doc.description) : '-'}</td>
                                    <td>${new Date(doc.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div class="doc-actions">
                                            <button class="doc-btn view" onclick="profileManager.viewDocument('${doc.file_url}')">
                                                👁️ View
                                            </button>
                                            <button class="doc-btn sign" onclick="profileManager.signDocument('${doc.id}')">
                                                ✍️ Sign
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Signed documents section
        if (signed.length > 0) {
            html += `
                <div>
                    <h3 style="color: #10b981; margin-bottom: 1rem; font-size: 1.25rem;">✅ Signed Documents (${signed.length})</h3>
                    <table class="documents-table">
                        <thead>
                            <tr>
                                <th>File Name</th>
                                <th>Description</th>
                                <th>Uploaded</th>
                                <th>Signed Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${signed.map(doc => `
                                <tr style="opacity: 0.8;" data-file-id="${doc.id}">
                                    <td><strong>${this.escapeHtml(doc.file_name)}</strong></td>
                                    <td>${doc.description ? this.escapeHtml(doc.description) : '-'}</td>
                                    <td>${new Date(doc.created_at).toLocaleDateString()}</td>
                                    <td style="color: #10b981;">
                                        ${doc.signed_at ? new Date(doc.signed_at).toLocaleDateString() : '-'}
                                    </td>
                                    <td>
                                        <button class="doc-btn view" onclick="profileManager.viewDocument('${doc.file_url}')">
                                            👁️ View
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

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
