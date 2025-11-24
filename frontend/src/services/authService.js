// authService.js - Unified authentication service
// Uses 'token' as the key to match backend response

const TOKEN_KEY = 'token'; // ✅ Changed from 'access_token' to 'token'
const USER_KEY = 'bloomup_user';

export const authService = {
  // Save token after login
  setToken(token) {
    if (token && token !== 'null' && token !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },

  // Get token for API calls
  getToken() {
    const token = localStorage.getItem(TOKEN_KEY);
    // Return null if token is invalid
    if (!token || token === 'null' || token === 'undefined') {
      return null;
    }
    return token;
  },

  // Remove token on logout
  removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  // Save user info
  setUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  // Get user info
  getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },

  // Check if user is authenticated
  isAuthenticated() {
    const token = this.getToken();
    return token !== null;
  },

  // Get auth headers for API calls
  getAuthHeaders() {
    const token = this.getToken();
    if (token) {
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
    }
    return {
      'Content-Type': 'application/json',
    };
  }
};

// API helper with automatic auth headers
export async function apiFetch(path, options = {}) {
  const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  
  const headers = {
    ...authService.getAuthHeaders(),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${BASE_URL}${path}`, config);
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
      authService.removeToken();
      // Don't redirect if we're already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      throw new Error('Unauthorized');
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    // Handle other errors
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Login function
export async function login(email, password) {
  const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Login failed');
    }

    const data = await response.json();
    
    // ✅ Changed: Use 'token' from backend response
    if (data.token) {
      authService.setToken(data.token);
      
      // Fetch user info
      const userResponse = await fetch(`${BASE_URL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${data.token}`,
        },
      });
      
      if (userResponse.ok) {
        const user = await userResponse.json();
        authService.setUser(user);
      }
    }

    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Signup function
export async function signup(email, password, name) {
  const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  
  try {
    const response = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Signup failed');
    }

    const user = await response.json();
    
    // Auto login after signup
    await login(email, password);
    
    return user;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}

// Logout function
export function logout() {
  authService.removeToken();
  window.location.href = '/login';
}

// Export as default for easier importing
export default authService;