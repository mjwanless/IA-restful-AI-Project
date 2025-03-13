document.addEventListener("DOMContentLoaded", function () {
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

            const response = await fetch("http://localhost:3000/api/admin/users", {
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
                <td>${user.email}${user.is_admin ? ' <span class="badge bg-info">Admin</span>' : ""}</td>
                <td>${user.api_calls_count}</td>
                <td>${createdDate}</td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button class="btn btn-outline-secondary reset-api-btn" data-user-id="${user.id}" data-user-email="${user.email}">
                            Reset API Count
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
    }

    async function resetUserApiCount() {
        try {
            if (!selectedUserId) return;

            const token = localStorage.getItem("jwt_token");
            if (!token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`http://localhost:3000/api/admin/reset-api-count/${selectedUserId}`, {
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
});
