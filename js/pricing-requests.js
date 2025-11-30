

class ServiceRequestManager {
    constructor() {
        this.selectedPackage = null;
        this.selectedPrice = null;
        this.init();
    }

    init() {

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {

        const requestButtons = document.querySelectorAll('.request-service-btn');
        requestButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleRequestClick(e));
        });


        const closeBtn = document.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }


        const modal = document.getElementById('requestModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }


        const form = document.getElementById('serviceRequestForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }


        const planOptions = document.querySelectorAll('.plan-option');
        planOptions.forEach(option => {
            option.addEventListener('click', () => this.selectPlan(option));
        });


        const workspacePlan = document.getElementById('workspacePlan');
        if (workspacePlan) {
            workspacePlan.addEventListener('change', () => {
                this.toggleAdditionalUsers();
                this.updateTotalCost();
            });
        }


        const additionalUsers = document.getElementById('additionalUsers');
        if (additionalUsers) {
            additionalUsers.addEventListener('input', () => this.updateTotalCost());
        }


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

        document.querySelectorAll('.plan-option').forEach(opt => {
            opt.classList.remove('selected');
        });


        selectedOption.classList.add('selected');


        const planValue = selectedOption.dataset.plan;
        const planPrice = selectedOption.dataset.price;
        document.getElementById('maintenancePlan').value = planValue;
        document.getElementById('maintenancePlan').dataset.price = planPrice;


        this.clearValidationError();


        this.updateTotalCost();
    }

    updateTotalCost() {
        const maintenancePlan = document.getElementById('maintenancePlan');
        const workspacePlan = document.getElementById('workspacePlan');
        const additionalUsers = document.getElementById('additionalUsers');
        const totalCostDisplay = document.getElementById('totalCostDisplay');


        const basePrice = parseFloat(this.selectedPrice) || 0;


        const maintenancePrice = parseFloat(maintenancePlan.dataset?.price || 0);


        const workspaceUnitPrice = workspacePlan.selectedOptions[0]?.dataset?.price
            ? parseFloat(workspacePlan.selectedOptions[0].dataset.price)
            : 0;

        const additionalUserCount = parseInt(additionalUsers.value) || 0;
        const workspaceTotal = workspaceUnitPrice * additionalUserCount;


        const monthlyTotal = maintenancePrice + workspaceTotal;


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


        if (maintenancePrice > 0) {
            totalCostDisplay.style.display = 'block';
        } else {
            totalCostDisplay.style.display = 'none';
        }
    }

    async handleRequestClick(e) {
        e.preventDefault();


        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert('Please log in to request a service.');
            window.location.href = 'login.html';
            return;
        }


        const btn = e.target;
        this.selectedPackage = btn.dataset.package;
        this.selectedPrice = btn.dataset.price;


        document.getElementById('selectedPackage').value = this.selectedPackage.charAt(0).toUpperCase() + this.selectedPackage.slice(1);
        document.getElementById('basePrice').value = '$' + this.selectedPrice;
        document.getElementById('requestDetails').value = '';


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


        container.classList.add('error');


        if (container.querySelector('.validation-error')) return;


        const errorMsg = document.createElement('div');
        errorMsg.className = 'validation-error';
        errorMsg.innerHTML = '⚠️ Please select a maintenance plan to continue';
        container.appendChild(errorMsg);


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


        document.getElementById('confirmPackage').textContent = packageName;
        document.getElementById('confirmOnetime').textContent = '$' + onetimeCost.toFixed(2);
        document.getElementById('confirmMonthly').textContent = '$' + monthlyCost.toFixed(2) + '/month';


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


        if (!maintenancePlan.value) {
            this.showValidationError();
            return;
        }

        try {

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert('Please log in to submit a request.');
                return;
            }


            const basePrice = parseFloat(this.selectedPrice) || 0;
            const maintenancePrice = parseFloat(maintenancePlan.dataset?.price || 0);
            const workspaceUnitPrice = parseFloat(workspacePlan.selectedOptions[0]?.dataset?.price || 0);
            const additionalUserCount = parseInt(additionalUsers.value) || 0;
            const workspaceTotal = workspaceUnitPrice * additionalUserCount;
            const monthlyTotal = maintenancePrice + workspaceTotal;


            const selectedPlanOption = document.querySelector('.plan-option.selected');
            const planName = selectedPlanOption ? selectedPlanOption.querySelector('.plan-name').textContent : '';


            const packageDetails = {
                package: this.selectedPackage,
                details: details || null,
                maintenance_plan: {
                    type: maintenancePlan.value,
                    name: planName,
                    monthly_cost: maintenancePrice
                }
            };


            if (workspacePlan.value) {
                packageDetails.google_workspace = {
                    plan: workspacePlan.value,
                    name: workspacePlan.selectedOptions[0].text,
                    unit_price: workspaceUnitPrice,
                    additional_users: additionalUserCount,
                    monthly_cost: workspaceTotal
                };
            }


            const { data, error } = await supabase
                .from('service_requests')
                .insert({
                    user_id: session.user.id,
                    service_name: this.selectedPackage.charAt(0).toUpperCase() + this.selectedPackage.slice(1) + ' Package',
                    service_type: 'website',
                    package_details: packageDetails,
                    total_amount: basePrice,
                    status: 'pending'
                });

            if (error) throw error;


            this.closeModal();


            document.getElementById('serviceRequestForm').reset();
            document.getElementById('totalCostDisplay').style.display = 'none';
            document.getElementById('additionalUsersGroup').style.display = 'none';


            document.querySelectorAll('.plan-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            document.getElementById('maintenancePlan').dataset.price = '0';
            this.clearValidationError();


            const packageName = this.selectedPackage.charAt(0).toUpperCase() + this.selectedPackage.slice(1) + ' Package';
            this.showConfirmation(packageName, basePrice, monthlyTotal);

        } catch (error) {
            console.error('Error submitting request:', error);
            alert('Error submitting request: ' + error.message);
        }
    }
}


const serviceRequestManager = new ServiceRequestManager();
