// ═══════════════════════════════════════════════════════════════════════════
// THANKSGIVING THEME - SITE-WIDE ENHANCEMENTS
// Include this script on all pages for the complete thanksgiving experience
// ═══════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';
    
    // Only run once
    if (window.thanksgivingThemeLoaded) return;
    window.thanksgivingThemeLoaded = true;
    
    // ══════════════════════════════════════════════════════════════════════
    // ADD THANKSGIVING BADGE TO NAVIGATION
    // ══════════════════════════════════════════════════════════════════════
    
    function addThanksgivingBadge() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;
        
        // Check if badge already exists
        if (navLinks.querySelector('.thanksgiving-badge')) return;
        
        // Find the login button li or last li
        const loginLi = navLinks.querySelector('li:last-child');
        
        // Create badge element
        const badgeLi = document.createElement('li');
        badgeLi.innerHTML = `
            <span class="thanksgiving-badge">
                <span class="tg-leaf">🍂</span>
                <span>Happy Thanksgiving</span>
            </span>
        `;
        
        // Insert before login
        if (loginLi) {
            navLinks.insertBefore(badgeLi, loginLi);
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
        }, 6500);
    }
    
    // ══════════════════════════════════════════════════════════════════════
    // INITIALIZE ON DOM READY
    // ══════════════════════════════════════════════════════════════════════
    
    function init() {
        addThanksgivingBadge();
        addAmbientGlow();
        showThanksgivingToast();
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();
