// Secure Authentication Helper
// This file provides a secure wrapper for authentication that doesn't expose API keys

class SecureAuth {
  constructor() {
    this.session = null;
    this.user = null;
  }

  // Check if user has an active session using stored token
  async getSession() {
    try {
      const token = localStorage.getItem('sb-access-token');
      if (!token) {
        return { session: null, user: null };
      }

      // If we already have a cached session, return it immediately
      if (this.session && this.user) {
        return { session: this.session, user: this.user };
      }

      // Validate session through backend
      const data = await apiRequest(API_CONFIG.ENDPOINTS.AUTH.SESSION, {
        method: 'POST',
        body: JSON.stringify({ accessToken: token })
      });

      if (data.user) {
        this.user = data.user;
        this.session = { user: data.user, access_token: token };
        return { session: this.session, user: this.user };
      }

      // Invalid token, clear it
      localStorage.removeItem('sb-access-token');
      return { session: null, user: null };
    } catch (error) {
      console.error('Session check failed:', error);
      // On error, don't immediately clear - might be network issue
      return { session: null, user: null };
    }
  }

  // Sign in with email and password
  async signInWithPassword({ email, password }) {
    try {
      const data = await apiRequest(API_CONFIG.ENDPOINTS.AUTH.SIGNIN, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (data.session && data.session.access_token) {
        localStorage.setItem('sb-access-token', data.session.access_token);
        this.session = data.session;
        this.user = data.user;
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Sign up with email and password
  async signUp({ email, password }) {
    try {
      const data = await apiRequest(API_CONFIG.ENDPOINTS.AUTH.SIGNUP, {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (data.session && data.session.access_token) {
        localStorage.setItem('sb-access-token', data.session.access_token);
        this.session = data.session;
        this.user = data.user;
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Sign out
  async signOut() {
    try {
      await apiRequest(API_CONFIG.ENDPOINTS.AUTH.SIGNOUT, {
        method: 'POST'
      });

      localStorage.removeItem('sb-access-token');
      this.session = null;
      this.user = null;

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Sign in with magic link (OTP)
  async signInWithOtp({ email, redirectTo }) {
    try {
      const data = await apiRequest(API_CONFIG.ENDPOINTS.AUTH.SIGNIN_OTP, {
        method: 'POST',
        body: JSON.stringify({ email, redirectTo })
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Sign in with OAuth (Google, etc.)
  async signInWithOAuth({ provider, redirectTo }) {
    try {
      const data = await apiRequest(API_CONFIG.ENDPOINTS.AUTH.SIGNIN_OAUTH, {
        method: 'POST',
        body: JSON.stringify({ provider, redirectTo })
      });

      if (data.success && data.data && data.data.url) {
        // Redirect to OAuth provider
        window.location.href = data.data.url;
        return { data, error: null };
      }

      // If no URL returned, something went wrong
      throw new Error(data.error || 'Failed to initiate OAuth sign in');
    } catch (error) {
      console.error('OAuth sign in error:', error);
      return { data: null, error };
    }
  }

  // Check membership status
  async checkMembership(email) {
    try {
      const data = await apiRequest(API_CONFIG.ENDPOINTS.MEMBERSHIP.CHECK, {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Verify email has active membership (for login)
  async verifyEmailMembership(email) {
    try {
      const data = await apiRequest(API_CONFIG.ENDPOINTS.MEMBERSHIP.VERIFY_EMAIL, {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

// Create and export a singleton instance
const secureAuth = new SecureAuth();

if (typeof window !== 'undefined') {
  window.secureAuth = secureAuth;
}
