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

// Load footer and inject into the page with adjusted links
fetch(footerBasePath + 'footer.html')
  .then(response => response.text())
  .then(html => {
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
      // Adjust all relative links by prepending the base path
      const adjustedHtml = html.replace(/href="(?!http|#|\.\.\/)/g, 'href="' + footerBasePath);
      footerContainer.innerHTML = adjustedHtml;
    } else {
      console.error('Footer container not found. Add <div id="footer-container"></div> to your HTML.');
    }
  })
  .catch(error => console.error('Error loading footer:', error));
