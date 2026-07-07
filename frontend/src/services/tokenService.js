/**
 * tokenService.js - JWT Token Management Service
 * 
 * Why: Manages JWT tokens in localStorage with validation
 * 
 * Functions:
 * - getAccessToken(): Retrieve access token from localStorage
 * - getRefreshToken(): Retrieve refresh token from localStorage
 * - setTokens(accessToken, refreshToken): Store tokens in localStorage
 * - clearTokens(): Remove all tokens from localStorage (logout)
 * - isTokenValid(token): Check if JWT token is not expired
 * - isAuthenticated(): Check if user has valid access token
 * 
 * Token Validation:
 * - Decodes JWT payload without verification
 * - Checks expiration time (exp claim)
 * - Compares with current timestamp
 * - Returns false for invalid/malformed tokens
 * 
 * Storage:
 * - Uses localStorage for persistence across sessions
 * - Keys: 'accessToken', 'refreshToken'
 * - Tokens stored as plain strings
 * 
 * Security Notes:
 * - localStorage is vulnerable to XSS attacks
 * - Tokens are not encrypted in storage
 * - Keep access token expiry short (30 min recommended)
 * - Use refresh tokens for extended sessions
 * 
 * JWT Structure:
 * - Header.Payload.Signature
 * - Payload contains: exp (expiration), iat (issued at), sub (user ID)
 * - Validation only checks expiration, not signature
 * 
 * Usage:
 *   // Store tokens after login
 *   tokenService.setTokens(accessToken, refreshToken);
 *   
 *   // Check authentication
 *   if (tokenService.isAuthenticated()) {
 *     // User is logged in
 *   }
 *   
 *   // Logout
 *   tokenService.clearTokens();
 * 
 * Dependencies:
 * - None (pure JavaScript)
 * - Uses browser localStorage API
 */

export const tokenService = {
  getAccessToken: () => {
    return localStorage.getItem('accessToken');
  },
  
  getRefreshToken: () => {
    return localStorage.getItem('refreshToken');
  },
  
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  },
  
  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
  
  isTokenValid: (token) => {
    if (!token) {
      return false;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      return false;
    }
  },
  
  isAuthenticated: () => {
    const token = tokenService.getAccessToken();
    return token && tokenService.isTokenValid(token);
  }
};
