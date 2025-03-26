document.addEventListener("DOMContentLoaded", function () {
    const ADMIN_API_URL = API_URL;
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
            showNotification(frontendMessages.notifications.accessDenied, "error");
            setTimeout(() => {
                window.location.href = "landing.html";
            }, 2000);
        }
    }

    async function fetchAllUsers() {
        try {
            const token = localStorage.getItem("jwt_token");
            if (!token) {
                throw new Error(frontendMessages.errors.noAuthToken);
            }
            usersTableBody.innerHTML = `<tr><td colspan="4" class="text-center">${frontendMessages.admin.loadingUsers}</td></tr>`;
            const response = await fetch(`${ADMIN_API_URL}/admin/users`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error(frontendMessages.errors.notAuthorizedForAdmin);
                }
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            displayUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
            usersTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            showNotification(`${frontendMessages.errors.failedToLoadUsers}: ${error.message}`, "error");
        }
    }

    function displayUsers(users) {
        if (!users || users.length === 0) {
            usersTableBody.innerHTML = `<tr><td colspan="4" class="text-center">${frontendMessages.admin.noUsers}</td></tr>`;
            return;
        }
        usersTableBody.innerHTML = "";
        users.sort((a, b) => b.apiCallsCount - a.apiCallsCount);
        users.forEach((user) => {
            const row = document.createElement("tr");
            if (user.is_admin) {
                row.classList.add("table-primary");
            }
            if (user.apiCallsCount >= 20) {
                row.classList.add("table-warning");
            }
            const createdDate = new Date(user.created_at).toLocaleString();
            row.innerHTML = `
                <td>
                    ${user.email} ${user.is_admin ? ` <span class="badge bg-info">${frontendMessages.admin.adminBadge}</span>` : ""}
                </td>
                <td>${user.apiCallsCount}</td>
                <td>${createdDate}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-secondary reset-api-btn me-2 rounded-pill" data-user-id="${user.id}" data-user-email="${
                user.email
            }">
                            ${frontendMessages.admin.resetApiButton}
                        </button>
                        <button class="btn btn-outline-danger delete-user-btn rounded-pill" data-user-id="${user.id}" data-user-email="${user.email}">
                            ${frontendMessages.admin.deleteUserButton}
                        </button>
                    </div>
                </td>
            `;
            usersTableBody.appendChild(row);
        });
        document.querySelectorAll(".reset-api-btn").forEach((button) => {
            button.addEventListener("click", function () {
                selectedUserId = this.dataset.userId;

                const fullMessage = `${frontendMessages.admin.resetApiModalQuestion} "${this.dataset.userEmail}"?`;

                const resetUserEmailElement = document.getElementById("resetUserEmail");
                if (resetUserEmailElement) {
                    resetUserEmailElement.textContent = fullMessage;
                    resetUserEmailElement.innerText = fullMessage;
                    resetUserEmailElement.innerHTML = fullMessage;
                }

                resetUserEmailElement.offsetHeight;

                resetApiCountModal.show();
            });
        });
        document.querySelectorAll(".delete-user-btn").forEach((button) => {
            button.addEventListener("click", function () {
                const userId = this.dataset.userId;
                const userEmail = this.dataset.userEmail;
                console.log("User ID for deletion:", userId);
                if (confirm(`${frontendMessages.admin.deleteUserConfirm} "${userEmail}"? ${frontendMessages.admin.deleteUserWarning}`)) {
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
                throw new Error(frontendMessages.errors.noAuthToken);
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
            showNotification(frontendMessages.notifications.apiCountResetSuccess, "success");
            fetchAllUsers();
        } catch (error) {
            console.error("Error resetting API count:", error);
            showNotification(`${frontendMessages.errors.failedToResetApiCount}: ${error.message}`, "error");
        }
    }

    async function deleteUser(userId) {
        try {
            const token = localStorage.getItem("jwt_token");
            if (!token) {
                throw new Error(frontendMessages.errors.noAuthToken);
            }

            console.log("Attempting to delete user with ID:", userId);
            console.log("Using API URL:", `${ADMIN_API_URL}/admin/users/${userId}`);
            console.log("JWT Token:", token);

            const response = await fetch(`${ADMIN_API_URL}/admin/users/${userId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            console.log("Response status:", response.status);
            console.log("Response headers:", Object.fromEntries(response.headers.entries()));

            const responseBody = await response.text();
            console.log("Response body:", responseBody);

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${responseBody}`);
            }

            showNotification(frontendMessages.notifications.userDeletedSuccess, "success");
            fetchAllUsers();
        } catch (error) {
            console.error("FULL Error deleting user:", error);
            showNotification(`${frontendMessages.errors.failedToDeleteUser}: ${error.message}`, "error");
        }
    }

    async function fetchEndpointStats() {
        try {
            const token = localStorage.getItem("jwt_token");
            if (!token) {
                throw new Error(frontendMessages.errors.noAuthToken);
            }

            const response = await fetch(`${ADMIN_API_URL}/admin/endpoint-stats`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            displayEndpointStats(data);
        } catch (error) {
            console.error("Error fetching endpoint stats:", error);
            document.getElementById(
                "endpointStatsBody"
            ).innerHTML = `<tr><td colspan="3" class="text-center text-danger">Error: ${error.message}</td></tr>`;
            showNotification(`${frontendMessages.errors.failedToFetchStats}: ${error.message}`, "error");
        }
    }

    function displayEndpointStats(stats) {
        if (!stats || stats.length === 0) {
            document.getElementById(
                "endpointStatsBody"
            ).innerHTML = `<tr><td colspan="3" class="text-center">${frontendMessages.admin.noStats}</td></tr>`;
            return;
        }

        const tableBody = document.getElementById("endpointStatsBody");
        tableBody.innerHTML = "";

        stats.forEach((stat) => {
            const row = document.createElement("tr");
            row.innerHTML = `
            <td>${stat.method}</td>
            <td>${stat.endpoint}</td>
            <td>${stat.calls}</td>
        `;
            tableBody.appendChild(row);
        });
    }

    fetchEndpointStats();

    document.getElementById("refreshStatsBtn").addEventListener("click", fetchEndpointStats);

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
