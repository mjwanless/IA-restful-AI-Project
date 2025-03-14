document.addEventListener("DOMContentLoaded", function () {
    const API_URL =
        window.location.hostname === "localhost" ? "http://localhost:3000/api" : "https://lyrics-generator-backend-883px.ondigitalocean.app/api";

    const generateBtn = document.getElementById("generateLyrics");
    const clearBtn = document.getElementById("clearBtn");
    const artistInput = document.getElementById("artistInput");
    const descInput = document.getElementById("descInput");
    const lengthSelect = document.getElementById("lengthSelect");
    const lyricsOutput = document.getElementById("lyricsOutput");
    const statusBadge = document.getElementById("statusBadge");
    const apiCallsCountElement = document.getElementById("apiCallsCount");

    updateApiCallsCount();

    generateBtn.addEventListener("click", async function () {
        try {
            const token = localStorage.getItem("jwt_token");

            if (!token) {
                throw new Error("Not authenticated. Please log in again.");
            }

            statusBadge.textContent = "Processing...";
            statusBadge.className = "badge bg-warning";
            lyricsOutput.textContent = "Generating lyrics, please wait...";
            generateBtn.disabled = true;

            const artist = artistInput.value.trim();
            const description = descInput.value.trim();
            const max_length = parseInt(lengthSelect.value, 10);

            const requestBody = {
                artist: artist,
                description: description,
                max_length: max_length,
                temperature: 0.9,
                top_p: 0.95,
                top_k: 5,
                complete_song: true,
            };

            const response = await fetch(`${API_URL}/generate-lyrics`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem("jwt_token");
                    window.location.href = "login.html";
                    throw new Error("Session expired. Please log in again.");
                }
                const errorData = await response.json();
                throw new Error(errorData.message || `API returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data && data.lyrics) {
                lyricsOutput.textContent = data.lyrics;
                statusBadge.textContent = "Success";
                statusBadge.className = "badge bg-success";

                if (data.apiCallsCount !== undefined && apiCallsCountElement) {
                    apiCallsCountElement.textContent = data.apiCallsCount;
                }

                if (data.limitReached) {
                    showNotification(data.limitMessage || "You have reached your free tier limit of 20 API calls.", "warning");
                }
            } else {
                throw new Error("No lyrics field in response");
            }
        } catch (error) {
            lyricsOutput.textContent = `Error: ${error.message}`;
            statusBadge.textContent = "Error";
            statusBadge.className = "badge bg-danger";
        } finally {
            generateBtn.disabled = false;
        }
    });

    clearBtn.addEventListener("click", function () {
        artistInput.value = "";
        descInput.value = "";
        lyricsOutput.textContent = "";
        statusBadge.textContent = "Ready";
        statusBadge.className = "badge bg-secondary";
    });

    function updateApiCallsCount() {
        const apiCallsCountElement = document.getElementById("apiCallsCount");
        if (!apiCallsCountElement) return;

        const token = localStorage.getItem("jwt_token");
        if (!token) return;

        fetch(`${API_URL}/user/profile`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to fetch profile");
                }
                return response.json();
            })
            .then((data) => {
                if (data && data.apiCallsCount !== undefined) {
                    apiCallsCountElement.textContent = data.apiCallsCount;
                }
            })
            .catch((error) => {
                console.error("Error fetching API calls count:", error);
            });
    }

    function showNotification(message, type = "info") {
        const container = document.getElementById("notification-container");
        if (!container) {
            const notificationContainer = document.createElement("div");
            notificationContainer.id = "notification-container";
            notificationContainer.style.position = "fixed";
            notificationContainer.style.top = "20px";
            notificationContainer.style.right = "20px";
            notificationContainer.style.zIndex = "1000";
            document.body.appendChild(notificationContainer);
        }

        const notification = document.createElement("div");
        notification.style.marginBottom = "10px";
        notification.style.padding = "15px";
        notification.style.borderRadius = "5px";
        notification.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
        notification.textContent = message;

        if (type === "warning") {
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
