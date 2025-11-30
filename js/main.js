
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);


const serviceCards = document.querySelectorAll('.service-card');
if (serviceCards.length > 0) {
    serviceCards.forEach(card => {
        observer.observe(card);
    });
}


function initMobileCollapse() {
    if (window.innerWidth <= 639) {
        const servicesHeader = document.querySelector('#services .section-header');
        const portfolioHeader = document.querySelector('#portfolio .section-header');
        const servicesGrid = document.querySelector('.services-grid');
        const portfolioGrid = document.querySelector('.portfolio-grid');


        if (!servicesHeader || !portfolioHeader || !servicesGrid || !portfolioGrid) {
            return;
        }


        servicesHeader.classList.add('collapsed');
        portfolioHeader.classList.add('collapsed');


        servicesHeader.addEventListener('click', function() {
            this.classList.toggle('collapsed');
            servicesGrid.classList.toggle('expanded');
        });


        portfolioHeader.addEventListener('click', function() {
            this.classList.toggle('collapsed');
            portfolioGrid.classList.toggle('expanded');
        });
    }
}


initMobileCollapse();
window.addEventListener('resize', function() {
    if (window.innerWidth > 639) {

        document.querySelectorAll('.section-header').forEach(header => {
            header.classList.remove('collapsed');
        });
        document.querySelectorAll('.services-grid, .portfolio-grid').forEach(grid => {
            grid.classList.add('expanded');
        });
    }
});


let lastScrollTop = 0;
let scrollThreshold = 5;

window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    if (!header) return;

    const lights = document.getElementById('xmas-lights');
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Add scrolled class for styling
    if (scrollTop > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }

    if (Math.abs(scrollTop - lastScrollTop) < scrollThreshold) {
        return;
    }

    if (scrollTop > lastScrollTop && scrollTop > 100) {

        header.classList.add('header-hidden');
        header.style.transform = 'translateY(-100%)';
        header.style.opacity = '0';
        header.style.pointerEvents = 'none';

        if (lights) {
            lights.style.transform = 'translateY(-150px)';
            lights.style.opacity = '0';
        }
    } else {

        header.classList.remove('header-hidden');
        header.style.transform = 'translateY(0)';
        header.style.opacity = '1';
        header.style.pointerEvents = 'auto';

        if (lights) {
            lights.style.transform = 'translateY(0)';
            lights.style.opacity = '1';
        }
    }

    lastScrollTop = scrollTop;
});


function copyEmail() {
    const email = 'contact@ryanswebservices.com';
    navigator.clipboard.writeText(email).then(function() {
        const btn = document.querySelector('.copy-email-btn');
        const icon = document.getElementById('copyIcon');
        const text = document.getElementById('copyText');

        btn.classList.add('copied');
        icon.textContent = '✓';
        text.textContent = 'Copied!';

        setTimeout(function() {
            btn.classList.remove('copied');
            icon.textContent = '📋';
            text.textContent = 'Copy';
        }, 2000);
    }).catch(function(err) {
        console.error('Failed to copy email:', err);
    });
}


function initSettings() {
    const settingsButton = document.getElementById('settingsButton');
    const settingsMenu = document.getElementById('settingsMenu');

    if (!settingsButton || !settingsMenu) {
        return;
    }

    const themeToggle = document.getElementById('themeToggleSwitch');
    const themeIcon = document.getElementById('themeIcon');
    const themeModeText = document.querySelector('#themeToggleItem .settings-menu-label span:last-child');
    const body = document.body;


    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        if (themeToggle) themeToggle.classList.add('active');
        if (themeIcon) themeIcon.textContent = '☀️';
        if (themeModeText) themeModeText.textContent = 'Light Mode';
    } else {
        if (themeIcon) themeIcon.textContent = '🌙';
        if (themeModeText) themeModeText.textContent = 'Dark Mode';
    }


    settingsButton.addEventListener('click', function(e) {
        e.stopPropagation();
        settingsMenu.classList.toggle('show');
        settingsButton.classList.toggle('active');
    });


    document.addEventListener('click', function(e) {
        if (!settingsMenu.contains(e.target) && e.target !== settingsButton) {
            settingsMenu.classList.remove('show');
            settingsButton.classList.remove('active');
        }
    });


    const themeToggleItem = document.getElementById('themeToggleItem');
    if (themeToggleItem) {
        themeToggleItem.addEventListener('click', function(e) {
            e.stopPropagation();
            body.classList.toggle('light-mode');
            if (themeToggle) themeToggle.classList.toggle('active');

            if (body.classList.contains('light-mode')) {
                if (themeIcon) themeIcon.textContent = '☀️';
                if (themeModeText) themeModeText.textContent = 'Light Mode';
                localStorage.setItem('theme', 'light');
            } else {
                if (themeIcon) themeIcon.textContent = '🌙';
                if (themeModeText) themeModeText.textContent = 'Dark Mode';
                localStorage.setItem('theme', 'dark');
            }
        });
    }

}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettings);
} else {
    initSettings();
}

console.log('%c✓ main.js loaded successfully', 'color: #10b981; font-weight: 500');
