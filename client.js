document.addEventListener("DOMContentLoaded", function () {
    // Grab elements
    const generateBtn = document.getElementById("generateLyrics");
    const clearBtn = document.getElementById("clearBtn");
    const artistInput = document.getElementById("artistInput");
    const descInput = document.getElementById("descInput");
    const lyricsOutput = document.getElementById("lyricsOutput");
    const statusBadge = document.getElementById("statusBadge");
  
    // (Logout functionality is now handled by auth_script.js)
  
    // Generate lyrics
    generateBtn.addEventListener("click", async function () {
      try {
        // Show "Processing" status
        statusBadge.textContent = "Processing...";
        statusBadge.className = "badge bg-warning";
        lyricsOutput.textContent = "Generating lyrics, please wait...";
        generateBtn.disabled = true;
  
        // Collect user input
        const artist = artistInput.value.trim();
        const description = descInput.value.trim();
  
        // EXACT order from your screenshot
        const requestBody = {
          artist: artist,
          description: description,
          max_length: 50,
          temperature: 0.9,
          top_p: 0.95,
          top_k: 5,
          complete_song: true
        };
  
        console.log("Sending request:", requestBody);
  
        // Call your proxy endpoint (server.js)
        const response = await fetch("http://localhost:3000/api/generate-lyrics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });
  
        console.log("Response status:", response.status);
  
        if (!response.ok) {
          throw new Error(
            `API returned ${response.status}: ${response.statusText}`
          );
        }
  
        const data = await response.json();
        console.log("Response data:", data);
  
        if (data && data.lyrics) {
          lyricsOutput.textContent = data.lyrics;
          statusBadge.textContent = "Success";
          statusBadge.className = "badge bg-success";
        } else {
          throw new Error("No lyrics field in response");
        }
      } catch (error) {
        console.error("Error:", error);
        lyricsOutput.textContent = `Error: ${error.message}`;
        statusBadge.textContent = "Error";
        statusBadge.className = "badge bg-danger";
      } finally {
        generateBtn.disabled = false;
      }
    });
  
    // Clear form and output
    clearBtn.addEventListener("click", function () {
      artistInput.value = "";
      descInput.value = "";
      lyricsOutput.textContent = "";
      statusBadge.textContent = "Ready";
      statusBadge.className = "badge bg-secondary";
    });
  });
  