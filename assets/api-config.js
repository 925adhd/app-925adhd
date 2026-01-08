// API Configuration - Frontend
// All API calls should go through our backend proxy to keep keys secure

const API_CONFIG = {
  // Vercel deployment - works for both local and production
  BASE_URL: window.location.origin,

  // API endpoints
  ENDPOINTS: {
    AUTH: {
      SESSION: '/api/auth/session',
      SIGNIN: '/api/auth/signin',
      SIGNIN_OTP: '/api/auth/signin-otp',
      SIGNIN_OAUTH: '/api/auth/signin-oauth',
      SIGNUP: '/api/auth/signup',
      SIGNOUT: '/api/auth/signout'
    },
    MEMBERSHIP: {
      CHECK: '/api/membership/check',
      VERIFY_EMAIL: '/api/membership/verify-email'
    },
    AI: {
      CHAT: '/api/ai/chat'
    }
  }
};

// Helper function to make API calls
async function apiRequest(endpoint, options = {}) {
  try {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.API_CONFIG = API_CONFIG;
  window.apiRequest = apiRequest;
}
