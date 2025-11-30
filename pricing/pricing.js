(function() {
    'use strict';

    const selections = {
        package: null,
        packagePrice: 0,
        maintenance: null,
        maintenancePrice: 0,
        addons: [],
        addonsPrice: 0
    };

    const sectionOrder = ['hero', 'packages', 'maintenance', 'addons', 'faq', 'summary'];

    function scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
            updateProgressDots(sectionId);
        }
    }

    function updateProgressDots(activeSectionId) {
        const dots = document.querySelectorAll('.progress-dot');
        const activeIndex = sectionOrder.indexOf(activeSectionId);

        dots.forEach((dot, index) => {
            dot.classList.remove('active', 'completed');
            if (index < activeIndex) {
                dot.classList.add('completed');
            } else if (index === activeIndex) {
                dot.classList.add('active');
            }
        });
    }

    function selectPackage(card) {
        document.querySelectorAll('#packages .pricing-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selections.package = card.dataset.package;
        selections.packagePrice = parseInt(card.dataset.price);
        document.getElementById('packages-continue').classList.add('enabled');
        updateSummary();
        setTimeout(() => scrollToSection('maintenance'), 500);
    }

    function selectMaintenance(card) {
        document.querySelectorAll('#maintenance .maintenance-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selections.maintenance = card.dataset.maintenance;
        selections.maintenancePrice = parseInt(card.dataset.price);
        document.getElementById('maintenance-continue').classList.add('enabled');
        updateSummary();
        setTimeout(() => scrollToSection('addons'), 500);
    }

    function toggleAddon(card) {
        card.classList.toggle('selected');

        const addon = card.dataset.addon;
        const basePrice = parseInt(card.dataset.price);
        const hasQuantity = card.dataset.hasQuantity === 'true';

        if (hasQuantity) {
            const qtyDiv = card.querySelector('.addon-quantity');
            if (qtyDiv) {
                qtyDiv.style.display = card.classList.contains('selected') ? 'block' : 'none';
            }
        }

        if (card.classList.contains('selected')) {
            if (addon === 'google-workspace') {
                const qty = parseInt(document.getElementById('workspace-qty')?.value) || 1;
                selections.addons.push({ name: addon, price: basePrice * qty, quantity: qty, unitPrice: basePrice });
            } else {
                selections.addons.push({ name: addon, price: basePrice });
            }
        } else {
            selections.addons = selections.addons.filter(a => a.name !== addon);
        }

        selections.addonsPrice = selections.addons.reduce((sum, a) => sum + a.price, 0);
        updateSummary();
    }

    function updateWorkspaceQty(delta) {
        const input = document.getElementById('workspace-qty');
        let qty = parseInt(input.value) || 1;
        qty = Math.max(1, Math.min(100, qty + delta));
        input.value = qty;
        updateWorkspaceFromInput();
    }

    function updateWorkspaceFromInput() {
        const input = document.getElementById('workspace-qty');
        let qty = parseInt(input.value) || 1;
        qty = Math.max(1, Math.min(100, qty));
        input.value = qty;

        const unitPrice = 7;
        const total = unitPrice * qty;

        document.getElementById('workspace-total').textContent = '$' + total + '/month';

        const existingAddon = selections.addons.find(a => a.name === 'google-workspace');
        if (existingAddon) {
            existingAddon.price = total;
            existingAddon.quantity = qty;
            selections.addonsPrice = selections.addons.reduce((sum, a) => sum + a.price, 0);
            updateSummary();
        }
    }

    function updateSummary() {
        const packageEl = document.getElementById('summary-package');
        if (selections.package) {
            const packageNames = { starter: 'Starter', professional: 'Professional', premium: 'Premium' };
            packageEl.textContent = packageNames[selections.package] + ' - $' + selections.packagePrice;
        } else {
            packageEl.textContent = 'Not selected';
        }

        const maintenanceEl = document.getElementById('summary-maintenance');
        if (selections.maintenance) {
            const maintenanceNames = { basic: 'Basic', full: 'Full Service' };
            maintenanceEl.textContent = maintenanceNames[selections.maintenance] + ' - $' + selections.maintenancePrice + '/mo';
        } else {
            maintenanceEl.textContent = 'Not selected';
        }

        const addonsEl = document.getElementById('summary-addons');
        if (selections.addons.length > 0) {
            const addonNames = selections.addons.map(a => {
                const nameMap = {
                    'google-workspace': 'Google Workspace',
                    'database': 'Database',
                    'analytics': 'Analytics'
                };
                let name = nameMap[a.name] || a.name;

                if (a.name === 'google-workspace' && a.quantity > 1) {
                    name += ' (' + a.quantity + ' users)';
                }
                return name;
            });
            addonsEl.textContent = addonNames.join(', ') + ' (+$' + selections.addonsPrice + '/mo)';
        } else {
            addonsEl.textContent = 'None';
        }

        const totalEl = document.getElementById('summary-total');
        const oneTimeTotal = selections.packagePrice;
        const monthlyTotal = selections.maintenancePrice + selections.addonsPrice;

        if (oneTimeTotal > 0 || monthlyTotal > 0) {
            let totalText = '';
            if (oneTimeTotal > 0) totalText += '$' + oneTimeTotal;
            if (monthlyTotal > 0) {
                if (totalText) totalText += ' + ';
                totalText += '$' + monthlyTotal + '/mo';
            }
            totalEl.textContent = totalText;
        } else {
            totalEl.textContent = '$0';
        }
    }

    function toggleFaq(element) {
        const item = element.parentElement;
        item.classList.toggle('open');
    }

    function showValidationPopup(title, message, sectionId) {
        document.getElementById('validationTitle').textContent = title;
        document.getElementById('validationMessage').textContent = message;
        document.getElementById('validationPopup').classList.add('active');
        document.getElementById('validationPopup').dataset.scrollTo = sectionId;
        document.body.style.overflow = 'hidden';
    }

    function closeValidationPopup() {
        const popup = document.getElementById('validationPopup');
        const sectionId = popup.dataset.scrollTo;
        popup.classList.remove('active');
        document.body.style.overflow = '';
        if (sectionId) {
            setTimeout(() => scrollToSection(sectionId), 300);
        }
    }

    async function openModal() {
        if (!selections.package) {
            showValidationPopup('Package Required', 'Please select a website package before submitting your request.', 'packages');
            return;
        }

        if (!selections.maintenance) {
            showValidationPopup('Maintenance Plan Required', 'Please select a maintenance plan before submitting your request.', 'maintenance');
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            showLoginRequiredModal();
            return;
        }

        document.getElementById('requestModal').classList.add('active');
        document.body.style.overflow = 'hidden';

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, email, business_name')
                .eq('id', session.user.id)
                .single();

            if (profile) {
                document.getElementById('clientName').value = profile.full_name || '';
                document.getElementById('clientEmail').value = profile.email || session.user.email || '';
                document.getElementById('businessName').value = profile.business_name || '';
            } else {
                document.getElementById('clientEmail').value = session.user.email || '';
            }
        } catch (error) {
            console.log('Could not pre-fill form:', error);
        }
    }

    function showLoginRequiredModal() {
        sessionStorage.setItem('pendingServiceRequest', JSON.stringify(selections));

        const modal = document.getElementById('requestModal');
        const modalContent = modal.querySelector('.modal-content');

        if (!modal.dataset.originalContent) {
            modal.dataset.originalContent = modalContent.innerHTML;
        }

        modalContent.innerHTML = '<div class="modal-header"><h3>Account Required</h3><p>Please sign in or create an account to submit a service request</p></div><div style="padding: 2rem; text-align: center;"><div style="font-size: 4rem; margin-bottom: 1rem;">🔐</div><p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Creating an account lets you track your request status, communicate with us directly, and manage your projects all in one place.</p><div style="background: rgba(212, 168, 83, 0.1); border: 1px solid rgba(212, 168, 83, 0.3); border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.5rem;"><p style="font-size: 0.875rem; color: var(--text-secondary); margin: 0;"><strong style="color: var(--text-primary);">Your selections will be saved!</strong><br>After signing in, you will be returned here to complete your request.</p></div><div style="display: flex; flex-direction: column; gap: 0.75rem;"><a href="/sign-up/?redirect=pricing" class="modal-submit" style="text-decoration: none; display: block; text-align: center;">Create Account</a><a href="/login/?redirect=pricing" class="modal-cancel" style="text-decoration: none; display: block; text-align: center; background: transparent; border: 1px solid var(--border-primary);">Sign In</a></div></div>';

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        const modal = document.getElementById('requestModal');
        modal.classList.remove('active');
        document.body.style.overflow = '';

        if (modal.dataset.originalContent) {
            modal.querySelector('.modal-content').innerHTML = modal.dataset.originalContent;
            delete modal.dataset.originalContent;
        }
    }

    async function checkPendingRequest() {
        const pending = sessionStorage.getItem('pendingServiceRequest');
        if (pending) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                try {
                    const savedSelections = JSON.parse(pending);
                    Object.assign(selections, savedSelections);
                    updateSummary();
                    sessionStorage.removeItem('pendingServiceRequest');
                    setTimeout(() => {
                        openModal();
                    }, 500);
                } catch (e) {
                    console.error('Error restoring selections:', e);
                }
            }
        }
    }

    document.addEventListener('DOMContentLoaded', checkPendingRequest);

    async function submitRequest(event) {
        event.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        const clientName = document.getElementById('clientName').value;
        const clientEmail = document.getElementById('clientEmail').value;
        const businessName = document.getElementById('businessName').value || null;
        const additionalNotes = document.getElementById('additionalNotes').value || null;

        const packageDetails = {
            package: selections.package,
            packagePrice: selections.packagePrice,
            maintenance: selections.maintenance,
            maintenancePrice: selections.maintenancePrice,
            addons: selections.addons,
            addonsPrice: selections.addonsPrice
        };

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                showLoginRequiredModal();
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Request';
                return;
            }

            const userId = session.user.id;

            const packageNames = { starter: 'Starter', professional: 'Professional', premium: 'Premium' };
            const serviceName = selections.package
                ? packageNames[selections.package] + ' Website Package'
                : 'Custom Website Package';

            const { data, error } = await supabase
                .from('service_requests')
                .insert({
                    user_id: userId,
                    service_name: serviceName,
                    service_type: 'website',
                    package_details: packageDetails,
                    total_amount: selections.packagePrice || 0,
                    status: 'pending',
                    admin_notes: additionalNotes || null
                })
                .select()
                .single();

            if (error) throw error;

            sessionStorage.removeItem('pendingServiceRequest');

            const modalContent = document.querySelector('.modal-content');
            modalContent.innerHTML = '<div class="success-message"><div class="success-icon">✓</div><h3>Request Submitted!</h3><p>Thank you for your interest! We will review your request and get back to you within 24 hours at ' + session.user.email + '</p><p style="color: var(--text-secondary); font-size: 0.875rem;">Request ID: ' + data.id.substring(0, 8).toUpperCase() + '</p><div style="display: flex; gap: 1rem; margin-top: 1.5rem; flex-wrap: wrap; justify-content: center;"><button class="submit-request-btn" onclick="window.location.href=\'profile.html\'" style="background: var(--gradient-primary);">View Dashboard</button><button class="submit-request-btn" onclick="window.location.href=\'index.html\'" style="background: transparent; border: 1px solid var(--border-primary);">Return Home</button></div></div>';

        } catch (error) {
            console.error('Error submitting request:', error);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Request';
            alert('There was an error submitting your request: ' + (error.message || 'Please try again.'));
        }
    }

    var pricingObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                updateProgressDots(entry.target.id);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.pricing-section').forEach(function(section) {
        pricingObserver.observe(section);
    });

    document.querySelectorAll('.progress-dot').forEach(function(dot) {
        dot.addEventListener('click', function() {
            var sectionId = dot.dataset.section;
            scrollToSection(sectionId);
        });
    });

    var header = document.querySelector('.header');
    var lastScrollTop = 0;
    window.addEventListener('scroll', function() {
        var scrollTop = window.scrollY;

        if (scrollTop > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        if (Math.abs(scrollTop - lastScrollTop) > 5) {
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                header.style.transform = 'translateY(-100%)';
                header.style.opacity = '0';
                header.style.pointerEvents = 'none';

                var lights = document.getElementById('xmas-lights');
                if (lights) {
                    lights.style.transform = 'translateY(-150px)';
                    lights.style.opacity = '0';
                }
            } else {
                header.style.transform = 'translateY(0)';
                header.style.opacity = '1';
                header.style.pointerEvents = 'auto';

                var lights = document.getElementById('xmas-lights');
                if (lights) {
                    lights.style.transform = 'translateY(0)';
                    lights.style.opacity = '1';
                }
            }
            lastScrollTop = scrollTop;
        }
    });

    var mobileToggle = document.getElementById('mobileToggle');
    var navMenu = document.getElementById('navMenu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', function() {
            mobileToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        navMenu.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                mobileToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    document.getElementById('requestModal').addEventListener('click', function(e) {
        if (e.target === e.currentTarget) {
            closeModal();
        }
    });

    document.getElementById('validationPopup').addEventListener('click', function(e) {
        if (e.target === e.currentTarget) {
            closeValidationPopup();
        }
    });

    window.scrollToSection = scrollToSection;
    window.selectPackage = selectPackage;
    window.selectMaintenance = selectMaintenance;
    window.toggleAddon = toggleAddon;
    window.updateWorkspaceQty = updateWorkspaceQty;
    window.updateWorkspaceFromInput = updateWorkspaceFromInput;
    window.toggleFaq = toggleFaq;
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.closeValidationPopup = closeValidationPopup;
    window.submitRequest = submitRequest;

})();
