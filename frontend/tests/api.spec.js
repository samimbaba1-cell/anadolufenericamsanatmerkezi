const { test, expect } = require('@playwright/test');

const API_URL = process.env.PLAYWRIGHT_API_URL || process.env.API_URL || "http://localhost:3000";

test.describe('Backend API Testleri', () => {
  test('health endpoint çalışıyor', async ({ request }) => {
    const response = await request.get(`${API_URL}/health`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    // API 'OK' döndürüyor, case-insensitive kontrol yap
    expect(data.status?.toLowerCase()).toBe('ok');
  });

  test('products API endpoint çalışıyor', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/products?limit=5`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBeTruthy();
  });

  test('categories API endpoint çalışıyor', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/categories`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('register API endpoint çalışıyor', async ({ request }) => {
    const uniqueEmail = `test+${Date.now()}@example.com`;
    const response = await request.post(`${API_URL}/api/users/register`, {
      data: {
        name: 'Test User',
        email: uniqueEmail,
        password: 'test123456'
      }
    });
    
    // Show actual error if registration fails
    if (!response.ok()) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Registration failed with status ${response.status()}: ${JSON.stringify(errorData)}`);
    }
    
    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data).toHaveProperty('token');
    expect(data).toHaveProperty('user');
  });

  test('login API endpoint çalışıyor', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/users/login`, {
      data: {
        email: 'test@example.com',
        password: 'test123456'
      }
    });
    
    // Show actual error if login fails
    if (!response.ok()) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Login failed with status ${response.status()}: ${JSON.stringify(errorData)}`);
    }
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('token');
    expect(data).toHaveProperty('user');
  });

  test('products search API endpoint çalışıyor', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/products/search?q=test`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBeTruthy();
  });

  test('protected endpoint auth gerektiriyor', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/users/profile`);
    expect(response.status()).toBe(401);
  });

  test('authenticated request çalışıyor', async ({ request }) => {
    // Önce login yap
    const loginResponse = await request.post(`${API_URL}/api/users/login`, {
      data: {
        email: 'test@example.com',
        password: 'test123456'
      }
    });
    
    // Show actual error if login fails
    if (!loginResponse.ok()) {
      const errorData = await loginResponse.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Login failed with status ${loginResponse.status()}: ${JSON.stringify(errorData)}`);
    }
    
    const loginData = await loginResponse.json();
    expect(loginData).toHaveProperty('token');
    const token = loginData.token;

    // Token ile protected endpoint'e istek at
    const profileResponse = await request.get(`${API_URL}/api/users/profile`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    // Show actual error if profile request fails
    if (!profileResponse.ok()) {
      const errorData = await profileResponse.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Profile request failed with status ${profileResponse.status()}: ${JSON.stringify(errorData)}`);
    }
    
    expect(profileResponse.status()).toBe(200);
    const profileData = await profileResponse.json();
    expect(profileData).toHaveProperty('user');
  });
});

