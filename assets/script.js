
// ===== ENHANCED RESPONSIVE BLOG MANAGER =====

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const categoryList = document.getElementById("categoryList");
  const postContent = document.getElementById("postContent");
  const searchInput = document.getElementById("searchInput");
  const tocList = document.getElementById("tocList");
  const mobileTocList = document.getElementById("mobileTocList");
  const mobileTOCFab = document.getElementById("mobileTOCFab");
  const sidebarNav = document.getElementById("sidebarNav"); // Updated from sidebarOffcanvas
  const mobileTOCModal = document.getElementById("mobileTOCModal");
  const desktopMenuToggle = document.getElementById("desktopMenuToggle");
  const floatingSidebarToggle = document.getElementById("floatingSidebarToggle");
  const layoutContainer = document.querySelector('.layout-container');

  // Verify critical elements exist
  console.log('🔍 Checking DOM elements...');
  console.log('categoryList:', categoryList);
  console.log('postContent:', postContent);
  console.log('searchInput:', searchInput);
  
  if (!categoryList) {
    console.error('❌ Critical error: categoryList element not found');
    return;
  }
  
  if (!postContent) {
    console.error('❌ Critical error: postContent element not found');
    return;
  }
  
  console.log('✅ All critical DOM elements found');

  // State Management
  let postsByCategory = {};
  let allPosts = [];
  let currentBreakpoint = getCurrentBreakpoint();
  let searchTimeout = null;
  let scrollTimeout = null;
  let resizeTimeout = null;

  // Utility Functions
  function getCurrentBreakpoint() {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 992) return 'tablet';
    if (width < 1200) return 'desktop';
    return 'large';
  }

  function debounce(func, wait) {
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(resizeTimeout);
        func(...args);
      };
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(later, wait);
    };
  }

  function throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Responsive Layout Manager
  class ResponsiveLayoutManager {
    constructor() {
      this.breakpoints = {
        mobile: 0,
        tablet: 768,
        desktop: 992,
        large: 1200
      };
      this.init();
    }

    init() {
      this.initEventListeners();
      this.initTouchGestures();
      this.initScrollBehavior();
      this.updateLayout();
    }

    initEventListeners() {
      // Resize handling with debouncing
      window.addEventListener('resize', debounce(() => {
        const newBreakpoint = getCurrentBreakpoint();
        if (newBreakpoint !== currentBreakpoint) {
          currentBreakpoint = newBreakpoint;
          this.updateLayout();
        }
      }, 150));

      // Sidebar event handling - no longer needed for offcanvas
      // Mobile sidebar is always visible, no offcanvas behavior

      // Desktop sidebar toggle functionality
      const toggleSidebar = () => {
        console.log('🖥️ Desktop sidebar toggle clicked');
        layoutContainer.classList.toggle('sidebar-collapsed');
        
        // Update button icon based on state
        const icon = desktopMenuToggle?.querySelector('i');
        if (layoutContainer.classList.contains('sidebar-collapsed')) {
          if (icon) icon.className = 'bi bi-arrow-right fs-5';
          if (desktopMenuToggle) desktopMenuToggle.setAttribute('aria-label', 'Show sidebar');
        } else {
          if (icon) icon.className = 'bi bi-list fs-5';
          if (desktopMenuToggle) desktopMenuToggle.setAttribute('aria-label', 'Hide sidebar');
        }
        
        // Force layout recalculation to ensure proper content expansion
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 350); // After transition completes
      };

      // Desktop sidebar toggle (inside sidebar)
      if (desktopMenuToggle && layoutContainer) {
        desktopMenuToggle.addEventListener('click', toggleSidebar);
      }

      // Floating sidebar toggle (always visible when collapsed)
      if (floatingSidebarToggle && layoutContainer) {
        floatingSidebarToggle.addEventListener('click', toggleSidebar);
      }

      // Category list click handling (delegated event listener)
      if (categoryList) {
        categoryList.addEventListener('click', (e) => {
          console.log('🖱️ Category list clicked:', e.target);
          
          // Find the topic card (could be the clicked element or a parent)
          let topicCard = e.target;
          if (!topicCard.classList.contains('topic-card')) {
            topicCard = e.target.closest('.topic-card');
          }
          
          if (topicCard && topicCard.classList.contains('topic-card')) {
            e.preventDefault();
            const postPath = topicCard.dataset.path;
            const postTitle = topicCard.dataset.title;
            
            console.log('🖱️ Topic card clicked:', { postPath, postTitle });
            
            if (postPath && postTitle) {
              // Update active state
              document.querySelectorAll('.topic-card').forEach(card => {
                card.classList.remove('active');
              });
              topicCard.classList.add('active');
              
              this.loadPost(postPath, postTitle);
              
              // No need to auto-close sidebar on mobile - content shows in overlay
              console.log('📱 Mobile: Content will show in full-screen overlay');
            } else {
              console.warn('⚠️ Missing post data:', { postPath, postTitle });
            }
          }
        });
      }

      // Mobile TOC handling
      if (mobileTocList) {
        mobileTocList.addEventListener('click', (e) => {
          console.log('📱 Mobile TOC clicked:', e.target);
          
          if (e.target.tagName === 'A') {
            e.preventDefault();
            const targetId = e.target.getAttribute('href').substring(1);
            console.log('🎯 Mobile target ID:', targetId);
            
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
              this.scrollToElement(targetElement);
              const modal = bootstrap.Modal.getInstance(mobileTOCModal);
              if (modal) modal.hide();
            } else {
              console.error('❌ Mobile TOC: Target element not found for ID:', targetId);
              
              // Try to find by text content as fallback
              const linkText = e.target.textContent.trim();
              const allHeaders = postContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
              const matchingHeader = Array.from(allHeaders).find(h => 
                h.textContent.trim() === linkText
              );
              
              if (matchingHeader) {
                console.log('🎆 Mobile: Found matching header by text!');
                if (!matchingHeader.id) {
                  const newId = this.createHeadingId(matchingHeader.textContent, Array.from(allHeaders).indexOf(matchingHeader));
                  matchingHeader.id = newId;
                }
                this.scrollToElement(matchingHeader);
                const modal = bootstrap.Modal.getInstance(mobileTOCModal);
                if (modal) modal.hide();
              }
            }
          }
        });
      }

      // Desktop TOC handling
      if (tocList) {
        console.log('🔧 Setting up desktop TOC event listener');
        
        tocList.addEventListener('click', (e) => {
          const sidebarCollapsed = layoutContainer.classList.contains('sidebar-collapsed');
          console.log('🖇 Desktop TOC clicked:', {
            target: e.target.tagName,
            sidebarCollapsed: sidebarCollapsed,
            currentBreakpoint: currentBreakpoint,
            tocListVisible: tocList.offsetParent !== null,
            tocListBounds: tocList.getBoundingClientRect(),
            layoutContainerClass: layoutContainer.className
          });
          
          if (e.target.tagName === 'A') {
            e.preventDefault();
            e.stopPropagation();
            
            const targetId = e.target.getAttribute('href').substring(1);
            console.log('🎯 Target ID from TOC link:', targetId);
            
            const targetElement = document.getElementById(targetId);
            console.log('📋 Target element found:', targetElement);
            
            if (targetElement) {
              console.log('✅ Attempting scroll - Layout state:', {
                sidebarCollapsed: sidebarCollapsed,
                targetId: targetElement.id,
                targetTagName: targetElement.tagName,
                targetText: targetElement.textContent.trim().substring(0, 30)
              });
              this.scrollToElement(targetElement);
            } else {
              console.error('❌ Target element not found! Available IDs:', 
                Array.from(document.querySelectorAll('[id]')).map(el => el.id)
              );
              
              // Try alternative search methods
              const allHeaders = postContent.querySelectorAll('h1, h2, h3, h4, h5, h6');
              console.log('🔍 Available headers:', 
                Array.from(allHeaders).map((h, i) => ({ 
                  index: i, 
                  id: h.id || 'NO-ID', 
                  tag: h.tagName, 
                  text: h.textContent.trim().substring(0, 30) 
                }))
              );
              
              // Try to find by text content
              const linkText = e.target.textContent.trim();
              const matchingHeader = Array.from(allHeaders).find(h => 
                h.textContent.trim() === linkText
              );
              
              if (matchingHeader) {
                console.log('🎆 Found matching header by text content!');
                // Assign an ID if it doesn't have one
                if (!matchingHeader.id) {
                  const newId = this.createHeadingId(matchingHeader.textContent, Array.from(allHeaders).indexOf(matchingHeader));
                  matchingHeader.id = newId;
                  console.log('🆔 Assigned new ID to header:', newId);
                }
                this.scrollToElement(matchingHeader);
              } else {
                console.error('❌ Could not find matching header for:', linkText);
              }
            }
          } else {
            console.log('⚠️ Clicked element is not a link:', e.target);
          }
        });
        
        // Add debugging for mouse events
        tocList.addEventListener('mousedown', (e) => {
          console.log('🖱️ TOC mousedown:', {
            target: e.target.tagName,
            sidebarCollapsed: layoutContainer.classList.contains('sidebar-collapsed')
          });
        });
        
        tocList.addEventListener('mouseup', (e) => {
          console.log('🖱️ TOC mouseup:', {
            target: e.target.tagName,
            sidebarCollapsed: layoutContainer.classList.contains('sidebar-collapsed')
          });
        });
      }
    }

    initTouchGestures() {
      // Touch gestures removed - mobile sidebar is now always visible
      // No need for swipe-to-open functionality
      console.log('📱 Touch gestures disabled - mobile sidebar is directly accessible');
    }

    initScrollBehavior() {
      document.addEventListener('scroll', throttle(() => {
        this.updateTOCHighlight();
      }, 16));
    }

    updateLayout() {
      this.updateTOCVisibility();
      this.updateSearchBehavior();
    }

    updateTOCVisibility() {
      if (!mobileTOCFab) return;
      const hasContent = tocList && tocList.children.length > 0;
      const isMobile = currentBreakpoint === 'mobile' || currentBreakpoint === 'tablet';
      
      if (isMobile && hasContent) {
        mobileTOCFab.style.display = 'flex';
      } else {
        mobileTOCFab.style.display = 'none';
      }
    }

    updateSearchBehavior() {
      if (searchInput && searchInput.value.trim()) {
        this.clearSearch();
      }
    }

    updateTOCHighlight() {
      const sections = postContent.querySelectorAll("h1, h2, h3, h4, h5, h6");
      if (sections.length === 0) {
        console.log('🔍 No headers found for TOC highlighting');
        return;
      }

      // Calculate offset based on layout
      const mobileHeaderHeight = 56;
      const desktopOffset = 100; // Increased for better accuracy
      const offset = currentBreakpoint === 'mobile' ? mobileHeaderHeight + 50 : desktopOffset;
      
      const scrollPosition = window.scrollY + offset;
      const allTocLinks = document.querySelectorAll('#tocList a, #mobileTocList a');
      allTocLinks.forEach(link => link.classList.remove('active'));

      let currentSection = null;
      
      // Find the current section more accurately
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const sectionTop = section.offsetTop;
        const sectionBottom = i < sections.length - 1 ? sections[i + 1].offsetTop : document.body.scrollHeight;
        
        // Check if current scroll position is within this section
        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
          currentSection = section;
          break;
        }
        
        // Fallback: if we're past all sections, highlight the last one
        if (scrollPosition >= sectionTop) {
          currentSection = section;
        }
      }
      
      // Special case: if we're at the very bottom of the document, highlight the last section
      const isAtBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 10);
      const isAtTop = window.scrollY <= 50;
      
      if (isAtBottom && sections.length > 0) {
        currentSection = sections[sections.length - 1];
      } else if (isAtTop && sections.length > 0) {
        // If we're at the top, don't highlight any TOC item
        currentSection = null;
      }

      if (currentSection && currentSection.id) {
        const currentLinks = document.querySelectorAll(
          `#tocList a[href="#${currentSection.id}"], #mobileTocList a[href="#${currentSection.id}"]`
        );
        currentLinks.forEach(link => link.classList.add('active'));
        
        console.log('\ud83d\udccd TOC highlight updated:', {
          sectionId: currentSection.id,
          sectionText: currentSection.textContent.trim().substring(0, 50),
          scrollPosition: window.scrollY,
          linksFound: currentLinks.length
        });
      } else if (currentSection) {
        console.warn('⚠️ Current section has no ID:', {
          tagName: currentSection.tagName,
          text: currentSection.textContent.trim().substring(0, 50)
        });
      }
    }

    loadPost(path, title) {
      console.log('📖 Loading post:', { path, title, currentBreakpoint });
      
      if (!path || !title) {
        console.error('❌ Invalid post data:', { path, title });
        this.showContentError(new Error('Invalid post data: missing path or title'));
        return;
      }
      
      // Handle mobile vs desktop content loading
      if (currentBreakpoint === 'mobile') {
        this.loadMobileContent(path, title);
      } else {
        this.loadDesktopContent(path, title);
      }
    }
    
    loadMobileContent(path, title) {
      console.log('📱 Loading mobile content:', { path, title });
      
      const mobileContentArea = document.getElementById('mobileContent');
      const mobilePostContent = document.getElementById('mobilePostContent');
      const mobileContentTitle = document.getElementById('mobileContentTitle');
      const mobileBackButton = document.getElementById('mobileBackButton');
      const mobileBottomBackButton = document.getElementById('mobileBottomBackButton');
      const mobileTopicsSection = document.getElementById('mobileTopicsSection');
      
      if (!mobileContentArea || !mobilePostContent) {
        console.error('❌ Mobile content elements not found');
        return;
      }
      
      // Show mobile content area
      mobileContentArea.style.display = 'flex';
      
      // Auto-scroll to top immediately when mobile content is shown
      this.scrollMobileContentToTop();
      
      // Set title
      if (mobileContentTitle) {
        mobileContentTitle.textContent = title;
      }
      
      // Setup back button functionality (both top and bottom)
      const backToTopics = () => {
        console.log('📱 Mobile back button clicked');
        mobileContentArea.style.display = 'none';
        window.scrollTo(0, 0);
      };
      
      // Bind both back buttons
      if (mobileBackButton) {
        mobileBackButton.onclick = backToTopics;
      }
      
      if (mobileBottomBackButton) {
        mobileBottomBackButton.onclick = backToTopics;
      }
      
      // Show loading in mobile content area
      mobilePostContent.innerHTML = `
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3 text-muted">Loading article...</p>
        </div>
      `;
      
      // Load article content
      this.fetchAndRenderContent(path, title, mobilePostContent);
    }
    

    
    loadDesktopContent(path, title) {
      console.log('🖥️ Loading desktop content:', { path, title });
      
      // Show loading spinner
      postContent.innerHTML = `
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3 text-muted">Loading article...</p>
        </div>
      `;
      
      this.fetchAndRenderContent(path, title, postContent);
    }
    
    fetchAndRenderContent(path, title, contentElement) {
      console.log('🌐 Fetching content for:', { path, title });
      
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('❌ Request timeout for:', path);
      }, 10000); // 10 second timeout

      fetch(path, { signal: controller.signal })
        .then(res => {
          clearTimeout(timeoutId);
          console.log('🌐 Fetch response:', { status: res.status, ok: res.ok, url: res.url });
          
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText} for ${path}`);
          }
          return res.text();
        })
        .then(markdown => {
          console.log('📝 Markdown loaded, length:', markdown.length);
          
          if (!markdown || markdown.trim().length === 0) {
            throw new Error('Empty or invalid markdown content');
          }
          
          try {
            console.log('🔄 Configuring marked.js for proper heading ID generation...');
            
            // Configure marked.js to generate heading IDs
            if (typeof marked !== 'undefined' && marked.setOptions) {
              marked.setOptions({
                headerIds: true,
                headerPrefix: '',
                gfm: true,
                breaks: true
              });
            }
            
            const htmlContent = marked.parse(markdown);
            console.log('✅ Markdown parsed successfully');
            console.log('🔍 HTML content length:', htmlContent.length);
            
            contentElement.innerHTML = `
              <article class="markdown-body">
                <h1 class="display-4 fw-bold text-primary mb-4">${title}</h1>
                <div class="content-body">${htmlContent}</div>
              </article>
            `;
            
            // Wait a bit for DOM to settle, then generate TOC (only for desktop)
            setTimeout(() => {
              if (currentBreakpoint !== 'mobile') {
                console.log('🔄 Regenerating TOC after content load...');
                
                // Debug: Check what headings exist in the DOM
                const allHeadings = contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6');
                console.log('🔍 Found headings after markdown parsing:', 
                  Array.from(allHeadings).map((h, i) => ({
                    index: i,
                    tagName: h.tagName,
                    id: h.id || 'NO-ID',
                    textContent: h.textContent.trim(),
                    innerHTML: h.innerHTML.trim()
                  }))
                );
                
                this.generateTOC();
                
                // Force a TOC highlight update
                setTimeout(() => {
                  this.updateTOCHighlight();
                }, 50);
              }
            }, 100);
            
            // Scroll to top (mobile content area or window)
            if (currentBreakpoint === 'mobile') {
              const mobileContentArea = document.getElementById('mobileContent');
              if (mobileContentArea) {
                mobileContentArea.scrollTop = 0;
              }
            } else {
              this.scrollToTop();
            }
            
            document.title = `${title} - AD Tech Blog`;
            console.log('✅ Post loaded successfully:', title);
            
          } catch (parseError) {
            console.error('❌ Markdown parsing error:', parseError);
            throw new Error('Failed to parse markdown content');
          }
        })
        .catch(err => {
          clearTimeout(timeoutId);
          console.error('❌ Error loading post:', err);
          this.showContentError(err, () => this.fetchAndRenderContent(path, title, contentElement));
        });
    }
    
    showContentError(error, retryCallback = null) {
      console.log('🚨 Showing content error:', error.message);
      
      const retryButton = retryCallback ? `
        <button class="btn btn-outline-danger me-2" onclick="(${retryCallback.toString()})()">  
          <i class="bi bi-arrow-repeat me-2"></i>Try Again
        </button>
      ` : '';
      
      postContent.innerHTML = `
        <div class="alert alert-danger m-4" role="alert">
          <div class="d-flex align-items-center mb-3">
            <i class="bi bi-exclamation-triangle-fill text-danger me-2 fs-4"></i>
            <h4 class="alert-heading mb-0">Content Loading Error</h4>
          </div>
          <p class="mb-3">${error.message}</p>
          <div class="d-flex gap-2">
            <button class="btn btn-danger" onclick="location.reload()">
              <i class="bi bi-arrow-clockwise me-2"></i>Reload Page
            </button>
            ${retryButton}
          </div>
        </div>
      `;
    }

    generateTOC() {
      console.log('🔧 Generating TOC...');
      if (!tocList) {
        console.warn('⚠️ TOC list element not found');
        return;
      }
      
      tocList.innerHTML = "";
      if (mobileTocList) mobileTocList.innerHTML = "";
      
      const headers = postContent.querySelectorAll("h1, h2, h3, h4, h5, h6");
      console.log(`📋 Found ${headers.length} headers for TOC:`);
      
      headers.forEach((header, index) => {
        let id;
        
        // Check if header already has an ID (from markdown parser like marked.js)
        if (header.id && header.id.trim() !== '') {
          id = header.id;
          console.log(`📌 Using existing header ID: "${id}" for "${header.textContent.trim()}"`);
        } else {
          // Create a meaningful ID from the header text
          id = this.createHeadingId(header.textContent, index);
          header.id = id;
          console.log(`🆔 Assigned new header ID: "${id}" for "${header.textContent.trim()}"`);
        }
        
        const level = parseInt(header.tagName.substring(1));
        const indent = level > 2 ? 'ms-3' : '';
        
        const tocItem = this.createTOCItem(header.textContent, id, indent);
        tocList.appendChild(tocItem);
        
        if (mobileTocList) {
          const mobileTocItem = this.createTOCItem(header.textContent, id, indent);
          mobileTocList.appendChild(mobileTocItem);
        }
        
        console.log(`🔗 TOC item created:`, {
          text: header.textContent.trim().substring(0, 40) + '...',
          id: id,
          href: `#${id}`,
          level: level
        });
      });
      
      console.log(`✅ TOC generated with ${headers.length} items`);
      
      // Verify all TOC links have valid targets
      const tocLinks = tocList.querySelectorAll('a[href^="#"]');
      tocLinks.forEach(link => {
        const targetId = link.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);
        if (!targetElement) {
          console.error(`❌ TOC link has no target: ${link.textContent} -> #${targetId}`);
        } else {
          console.log(`✅ TOC link verified: ${link.textContent.substring(0, 30)}... -> #${targetId}`);
        }
      });
      
      this.updateTOCVisibility();
    }

    createHeadingId(text, index) {
      console.log(`🆔 Creating ID for text: "${text}"`);
      
      // Clean the text to create a URL-friendly ID
      let id = text
        .toLowerCase()
        .trim()
        // Handle numbered lists like "6) Rebuild topology"
        .replace(/^\d+\)\s*/, '') // Remove leading numbers with parenthesis
        .replace(/^\d+\.\s*/, '') // Remove leading numbers with period
        .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
        .substring(0, 50); // Limit length
      
      console.log(`🔧 Cleaned text for ID: "${id}"`);
      
      // If the ID is empty or too short, use a fallback
      if (!id || id.length < 2) {
        id = `heading-${index}`;
        console.log(`⚠️ Using fallback ID: "${id}"`);
      }
      
      // Ensure uniqueness by checking if ID already exists
      let finalId = id;
      let counter = 1;
      while (document.getElementById(finalId)) {
        finalId = `${id}-${counter}`;
        counter++;
        console.log(`🔄 ID conflict, trying: "${finalId}"`);
      }
      
      console.log(`✅ Final ID created: "${finalId}"`);
      return finalId;
    }

    createTOCItem(text, id, className = '') {
      const link = document.createElement('a');
      link.href = `#${id}`;
      link.textContent = text;
      link.className = className;
      return link;
    }

    scrollToElement(element) {
      if (!element) {
        console.error('❌ scrollToElement: No element provided');
        return;
      }
      
      const sidebarCollapsed = layoutContainer.classList.contains('sidebar-collapsed');
      console.log(`🎯 Starting scroll to element - Layout state:`, {
        id: element.id,
        tagName: element.tagName,
        textContent: element.textContent.trim().substring(0, 50) + '...',
        sidebarCollapsed: sidebarCollapsed,
        currentBreakpoint: currentBreakpoint,
        layoutClasses: layoutContainer.className,
        contentAreaVisible: document.querySelector('.content-area')?.offsetParent !== null,
        elementVisible: element.offsetParent !== null,
        elementBounds: element.getBoundingClientRect()
      });
      
      // Calculate precise offsets based on layout and device
      const isMobile = currentBreakpoint === 'mobile';
      const isTablet = currentBreakpoint === 'tablet';
      
      let offset;
      if (isMobile) {
        offset = 70; // Mobile header + some padding
      } else if (isTablet) {
        offset = 60; // Tablet offset
      } else {
        offset = 40; // Desktop offset
      }
      
      // Get precise element position
      const elementRect = element.getBoundingClientRect();
      const elementTop = window.scrollY + elementRect.top;
      
      console.log(`📏 Element position info:`, {
        elementRect: {
          top: elementRect.top,
          bottom: elementRect.bottom,
          height: elementRect.height,
          left: elementRect.left,
          right: elementRect.right,
          width: elementRect.width
        },
        currentScrollY: window.scrollY,
        elementTop: elementTop,
        offset: offset,
        sidebarCollapsed: sidebarCollapsed
      });
      
      // Calculate target scroll position
      let targetScrollPosition = elementTop - offset;
      
      // Get document boundaries to prevent over-scrolling
      const documentHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
      const viewportHeight = window.innerHeight;
      const maxScrollPosition = Math.max(0, documentHeight - viewportHeight);
      
      // Clamp the target position within valid bounds
      targetScrollPosition = Math.min(targetScrollPosition, maxScrollPosition);
      targetScrollPosition = Math.max(0, targetScrollPosition);
      
      console.log(`🎢 Scroll calculation:`, {
        documentHeight,
        viewportHeight,
        maxScrollPosition,
        targetScrollPosition,
        willScroll: Math.abs(window.scrollY - targetScrollPosition) > 5,
        sidebarCollapsed: sidebarCollapsed,
        documentScrollingElement: document.scrollingElement,
        bodyScrollHeight: document.body.scrollHeight,
        htmlScrollHeight: document.documentElement.scrollHeight
      });
      
      // Only scroll if there's a meaningful difference
      if (Math.abs(window.scrollY - targetScrollPosition) <= 5) {
        console.log('🚫 Already at target position, skipping scroll');
        this.highlightTargetElement(element);
        return;
      }
      
      // Determine the correct scroll container
      let scrollContainer = window;
      let scrollElement = document.scrollingElement || document.documentElement;
      
      // Check if we're in a layout where content area might be the scroll container
      const contentArea = document.querySelector('.content-area');
      if (!sidebarCollapsed && contentArea && currentBreakpoint === 'desktop') {
        // When sidebar is expanded, content might be in its own scroll container
        const contentRect = contentArea.getBoundingClientRect();
        const elementInContent = element.closest('.content-area');
        
        console.log('📏 Checking scroll containers:', {
          contentAreaExists: !!contentArea,
          elementInContent: !!elementInContent,
          contentAreaScrollable: contentArea.scrollHeight > contentArea.clientHeight,
          contentAreaRect: contentRect
        });
        
        if (elementInContent && contentArea.scrollHeight > contentArea.clientHeight) {
          console.log('📊 Using content area as scroll container');
          scrollContainer = contentArea;
          scrollElement = contentArea;
          // Recalculate position relative to content area
          const contentAreaTop = contentArea.getBoundingClientRect().top + window.scrollY;
          targetScrollPosition = elementTop - contentAreaTop - offset;
          targetScrollPosition = Math.max(0, Math.min(targetScrollPosition, contentArea.scrollHeight - contentArea.clientHeight));
        }
      }
      
      // Perform the smooth scroll
      console.log(`⬆️ Scrolling from ${scrollContainer === window ? window.scrollY : scrollContainer.scrollTop} to ${targetScrollPosition} using container:`, scrollContainer === window ? 'window' : 'content-area');
      
      // Use different scrolling methods based on container
      if (scrollContainer === window) {
        // Use requestAnimationFrame for smoother scrolling on window
        const startY = window.scrollY;
        const distance = targetScrollPosition - startY;
        const duration = Math.min(800, Math.max(300, Math.abs(distance) * 0.5)); // Dynamic duration
        let startTime = null;
        
        function animateScroll(currentTime) {
          if (startTime === null) startTime = currentTime;
          const timeElapsed = currentTime - startTime;
          const progress = Math.min(timeElapsed / duration, 1);
          
          // Easing function for smooth animation
          const easeInOutCubic = progress < 0.5 
            ? 4 * progress * progress * progress 
            : (progress - 1) * (2 * progress - 2) * (2 * progress - 2) + 1;
          
          const currentPosition = startY + (distance * easeInOutCubic);
          window.scrollTo(0, currentPosition);
          
          if (progress < 1) {
            requestAnimationFrame(animateScroll);
          } else {
            console.log('✅ Window scroll animation completed');
            setTimeout(() => {
              this.highlightTargetElement(element);
              this.updateTOCHighlight();
            }, 50);
          }
        }
        
        requestAnimationFrame(animateScroll);
      } else {
        // Scroll the content area directly
        console.log('📊 Scrolling content area to:', targetScrollPosition);
        scrollContainer.scrollTo({
          top: targetScrollPosition,
          behavior: 'smooth'
        });
        
        setTimeout(() => {
          console.log('✅ Content area scroll completed');
          this.highlightTargetElement(element);
          this.updateTOCHighlight();
        }, 500);
      }
    }
    
    highlightTargetElement(element) {
      if (!element) return;
      
      console.log(`✨ Highlighting target element: ${element.id}`);
      
      // Remove any existing highlight classes
      document.querySelectorAll('.toc-target-highlight').forEach(el => {
        el.classList.remove('toc-target-highlight');
      });
      
      // Add highlight class to target
      element.classList.add('toc-target-highlight');
      
      // Remove highlight after animation
      setTimeout(() => {
        element.classList.remove('toc-target-highlight');
      }, 3000);
    }

    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    clearSearch() {
      if (searchInput) {
        searchInput.value = '';
        this.renderCategoryList();
      }
    }

    // Mobile auto-scroll functionality
    scrollMobileContentToTop() {
      console.log('📱 Auto-scrolling mobile content to top');
      const mobileContentArea = document.getElementById('mobileContent');
      
      if (mobileContentArea) {
        // Immediate scroll for responsive feedback
        mobileContentArea.scrollTop = 0;
        
        // Also ensure window is at top (fallback)
        window.scrollTo({
          top: 0,
          behavior: 'instant'
        });
        
        console.log('✅ Mobile content auto-scroll completed');
      } else {
        console.warn('⚠️ Mobile content area not found for auto-scroll');
      }
    }

    // Cache for post descriptions to avoid repeated fetches
    descriptionCache = new Map();

    async getPostDescription(postPath) {
      // Check cache first
      if (this.descriptionCache.has(postPath)) {
        return this.descriptionCache.get(postPath);
      }

      try {
        const response = await fetch(postPath);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${postPath}`);
        }
        
        const content = await response.text();
        
        // Extract first meaningful paragraph (skip headers and empty lines)
        const lines = content.split('\n');
        let description = '';
        let foundContent = false;
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          // Skip empty lines, headers, and markdown metadata
          if (!trimmedLine || 
              trimmedLine.startsWith('#') || 
              trimmedLine.startsWith('---') ||
              trimmedLine.startsWith('title:') ||
              trimmedLine.startsWith('date:') ||
              trimmedLine.startsWith('author:')) {
            continue;
          }
          
          // Found meaningful content
          if (!foundContent) {
            foundContent = true;
            description = trimmedLine;
          } else if (description.length < 100) {
            // Add more content if we haven't reached a good length yet
            description += ' ' + trimmedLine;
          } else {
            break;
          }
          
          // Stop if we have enough content
          if (description.length > 150) {
            break;
          }
        }
        
        // Clean up markdown syntax and truncate
        description = description
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
          .replace(/\*(.*?)\*/g, '$1') // Remove italic
          .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
          .replace(/`(.*?)`/g, '$1') // Remove inline code
          .replace(/#{1,6}\s+/g, '') // Remove headers
          .trim();
        
        // Truncate to reasonable length
        if (description.length > 120) {
          description = description.substring(0, 120).trim();
          // Try to end at a word boundary
          const lastSpace = description.lastIndexOf(' ');
          if (lastSpace > 80) {
            description = description.substring(0, lastSpace);
          }
          description += '...';
        }
        
        // Fallback if no description found
        if (!description) {
          description = 'Click to learn more about this topic.';
        }
        
        // Cache the result
        this.descriptionCache.set(postPath, description);
        return description;
        
      } catch (error) {
        console.warn(`⚠️ Could not fetch description for ${postPath}:`, error);
        const fallbackDescription = 'Click to learn more about this Active Directory topic.';
        this.descriptionCache.set(postPath, fallbackDescription);
        return fallbackDescription;
      }
    }

    async renderCategoryList() {
      console.log('🎨 Rendering enhanced category list...');
      console.log('categoryList element:', categoryList);
      console.log('postsByCategory:', postsByCategory);
      
      if (!categoryList) {
        console.error('❌ categoryList element not found in renderCategoryList');
        return;
      }
      
      categoryList.innerHTML = "";
      const categories = Object.keys(postsByCategory).sort();
      console.log('📂 Categories found:', categories);
      
      if (categories.length === 0) {
        console.warn('⚠️ No categories found, showing empty message');
        categoryList.innerHTML = '<li class="nav-item"><div class="text-muted text-center py-4"><small>No topics available</small></div></li>';
        return;
      }
      
      let totalPosts = 0;
      for (const category of categories) {
        const posts = postsByCategory[category];
        console.log(`📁 Category "${category}" has ${posts.length} posts:`, posts);
        totalPosts += posts.length;
        
        // Create category header
        const categoryHeader = document.createElement('li');
        categoryHeader.className = 'nav-item';
        categoryHeader.innerHTML = `
          <div class="fw-bold text-primary mt-3 mb-2 px-3 small text-uppercase">
            ${category} (${posts.length})
          </div>
        `;
        categoryList.appendChild(categoryHeader);
        
        // Add posts for this category
        for (const [index, post] of posts.entries()) {
          console.log(`  📄 Adding post ${index + 1}:`, { title: post.title, path: post.path });
          
          const li = document.createElement("li");
          li.className = "nav-item";
          
          // Create enhanced topic card
          const topicCard = document.createElement("a");
          topicCard.className = "topic-card";
          topicCard.href = "#";
          topicCard.dataset.path = post.path;
          topicCard.dataset.title = post.title;
          topicCard.title = post.title; // tooltip
          
          // Get description for the post
          const description = await this.getPostDescription(post.path);
          
          topicCard.innerHTML = `
            <div class="topic-title">${post.title}</div>
            <div class="topic-description">${description}</div>
          `;
          
          li.appendChild(topicCard);
          categoryList.appendChild(li);
        }
      }
      
      console.log(`✅ Enhanced category list rendered: ${categories.length} categories, ${totalPosts} total posts`);
    }

    async searchPosts(query) {
      if (!categoryList) return;
      categoryList.innerHTML = "";
      let resultsFound = false;
      
      const normalizedQuery = query.toLowerCase().trim();
      
      for (const category of Object.keys(postsByCategory)) {
        const matchingPosts = postsByCategory[category].filter(post => 
          post.title.toLowerCase().includes(normalizedQuery) ||
          category.toLowerCase().includes(normalizedQuery)
        );
        
        if (matchingPosts.length > 0) {
          resultsFound = true;
          const categoryHeader = document.createElement('li');
          categoryHeader.className = 'nav-item';
          categoryHeader.innerHTML = `
            <div class="fw-bold text-primary mt-3 mb-2 px-3 small text-uppercase">
              ${category} (${matchingPosts.length})
            </div>
          `;
          categoryList.appendChild(categoryHeader);
          
          for (const post of matchingPosts) {
            const li = document.createElement("li");
            li.className = "nav-item";
            
            const topicCard = document.createElement("a");
            topicCard.className = "topic-card";
            topicCard.href = "#";
            topicCard.dataset.path = post.path;
            topicCard.dataset.title = post.title;
            
            const description = await this.getPostDescription(post.path);
            const highlightedTitle = this.highlightSearchTerm(post.title, normalizedQuery);
            
            topicCard.innerHTML = `
              <div class="topic-title">${highlightedTitle}</div>
              <div class="topic-description">${description}</div>
            `;
            
            li.appendChild(topicCard);
            categoryList.appendChild(li);
          }
        }
      }
      
      if (!resultsFound) {
        const noResults = document.createElement('li');
        noResults.className = 'nav-item';
        noResults.innerHTML = `
          <div class="text-muted text-center py-4">
            <i class="bi bi-search fs-4 d-block mb-2"></i>
            <small>No articles found for "${query}"</small>
          </div>
        `;
        categoryList.appendChild(noResults);
      }
    }

    highlightSearchTerm(text, searchTerm) {
      if (!searchTerm) return text;
      const regex = new RegExp(`(${searchTerm})`, 'gi');
      return text.replace(regex, '<mark class="bg-warning text-dark">$1</mark>');
    }
  }

  // Initialize Layout Manager
  const layoutManager = new ResponsiveLayoutManager();
  
  // Expose layoutManager globally for debugging
  window.layoutManager = layoutManager;
  console.log('🔧 Layout manager exposed globally for debugging');

  // Search Input Handling
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const query = this.value.toLowerCase().trim();
        if (query) {
          layoutManager.searchPosts(query);
        } else {
          layoutManager.renderCategoryList();
        }
      }, 300);
    });

    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        this.value = '';
        layoutManager.renderCategoryList();
      }
    });
  }

  // Load Posts Data with enhanced debugging
  console.log('📥 Starting to load posts data...');

  fetch("assets/posts.json")
    .then(res => {
      console.log('🌐 Posts JSON fetch response:', { status: res.status, ok: res.ok, url: res.url });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    })
    .then(jsonData => {
      console.log('📄 JSON loaded, items:', jsonData.length);

      try {
        allPosts = Array.isArray(jsonData) ? jsonData : [];
        console.log('📚 All posts loaded:', allPosts.length, 'posts');

        // Validate posts data
        const validPosts = allPosts.filter(post => {
          const isValid = post && post.title && post.path && post.category;
          if (!isValid) {
            console.warn('⚠️ Invalid post found:', post);
          }
          return isValid;
        });

        console.log('✅ Valid posts:', validPosts.length);

        // Group posts by category
        postsByCategory = validPosts.reduce((acc, post) => {
          const category = post.category || 'Uncategorized';
          if (!acc[category]) {
            acc[category] = [];
            console.log(`📁 Created new category: ${category}`);
          }
          acc[category].push(post);
          return acc;
        }, {});

        console.log('📊 Posts by category:', postsByCategory);
        console.log('📈 Category summary:');
        Object.entries(postsByCategory).forEach(([category, posts]) => {
          console.log(`  ${category}: ${posts.length} posts`);
        });

        // Render the category list
        console.log('🎨 Calling renderCategoryList...');
        layoutManager.renderCategoryList();

      } catch (error) {
        console.error('❌ Error processing posts JSON:', error);

        if (categoryList) {
          categoryList.innerHTML = `
            <li class="nav-item">
              <div class="alert alert-warning m-3" role="alert">
                <h6 class="alert-heading">Data Error</h6>
                <small>Error: ${error.message}</small><br>
                <small class="text-muted">Please refresh the page or check the console for details.</small>
              </div>
            </li>
          `;
        }
      }
    })
    .catch(err => {
      console.error('❌ Error loading posts JSON file:', err);

      if (categoryList) {
        categoryList.innerHTML = `
          <li class="nav-item">
            <div class="alert alert-danger m-3" role="alert">
              <h6 class="alert-heading">Network Error</h6>
              <small>Unable to load posts: ${err.message}</small><br>
              <small class="text-muted">Please check your connection and refresh the page.</small>
            </div>
          </li>
        `;
      }
    });

  // Dark Mode Toggle
  const toggleButton = document.getElementById("toggleTheme");
  if (toggleButton) {
    const userPref = localStorage.getItem("theme");
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (userPref === "dark" || (!userPref && systemDark)) {
      document.body.classList.add("dark-mode");
      document.documentElement.setAttribute('data-bs-theme', 'dark');
    }

    toggleButton.addEventListener("click", () => {
      const isDark = document.body.classList.toggle("dark-mode");
      document.documentElement.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }

  // Keyboard Navigation
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (mobileTOCModal) {
        const modal = bootstrap.Modal.getInstance(mobileTOCModal);
        if (modal && modal._isShown) {
          modal.hide();
          return;
        }
      }
      
      // Handle mobile content area escape - close mobile content view
      if (currentBreakpoint === 'mobile') {
        const mobileContentArea = document.getElementById('mobileContent');
        if (mobileContentArea && mobileContentArea.style.display !== 'none') {
          mobileContentArea.style.display = 'none';
          return;
        }
      }
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  });

  console.log('✅ Enhanced Responsive Blog Manager initialized successfully');
  console.log('🔍 Debug mode enabled - check console for detailed logs');
  console.log('📊 Current state:', {
    currentBreakpoint,
    hasSearchInput: !!searchInput,
    hasCategoryList: !!categoryList,
    hasPostContent: !!postContent
  });
});
