const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Import Supabase configuration
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing required environment variables SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// API endpoint to get Supabase session
app.post('/api/auth/session', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(401).json({ error: 'No access token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({ user });
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to check membership status
app.post('/api/membership/check', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { data: member, error } = await supabase
      .from('Paid')
      .select('email, status, is_premium')
      .eq('email', email)
      .eq('status', 'active')
      .single();

    if (error && !error.message?.includes('is_premium')) {
      return res.status(404).json({ error: 'Membership not found', isPremium: false, isActive: false });
    }

    // Fallback if is_premium column doesn't exist
    if (error && error.message?.includes('is_premium')) {
      const { data: fallbackMember } = await supabase
        .from('Paid')
        .select('email, status')
        .eq('email', email)
        .eq('status', 'active')
        .single();

      return res.json({
        isPremium: fallbackMember?.is_premium || false,
        isActive: !!fallbackMember,
        email: fallbackMember?.email
      });
    }

    res.json({
      isPremium: member?.is_premium || false,
      isActive: !!member,
      email: member?.email
    });
  } catch (error) {
    console.error('Membership check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to verify email has active membership (for login screen)
app.post('/api/membership/verify-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required', hasActiveMembership: false });
    }

    const { data: member } = await supabase
      .from('Paid')
      .select('email, status')
      .eq('email', email)
      .eq('status', 'active')
      .single();

    res.json({
      hasActiveMembership: !!member,
      email: member?.email
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error', hasActiveMembership: false });
  }
});

// API endpoint for AI chat (proxying to Supabase Edge Function)
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: 'Invalid messages format' });
    }

    const AI_FUNCTION_URL = `${supabaseUrl}/functions/v1/ai-chat`;

    const response = await fetch(AI_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ messages, model })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ success: false, error: 'Failed to process AI request' });
  }
});

// API endpoint for Supabase auth operations
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ session: data.session, user: data.user });
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ session: data.session, user: data.user });
  } catch (error) {
    console.error('Sign up error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/signout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Sign out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint for magic link (OTP) sign in
app.post('/api/auth/signin-otp', async (req, res) => {
  try {
    const { email, redirectTo } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('OTP sign in error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint for OAuth sign in
app.post('/api/auth/signin-oauth', async (req, res) => {
  try {
    const { provider, redirectTo } = req.body;

    if (!provider) {
      return res.status(400).json({ success: false, error: 'Provider is required' });
    }

    console.log('OAuth sign in request:', { provider, redirectTo });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo
      }
    });

    if (error) {
      console.error('Supabase OAuth error:', error);
      return res.status(400).json({ success: false, error: error.message });
    }

    console.log('OAuth response data:', data);
    res.json({ success: true, data });
  } catch (error) {
    console.error('OAuth sign in error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Environment variables loaded successfully');
});
