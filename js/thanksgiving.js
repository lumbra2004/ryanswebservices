// ═══════════════════════════════════════════════════════════════════════════
// ULTRA PREMIUM THANKSGIVING THEME - SITE-WIDE ENHANCEMENTS
// Include this script on all pages for the complete thanksgiving experience
// ═══════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';
    
    // Only run once
    if (window.thanksgivingThemeLoaded) return;
    window.thanksgivingThemeLoaded = true;
    
    // ══════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ══════════════════════════════════════════════════════════════════════
    
    const CONFIG = {
        promoCode: 'THANKSGIVING',
        promoDiscount: '15%',
        promoExpiry: 'December 27, 2025',
        showPromoOnPages: ['index.html', '/', ''], // Only show on homepage
    };
    
    // ══════════════════════════════════════════════════════════════════════
    // ADD THANKSGIVING BADGE TO NAVIGATION
    // ══════════════════════════════════════════════════════════════════════
    
    function addThanksgivingBadge() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;
        
        // Check if badge already exists
        if (navLinks.querySelector('.thanksgiving-badge')) return;
        
        // Find the last li (usually login)
        const allLis = navLinks.querySelectorAll('li');
        const lastLi = allLis[allLis.length - 1];
        
        // Create badge element
        const badgeLi = document.createElement('li');
        badgeLi.innerHTML = `
            <span class="thanksgiving-badge">
                <span class="tg-leaf">🍂</span>
                <span>Happy Thanksgiving!</span>
            </span>
        `;
        
        // Insert before last li (login)
        if (lastLi) {
            navLinks.insertBefore(badgeLi, lastLi);
        } else {
            navLinks.appendChild(badgeLi);
        }
    }
    
    // ══════════════════════════════════════════════════════════════════════
    // ADD AMBIENT GLOW ELEMENTS
    // ══════════════════════════════════════════════════════════════════════
    
    function addAmbientGlow() {
        // Check if already added
        if (document.querySelector('.tg-ambient')) return;
        
        const ambientTL = document.createElement('div');
        ambientTL.className = 'tg-ambient tg-ambient-tl';
        document.body.appendChild(ambientTL);
        
        const ambientBR = document.createElement('div');
        ambientBR.className = 'tg-ambient tg-ambient-br';
        document.body.appendChild(ambientBR);
    }
    
    // ══════════════════════════════════════════════════════════════════════
    // SHOW THANKSGIVING TOAST (ONCE PER SESSION)
    // ══════════════════════════════════════════════════════════════════════
    
    function showThanksgivingToast() {
        // Only show once per session
        if (sessionStorage.getItem('tg-toast-shown')) return;
        
        // Don't show if promo popup is showing
        if (!sessionStorage.getItem('tg-promo-shown')) return;
        
        const toast = document.createElement('div');
        toast.className = 'tg-toast';
        toast.innerHTML = `
            <span class="tg-toast-icon">🦃</span>
            <span class="tg-toast-text"><strong>Happy Thanksgiving!</strong> Wishing you warmth & gratitude</span>
        `;
        
        document.body.appendChild(toast);
        sessionStorage.setItem('tg-toast-shown', 'true');
        
        // Remove after animation completes
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 7000);
    }
    
    // ══════════════════════════════════════════════════════════════════════
    // PROMOTIONAL DISCOUNT POPUP
    // ══════════════════════════════════════════════════════════════════════
    
    function isHomepage() {
        const path = window.location.pathname;
        return CONFIG.showPromoOnPages.some(page => {
            if (page === '/') return path === '/' || path === '';
            return path.endsWith(page);
        });
    }
    
    function showPromoPopup() {
        // Only show on homepage
        if (!isHomepage()) return;
        
        // Only show once per session
        if (sessionStorage.getItem('tg-promo-shown')) {
            // Show toast instead since promo was already shown
            setTimeout(showThanksgivingToast, 500);
            return;
        }
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'tg-promo-overlay';
        overlay.innerHTML = `
            <div class="tg-promo-modal">
                <button class="tg-promo-close" aria-label="Close">&times;</button>
                <div class="tg-promo-content">
                    <span class="tg-promo-icon">🦃</span>
                    <h2 class="tg-promo-title">Happy Thanksgiving!</h2>
                    <p class="tg-promo-subtitle">We're grateful for you! Enjoy a special holiday discount.</p>
                    
                    <div class="tg-promo-discount">
                        <div class="tg-promo-percent">${CONFIG.promoDiscount}</div>
                        <div class="tg-promo-off">OFF</div>
                        
                        <div class="tg-promo-code-wrap">
                            <div class="tg-promo-code-label">Use discount code</div>
                            <div class="tg-promo-code" id="promoCodeBtn">
                                <span class="tg-promo-code-text">${CONFIG.promoCode}</span>
                                <span class="tg-promo-code-copy">📋</span>
                            </div>
                        </div>
                        
                        <div class="tg-promo-expiry">Valid until ${CONFIG.promoExpiry}</div>
                    </div>
                    
                    <a href="#contact" class="tg-promo-cta" id="promoCta">
                        <span>Get Started Now</span>
                        <span>→</span>
                    </a>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
        
        // Animate in after a brief delay
        setTimeout(() => {
            overlay.classList.add('active');
        }, 500);
        
        // Mark as shown
        sessionStorage.setItem('tg-promo-shown', 'true');
        
        // Close handlers
        const closeBtn = overlay.querySelector('.tg-promo-close');
        const ctaBtn = overlay.querySelector('#promoCta');
        const codeBtn = overlay.querySelector('#promoCodeBtn');
        
        function closePopup() {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            setTimeout(() => {
                overlay.remove();
                // Show toast after popup closes
                setTimeout(showThanksgivingToast, 1000);
            }, 400);
        }
        
        closeBtn.addEventListener('click', closePopup);
        
        ctaBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closePopup();
            // Smooth scroll to contact after popup closes
            setTimeout(() => {
                const contact = document.querySelector('#contact');
                if (contact) {
                    contact.scrollIntoView({ behavior: 'smooth' });
                }
            }, 500);
        });
        
        // Copy code functionality
        codeBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(CONFIG.promoCode).then(() => {
                showCopyToast();
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = CONFIG.promoCode;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showCopyToast();
            });
        });
        
        // Close on overlay click (not modal)
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closePopup();
            }
        });
        
        // Close on Escape key
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closePopup();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }
    
    function showCopyToast() {
        // Remove existing toast
        const existing = document.querySelector('.tg-copy-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = 'tg-copy-toast';
        toast.textContent = '✓ Code copied to clipboard!';
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    // ══════════════════════════════════════════════════════════════════════
    // INITIALIZE ON DOM READY
    // ══════════════════════════════════════════════════════════════════════
    
    function init() {
        addThanksgivingBadge();
        addAmbientGlow();
        showPromoPopup();
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
