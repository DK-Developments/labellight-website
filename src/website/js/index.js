// Index page - Landing page interactivity

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
