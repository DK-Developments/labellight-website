// Index page - Handle OAuth callback and landing page interactivity

// Handle OAuth callback (tokens in URL)
if (auth.parseTokensFromUrl()) {
  // New login - check if user needs onboarding
  auth.handlePostLoginRedirect();
}
// Otherwise, user stays on the home page (navbar shows login/logout based on auth state)

// ========================================
// Landing Page Interactivity
// ========================================

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
  
  // FAQ Accordion functionality
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    
    question.addEventListener('click', function() {
      // Toggle active state on clicked item
      const isActive = item.classList.contains('active');
      
      // Close all FAQ items
      faqItems.forEach(faq => faq.classList.remove('active'));
      
      // If item wasn't active, open it
      if (!isActive) {
        item.classList.add('active');
      }
      
      // Send event to Google Analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'faq_interaction', {
          'event_category': 'engagement',
          'event_label': question.textContent.trim(),
          'action': isActive ? 'close' : 'open'
        });
      }
    });
  });

  // Smooth scroll for "See How It Works" button
  const seeHowButton = document.getElementById('see-how-it-works');
  
  if (seeHowButton) {
    seeHowButton.addEventListener('click', function() {
      const targetSection = document.getElementById('how-it-works');
      
      if (targetSection) {
        targetSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
        
        // Send event to Google Analytics
        if (typeof gtag !== 'undefined') {
          gtag('event', 'cta_click', {
            'event_category': 'engagement',
            'event_label': 'See How It Works',
            'cta_location': 'hero_section'
          });
        }
      }
    });
  }

  // Track CTA button clicks (all Subscribe/Get Started buttons)
  const ctaButtons = document.querySelectorAll('.btn-primary');
  
  ctaButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      const buttonText = button.textContent.trim();
      
      // Send event to Google Analytics
      if (typeof gtag !== 'undefined') {
        const section = button.closest('section');
        const sectionClass = section ? section.className : 'unknown';
        
        gtag('event', 'cta_click', {
          'event_category': 'conversion',
          'event_label': buttonText,
          'cta_location': sectionClass
        });
      }
      
      // Allow default behavior (navigation to pricing.html)
    });
  });

  console.log('Landing page interactivity initialized');
});
