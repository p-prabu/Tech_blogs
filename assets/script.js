
// ===== ENHANCED RESPONSIVE BLOG MANAGER =====

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const categoryList = document.getElementById("categoryList");
  const postContent = document.getElementById("postContent");
  const searchInput = document.getElementById("searchInput");
  const tocList = document.getElementById("tocList");
  const mobileTocList = document.getElementById("mobileTocList");
  const mobileTOCFab = document.getElementById("mobileTOCFab");
  const sidebarOffcanvas = document.getElementById("sidebarOffcanvas");
  const mobileTOCModal = document.getElementById("mobileTOCModal");

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

      // Sidebar event handling
      if (sidebarOffcanvas) {
        sidebarOffcanvas.addEventListener('hidden.bs.offcanvas', () => {
          if (currentBreakpoint === 'mobile' && searchInput.value.trim()) {
            this.clearSearch();
          }
        });
      }

      // Category list click handling (delegated event listener)
      if (categoryList) {
        categoryList.addEventListener('click', (e) => {
          console.log('🖱️ Category list clicked:', e.target);

          const link = e.target.closest('a.nav-link');
          if (link) {
            e.preventDefault();
            const postPath = link.dataset.path;
            const postTitle = link.dataset.title;

            console.log('🖱️ Nav link clicked:', { postPath, postTitle });

            if (postPath && postTitle) {
              this.loadPost(postPath, postTitle);

              // Auto-close sidebar on mobile
              if (currentBreakpoint === 'mobile') {
                const sidebar = bootstrap.Offcanvas.getInstance(sidebarOffcanvas);
                if (sidebar) {
                  sidebar.hide();
                }
              }
            } else {
              console.warn('⚠️ Missing post data:', { postPath, postTitle });
            }
          }
        });
      }

      // Mobile TOC handling
      if (mobileTocList) {
        mobileTocList.addEventListener('click', (e) => {
          if (e.target.tagName === 'A') {
            e.preventDefault();
            const targetId = e.target.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
              this.scrollToElement(targetElement);
              const modal = bootstrap.Modal.getInstance(mobileTOCModal);
              if (modal) modal.hide();
            }
          }
        });
      }

      // Desktop TOC handling
      if (tocList) {
        tocList.addEventListener('click', (e) => {
          if (e.target.tagName === 'A') {
            e.preventDefault();
            const targetId = e.target.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) this.scrollToElement(targetElement);
          }
        });
      }
    }

    initTouchGestures() {
      if (currentBreakpoint !== 'mobile') return;

      let touchStartX = 0;
      let touchStartY = 0;
      const threshold = 100;

      document.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      document.addEventListener('touchend', (e) => {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = Math.abs(touchEndY - touchStartY);

        // Swipe right from left edge to open sidebar
        if (touchStartX < 50 && deltaX > threshold && deltaY < 100) {
          const sidebar = bootstrap.Offcanvas.getInstance(sidebarOffcanvas) || 
                         new bootstrap.Offcanvas(sidebarOffcanvas);
          if (!sidebar._isShown) {
            sidebar.show();
          }
        }
      }, { passive: true });
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
      const sections = postContent.querySelectorAll("h2, h3, h4");
      if (sections.length === 0) return;

      const scrollPosition = window.scrollY + (currentBreakpoint === 'mobile' ? 120 : 80);
      const allTocLinks = document.querySelectorAll('#tocList a, #mobileTocList a');
      allTocLinks.forEach(link => link.classList.remove('active'));

      let currentSection = null;
      sections.forEach((section) => {
        if (section.offsetTop <= scrollPosition) {
          currentSection = section;
        }
      });

      if (currentSection && currentSection.id) {
        const currentLinks = document.querySelectorAll(
          `#tocList a[href="#${currentSection.id}"], #mobileTocList a[href="#${currentSection.id}"]`
        );
        currentLinks.forEach(link => link.classList.add('active'));
      }
    }

    loadPost(path, title) {
      console.log('📖 Loading post:', { path, title });
      
      if (!path || !title) {
        console.error('❌ Invalid post data:', { path, title });
        this.showContentError(new Error('Invalid post data: missing path or title'));
        return;
      }
      
      // Show loading spinner
      postContent.innerHTML = `
        <div class="text-center py-5">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3 text-muted">Loading article...</p>
        </div>
      `;

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
            const htmlContent = marked.parse(markdown);
            console.log('✅ Markdown parsed successfully');
            
            postContent.innerHTML = `
              <article class="markdown-body">
                <h1 class="display-4 fw-bold text-primary mb-4">${title}</h1>
                <div class="content-body">${htmlContent}</div>
              </article>
            `;
            
            this.generateTOC();
            this.scrollToTop();
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
          this.showContentError(err, () => this.loadPost(path, title));
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
      if (!tocList) return;
      tocList.innerHTML = "";
      if (mobileTocList) mobileTocList.innerHTML = "";
      
      const headers = postContent.querySelectorAll("h2, h3, h4");
      headers.forEach((header, index) => {
        const id = `heading-${index}`;
        header.id = id;
        
        const level = parseInt(header.tagName.substring(1));
        const indent = level > 2 ? 'ms-3' : '';
        
        const tocItem = this.createTOCItem(header.textContent, id, indent);
        tocList.appendChild(tocItem);
        
        if (mobileTocList) {
          const mobileTocItem = this.createTOCItem(header.textContent, id, indent);
          mobileTocList.appendChild(mobileTocItem);
        }
      });
      
      this.updateTOCVisibility();
    }

    createTOCItem(text, id, className = '') {
      const link = document.createElement('a');
      link.href = `#${id}`;
      link.textContent = text;
      link.className = className;
      return link;
    }

    scrollToElement(element) {
      const offset = currentBreakpoint === 'mobile' ? 80 : 60;
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({ top: elementPosition, behavior: 'smooth' });
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

    renderCategoryList() {
      console.log('🎨 Rendering category list...');
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
      categories.forEach(category => {
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
        posts.forEach((post, index) => {
          console.log(`  📄 Adding post ${index + 1}:`, { title: post.title, path: post.path });
          
          const li = document.createElement("li");
          li.className = "nav-item";
          
          const link = document.createElement("a");
          link.className = "nav-link text-truncate";
          link.href = "#";
          link.textContent = post.title;
          link.dataset.path = post.path;
          link.dataset.title = post.title;
          link.title = post.title; // tooltip for truncated text
          
          li.appendChild(link);
          categoryList.appendChild(li);
        });
      });
      
      console.log(`✅ Category list rendered: ${categories.length} categories, ${totalPosts} total posts`);
    }

    searchPosts(query) {
      if (!categoryList) return;
      categoryList.innerHTML = "";
      let resultsFound = false;
      
      const normalizedQuery = query.toLowerCase().trim();
      Object.keys(postsByCategory).forEach(category => {
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
          
          matchingPosts.forEach(post => {
            const li = document.createElement("li");
            li.className = "nav-item";
            const link = document.createElement("a");
            link.className = "nav-link";
            link.href = "#";
            link.dataset.path = post.path;
            link.dataset.title = post.title;
            link.innerHTML = this.highlightSearchTerm(post.title, normalizedQuery);
            
            li.appendChild(link);
            categoryList.appendChild(li);
          });
        }
      });
      
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

  const postsJsonPath = location.pathname.includes('/posts/') ? '../assets/posts.json' : './assets/posts.json';
  fetch(postsJsonPath)
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
      
      if (sidebarOffcanvas) {
        const offcanvas = bootstrap.Offcanvas.getInstance(sidebarOffcanvas);
        if (offcanvas && offcanvas._isShown) {
          offcanvas.hide();
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
