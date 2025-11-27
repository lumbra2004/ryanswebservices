// Pricing Page - Service Request System

class ServiceRequestManager {
    constructor() {
        this.selectedPackage = null;
        this.selectedPrice = null;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Request service buttons
        const requestButtons = document.querySelectorAll('.request-service-btn');
        requestButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleRequestClick(e));
        });

        // Close modal
        const closeBtn = document.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        // Click outside modal to close
        const modal = document.getElementById('requestModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }

        // Form submission
        const form = document.getElementById('serviceRequestForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Plan slider options
        const planOptions = document.querySelectorAll('.plan-option');
        planOptions.forEach(option => {
            option.addEventListener('click', () => this.selectPlan(option));
        });

        // Workspace plan change
        const workspacePlan = document.getElementById('workspacePlan');
        if (workspacePlan) {
            workspacePlan.addEventListener('change', () => {
                this.toggleAdditionalUsers();
                this.updateTotalCost();
            });
        }

        // Additional users change
        const additionalUsers = document.getElementById('additionalUsers');
        if (additionalUsers) {
            additionalUsers.addEventListener('input', () => this.updateTotalCost());
        }

        // Confirmation modal buttons
        const confirmStay = document.getElementById('confirmStay');
        const confirmView = document.getElementById('confirmView');
        const confirmationOverlay = document.getElementById('confirmationOverlay');
        
        if (confirmStay) {
            confirmStay.addEventListener('click', () => this.closeConfirmation());
        }
        
        if (confirmView) {
            confirmView.addEventListener('click', () => {
                window.location.href = 'profile.html';
            });
        }
        
        if (confirmationOverlay) {
            confirmationOverlay.addEventListener('click', () => this.closeConfirmation());
        }
    }

    toggleAdditionalUsers() {
        const workspacePlan = document.getElementById('workspacePlan');
        const additionalUsersGroup = document.getElementById('additionalUsersGroup');
        
        if (workspacePlan.value) {
            additionalUsersGroup.style.display = 'block';
        } else {
            additionalUsersGroup.style.display = 'none';
            document.getElementById('additionalUsers').value = 0;
        }
    }

    selectPlan(selectedOption) {
        // Remove selected class from all options
        document.querySelectorAll('.plan-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        // Add selected class to clicked option
        selectedOption.classList.add('selected');
        
        // Update hidden input value
        const planValue = selectedOption.dataset.plan;
        const planPrice = selectedOption.dataset.price;
        document.getElementById('maintenancePlan').value = planValue;
        document.getElementById('maintenancePlan').dataset.price = planPrice;
        
        // Clear any validation errors
        this.clearValidationError();
        
        // Update total cost
        this.updateTotalCost();
    }

    updateTotalCost() {
        const maintenancePlan = document.getElementById('maintenancePlan');
        const workspacePlan = document.getElementById('workspacePlan');
        const additionalUsers = document.getElementById('additionalUsers');
        const totalCostDisplay = document.getElementById('totalCostDisplay');
        
        // Get base price
        const basePrice = parseFloat(this.selectedPrice) || 0;
        
        // Get maintenance price from hidden input's data attribute
        const maintenancePrice = parseFloat(maintenancePlan.dataset?.price || 0);
        
        // Get workspace price
        const workspaceUnitPrice = workspacePlan.selectedOptions[0]?.dataset?.price 
            ? parseFloat(workspacePlan.selectedOptions[0].dataset.price) 
            : 0;
        
        const additionalUserCount = parseInt(additionalUsers.value) || 0;
        const workspaceTotal = workspaceUnitPrice * additionalUserCount;
        
        // Calculate monthly total
        const monthlyTotal = maintenancePrice + workspaceTotal;
        
        // Update display
        document.getElementById('basePackageDisplay').textContent = `$${basePrice.toFixed(2)}`;
        document.getElementById('maintenanceDisplay').textContent = maintenancePrice > 0 
            ? `$${maintenancePrice.toFixed(2)}/month` 
            : '$0/month';
        
        const workspaceDisplay = document.getElementById('workspaceDisplay');
        if (workspaceTotal > 0) {
            workspaceDisplay.style.display = 'block';
            document.getElementById('workspaceCost').textContent = `$${workspaceTotal.toFixed(2)}/month (${additionalUserCount} user${additionalUserCount !== 1 ? 's' : ''})`;
        } else {
            workspaceDisplay.style.display = 'none';
        }
        
        document.getElementById('monthlyTotal').textContent = `$${monthlyTotal.toFixed(2)}/month`;
        
        // Show total display if maintenance is selected
        if (maintenancePrice > 0) {
            totalCostDisplay.style.display = 'block';
        } else {
            totalCostDisplay.style.display = 'none';
        }
    }

    async handleRequestClick(e) {
        e.preventDefault();

        // Check if user is logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('Please log in to request a service.');
            window.location.href = 'login.html';
            return;
        }

        // Get package details
        const btn = e.target;
        this.selectedPackage = btn.dataset.package;
        this.selectedPrice = btn.dataset.price;

        // Populate modal
        document.getElementById('selectedPackage').value = this.selectedPackage.charAt(0).toUpperCase() + this.selectedPackage.slice(1);
        document.getElementById('basePrice').value = '$' + this.selectedPrice;
        document.getElementById('requestDetails').value = '';

        // Show modal
        this.openModal();
    }

    openModal() {
        const modal = document.getElementById('requestModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        const modal = document.getElementById('requestModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    showValidationError() {
        const container = document.querySelector('.plan-slider-container');
        if (!container) return;
        
        // Add error class
        container.classList.add('error');
        
        // Check if error message already exists
        if (container.querySelector('.validation-error')) return;
        
        // Create error message
        const errorMsg = document.createElement('div');
        errorMsg.className = 'validation-error';
        errorMsg.innerHTML = '⚠️ Please select a maintenance plan to continue';
        container.appendChild(errorMsg);
        
        // Scroll to the plan selector
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    clearValidationError() {
        const container = document.querySelector('.plan-slider-container');
        if (!container) return;
        
        container.classList.remove('error');
        const errorMsg = container.querySelector('.validation-error');
        if (errorMsg) {
            errorMsg.remove();
        }
    }

    showConfirmation(packageName, onetimeCost, monthlyCost) {
        const modal = document.getElementById('confirmationModal');
        const overlay = document.getElementById('confirmationOverlay');
        
        // Update confirmation details
        document.getElementById('confirmPackage').textContent = packageName;
        document.getElementById('confirmOnetime').textContent = '$' + onetimeCost.toFixed(2);
        document.getElementById('confirmMonthly').textContent = '$' + monthlyCost.toFixed(2) + '/month';
        
        // Show modal with animation
        setTimeout(() => {
            overlay.classList.add('show');
            modal.classList.add('show');
        }, 100);
    }

    closeConfirmation() {
        const modal = document.getElementById('confirmationModal');
        const overlay = document.getElementById('confirmationOverlay');
        
        modal.classList.remove('show');
        overlay.classList.remove('show');
    }

    async handleSubmit(e) {
        e.preventDefault();

        const details = document.getElementById('requestDetails').value;
        const maintenancePlan = document.getElementById('maintenancePlan');
        const workspacePlan = document.getElementById('workspacePlan');
        const additionalUsers = document.getElementById('additionalUsers');

        // Validate maintenance plan is selected
        if (!maintenancePlan.value) {
            this.showValidationError();
            return;
        }

        try {
            // Get current user
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert('Please log in to submit a request.');
                return;
            }

            // Calculate costs
            const basePrice = parseFloat(this.selectedPrice) || 0;
            const maintenancePrice = parseFloat(maintenancePlan.dataset?.price || 0);
            const workspaceUnitPrice = parseFloat(workspacePlan.selectedOptions[0]?.dataset?.price || 0);
            const additionalUserCount = parseInt(additionalUsers.value) || 0;
            const workspaceTotal = workspaceUnitPrice * additionalUserCount;
            const monthlyTotal = maintenancePrice + workspaceTotal;

            // Get plan name from selected slider option
            const selectedPlanOption = document.querySelector('.plan-option.selected');
            const planName = selectedPlanOption ? selectedPlanOption.querySelector('.plan-name').textContent : '';

            // Prepare package details
            const packageDetails = {
                package: this.selectedPackage,
                details: details || null,
                maintenance_plan: {
                    type: maintenancePlan.value,
                    name: planName,
                    monthly_cost: maintenancePrice
                }
            };

            // Add workspace details if selected
            if (workspacePlan.value) {
                packageDetails.google_workspace = {
                    plan: workspacePlan.value,
                    name: workspacePlan.selectedOptions[0].text,
                    unit_price: workspaceUnitPrice,
                    additional_users: additionalUserCount,
                    monthly_cost: workspaceTotal
                };
            }

            // Create service request
            const { data, error } = await supabase
                .from('service_requests')
                .insert({
                    user_id: session.user.id,
                    service_name: this.selectedPackage.charAt(0).toUpperCase() + this.selectedPackage.slice(1) + ' Package',
                    service_type: 'website',
                    package_details: packageDetails,
                    total_amount: basePrice, // One-time website cost
                    status: 'pending'
                });

            if (error) throw error;

            // Close request modal
            this.closeModal();

            // Reset form
            document.getElementById('serviceRequestForm').reset();
            document.getElementById('totalCostDisplay').style.display = 'none';
            document.getElementById('additionalUsersGroup').style.display = 'none';
            
            // Reset plan slider
            document.querySelectorAll('.plan-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            document.getElementById('maintenancePlan').dataset.price = '0';
            this.clearValidationError();

            // Show modern confirmation modal
            const packageName = this.selectedPackage.charAt(0).toUpperCase() + this.selectedPackage.slice(1) + ' Package';
            this.showConfirmation(packageName, basePrice, monthlyTotal);

        } catch (error) {
            console.error('Error submitting request:', error);
            alert('Error submitting request: ' + error.message);
        }
    }
}

// Initialize
const serviceRequestManager = new ServiceRequestManager();
