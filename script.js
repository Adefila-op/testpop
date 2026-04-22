// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

function initializeApp() {
  // Set discovery feed as default active page
  showPage('discoveryFeed');
  
  // Setup navigation buttons
  setupNavigation();
  
  // Setup tab switching
  setupTabs();
  
  // Setup filters
  setupFilters();
}

function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  
  // Show selected page
  const page = document.getElementById(pageId);
  if (page) {
    page.classList.add('active');
  }
  
  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.querySelector(`[data-page="${pageId}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
  
  // Scroll to top
  window.scrollTo(0, 0);
}

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.hasAttribute('data-page')) {
      btn.addEventListener('click', () => {
        const pageId = btn.getAttribute('data-page');
        showPage(pageId);
      });
    }
  });
  
  // Back buttons
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Go back to previous page or home
      showPage('discoveryFeed');
    });
  });
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabs = tab.parentElement.querySelectorAll('.tab-btn');
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
  
  // Feed tabs
  document.querySelectorAll('.feed-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabs = tab.parentElement.querySelectorAll('.feed-tab');
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

function setupFilters() {
  // Product filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.parentElement;
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  
  // Token filters
  document.querySelectorAll('.token-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.parentElement;
      container.querySelectorAll('.token-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

// Add smooth scroll behavior for discover items
document.addEventListener('DOMContentLoaded', () => {
  const discoverScroll = document.querySelector('.discover-scroll');
  if (discoverScroll) {
    discoverScroll.addEventListener('wheel', (e) => {
      e.preventDefault();
      discoverScroll.scrollLeft += e.deltaY;
    });
  }
});

// Add click handlers for interactive elements
document.addEventListener('click', (e) => {
  // Handle "View token" buttons
  if (e.target.classList.contains('view-token-btn')) {
    console.log('View token clicked');
  }
  
  // Handle profile cards/token rows
  if (e.target.closest('.token-row')) {
    console.log('Token row clicked');
  }
  
  // Handle posts
  if (e.target.closest('.post')) {
    console.log('Post clicked');
  }
});

// Add hover effects for interactive cards
document.querySelectorAll('.product-item, .token-row, .featured-card').forEach(card => {
  card.style.cursor = 'pointer';
  card.addEventListener('mouseenter', function() {
    this.style.opacity = '0.8';
  });
  card.addEventListener('mouseleave', function() {
    this.style.opacity = '1';
  });
});
