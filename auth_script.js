// auth_script.js - Enhanced authentication functionality for Lyrics Generator app

// Wait for DOM to be fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check which page we're on and attach appropriate event listeners
    const currentPage = window.location.pathname.split('/').pop();
    
    // Check authentication state on page load
    checkAuthState();
    
    // Set up failed login attempts tracking
    if (!sessionStorage.getItem('loginAttempts')) {
        sessionStorage.setItem('loginAttempts', '0');
    }
    
    // Attach event listeners based on current page
    if (currentPage === 'signup.html') {
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            registerBtn.addEventListener('click', handleSignup);
        }
    } 
    else if (currentPage === 'login.html') {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', handleLogin);
        }
    }
    else if (currentPage === 'landing.html' || currentPage === '') {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', handleLogout);
        }
        
        const logoutBtnCard = document.getElementById('logoutBtnCard');
        if (logoutBtnCard) {
            logoutBtnCard.addEventListener('click', handleLogout);
        }
    }
});

// Check if user is authenticated via JWT cookie
function checkAuthState() {
    const currentPage = window.location.pathname.split('/').pop();
    
    // Check for JWT token (for testing, we'll use localStorage since we can't set HttpOnly cookies in client-side JS)
    // Note: In a real implementation, this would be checking for the existence of an HttpOnly cookie via server response
    const jwt = localStorage.getItem('jwt_token');
    const isLoggedIn = !!jwt;
    
    // Redirect logic
    if (isLoggedIn) {
        // If logged in but on login or signup page, redirect to landing
        if (currentPage === 'login.html' || currentPage === 'signup.html' || currentPage === 'index.html') {
            window.location.href = 'landing.html';
        }
    } else {
        // If not logged in but on landing page, redirect to login
        if (currentPage === 'landing.html') {
            window.location.href = 'login.html';
        }
    }
}

// Handle user signup
async function handleSignup() {
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const termsCheck = document.getElementById('termsCheck')?.checked;
    
    // Validate inputs
    if (!email || !password) {
        alert('Please fill in all required fields.');
        return;
    }
    
    if (confirmPassword && password !== confirmPassword) {
        alert('Passwords do not match.');
        return;
    }
    
    if (termsCheck !== undefined && !termsCheck) {
        alert('You must agree to the Terms & Conditions.');
        return;
    }
    
    // Basic email validation
    if (!validateEmail(email)) {
        alert('Please enter a valid email address.');
        return;
    }
    
    // For demo purposes, we'll simulate server-side actions
    try {
        // Simulate password hashing with bcrypt
        // In a real application, this would be done server-side
        const hashedPassword = await simulateBcryptHash(password);
        
        // Check if user already exists in localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some(user => user.email === email)) {
            alert('A user with this email already exists.');
            return;
        }
        
        // Add new user with hashed password
        users.push({
            email: email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        });
        
        // Save users to localStorage
        localStorage.setItem('users', JSON.stringify(users));
        
        // Generate JWT token and store it
        // In a real application, the JWT would be set as an HttpOnly cookie by the server
        const token = generateJWT(email);
        localStorage.setItem('jwt_token', token);
        
        // Redirect to landing page
        alert('Registration successful! Redirecting to dashboard...');
        window.location.href = 'landing.html';
    } catch (error) {
        console.error('Registration error:', error);
        alert('An error occurred during signup. Please try again.');
    }
    
    /* 
    // Server-side code (for future implementation)
    // This would be implemented on your backend
    
    // Example server-side pseudocode:
    try {
        // Use parameterized query to prevent SQL injection
        const userExists = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (userExists.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password with bcrypt
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Insert new user with parameterized query
        await db.query(
            'INSERT INTO users (email, password, created_at) VALUES (?, ?, ?)',
            [email, hashedPassword, new Date()]
        );
        
        // Generate JWT token
        const token = jwt.sign({ userId: email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        // Set HttpOnly cookie with the JWT
        res.cookie('token', token, { 
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hour
        });
        
        return res.status(201).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
    */
}

// Handle user login
async function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Validate inputs
    if (!email || !password) {
        alert('Please enter both email and password.');
        return;
    }
    
    // Implement rate limiting for login attempts
    const loginAttempts = parseInt(sessionStorage.getItem('loginAttempts') || '0');
    if (loginAttempts >= 5) {
        const lastAttemptTime = parseInt(sessionStorage.getItem('lastAttemptTime') || '0');
        const currentTime = new Date().getTime();
        
        // If it's been less than 15 minutes since last attempt, block login
        if (currentTime - lastAttemptTime < 15 * 60 * 1000) {
            const minutesLeft = Math.ceil((15 * 60 * 1000 - (currentTime - lastAttemptTime)) / (60 * 1000));
            alert(`Too many failed login attempts. Please try again after ${minutesLeft} minutes.`);
            return;
        } else {
            // Reset after timeout period
            sessionStorage.setItem('loginAttempts', '0');
        }
    }
    
    // Track attempt time
    sessionStorage.setItem('lastAttemptTime', new Date().getTime().toString());
    
    try {
        // Get users from localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(user => user.email === email);
        
        // If no user found or password doesn't match
        if (!user || !(await simulateBcryptVerify(password, user.password))) {
            // Increment failed login attempts
            sessionStorage.setItem('loginAttempts', (loginAttempts + 1).toString());
            alert('Invalid email or password.');
            return;
        }
        
        // Login successful - reset login attempts
        sessionStorage.setItem('loginAttempts', '0');
        
        // Generate and store JWT token
        // In a real application, this would be an HttpOnly cookie set by the server
        const token = generateJWT(email);
        localStorage.setItem('jwt_token', token);
        
        // Redirect to landing page
        alert('Login successful! Redirecting to dashboard...');
        window.location.href = 'landing.html';
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login. Please try again.');
    }
    
    /*
    // Server-side code (for future implementation)
    // This would be implemented on your backend
    
    // Example server-side pseudocode:
    try {
        // Implement rate limiting (could use Redis or similar for distributed systems)
        const ipAddress = req.ip;
        const rateLimitKey = `login_attempts:${ipAddress}`;
        const attempts = await redisClient.get(rateLimitKey) || 0;
        
        if (attempts >= 5) {
            return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
        }
        
        // Use parameterized query to prevent SQL injection
        const [user] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (!user) {
            // Increment failed attempt counter
            await redisClient.incr(rateLimitKey);
            await redisClient.expire(rateLimitKey, 15 * 60); // 15 minutes expiry
            
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Compare password with hashed password using bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            // Increment failed attempt counter
            await redisClient.incr(rateLimitKey);
            await redisClient.expire(rateLimitKey, 15 * 60); // 15 minutes expiry
            
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Reset login attempts on successful login
        await redisClient.del(rateLimitKey);
        
        // Generate JWT token
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        // Set HttpOnly cookie with the JWT
        res.cookie('token', token, { 
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hour
        });
        
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
    */
}

// Handle user logout
function handleLogout() {
    // Clear JWT token
    localStorage.removeItem('jwt_token');
    
    // Redirect to login page
    alert('You have been logged out successfully.');
    window.location.href = 'login.html';
    
    /*
    // Server-side code (for future implementation)
    // This would be implemented on your backend
    
    // Example server-side pseudocode:
    res.clearCookie('token');
    return res.status(200).json({ success: true });
    */
}

// Helper function to validate email format
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Make logout function available globally
window.logout = handleLogout;

// Simulate bcrypt password hashing (client-side simulation only)
// In a real app, this would be done server-side
async function simulateBcryptHash(password) {
    // This is a simplified simulation, not actual bcrypt
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'some_salt_value');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simulate bcrypt password verification (client-side simulation only)
async function simulateBcryptVerify(password, hashedPassword) {
    const computedHash = await simulateBcryptHash(password);
    return computedHash === hashedPassword;
}

// Generate a simple JWT token (client-side simulation only)
function generateJWT(email) {
    // In a real app, this would be done server-side with proper signing
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };
    
    const payload = {
        sub: email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiration
    };
    
    // Base64 encode header and payload
    const stringifiedHeader = JSON.stringify(header);
    const stringifiedPayload = JSON.stringify(payload);
    const encodedHeader = btoa(stringifiedHeader);
    const encodedPayload = btoa(stringifiedPayload);
    
    // In a real JWT, this would be cryptographically signed
    // This is just for simulation
    const signature = btoa(encodedHeader + '.' + encodedPayload + 'secret');
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
}