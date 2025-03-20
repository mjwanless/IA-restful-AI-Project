document.addEventListener("DOMContentLoaded", function () {
    // const ADMIN_API_URL =
    //     window.location.hostname === "localhost" ? "http://localhost:3000/api" : "https://lyrics-generator-backend-883px.ondigitalocean.app/api";
    const ADMIN_API_URL = API_URL;  // Use your API_URL from earlier
    console.log("Using admin API URL:", ADMIN_API_URL);

    checkAdminStatus();

    const usersTableBody = document.getElementById("usersTableBody");
    const refreshUsersBtn = document.getElementById("refreshUsersBtn");
    const resetApiCountModal = new bootstrap.Modal(document.getElementById("resetApiCountModal"));
    const resetUserEmail = document.getElementById("resetUserEmail");
    const confirmResetBtn = document.getElementById("confirmResetBtn");

    let selectedUserId = null;

    refreshUsersBtn.addEventListener("click", fetchAllUsers);
    confirmResetBtn.addEventListener("click", resetUserApiCount);
    fetchAllUsers();

    function checkAdminStatus() {
        const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
        if (!userData.isAdmin) {
            showNotification("Access denied. Admin privileges required.", "error");
            setTimeout(() => {
                window.location.href = "landing.html";
            }, 2000);
        }
    }

    async function fetchAllUsers() {
        try {
            const token = localStorage.getItem("jwt_token");
            if (!token) {
                throw new Error("No authentication token found");
            }
            usersTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Loading users...</td></tr>';
            const response = await fetch(`${ADMIN_API_URL}/admin/users`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error("Not authorized to view admin data");
                }
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            displayUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
            usersTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            showNotification(`Failed to load users: ${error.message}`, "error");
        }
    }

    function displayUsers(users) {
        if (!users || users.length === 0) {
            usersTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No users found</td></tr>';
            return;
        }
        usersTableBody.innerHTML = "";
        users.sort((a, b) => b.api_calls_count - a.api_calls_count);
        users.forEach((user) => {
            const row = document.createElement("tr");
            if (user.is_admin) {
                row.classList.add("table-primary");
            }
            if (user.api_calls_count >= 20) {
                row.classList.add("table-warning");
            }
            const createdDate = new Date(user.created_at).toLocaleString();
            row.innerHTML = `
                <td>
                    ${user.email} ${user.is_admin ? ' <span class="badge bg-info">Admin</span>' : ""}
                </td>
                <td>${user.api_calls_count}</td>
                <td>${createdDate}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-secondary reset-api-btn me-2 rounded-pill" data-user-id="${user.id}" data-user-email="${user.email}">
                            Reset API Count
                        </button>
                        <button class="btn btn-outline-danger delete-user-btn rounded-pill" data-user-id="${user.id}" data-user-email="${user.email}">
                            Delete
                        </button>
                    </div>
                </td>
            `;
            usersTableBody.appendChild(row);
        });
        document.querySelectorAll(".reset-api-btn").forEach((button) => {
            button.addEventListener("click", function () {
                selectedUserId = this.dataset.userId;
                resetUserEmail.textContent = this.dataset.userEmail;
                resetApiCountModal.show();
            });
        });
        document.querySelectorAll(".delete-user-btn").forEach((button) => {
            button.addEventListener("click", function () {
                const userId = this.dataset.userId;
                const userEmail = this.dataset.userEmail;
                if (confirm(`Are you sure you want to delete user "${userEmail}"? This action cannot be undone.`)) {
                    deleteUser(userId);
                }
            });
        });
    }

    async function resetUserApiCount() {
        try {
            if (!selectedUserId) return;
            const token = localStorage.getItem("jwt_token");
            if (!token) {
                throw new Error("No authentication token found");
            }
            const response = await fetch(`${ADMIN_API_URL}/admin/reset-api-count/${selectedUserId}`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            resetApiCountModal.hide();
            showNotification("API count reset successfully", "success");
            fetchAllUsers();
        } catch (error) {
            console.error("Error resetting API count:", error);
            showNotification(`Failed to reset API count: ${error.message}`, "error");
        }
    }

    async function deleteUser(userId) {
        try {
            const token = localStorage.getItem("jwt_token");
            if (!token) {
                throw new Error("No authentication token found");
            }
            const response = await fetch(`${ADMIN_API_URL}/admin/users/${userId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            showNotification("User deleted successfully", "success");
            fetchAllUsers();
        } catch (error) {
            console.error("Error deleting user:", error);
            showNotification(`Failed to delete user: ${error.message}`, "error");
        }
    }

    function showNotification(message, type = "info") {
        let container = document.getElementById("notification-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "notification-container";
            container.style.position = "fixed";
            container.style.top = "20px";
            container.style.right = "20px";
            container.style.zIndex = "1000";
            document.body.appendChild(container);
        }

        const notification = document.createElement("div");
        notification.style.marginBottom = "10px";
        notification.style.padding = "15px";
        notification.style.borderRadius = "5px";
        notification.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
        notification.textContent = message;

        if (type === "success") {
            notification.style.backgroundColor = "#d4edda";
            notification.style.color = "#155724";
        } else if (type === "error") {
            notification.style.backgroundColor = "#f8d7da";
            notification.style.color = "#721c24";
        } else if (type === "warning") {
            notification.style.backgroundColor = "#fff3cd";
            notification.style.color = "#856404";
        } else {
            notification.style.backgroundColor = "#d1ecf1";
            notification.style.color = "#0c5460";
        }

        container.appendChild(notification);

        setTimeout(() => {
            try {
                container.removeChild(notification);
            } catch (e) {}
        }, 5000);

        return notification;
    }
});
