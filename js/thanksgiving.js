




(function() {
    'use strict';


    if (window.thanksgivingThemeLoaded) return;
    window.thanksgivingThemeLoaded = true;





    const CONFIG = {
        promoCode: 'THANKSGIVING',
        promoDiscount: '15%',
        promoExpiry: 'December 27, 2025',
        showPromoOnPages: ['index.html', '/', ''],
    };





    function addThanksgivingBadge() {
        const navLinks = document.querySelector('.nav-links');
        if (!navLinks) return;


        if (navLinks.querySelector('.thanksgiving-badge')) return;


        const allLis = navLinks.querySelectorAll('li');
        const lastLi = allLis[allLis.length - 1];


        const badgeLi = document.createElement('li');
        badgeLi.innerHTML = `
            <span class="thanksgiving-badge">
                <span class="tg-leaf">🍂</span>
                <span>Happy Thanksgiving!</span>
            </span>
        `;


        if (lastLi) {
            navLinks.insertBefore(badgeLi, lastLi);
        } else {
            navLinks.appendChild(badgeLi);
        }
    }





    function addAmbientGlow() {

        if (document.querySelector('.tg-ambient')) return;

        const ambientTL = document.createElement('div');
        ambientTL.className = 'tg-ambient tg-ambient-tl';
        document.body.appendChild(ambientTL);

        const ambientBR = document.createElement('div');
        ambientBR.className = 'tg-ambient tg-ambient-br';
        document.body.appendChild(ambientBR);
    }





    function showThanksgivingToast() {

        if (sessionStorage.getItem('tg-toast-shown')) return;


        if (!sessionStorage.getItem('tg-promo-shown')) return;

        const toast = document.createElement('div');
        toast.className = 'tg-toast';
        toast.innerHTML = `
            <span class="tg-toast-icon">🦃</span>
            <span class="tg-toast-text"><strong>Happy Thanksgiving!</strong> Wishing you warmth & gratitude</span>
        `;

        document.body.appendChild(toast);
        sessionStorage.setItem('tg-toast-shown', 'true');


        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 7000);
    }





    function isHomepage() {
        const path = window.location.pathname;
        return CONFIG.showPromoOnPages.some(page => {
            if (page === '/') return path === '/' || path === '';
            return path.endsWith(page);
        });
    }

    function showPromoPopup() {

        if (!isHomepage()) return;


        if (sessionStorage.getItem('tg-promo-shown')) {

            setTimeout(showThanksgivingToast, 500);
            return;
        }


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


        document.body.style.overflow = 'hidden';


        setTimeout(() => {
            overlay.classList.add('active');
        }, 500);


        sessionStorage.setItem('tg-promo-shown', 'true');


        const closeBtn = overlay.querySelector('.tg-promo-close');
        const ctaBtn = overlay.querySelector('#promoCta');
        const codeBtn = overlay.querySelector('#promoCodeBtn');

        function closePopup() {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            setTimeout(() => {
                overlay.remove();

                setTimeout(showThanksgivingToast, 1000);
            }, 400);
        }

        closeBtn.addEventListener('click', closePopup);

        ctaBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closePopup();

            setTimeout(() => {
                const contact = document.querySelector('#contact');
                if (contact) {
                    contact.scrollIntoView({ behavior: 'smooth' });
                }
            }, 500);
        });


        codeBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(CONFIG.promoCode).then(() => {
                showCopyToast();
            }).catch(() => {

                const textArea = document.createElement('textarea');
                textArea.value = CONFIG.promoCode;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                showCopyToast();
            });
        });


        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closePopup();
            }
        });


        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closePopup();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }

    function showCopyToast() {

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





    function init() {
        addThanksgivingBadge();
        addAmbientGlow();
        showPromoPopup();
    }


    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
