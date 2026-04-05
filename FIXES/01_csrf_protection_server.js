/**
 * CSRF PROTECTION - Server Implementation
 * File: server/index.js (additions)
 * 
 * This implements CSRF token generation and validation
 * Add these imports and middleware configuration
 */

// ADD TO IMPORTS SECTION:
import csrf from 'csurf';

// ADD AFTER OTHER MIDDLEWARE (around line 100-150):

// Initialize CSRF protection
const csrfProtection = csrf({ 
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    sameSite: 'strict'
  }
});

// Middleware to generate CSRF token on GET requests
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Apply CSRF protection to state-changing operations
// Add csrfProtection middleware to these routes:
app.post('/api/checkout/create-order', csrfProtection, validateInput, async (req, res) => {
  try {
    // Existing validation
    const { dropId, quantity, address } = req.body;
    
    // CSRF token is already validated by middleware
    // If we reach here, token is valid
    
    // ... rest of handler
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/drops/:id', csrfProtection, validateInput, async (req, res) => {
  // Drop update endpoint - CSRF protected
});

app.patch('/api/orders/:id', csrfProtection, validateInput, async (req, res) => {
  // Order update - CSRF protected
});

// Apply to all checkout endpoints
app.post('/api/checkout/*', csrfProtection);
app.post('/api/artists/*', csrfProtection);
app.post('/api/products/*', csrfProtection);
app.delete('/api/*', csrfProtection);
app.patch('/api/*', csrfProtection);

// Error handler for CSRF failures
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    // CSRF token errors
    res.status(403).json({ 
      error: 'Invalid or missing CSRF token',
      code: 'CSRF_VALIDATION_FAILED'
    });
  } else {
    next(err);
  }
});

/**
 * IMPORTANT: Don't forget to update package.json
 * npm install csurf --save
 */
