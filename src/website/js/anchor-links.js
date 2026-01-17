/**
 * Anchor Links - Adds copy-to-clipboard anchor links to documentation headings
 * 
 * Automatically adds link icons to all h2, h3, and h4 elements with IDs,
 * allowing users to easily copy direct links to sections.
 * 
 * @author Kahn Wynyard
 * @version 1.0.0
 * 
 * USAGE EXAMPLE:
 * 
 * // Include this script at the bottom of documentation pages
 * <script src="../js/anchor-links.js"></script>
 * 
 * // The script automatically runs on page load
 */

(function() {
  'use strict';

  /**
   * SVG icon for the link/chain symbol
   */
  var linkIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>';

  /**
   * Creates an anchor link element
   * @param {string} id - The ID to link to
   * @returns {HTMLElement} The anchor link element
   */
  function createAnchorLink(id) {
    var anchor = document.createElement('a');
    anchor.className = 'anchor-link';
    anchor.href = '#' + id;
    anchor.innerHTML = linkIcon;
    anchor.setAttribute('aria-label', 'Copy link to this section');
    anchor.setAttribute('title', 'Copy link to section');
    
    // Handle click event
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      var url = window.location.href.split('#')[0] + '#' + id;
      
      // Try to use the modern Clipboard API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function() {
          showCopyFeedback(anchor);
        }).catch(function() {
          // Fallback to older method
          copyToClipboardFallback(url, anchor);
        });
      } else {
        // Fallback for older browsers
        copyToClipboardFallback(url, anchor);
      }
      
      // Update URL without scrolling
      history.pushState(null, null, '#' + id);
    });
    
    return anchor;
  }

  /**
   * Fallback method for copying to clipboard
   * @param {string} text - The text to copy
   * @param {HTMLElement} anchor - The anchor element for feedback
   */
  function copyToClipboardFallback(text, anchor) {
    var textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      var successful = document.execCommand('copy');
      if (successful) {
        showCopyFeedback(anchor);
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
    
    document.body.removeChild(textArea);
  }

  /**
   * Shows visual feedback that the link was copied
   * @param {HTMLElement} anchor - The anchor element
   */
  function showCopyFeedback(anchor) {
    var originalTitle = anchor.getAttribute('title');
    anchor.setAttribute('title', 'Link copied!');
    anchor.style.color = '#0d652d';
    
    setTimeout(function() {
      anchor.setAttribute('title', originalTitle);
      anchor.style.color = '';
    }, 2000);
  }

  /**
   * Converts text to a URL-friendly slug
   * @param {string} text - The text to convert
   * @returns {string} The slugified text
   */
  function slugify(text) {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')        // Replace spaces with -
      .replace(/[^\w\-]+/g, '')    // Remove all non-word chars except hyphens
      .replace(/\-\-+/g, '-')      // Replace multiple - with single -
      .replace(/^-+/, '')          // Trim - from start of text
      .replace(/-+$/, '');         // Trim - from end of text
  }

  /**
   * Generates a unique ID for an element
   * @param {string} baseId - The base ID
   * @param {Set} existingIds - Set of existing IDs
   * @returns {string} A unique ID
   */
  function generateUniqueId(baseId, existingIds) {
    var id = baseId;
    var counter = 1;
    
    while (existingIds.has(id)) {
      id = baseId + '-' + counter;
      counter++;
    }
    
    existingIds.add(id);
    return id;
  }

  /**
   * Adds IDs to headings and sections that don't have them
   */
  function ensureHeadingsHaveIds() {
    var existingIds = new Set();
    
    // Collect existing IDs
    var allElements = document.querySelectorAll('[id]');
    for (var i = 0; i < allElements.length; i++) {
      existingIds.add(allElements[i].getAttribute('id'));
    }
    
    // Add IDs to sections without them
    var sections = document.querySelectorAll('.docs-section');
    for (var j = 0; j < sections.length; j++) {
      var section = sections[j];
      if (!section.getAttribute('id')) {
        // Find the first h2 in this section
        var h2 = section.querySelector('h2');
        if (h2) {
          var baseId = slugify(h2.textContent);
          var uniqueId = generateUniqueId(baseId, existingIds);
          section.setAttribute('id', uniqueId);
          console.log('[Anchor Links] Auto-generated ID for section: ' + uniqueId);
        }
      }
    }
    
    // Add IDs to headings without them
    var allHeadings = document.querySelectorAll('h2, h3, h4');
    for (var k = 0; k < allHeadings.length; k++) {
      var heading = allHeadings[k];
      if (!heading.getAttribute('id')) {
        var baseId = slugify(heading.textContent);
        var uniqueId = generateUniqueId(baseId, existingIds);
        heading.setAttribute('id', uniqueId);
        console.log('[Anchor Links] Auto-generated ID for heading: ' + uniqueId);
      }
    }
  }

  /**
   * Adds anchor links to all headings with IDs
   */
  function addAnchorLinks() {
    // Find headings with IDs directly
    var headings = document.querySelectorAll('h2[id], h3[id], h4[id]');
    
    // Also find sections with IDs that contain h2 elements
    var sections = document.querySelectorAll('section[id], .docs-section[id]');
    
    console.log('[Anchor Links] Found ' + headings.length + ' headings with IDs');
    console.log('[Anchor Links] Found ' + sections.length + ' sections with IDs');
    
    // Add anchors to headings with IDs
    for (var i = 0; i < headings.length; i++) {
      var heading = headings[i];
      var id = heading.getAttribute('id');
      
      if (id) {
        var anchor = createAnchorLink(id);
        heading.appendChild(anchor);
        console.log('[Anchor Links] Added anchor to heading: ' + id);
      }
    }
    
    // Add anchors to h2/h3/h4 inside sections with IDs
    for (var j = 0; j < sections.length; j++) {
      var section = sections[j];
      var id = section.getAttribute('id');
      
      if (id) {
        // Find the first h2, h3, or h4 in this section
        var sectionHeading = section.querySelector('h2, h3, h4');
        
        if (sectionHeading && !sectionHeading.querySelector('.anchor-link')) {
          var anchor = createAnchorLink(id);
          sectionHeading.appendChild(anchor);
          console.log('[Anchor Links] Added anchor to section heading: ' + id);
        }
      }
    }
  }

  /**
   * Initialize anchor links when DOM is ready
   */
  function init() {
    // First ensure all headings have IDs
    ensureHeadingsHaveIds();
    // Then add anchor links to them
    addAnchorLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
