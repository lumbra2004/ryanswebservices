// Intersection Observer for scroll-triggered animations
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

// Observe all service cards (if they exist)
const serviceCards = document.querySelectorAll('.service-card');
if (serviceCards.length > 0) {
    serviceCards.forEach(card => {
        observer.observe(card);
    });
}

// Mobile collapsible sections
function initMobileCollapse() {
    if (window.innerWidth <= 639) {
        const servicesHeader = document.querySelector('#services .section-header');
        const portfolioHeader = document.querySelector('#portfolio .section-header');
        const servicesGrid = document.querySelector('.services-grid');
        const portfolioGrid = document.querySelector('.portfolio-grid');
        
        // Only initialize if elements exist
        if (!servicesHeader || !portfolioHeader || !servicesGrid || !portfolioGrid) {
            return;
        }
        
        // Start collapsed
        servicesHeader.classList.add('collapsed');
        portfolioHeader.classList.add('collapsed');
        
        // Toggle services section
        servicesHeader.addEventListener('click', function() {
            this.classList.toggle('collapsed');
            servicesGrid.classList.toggle('expanded');
        });
        
        // Toggle portfolio section
        portfolioHeader.addEventListener('click', function() {
            this.classList.toggle('collapsed');
            portfolioGrid.classList.toggle('expanded');
        });
    }
}

// Initialize on load and resize
initMobileCollapse();
window.addEventListener('resize', function() {
    if (window.innerWidth > 639) {
        // Remove collapsed state on larger screens
        document.querySelectorAll('.section-header').forEach(header => {
            header.classList.remove('collapsed');
        });
        document.querySelectorAll('.services-grid, .portfolio-grid').forEach(grid => {
            grid.classList.add('expanded');
        });
    }
});

// Header hide/show on scroll
let lastScrollTop = 0;
let scrollThreshold = 5; // Minimum scroll distance to trigger

window.addEventListener('scroll', function() {
    const header = document.querySelector('header');
    const lights = document.getElementById('xmas-lights');
    if (!header) return;
    
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Only hide/show if scrolled past threshold
    if (Math.abs(scrollTop - lastScrollTop) < scrollThreshold) {
        return;
    }
    
    if (scrollTop > lastScrollTop && scrollTop > 100) {
        // Scrolling down & past 100px
        header.classList.add('header-hidden');
        header.style.transform = 'translateY(-100%)';
        header.style.opacity = '0';
        header.style.pointerEvents = 'none';
        // Hide lights with header
        if (lights) {
            lights.style.transform = 'translateY(-150px)';
            lights.style.opacity = '0';
        }
    } else {
        // Scrolling up
        header.classList.remove('header-hidden');
        header.style.transform = 'translateY(0)';
        header.style.opacity = '1';
        header.style.pointerEvents = 'auto';
        // Show lights with header
        if (lights) {
            lights.style.transform = 'translateY(0)';
            lights.style.opacity = '1';
        }
    }
    
    lastScrollTop = scrollTop;
});

// Copy email functionality
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

// Settings Menu & Theme Toggle
function initSettings() {
    const settingsButton = document.getElementById('settingsButton');
    const settingsMenu = document.getElementById('settingsMenu');
    
    console.log('initSettings called');
    console.log('settingsButton:', settingsButton);
    console.log('settingsMenu:', settingsMenu);
    
    // Exit if settings button doesn't exist on this page
    if (!settingsButton || !settingsMenu) {
        console.log('Settings elements not found, exiting');
        return;
    }
    
    const themeToggle = document.getElementById('themeToggleSwitch');
    const themeIcon = document.getElementById('themeIcon');
    const themeModeText = document.querySelector('#themeToggleItem .settings-menu-label span:last-child');
    const body = document.body;
    
    // Check for saved theme preference or default to dark mode
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
    
    // Toggle settings menu
    settingsButton.addEventListener('click', function(e) {
        console.log('Settings button clicked!');
        e.stopPropagation();
        settingsMenu.classList.toggle('show');
        settingsButton.classList.toggle('active');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!settingsMenu.contains(e.target) && e.target !== settingsButton) {
            settingsMenu.classList.remove('show');
            settingsButton.classList.remove('active');
        }
    });
    
    // Theme toggle functionality
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
    
    console.log('Settings initialized successfully');
}

// Initialize settings when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettings);
} else {
    // DOM already loaded
    initSettings();
}
