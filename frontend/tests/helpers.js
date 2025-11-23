const API_URL = process.env.PLAYWRIGHT_API_URL || process.env.API_URL || "http://localhost:3000";

// Retry helper function
async function retryRequest(fn, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

// Check if backend is available
async function checkBackendHealth(page) {
  try {
    const response = await page.request.get(`${API_URL}/health`, { timeout: 5000 });
    return response.ok();
  } catch (error) {
    console.warn('Backend health check failed:', error.message);
    return false;
  }
}

async function fetchFirstProduct(page) {
  // Check backend health first
  const isHealthy = await checkBackendHealth(page);
  if (!isHealthy) {
    throw new Error('Backend sunucusu çalışmıyor. Lütfen backend\'i başlatın.');
  }

  const response = await retryRequest(async () => {
    return await page.request.get(`${API_URL}/api/products?limit=1`, { timeout: 10000 });
  });

  if (!response.ok()) {
    throw new Error(`Ürün listesi alınamadı: ${response.status()} - ${await response.text()}`);
  }
  
  const data = await response.json();
  const product = data?.items?.[0];
  if (!product) {
    throw new Error("Test için kullanılabilecek ürün bulunamadı");
  }
  return product;
}

async function addProductToCart(page) {
  const product = await fetchFirstProduct(page);
  await page.goto(`/product/${product._id}`);
  await page.getByRole("button", { name: /Sepete Ekle/i }).click();
  return product;
}

async function seedGuestCart(page) {
  const product = await fetchFirstProduct(page);
  await page.goto("/", { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.evaluate((entry) => {
    localStorage.setItem("cart", JSON.stringify([entry]));
  }, { product: product._id, quantity: 1, productData: product });
  await page.waitForTimeout(500);
  // Reload page to ensure CartContext picks up the cart from localStorage
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000); // CartContext'in localStorage'dan cart'ı okuması için bekle
  return product;
}

async function addProductToUserCart(page, token) {
  if (!token) throw new Error("Kullanıcı oturumu bulunamadı");
  
  // Check backend health first
  const isHealthy = await checkBackendHealth(page);
  if (!isHealthy) {
    throw new Error('Backend sunucusu çalışmıyor. Lütfen backend\'i başlatın.');
  }

  const product = await fetchFirstProduct(page);
  
  const response = await retryRequest(async () => {
    return await page.request.post(`${API_URL}/api/cart/add`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      data: { product: product._id, quantity: 1 },
      timeout: 10000,
    });
  });

  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Sunucu sepetine ürün eklenemedi: ${response.status()} - ${errorText}`);
  }
  
  // Verify cart was updated by fetching it
  const cartResponse = await page.request.get(`${API_URL}/api/cart`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    timeout: 10000,
  });
  
  if (!cartResponse.ok()) {
    throw new Error(`Sepet kontrolü başarısız: ${cartResponse.status()}`);
  }
  
  const cartData = await cartResponse.json();
  if (!cartData.items || cartData.items.length === 0) {
    throw new Error('Sepete ürün eklendi ama sepet boş görünüyor');
  }
  
  return product;
}

// Login helper function - uses API directly to avoid rate limiting and UI issues
async function loginUser(page, email, password, timeout = 30000) {
  // First, try to login via API directly to avoid rate limiting and UI issues
  const API_URL = process.env.PLAYWRIGHT_API_URL || process.env.API_URL || "http://localhost:3000";
  
  // Wait a bit for backend to be ready
  await page.waitForTimeout(1000);
  
  // Add small random delay to spread out login attempts and reduce rate limiting
  // Firefox için daha fazla delay ekle (user agent kontrolü ile)
  let isFirefox = false;
  try {
    const userAgent = await page.evaluate(() => navigator.userAgent);
    isFirefox = userAgent && userAgent.toLowerCase().includes('firefox');
  } catch (e) {
    // User agent kontrolü başarısız, varsayılan delay kullan
  }
  // Firefox için delay - rate limiting'i önlemek için ama test timeout'larına neden olmamak için
  // Testler paralel çalıştığı için her test aynı anda login yapmaya çalışıyor
  // Delay'i azalt ama retry mekanizmasını güçlendir
  const randomDelay = isFirefox ? Math.random() * 5000 + 5000 : Math.random() * 1000; // Firefox: 5000-10000ms, diğerleri: 0-1000ms
  await page.waitForTimeout(randomDelay);
  
  try {
    // Try API login first - with retry
    // Firefox için daha fazla retry ve daha uzun delay
    let response;
    let retries = isFirefox ? 5 : 3;
    while (retries > 0) {
      try {
        response = await page.request.post(`${API_URL}/api/users/login`, {
          data: {
            email: email,
            password: password
          },
          timeout: 20000
        });
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        // Exponential backoff for retries - Firefox için daha uzun
        const backoffDelay = isFirefox ? 5000 * (6 - retries) : 2000 * (4 - retries);
        await page.waitForTimeout(backoffDelay);
      }
    }
    
    if (response.ok()) {
      const data = await response.json();
      const token = data.token;
      
      if (!token) {
        throw new Error('Login API returned success but no token in response');
      }
      
      // Set token in localStorage
      // Try to navigate to home page, but if it fails, try to set token on current page
      let canSetToken = false;
      try {
        await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 10000 });
        canSetToken = true;
      } catch (e) {
        // If navigation fails, check if we're on a valid page
        const currentUrl = page.url();
        if (currentUrl && currentUrl !== 'about:blank' && currentUrl.startsWith('http')) {
          canSetToken = true;
        } else {
          // Try one more time with a shorter timeout
          try {
            await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 5000 });
            canSetToken = true;
          } catch (e2) {
            // If still fails, throw error
            throw new Error('Cannot set token - page is not ready');
          }
        }
      }
      
      // Set token and user data in localStorage - retry if fails (Firefox issue)
      let tokenSet = false;
      let retries = 10; // Firefox için daha fazla retry
      while (!tokenSet && retries > 0) {
        try {
          // Firefox'ta localStorage set etme işlemi bazen başarısız oluyor
          // Bu yüzden evaluate içinde try-catch kullanıyoruz
          const setResult = await page.evaluate(({ token: t, userData }) => {
            try {
              localStorage.setItem('token', t);
              if (userData) {
                localStorage.setItem('user', JSON.stringify(userData));
              }
              return true;
            } catch (e) {
              return false;
            }
          }, { token, userData: data.user || null });
          
          if (!setResult) {
            retries--;
            await page.waitForTimeout(2000);
            continue;
          }
          
          // Wait a bit for localStorage to be fully set
          await page.waitForTimeout(2000);
          
          // Verify token is set - multiple checks
          let storedToken = null;
          for (let i = 0; i < 5; i++) {
            try {
              storedToken = await page.evaluate(() => {
                try {
                  return localStorage.getItem('token');
                } catch (e) {
                  return null;
                }
              });
              if (storedToken && storedToken.length > 0) {
                tokenSet = true;
                break;
              }
            } catch (e) {
              // localStorage access error
            }
            await page.waitForTimeout(1000);
          }
          
          if (tokenSet) {
            break;
          }
        } catch (e) {
          // Retry
        }
        retries--;
        if (retries > 0) {
          await page.waitForTimeout(2000);
        }
      }
      
      if (!tokenSet) {
        throw new Error('Token was not set in localStorage after API login - Firefox localStorage issue');
      }
      
      // User data yoksa, API'den çek ve localStorage'a set et
      // Böylece AuthContext'in API çağrısını beklemeden user state hazır olur
      if (!data.user) {
        try {
          const userResponse = await page.request.get(`${API_URL}/api/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          });
          if (userResponse.ok()) {
            const userData = await userResponse.json();
            if (userData.user) {
              await page.evaluate(({ userData: u }) => {
                localStorage.setItem('user', JSON.stringify(u));
              }, { userData: userData.user });
              await page.waitForTimeout(500);
            }
          }
        } catch (e) {
          // User data çekilemedi, devam et - AuthContext kendi çekecek
        }
      }
      
      // Reload page to ensure app recognizes the token - use domcontentloaded to avoid timeout
      try {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(3000); // AuthContext'in token'ı tanıması için bekle
      } catch (e) {
        // Reload timeout is OK, continue - token is already set
        await page.waitForTimeout(3000);
      }
      
      return token;
    } else {
      // API login failed, get error message
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const status = response.status();
      const errorMsg = errorData.error || errorData.message || JSON.stringify(errorData);
      
      // If 429 (rate limiting), wait longer and throw error to trigger UI fallback
      if (status === 429) {
        await page.waitForTimeout(3000); // Wait 3 seconds for rate limit to reset
        throw new Error(`Rate limited (429): ${errorMsg}. Will try UI login.`);
      }
      
      // If 401, it means credentials are wrong or user doesn't exist
      if (status === 401) {
        throw new Error(`Login failed: Invalid credentials (${errorMsg}). User may not exist in database. Please ensure seedData has run.`);
      }
      
      throw new Error(`API login failed (${status}): ${errorMsg}`);
    }
  } catch (error) {
    // If API login fails, fall back to UI login
    console.warn('API login failed, trying UI login:', error.message);
    
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 10000 });
    
    // Form alanlarının yüklenmesini bekle
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.waitForSelector('input[name="password"]', { timeout: 10000 });
    
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    
    const loginButton = page.getByRole('button', { name: /Giriş Yap/i });
    await loginButton.waitFor({ state: 'visible', timeout: 30000 });
    await loginButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await loginButton.click({ force: true, timeout: 30000 });
    
    // Wait for navigation or error message
    try {
      await page.waitForURL('**/', { timeout: timeout });
    } catch (error) {
      // Check if there's an error message on the page
      const errorMessage = await page.locator('.bg-red-50, [role="alert"], .error, [class*="error"]').first().isVisible({ timeout: 5000 }).catch(() => false);
      if (errorMessage) {
        const errorText = await page.locator('.bg-red-50, [role="alert"], .error, [class*="error"]').first().textContent();
        throw new Error(`Login failed: ${errorText || 'Unknown error'}`);
      }
      // If still on login page, check for any error indicators
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        const pageText = await page.textContent('body');
        throw new Error(`Login failed: Still on login page. Page content: ${pageText?.substring(0, 200)}`);
      }
      throw error;
    }
    
    // Wait for token to be set - retry mechanism for Firefox
    let token = null;
    let tokenRetries = 10; // Firefox için daha fazla retry
    while (tokenRetries > 0) {
      try {
        token = await page.evaluate(() => localStorage.getItem('token'));
        if (token && token.length > 0) {
          break;
        }
      } catch (e) {
        // localStorage access error, continue
      }
      
      if (!token || token.length === 0) {
        // Wait a bit and check again
        await page.waitForTimeout(2000);
        tokenRetries--;
        
        // Check if we're still on login page (login might have failed)
        const currentUrl = page.url();
        if (currentUrl.includes('/login')) {
          const errorMessage = await page.locator('.bg-red-50, [role="alert"], .error, [class*="error"]').first().isVisible({ timeout: 5000 }).catch(() => false);
          if (errorMessage) {
            const errorText = await page.locator('.bg-red-50, [role="alert"], .error, [class*="error"]').first().textContent();
            throw new Error(`Login failed - token not set: ${errorText || 'Unknown error'}`);
          }
          if (tokenRetries === 0) {
            throw new Error('Login failed - token not set and still on login page');
          }
        }
      } else {
        break;
      }
    }
    
    // Verify token is actually set - retry mechanism for Firefox
    if (!token || token.length === 0) {
      // Token hala set edilmemiş, birkaç kez daha dene
      let tokenRetries = 5;
      while (tokenRetries > 0 && (!token || token.length === 0)) {
        await page.waitForTimeout(2000);
        try {
          token = await page.evaluate(() => {
            try {
              return localStorage.getItem('token');
            } catch (e) {
              return null;
            }
          });
          if (token && token.length > 0) {
            break;
          }
        } catch (e) {
          // localStorage access error
        }
        tokenRetries--;
      }
      
      if (!token || token.length === 0) {
        const currentUrl = page.url();
        throw new Error(`Login failed - token is empty or null after retries. Current URL: ${currentUrl}`);
      }
    }
    
    // Reload page to ensure AuthContext recognizes the token
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(3000); // Firefox için daha uzun bekleme
    } catch (e) {
      await page.waitForTimeout(3000);
    }
    
    // Token'ın hala var olduğunu kontrol et (reload sonrası)
    const finalToken = await page.evaluate(() => {
      try {
        return localStorage.getItem('token');
      } catch (e) {
        return null;
      }
    });
    
    if (!finalToken || finalToken.length === 0) {
      // Token reload sonrası kaybolmuş, tekrar set et
      await page.evaluate(({ token: t }) => {
        try {
          localStorage.setItem('token', t);
        } catch (e) {
          // localStorage access error
        }
      }, { token });
      await page.waitForTimeout(1000);
    }
    
    return finalToken || token;
  }
}

// Navigate to a protected page with retry (handles auth redirects)
async function navigateToProtectedPage(page, url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000); // Wait for auth check
      
      const currentUrl = page.url();
      // If redirected to login, try to login and retry
      if (currentUrl.includes('/login')) {
        if (i < maxRetries - 1) {
          // Try to login directly (use default test credentials)
          try {
            await loginUser(page, 'test@example.com', 'test123456', 30000);
            await page.waitForTimeout(2000);
            // After login, try navigating again
            continue; // Retry navigation
          } catch (authError) {
            // If auth fails, throw original error
            if (i === maxRetries - 1) {
              throw new Error(`Redirected to login page after ${maxRetries} attempts: ${authError.message}`);
            }
            await page.waitForTimeout(2000);
            continue;
          }
        } else {
          throw new Error('Redirected to login page - authentication failed after all retries');
        }
      }
      
      // If redirected to home but we wanted a specific page, check if it's an auth issue
      if (currentUrl === 'http://localhost:3001/' && !url.includes('/')) {
        // This is fine, we're on home
        return;
      }
      
      // Check if we're on the target URL or a sub-path
      if (currentUrl.includes(url.replace(/^\//, '')) || url === '/' || currentUrl.endsWith(url)) {
        return;
      }
      
      // If we're not on the target URL and not on login, might be a redirect
      if (i < maxRetries - 1) {
        await page.waitForTimeout(2000);
        continue;
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // Check if token exists, if not try to authenticate
      try {
        let token = null;
        try {
          token = await page.evaluate(() => {
            try {
              return localStorage.getItem('token');
            } catch (e) {
              return null;
            }
          });
        } catch (e) {
          // Can't access localStorage, try to navigate to a page first
          await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 10000 });
          await page.waitForTimeout(1000);
          try {
            token = await page.evaluate(() => localStorage.getItem('token'));
          } catch (e2) {
            token = null;
          }
        }
        
        if (!token) {
          // Try to authenticate
          await ensureAuthenticated(page);
          await page.waitForTimeout(2000);
        } else {
          await page.waitForTimeout(2000);
        }
      } catch (authError) {
        // If auth fails and this is last retry, throw
        if (i === maxRetries - 1) {
          throw new Error(`Authentication failed: ${authError.message}`);
        }
        await page.waitForTimeout(2000);
      }
    }
  }
}

// Check if user is authenticated
async function ensureAuthenticated(page, email = 'test@example.com', password = 'test123456') {
  // Ensure page is on a valid URL (not about:blank)
  const currentUrl = page.url();
  if (!currentUrl || currentUrl === 'about:blank' || !currentUrl.startsWith('http')) {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(1000);
  }
  
  // Try to get token, catch security errors
  let token = null;
  try {
    token = await page.evaluate(() => {
      try {
        return localStorage.getItem('token');
      } catch (e) {
        return null;
      }
    });
  } catch (error) {
    // If we can't access localStorage, navigate to a page first
    if (error.message.includes('SecurityError') || error.message.includes('insecure')) {
      await page.goto('/', { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(1000);
      try {
        token = await page.evaluate(() => localStorage.getItem('token'));
      } catch (e) {
        // Still can't access, just proceed to login
        token = null;
      }
    } else {
      throw error;
    }
  }
  
  if (!token || token.length === 0) {
    // Need to login - retry mechanism for Firefox
    let loginRetries = 3;
    let loginSuccess = false;
    
    while (loginRetries > 0 && !loginSuccess) {
      try {
        await loginUser(page, email, password);
        await page.waitForTimeout(2000);
        
        // Get token after login - retry if null
        let retries = 5; // Firefox için daha fazla retry
        while (retries > 0) {
          try {
            token = await page.evaluate(() => localStorage.getItem('token'));
            if (token && token.length > 0) {
              loginSuccess = true;
              break;
            }
          } catch (e) {
            // If still can't access, wait and retry
          }
          if (!token || token.length === 0) {
            await page.waitForTimeout(2000); // Firefox için daha uzun bekleme
            retries--;
          } else {
            loginSuccess = true;
            break;
          }
        }
        
        if (loginSuccess) {
          break;
        }
      } catch (e) {
        // Login failed, retry
        loginRetries--;
        if (loginRetries > 0) {
          await page.waitForTimeout(3000); // Retry arasında bekle
        }
      }
    }
    
    // If still no token, throw error
    if (!token || token.length === 0) {
      throw new Error('Login failed - token not set after login (after retries)');
    }
    
    // Reload page to ensure app recognizes the token (but don't wait for networkidle to avoid timeout)
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 5000 });
      await page.waitForTimeout(2000); // Firefox için daha uzun bekleme
    } catch (e) {
      // Reload timeout is OK, continue
      await page.waitForTimeout(2000);
    }
  } else {
    // Token exists, verify it's still valid by checking if we can access protected content
    // Don't reload unnecessarily - it can cause token loss
    try {
      const tokenCheck = await page.evaluate(() => localStorage.getItem('token'));
      if (!tokenCheck || tokenCheck.length === 0) {
        // Token lost, login again
        await loginUser(page, email, password);
        await page.waitForTimeout(2000);
        token = await page.evaluate(() => localStorage.getItem('token'));
        if (!token || token.length === 0) {
          throw new Error('Login failed - token not set after re-login');
        }
      } else {
        token = tokenCheck;
      }
    } catch (e) {
      // If we can't verify, use original token
    }
  }
  return token;
}

module.exports = {
  addProductToCart,
  seedGuestCart,
  addProductToUserCart,
  fetchFirstProduct,
  checkBackendHealth,
  loginUser,
  navigateToProtectedPage,
  ensureAuthenticated,
};

