import axios from 'axios';

const getBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL || import.meta.env.VITE_ASSETS_URL || 'http://localhost:5000/api';
  if (!url.endsWith('/api') && !url.endsWith('/api/')) {
    url = `${url.replace(/\/$/, '')}/api`;
  }
  return url;
};

const api = axios.create({
  baseURL: getBaseUrl(),
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token =
      sessionStorage.getItem("token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("documentAdminToken") ||
      localStorage.getItem("documentAdminToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for automatic retries on network failures
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Set up retry config if not exists
    if (!config || !config.retry) {
      if (config) {
        config.retry = {
          count: 0,
          maxRetries: 2,
          delay: 1000
        };
      } else {
        return Promise.reject(error);
      }
    }
    
    // Only retry on network errors or 5xx server errors
    if (error.response && error.response?.status >= 400 && error.response?.status < 500) {
      return Promise.reject(error);
    }
    
    config.retry.count += 1;
    
    if (config.retry.count <= config.retry.maxRetries) {
      console.log(`API Retry attempt ${config.retry.count} for ${config.url}`);
      await new Promise(resolve => setTimeout(resolve, config.retry.delay));
      return api(config);
    }
    
    return Promise.reject(error);
  }
);

export default api;
