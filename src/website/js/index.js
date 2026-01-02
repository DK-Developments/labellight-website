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
      
      // Log for analytics (placeholder for future implementation)
      console.log('FAQ clicked:', question.textContent.trim());
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
        
        // Log for analytics (placeholder for future implementation)
        console.log('CTA clicked: See How It Works');
      }
    });
  }

  // Track CTA button clicks (all Subscribe/Get Started buttons)
  const ctaButtons = document.querySelectorAll('.btn-primary');
  
  ctaButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      // Log for analytics (placeholder for future implementation)
      const buttonText = button.textContent.trim();
      console.log('CTA clicked:', buttonText);
      
      // Allow default behavior (navigation to pricing.html)
      // In future, could add tracking pixel or analytics call here
    });
  });

  console.log('Landing page interactivity initialized');
});
