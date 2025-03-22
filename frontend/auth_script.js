const API_URL = (() => {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        return "http://localhost:3000/api/v1";
    } else if (window.location.hostname === "elegant-faun-14186b.netlify.app") {
        return "https://lyrics-generator-backend-883px.ondigitalocean.app/api/v1";
    } else {
        return "https://lyrics-generator-backend-883px.ondigitalocean.app/api/v1";
    }
})();
console.log("Current hostname:", window.location.hostname);
console.log("Using API URL:", API_URL);

window.handleLogin = async function () {
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");

    const email = emailInput.value;
    const password = passwordInput.value;

    let isValid = true;

    if (!email) {
        showFormError(emailInput, "Email is required");
        isValid = false;
    }

    if (!password) {
        showFormError(passwordInput, "Password is required");
        isValid = false;
    }

    if (!isValid) return;

    try {
        const loadingNotification = showNotification("Signing in...", "info");

        const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                password,
            }),
        });

        document.getElementById("notification-container").removeChild(loadingNotification);

        const responseData = await response.text();

        if (!response.ok) {
            let errorMessage = "Login failed";
            try {
                const errorData = JSON.parse(responseData);
                errorMessage = errorData.error || errorMessage;
            } catch {
                errorMessage = responseData || errorMessage;
            }

            showNotification(errorMessage, "error");
            return;
        }

        const data = JSON.parse(responseData);

        localStorage.setItem("jwt_token", data.token);
        localStorage.setItem(
            "user_data",
            JSON.stringify({
                id: data.user.id,
                email: data.user.email,
                isAdmin: data.user.isAdmin,
                apiCallsCount: data.user.apiCallsCount,
            })
        );

        if (data.user.isAdmin && data.user.email === "admin@admin.com") {
            showNotification("Login successful! Redirecting to admin dashboard...", "success");
            setTimeout(() => (window.location.href = "admin.html"), 2000);
        } else {
            showNotification("Login successful! Redirecting to dashboard...", "success");
            setTimeout(() => (window.location.href = "landing.html"), 2000);
        }
    } catch (error) {
        console.error("Complete login error:", error);
        showNotification(`Network error: ${error.message}`, "error");
    }
};

document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM fully loaded");

    const currentPage = window.location.pathname.split("/").pop();

    checkAuthState();

    if (!sessionStorage.getItem("loginAttempts")) {
        sessionStorage.setItem("loginAttempts", "0");
    }

    if (!document.getElementById("notification-container")) {
        const notificationContainer = document.createElement("div");
        notificationContainer.id = "notification-container";
        notificationContainer.style.position = "fixed";
        notificationContainer.style.top = "20px";
        notificationContainer.style.right = "20px";
        notificationContainer.style.zIndex = "1000";
        document.body.appendChild(notificationContainer);
    }

    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            console.log("Login button clicked!");
            window.handleLogin();
        });
    }

    if (currentPage === "signup.html") {
        const registerBtn = document.getElementById("registerBtn");
        if (registerBtn) {
            registerBtn.addEventListener("click", handleSignup);
        }
    } else if (currentPage === "landing.html" || currentPage === "") {
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                window.handleLogout();
            });
        }

        const logoutBtnCard = document.getElementById("logoutBtnCard");
        if (logoutBtnCard) {
            logoutBtnCard.addEventListener("click", () => {
                window.handleLogout();
            });
        }

        fetchUserProfile();
    } else if (currentPage === "admin.html") {
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                window.handleLogout();
            });
        }
    }
});

function checkAuthState() {
    const currentPage = window.location.pathname.split("/").pop();

    const jwt = localStorage.getItem("jwt_token");
    const isLoggedIn = !!jwt;

    const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
    const isAdmin = userData.isAdmin;

    if (isLoggedIn) {
        if (currentPage === "login.html" || currentPage === "signup.html" || currentPage === "index.html") {
            if (isAdmin) {
                window.location.href = "admin.html";
            } else {
                window.location.href = "landing.html";
            }
        }
    } else {
        if (currentPage === "landing.html" || currentPage === "admin.html") {
            window.location.href = "login.html";
        }
    }
}

async function fetchUserProfile() {
    const jwt = localStorage.getItem("jwt_token");
    if (!jwt) return;

    try {
        const response = await fetch(`${API_URL}/user/profile`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${jwt}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                handleLogout();
                return;
            }
            throw new Error("Failed to fetch profile");
        }

        const userData = await response.json();

        localStorage.setItem(
            "user_data",
            JSON.stringify({
                id: userData.id,
                email: userData.email,
                firstName: userData.firstName,
                isAdmin: userData.isAdmin,
                apiCallsCount: userData.apiCallsCount,
            })
        );

        const userEmailElement = document.getElementById("userEmail");
        if (userEmailElement) {
            userEmailElement.textContent = userData.firstName;
        }

        const apiCallsElement = document.getElementById("apiCallsCount");
        if (apiCallsElement) {
            apiCallsElement.textContent = userData.apiCallsCount || 0;
        }

        if (userData.isAdmin) {
            const navbarNav = document.getElementById("navbarNav");
            if (navbarNav && !document.getElementById("adminLink")) {
                const adminLinkLi = document.createElement("li");
                adminLinkLi.className = "nav-item";
                adminLinkLi.innerHTML = `<a id="adminLink" class="btn btn-outline-light" href="admin.html" style="margin-right: 10px;">Admin Dashboard</a>`;

                const firstChild = navbarNav.querySelector("ul").firstChild;
                navbarNav.querySelector("ul").insertBefore(adminLinkLi, firstChild);
            }
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        showNotification("Error loading profile data", "error");
    }
}

function showNotification(message, type = "info") {
    const container = document.getElementById("notification-container");

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="close-btn">&times;</button>
        </div>
    `;

    notification.style.marginBottom = "10px";
    notification.style.padding = "15px";
    notification.style.borderRadius = "5px";
    notification.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
    notification.style.display = "flex";
    notification.style.justifyContent = "space-between";
    notification.style.alignItems = "center";
    notification.style.animation = "fadeIn 0.3s ease-out";

    if (type === "success") {
        notification.style.backgroundColor = "#d4edda";
        notification.style.color = "#155724";
        notification.style.borderLeft = "4px solid #28a745";
    } else if (type === "error") {
        notification.style.backgroundColor = "#f8d7da";
        notification.style.color = "#721c24";
        notification.style.borderLeft = "4px solid #dc3545";
    } else if (type === "warning") {
        notification.style.backgroundColor = "#fff3cd";
        notification.style.color = "#856404";
        notification.style.borderLeft = "4px solid #ffc107";
    } else {
        notification.style.backgroundColor = "#d1ecf1";
        notification.style.color = "#0c5460";
        notification.style.borderLeft = "4px solid #17a2b8";
    }

    const closeBtn = notification.querySelector(".close-btn");
    closeBtn.style.background = "none";
    closeBtn.style.border = "none";
    closeBtn.style.cursor = "pointer";
    closeBtn.style.fontSize = "20px";
    closeBtn.style.marginLeft = "10px";
    closeBtn.style.color = "inherit";

    closeBtn.addEventListener("click", function () {
        container.removeChild(notification);
    });

    container.appendChild(notification);

    if (type === "success") {
        setTimeout(() => {
            if (container.contains(notification)) {
                container.removeChild(notification);
            }
        }, 5000);
    }

    return notification;
}

function showFormError(inputElement, message) {
    const existingError = inputElement.parentElement.querySelector(".form-error");
    if (existingError) {
        existingError.remove();
    }

    const errorElement = document.createElement("div");
    errorElement.className = "form-error";
    errorElement.textContent = message;
    errorElement.style.color = "#dc3545";
    errorElement.style.fontSize = "0.875rem";
    errorElement.style.marginTop = "5px";

    inputElement.classList.add("error-input");
    inputElement.style.borderColor = "#dc3545";

    inputElement.parentElement.appendChild(errorElement);

    inputElement.addEventListener(
        "input",
        function () {
            const error = inputElement.parentElement.querySelector(".form-error");
            if (error) {
                error.remove();
                inputElement.classList.remove("error-input");
                inputElement.style.borderColor = "";
            }
        },
        { once: true }
    );
}

async function handleSignup() {
    const firstNameInput = document.getElementById("firstName");
    const firstName = firstNameInput.value.trim();

    const emailInput = document.getElementById("signupEmail");
    const passwordInput = document.getElementById("signupPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const termsCheckInput = document.getElementById("termsCheck");

    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput?.value;
    const termsCheck = termsCheckInput?.checked;

    let isValid = true;

    if (!firstName) {
        showFormError(firstNameInput, "First name is required");
        isValid = false;
    }
    if (!email) {
        showFormError(emailInput, "Email is required");
        isValid = false;
    } else if (!validateEmail(email)) {
        showFormError(emailInput, "Please enter a valid email address");
        isValid = false;
    }
    if (!password) {
        showFormError(passwordInput, "Password is required");
        isValid = false;
    }
    if (confirmPasswordInput && password !== confirmPassword) {
        showFormError(confirmPasswordInput, "Passwords do not match");
        isValid = false;
    }
    if (termsCheckInput !== undefined && !termsCheck) {
        showFormError(termsCheckInput, "You must agree to the Terms & Conditions");
        isValid = false;
    }

    if (!isValid) return;

    let loadingNotification;
    try {
        loadingNotification = showNotification("Creating your account...", "info");

        const response = await fetch(`${API_URL}/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                first_name: firstName,
                email: email,
                password: password,
            }),
        });

        const notificationContainer = document.getElementById("notification-container");
        if (notificationContainer && loadingNotification) {
            notificationContainer.removeChild(loadingNotification);
        }

        const responseData = await response.text();
        console.log("Full signup response:", responseData);

        if (!response.ok) {
            let errorMessage = "Registration failed";
            try {
                const errorData = JSON.parse(responseData);
                errorMessage = errorData.error || errorMessage;
            } catch {
                errorMessage = responseData || errorMessage;
            }

            showNotification(errorMessage, "error");
            return;
        }

        let data;
        try {
            data = JSON.parse(responseData);
        } catch (parseError) {
            console.error("Failed to parse response:", parseError);
            showNotification("Invalid server response", "error");
            return;
        }

        localStorage.setItem("jwt_token", data.token);
        localStorage.setItem(
            "user_data",
            JSON.stringify({
                id: data.user.id,
                email: data.user.email,
                firstName: data.user.firstName,
                isAdmin: data.user.isAdmin,
            })
        );

        showNotification("Registration successful! Redirecting to dashboard...", "success");
        setTimeout(() => {
            window.location.href = "landing.html";
        }, 2000);
    } catch (error) {
        console.error("Registration error:", error);
        if (loadingNotification) {
            const notificationContainer = document.getElementById("notification-container");
            if (notificationContainer.contains(loadingNotification)) {
                notificationContainer.removeChild(loadingNotification);
            }
        }
        showNotification("Network error. Please try again.", "error");
    }
}

function handleLogout() {
    localStorage.removeItem("jwt_token");
    localStorage.removeItem("user_data");

    showNotification("You have been logged out successfully.", "success");

    setTimeout(() => {
        window.location.href = "login.html";
    }, 2000);
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

window.handleLogout = handleLogout;

const style = document.createElement("style");
style.textContent = `
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
`;
document.head.appendChild(style);

window.verifyResetToken = async function (token, email) {
  try {
    console.log(`Verifying token: ${token} for email: ${email}`);

    const API_URL = (() => {
      if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        return "http://localhost:3000/api/v1";
      } else if (
        window.location.hostname === "elegant-faun-14186b.netlify.app"
      ) {
        return "https://lyrics-generator-backend-883px.ondigitalocean.app/api/v1";
      } else {
        return "https://lyrics-generator-backend-883px.ondigitalocean.app/api/v1";
      }
    })();

    const response = await fetch(
      `${API_URL}/auth/verify-reset-token?token=${encodeURIComponent(
        token
      )}&email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const responseText = await response.text();
    console.log("Token verification raw response:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse response as JSON:", e);
      return { success: false, error: "Invalid server response" };
    }

    console.log("Token verification parsed response:", data);

    return {
      success: response.ok && data.valid,
      error: data.error || "Invalid or expired reset link",
    };
  } catch (error) {
    console.error("Error verifying token:", error);
    return { success: false, error: "Failed to verify reset token" };
  }
};

window.handleResetPassword = async function (token, email, newPassword) {
  try {
    console.log("Resetting password for email:", email);

    // Get the API URL
    const API_URL = (() => {
      if (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
      ) {
        return "http://localhost:3000/api/v1";
      } else if (
        window.location.hostname === "elegant-faun-14186b.netlify.app"
      ) {
        return "https://lyrics-generator-backend-883px.ondigitalocean.app/api/v1";
      } else {
        return "https://lyrics-generator-backend-883px.ondigitalocean.app/api/v1";
      }
    })();

    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: token,
        email: email,
        password: newPassword,
      }),
    });

    const responseText = await response.text();
    console.log("Reset password raw response:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse response as JSON:", e);
      return {
        success: false,
        message: "Invalid server response",
      };
    }

    return {
      success: response.ok,
      message: response.ok
        ? "Password reset successful!"
        : data.error || "Failed to reset password",
    };
  } catch (error) {
    console.error("Password reset error:", error);
    return { success: false, message: "Network error. Please try again." };
  }
};

window.handleForgotPassword = async function (email) {
  try {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    return {
      success: true,
      message:
        "If that email exists in our system, a password reset link has been sent.",
    };
  } catch (error) {
    console.error("Forgot password error:", error);
    return { success: false, message: "Network error. Please try again." };
  }
};