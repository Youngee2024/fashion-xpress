window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    
    // Give it a tiny extra delay for a smoother visual feel
    setTimeout(() => {
        preloader.classList.add('fade-out');
    }, 1000);
});

/**
 * FashionXpress Interactivity Engine
 */

document.addEventListener('DOMContentLoaded', () => {
    initCustomCursor();
    initScrollAnimations();
    initMobileMenu(); // Add mobile menu initialization here
});

/**
 * Handles the custom cursor and follower logic
 */
function initCustomCursor() {
    const cursor = document.querySelector('.cursor');
    const follower = document.querySelector('.cursor-follower');
    
    // Check if cursor elements exist to prevent errors
    if (!cursor || !follower) return;

    document.addEventListener('mousemove', (e) => {
        // Use translate3d for better performance (GPU accelerated)
        const x = e.clientX;
        const y = e.clientY;
        
        cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        follower.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });

    // Hover effect on interactive cards
    const interactiveElements = document.querySelectorAll('.feature-card, .bento-item, .bento-item-link, .nav-btn, .btn-primary, .btn-secondary, a');
    
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.style.transform += ' scale(1.5)';
            follower.style.borderColor = 'rgba(102, 126, 234, 0.8)';
        });
        
        el.addEventListener('mouseleave', () => {
            // We strip the scale but keep the position logic via the mousemove listener
            cursor.style.transform = cursor.style.transform.replace(' scale(1.5)', '');
            follower.style.borderColor = 'rgba(255,255,255,0.3)';
        });
    });
}

/**
 * Handles reveal animations on scroll
 */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                // Once it's visible, stop observing to save resources
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.feature-card, .bento-item');
    
    animatedElements.forEach(el => {
        // Initial state
        el.style.opacity = '0';
        el.style.transform = 'translateY(50px)';
        el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        
        observer.observe(el);
    });
}

// Mobile Menu Toggle - Clean working version
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navActions = document.querySelector('.nav-actions');
    
    if (!menuBtn || !navActions) {
        console.error('Mobile menu elements not found!');
        return;
    }
    
    console.log('Mobile menu initialized');
    
    menuBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Menu button clicked');
        
        // Toggle active classes
        navActions.classList.toggle('active');
        menuBtn.classList.toggle('is-active');
        
        // Toggle body scroll
        document.body.classList.toggle('menu-open');
    });
    
    // Close menu when clicking on a link
    const menuLinks = navActions.querySelectorAll('a, button');
    menuLinks.forEach(link => {
        link.addEventListener('click', function() {
            navActions.classList.remove('active');
            menuBtn.classList.remove('is-active');
            document.body.classList.remove('menu-open');
        });
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!navActions.contains(e.target) && !menuBtn.contains(e.target)) {
            navActions.classList.remove('active');
            menuBtn.classList.remove('is-active');
            document.body.classList.remove('menu-open');
        }
    });
    
    // Close menu with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            navActions.classList.remove('active');
            menuBtn.classList.remove('is-active');
            document.body.classList.remove('menu-open');
        }
    });
}

// Contact Form Submission Handler
const contactForm = document.querySelector('.contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevents page reload
        
        // Visual feedback on the button
        const submitBtn = contactForm.querySelector('button');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = "Sending...";
        submitBtn.style.opacity = "0.7";

        // Simulate a network delay
        setTimeout(() => {
            showSuccessToast();
            contactForm.reset();
            submitBtn.innerText = originalText;
            submitBtn.style.opacity = "1";
        }, 1500);
    });
}

function showSuccessToast() {
    // Create the notification element
    const toast = document.createElement('div');
    toast.className = 'glass-card success-toast';
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <span style="font-size: 1.5rem;">✅</span>
            <div>
                <h4 style="margin: 0;">Message Sent!</h4>
                <p style="margin: 0; font-size: 0.8rem; opacity: 0.7;">We'll get back to you shortly.</p>
            </div>
        </div>
    `;

    // Append to body
    document.body.appendChild(toast);

    // Fade in and then out
    setTimeout(() => toast.classList.add('show'), 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Save preference for next visit
    localStorage.setItem('theme', newTheme);
});

// Check for saved theme on load
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('collection-search');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const cards = document.querySelectorAll('.feature-card');

    // Search functionality
    searchInput?.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        cards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            card.style.display = title.includes(value) ? 'block' : 'none';
        });
    });

    // Filter functionality
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Update
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');
            cards.forEach(card => {
                const category = card.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
});

const newsletterForm = document.getElementById('newsletter-form');

newsletterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input').value;
    
    // Change the button text to show success
    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '✓ Joined';
    btn.style.background = '#4cd137'; // Success Green
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.style.background = ''; // Reset to original
        newsletterForm.reset();
    }, 3000);
});

document.addEventListener('DOMContentLoaded', () => {
    const designerForm = document.getElementById('designer-form');

    // 1. Handle Form Submission
    designerForm?.addEventListener('submit', (e) => {
        e.preventDefault();

        // Capture the submit button to show loading state
        const submitBtn = designerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;

        // Simulate a "Sending" state
        submitBtn.innerHTML = 'Sending Application...';
        submitBtn.style.opacity = '0.7';
        submitBtn.disabled = true;

        // Simulate an API delay (2 seconds)
        setTimeout(() => {
            // Success State
            submitBtn.innerHTML = '✓ Application Sent!';
            submitBtn.style.backgroundColor = '#4cd137'; // Green success color
            submitBtn.style.opacity = '1';

            // Reset the form
            designerForm.reset();

            // Optional: Revert button after 5 seconds
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.style.backgroundColor = '';
                submitBtn.disabled = false;
            }, 5000);
        }, 2000);
    });

    // 2. Ensure Theme Toggle works on this page
    const themeToggle = document.querySelector('.theme-toggle-btn');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const designerForm = document.getElementById('designer-form');
    const modal = document.getElementById('success-modal');
    const closeBtn = document.getElementById('close-modal');

    designerForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const submitBtn = designerForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = 'Sending...';
        submitBtn.disabled = true;

        // Simulate API call
        setTimeout(() => {
            // 1. This triggers your custom modal
            modal.classList.add('active');
            
            // 2. Clear the form so it's fresh for next time
            designerForm.reset();
            
            // 3. Put the button back to normal
            submitBtn.innerHTML = 'Submit Application';
            submitBtn.disabled = false;
        }, 1500);
    });

    // Close Modal Logic
    closeBtn?.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // Close if clicking outside the card
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Add this inside your existing DOMContentLoaded listener
const initDetailsPage = () => {
    const previewImg = document.querySelector('.item-preview-card img');
    
    if (previewImg) {
        // Parallax effect on scroll
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            previewImg.style.transform = `translateY(${scrolled * 0.1}px)`;
        });
    }

    // Refresh cursor listeners for the new page elements
    const newButtons = document.querySelectorAll('.btn-primary, .back-link');
    const cursor = document.querySelector('.cursor');

    newButtons.forEach(btn => {
        btn.addEventListener('mouseenter', () => cursor?.classList.add('active'));
        btn.addEventListener('mouseleave', () => cursor?.classList.remove('active'));
    });
};

document.addEventListener('DOMContentLoaded', initDetailsPage);

const approveBtn = document.getElementById('approve-btn');
const walletOverlay = document.getElementById('wallet-overlay');
const text = document.getElementById('percent');

if (approveBtn && walletOverlay && text) {
    approveBtn.addEventListener('click', () => {
        // 1. Hide the Wallet UI
        walletOverlay.style.opacity = '0';
        setTimeout(() => {
            walletOverlay.style.display = 'none';
            
            // 2. Start the Minting Counter
            startMinting();
        }, 500);
    });
}

function startMinting() {
    const text = document.getElementById('percent');
    if (!text) return;
    
    let count = 0;
    const interval = setInterval(() => {
        count++;
        text.innerText = count;

        if(count === 100) {
            clearInterval(interval);
            
            const statusText = document.querySelector('.status-text');
            if (statusText) {
                statusText.innerHTML = "SOLARIS CLOAK SECURED";
                statusText.classList.add('success-glow');
            }

            setTimeout(() => {
                window.location.href = "index.html";
            }, 4000);
        }
    }, 50);
}

// 1. Custom Cursor Logic (Keep this so the cursor works on all pages)
const cursor = document.querySelector('.cursor');
const follower = document.querySelector('.cursor-follower');

if (cursor && follower) {
    document.addEventListener('mousemove', (e) => {
        cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        follower.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    });
}

// 2. Preloader Logic (Keep this for the smooth entrance)
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => { preloader.style.display = 'none'; }, 500);
    }
});

// Add this to your script.js
function initQuoteSlider() {
    const quotes = document.querySelectorAll('.quote');
    const dots = document.querySelectorAll('.dot');
    let currentSlide = 0;
    
    if (!quotes.length || !dots.length) return;
    
    function showSlide(index) {
        // Hide all quotes
        quotes.forEach(quote => quote.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        // Show current quote
        quotes[index].classList.add('active');
        dots[index].classList.add('active');
        
        currentSlide = index;
    }
    
    // Auto-rotate quotes every 5 seconds
    let slideInterval = setInterval(() => {
        let nextSlide = (currentSlide + 1) % quotes.length;
        showSlide(nextSlide);
    }, 5000);
    
    // Dot click handlers
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            clearInterval(slideInterval);
            showSlide(index);
            
            // Restart auto-rotate after manual click
            slideInterval = setInterval(() => {
                let nextSlide = (currentSlide + 1) % quotes.length;
                showSlide(nextSlide);
            }, 5000);
        });
    });
    
    // Pause auto-rotate on hover
    const slider = document.querySelector('.quote-slider');
    if (slider) {
        slider.addEventListener('mouseenter', () => {
            clearInterval(slideInterval);
        });
        
        slider.addEventListener('mouseleave', () => {
            slideInterval = setInterval(() => {
                let nextSlide = (currentSlide + 1) % quotes.length;
                showSlide(nextSlide);
            }, 5000);
        });
    }
}

// Call this in DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initQuoteSlider();
});

// AR Page specific functions
function initARPage() {
    // Check if we're on AR page
    if (!document.querySelector('.ar-page')) return;
    
    console.log('AR Page initialized');
    
    // Add specific AR page functionality here
    // This function is called from DOMContentLoaded
}

// Call this in your existing DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // ... your existing initialization code
    
    // Add AR page initialization
    initARPage();
});

// Utility function to check camera support
function checkCameraSupport() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Add camera permission check to your existing theme toggle or somewhere visible
if (checkCameraSupport()) {
    console.log('Camera API supported');
} else {
    console.warn('Camera API not supported on this device');
}


// Community Page Functions
function initCommunityPage() {
    // Check if we're on community page
    if (!document.querySelector('.community-page')) return;
    
    console.log('Community page initialized');
    
    // Add community-specific functionality here
    // The main community functionality is already in the inline script
    // This function is for any additional global community features
}

// Update your existing DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // ... your existing initialization code
    
    // Add community page initialization
    initCommunityPage();
});