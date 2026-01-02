/**
 * Footer Component Loader
 * Dynamically loads the footer HTML into pages for consistent footer across the application.
 * 
 * @author Eprouvez
 * @version 1.0.0
 * 
 * USAGE EXAMPLE:
 * 
 * <!-- In HTML file -->
 * <div id="footer-container"></div>
 * <script src="js/footer.js"></script>
 * 
 */

// Determine the base path based on current page location
const footerBasePath = window.location.pathname.includes('/docs/') ? '../' : '';
const footerIsInDocs = window.location.pathname.includes('/docs/');

// Load footer and inject into the page
fetch(footerBasePath + 'footer.html')
  .then(response => response.text())
  .then(html => {
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
      footerContainer.innerHTML = html;
      fixFooterLinks();
    } else {
      console.error('Footer container not found. Add <div id="footer-container"></div> to your HTML.');
    }
  })
  .catch(error => console.error('Error loading footer:', error));

// Fix footer links based on current page location
function fixFooterLinks() {
  if (footerIsInDocs) {
    // When in docs folder, adjust relative links
    const footerLinks = document.querySelectorAll('.footer a');
    footerLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === 'docs/index.html') {
        // Already in docs, just go to index.html
        link.setAttribute('href', 'index.html');
      } else if (href && !href.startsWith('../') && !href.startsWith('http') && !href.startsWith('#')) {
        // Add ../ prefix for links to root-level pages
        link.setAttribute('href', '../' + href);
      }
    });
  }
}
