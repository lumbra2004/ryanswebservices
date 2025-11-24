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

// Observe all service cards
document.querySelectorAll('.service-card').forEach(card => {
    observer.observe(card);
});

// Mobile collapsible sections
function initMobileCollapse() {
    if (window.innerWidth <= 639) {
        const servicesHeader = document.querySelector('#services .section-header');
        const portfolioHeader = document.querySelector('#portfolio .section-header');
        const servicesGrid = document.querySelector('.services-grid');
        const portfolioGrid = document.querySelector('.portfolio-grid');
        
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
const header = document.querySelector('header');

window.addEventListener('scroll', function() {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Only hide/show if scrolled past threshold
    if (Math.abs(scrollTop - lastScrollTop) < scrollThreshold) {
        return;
    }
    
    if (scrollTop > lastScrollTop && scrollTop > 100) {
        // Scrolling down & past 100px
        header.classList.add('header-hidden');
    } else {
        // Scrolling up
        header.classList.remove('header-hidden');
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
