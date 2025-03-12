// auth_script.js - Enhanced authentication functionality with intuitive notifications

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
    
    // Add notification container to the page if it doesn't exist
    if (!document.getElementById('notification-container')) {
        const notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '20px';
        notificationContainer.style.right = '20px';
        notificationContainer.style.zIndex = '1000';
        document.body.appendChild(notificationContainer);
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

// Show notification message
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="close-btn">&times;</button>
        </div>
    `;
    
    // Style the notification
    notification.style.marginBottom = '10px';
    notification.style.padding = '15px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.display = 'flex';
    notification.style.justifyContent = 'space-between';
    notification.style.alignItems = 'center';
    notification.style.animation = 'fadeIn 0.3s ease-out';
    
    // Set colors based on notification type
    if (type === 'success') {
        notification.style.backgroundColor = '#d4edda';
        notification.style.color = '#155724';
        notification.style.borderLeft = '4px solid #28a745';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#f8d7da';
        notification.style.color = '#721c24';
        notification.style.borderLeft = '4px solid #dc3545';
    } else if (type === 'warning') {
        notification.style.backgroundColor = '#fff3cd';
        notification.style.color = '#856404';
        notification.style.borderLeft = '4px solid #ffc107';
    } else {
        notification.style.backgroundColor = '#d1ecf1';
        notification.style.color = '#0c5460';
        notification.style.borderLeft = '4px solid #17a2b8';
    }
    
    // Add close button functionality
    const closeBtn = notification.querySelector('.close-btn');
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '20px';
    closeBtn.style.marginLeft = '10px';
    closeBtn.style.color = 'inherit';
    
    closeBtn.addEventListener('click', function() {
        container.removeChild(notification);
    });
    
    // Add notification to container
    container.appendChild(notification);
    
    // Auto-remove after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            if (container.contains(notification)) {
                container.removeChild(notification);
            }
        }, 5000);
    }
    
    return notification;
}

// Show form validation errors in-page
function showFormError(inputElement, message) {
    // Remove any existing error message
    const existingError = inputElement.parentElement.querySelector('.form-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Create error element
    const errorElement = document.createElement('div');
    errorElement.className = 'form-error';
    errorElement.textContent = message;
    errorElement.style.color = '#dc3545';
    errorElement.style.fontSize = '0.875rem';
    errorElement.style.marginTop = '5px';
    
    // Add error class to input
    inputElement.classList.add('error-input');
    inputElement.style.borderColor = '#dc3545';
    
    // Add error message after input
    inputElement.parentElement.appendChild(errorElement);
    
    // Remove error when input changes
    inputElement.addEventListener('input', function() {
        const error = inputElement.parentElement.querySelector('.form-error');
        if (error) {
            error.remove();
            inputElement.classList.remove('error-input');
            inputElement.style.borderColor = '';
        }
    }, { once: true });
}

// Handle user signup
async function handleSignup() {
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const termsCheckInput = document.getElementById('termsCheck');
    
    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput?.value;
    const termsCheck = termsCheckInput?.checked;
    
    let isValid = true;
    
    // Validate inputs
    if (!email) {
        showFormError(emailInput, 'Email is required');
        isValid = false;
    } else if (!validateEmail(email)) {
        showFormError(emailInput, 'Please enter a valid email address');
        isValid = false;
    }
    
    if (!password) {
        showFormError(passwordInput, 'Password is required');
        isValid = false;
    }
    
    if (confirmPasswordInput && password !== confirmPassword) {
        showFormError(confirmPasswordInput, 'Passwords do not match');
        isValid = false;
    }
    
    if (termsCheckInput !== undefined && !termsCheck) {
        showFormError(termsCheckInput, 'You must agree to the Terms & Conditions');
        isValid = false;
    }
    
    if (!isValid) return;
    
    // For demo purposes, we'll simulate server-side actions
    try {
        // Show loading indicator
        const loadingNotification = showNotification('Creating your account...', 'info');
        
        // Simulate password hashing with bcrypt
        // In a real application, this would be done server-side
        const hashedPassword = await simulateBcryptHash(password);
        
        // Check if user already exists in localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some(user => user.email === email)) {
            // Remove loading notification
            document.getElementById('notification-container').removeChild(loadingNotification);
            showNotification('A user with this email already exists.', 'error');
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
        
        // Remove loading notification
        document.getElementById('notification-container').removeChild(loadingNotification);
        
        // Show success message
        showNotification('Registration successful! Redirecting to dashboard...', 'success');
        
        // Redirect after a short delay (for the user to see the success message)
        setTimeout(() => {
            window.location.href = 'landing.html';
        }, 2000);
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('An error occurred during signup. Please try again.', 'error');
    }
}

// Handle user login
async function handleLogin() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    const email = emailInput.value;
    const password = passwordInput.value;
    
    let isValid = true;
    
    // Validate inputs
    if (!email) {
        showFormError(emailInput, 'Email is required');
        isValid = false;
    }
    
    if (!password) {
        showFormError(passwordInput, 'Password is required');
        isValid = false;
    }
    
    if (!isValid) return;
    
    // Implement rate limiting for login attempts
    const loginAttempts = parseInt(sessionStorage.getItem('loginAttempts') || '0');
    if (loginAttempts >= 5) {
        const lastAttemptTime = parseInt(sessionStorage.getItem('lastAttemptTime') || '0');
        const currentTime = new Date().getTime();
        
        // If it's been less than 15 minutes since last attempt, block login
        if (currentTime - lastAttemptTime < 15 * 60 * 1000) {
            const minutesLeft = Math.ceil((15 * 60 * 1000 - (currentTime - lastAttemptTime)) / (60 * 1000));
            showNotification(`Too many failed login attempts. Please try again after ${minutesLeft} minutes.`, 'error');
            return;
        } else {
            // Reset after timeout period
            sessionStorage.setItem('loginAttempts', '0');
        }
    }
    
    // Track attempt time
    sessionStorage.setItem('lastAttemptTime', new Date().getTime().toString());
    
    try {
        // Show loading indicator
        const loadingNotification = showNotification('Signing in...', 'info');
        
        // Get users from localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(user => user.email === email);
        
        // Simulate server delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // If no user found or password doesn't match
        if (!user || !(await simulateBcryptVerify(password, user.password))) {
            // Increment failed login attempts
            sessionStorage.setItem('loginAttempts', (loginAttempts + 1).toString());
            
            // Remove loading notification
            document.getElementById('notification-container').removeChild(loadingNotification);
            
            showNotification('Invalid email or password.', 'error');
            return;
        }
        
        // Login successful - reset login attempts
        sessionStorage.setItem('loginAttempts', '0');
        
        // Generate and store JWT token
        // In a real application, this would be an HttpOnly cookie set by the server
        const token = generateJWT(email);
        localStorage.setItem('jwt_token', token);
        
        // Remove loading notification
        document.getElementById('notification-container').removeChild(loadingNotification);
        
        // Show success message
        showNotification('Login successful! Redirecting to dashboard...', 'success');
        
        // Redirect after a short delay (for the user to see the success message)
        setTimeout(() => {
            window.location.href = 'landing.html';
        }, 2000);
    } catch (error) {
        console.error('Login error:', error);
        showNotification('An error occurred during login. Please try again.', 'error');
    }
}

// Handle user logout
function handleLogout() {
    // Clear JWT token
    localStorage.removeItem('jwt_token');
    
    // Show success message
    showNotification('You have been logged out successfully.', 'success');
    
    // Redirect to login page after a short delay
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 2000);
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

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(style);