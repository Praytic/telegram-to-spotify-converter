const SERVER_URL = "https://localhost:8000";
let currentStep = 1;

// Track login statuses
let telegramLoggedIn = false;
let spotifyLoggedIn = false;

// Data from the backend
let availableChannels = [];
let selectedChannel = null;
let channelAudioFiles = [];
let checkedAudioFiles = [];

let existingPlaylists = [];
let selectedPlaylist = null;
let isNewPlaylist = false;
let newPlaylistName = "";

/*******************************************
 * HTML Elements
 ******************************************/
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modal-content");
const breadcrumb = document.getElementById("breadcrumb");
const enterButton = document.getElementById("enter-button");

/*******************************************
 * Utility
 ******************************************/

// Soft transition that matches CSS transition duration (0.4s)
function updateModalContent(html, nextStep, callback) {
    modal.classList.add("fade-out");
    setTimeout(() => {
        if (typeof nextStep === "number") currentStep = nextStep;
        breadcrumb.textContent = `Step ${currentStep} of 4`;
        modalContent.innerHTML = html;
        modal.classList.remove("fade-out");
        updateEnterButtonState();
        if (callback) callback()
    }, 400);
}

function updateEnterButtonState() {
    // By default, disable it. We'll enable it step-by-step if conditions are met.
    enterButton.disabled = true;

    switch (currentStep) {
        case 1:
            // Enable only if both Telegram & Spotify logins are successful
            if (telegramLoggedIn && spotifyLoggedIn) {
                enterButton.disabled = false;
            }
            break;
        case 2:
            // Must have a channel selected + at least one checked song
            if (selectedChannel && checkedAudioFiles.length > 0) {
                enterButton.disabled = false;
            }
            break;
        case 3:
            // Must choose or create a playlist
            if (
                (isNewPlaylist && newPlaylistName.trim().length > 0) ||
                (!isNewPlaylist && selectedPlaylist)
            ) {
                enterButton.disabled = false;
            }
            break;
        case 4:
            // Final step: always enable so user can finalize the upload
            enterButton.disabled = false;
            break;
        default:
            break;
    }
}

/*******************************************
 * Step 1: Telegram & Spotify Login
 ******************************************/
async function renderStep1() {
    const html = `
    <div class="modal-header">Login Required</div>
    <div class="login-split">
      <div class="login-half">
        <button onclick="loginTelegram()">Login with Telegram</button>
        <span id="telegram-status" class="status-icon fail">&#10007;</span>
      </div>
      <div class="login-half">
        <button onclick="loginSpotify()">Login with Spotify</button>
        <span id="spotify-status" class="status-icon fail">&#10007;</span>
      </div>
    </div>
  `;
    updateModalContent(html, 1, async () => {
        await checkTelegramStatus();
        await checkSpotifyStatus();
    });
}

async function loginTelegram() {
  const phone = prompt("Enter your Telegram phone number (with country code):");
  if (!phone) {
    alert("No phone number entered.");
    return;
  }
  try {
    const res = await fetch(`${SERVER_URL}/telegram/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      await checkTelegramStatus();
    } else {
      alert("Telegram login failed: " + (data.error || "Unknown error"));
    }
  } catch (error) {
    alert("Telegram login request failed.");
  }
}

async function checkTelegramStatus() {
  try {
    const res = await fetch(`${SERVER_URL}/telegram/logged_in`);
    const data = await res.json();
    telegramLoggedIn = data.logged_in;
    if (telegramLoggedIn) {
      const el = document.getElementById("telegram-status");
      el.textContent = "✓";
      el.classList.remove("fail");
      el.classList.add("success");
    }
    updateEnterButtonState();
  } catch {}
}

function loginSpotify() {
  window.location.href = `${SERVER_URL}/spotify/login`;
}

async function checkSpotifyStatus() {
    try {
        const res = await fetch(`${SERVER_URL}/spotify/me`);
        if (res.ok) {
            const user = await res.json();
            spotifyLoggedIn = !!user.id;
            const el = document.getElementById("spotify-status");
            if (spotifyLoggedIn && el) {
                el.textContent = "✓";
                el.classList.remove("fail");
                el.classList.add("success");
                const spotifyButton = document.querySelector("button[onclick='loginSpotify()']");
                if (spotifyButton && user.display_name) {
                    const parent = spotifyButton.parentElement;
                    parent.removeChild(spotifyButton);
                    const label = document.createElement("span");
                    label.textContent = user.display_name;
                    parent.prepend(label);
                }
            }
        }
    } catch {}
    updateEnterButtonState();
}

async function fetchSongsFromTelegramChannel(chatId) {
  try {
    const res = await fetch(`${SERVER_URL}/telegram/songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat: chatId })
    });
    if (!res.ok) {
      const errData = await res.json();
      alert("Error: " + (errData.error || "unknown"));
      return [];
    }
    const data = await res.json();
    return data.songs || [];
  } catch {
    return [];
  }
}

async function addSongsToSpotify(playlistName, songs) {
  try {
    const res = await fetch(`${SERVER_URL}/spotify/add_songs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistName, songs })
    });
    const data = await res.json();
    if (res.ok) {
      alert(`Songs added. Missing: ${data.not_found.length}`);
    } else {
      alert("Error adding songs: " + (data.error || "Unknown"));
    }
  } catch {}
}

/*******************************************
 * Step 2: Choose Telegram Channel, then show list of Audio
 ******************************************/
async function renderStep2() {
    // Get channels from backend
    try {
        const res = await fetch(`${SERVER_URL}/channels`);
        const data = await res.json();
        availableChannels = data.channels || [];
    } catch (err) {
        console.error("Error fetching channels:", err);
        availableChannels = [];
    }

    // We'll populate the audio list once the user picks a channel
    channelAudioFiles = [];
    selectedChannel = null;
    checkedAudioFiles = [];

    let channelsHTML = availableChannels.map(ch => {
        return `<option value="${ch}">${ch}</option>`;
    }).join("");

    const html = `
    <div class="modal-header">Choose Telegram Channel</div>
    <select id="channel-select">
      <option value="">-- Select Channel --</option>
      ${channelsHTML}
    </select>

    <div class="scrollable-list" id="audio-list">
      <!-- Audio file checkboxes will appear after selecting channel -->
    </div>
  `;
    updateModalContent(html, 2, () => {
        const channelSelect = document.getElementById("channel-select");
        channelSelect.addEventListener("change", onChannelChange);
    });
}

async function onChannelChange(event) {
    selectedChannel = event.target.value;
    channelAudioFiles = [];
    checkedAudioFiles = [];

    // Fetch songs for the selected channel
    if (selectedChannel) {
        try {
            let res = await fetch(`${SERVER_URL}/songs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channel: selectedChannel })
            });
            let data = await res.json();
            channelAudioFiles = data.songs || [];
        } catch (err) {
            console.error("Error fetching songs:", err);
            channelAudioFiles = [];
        }

        // Update the audio list UI
        const audioList = document.getElementById("audio-list");
        audioList.innerHTML = channelAudioFiles.map(file => {
            return `
        <label>
          <input type="checkbox" value="${file}" onchange="onAudioCheckboxChange(this)">
          ${file}
        </label>
      `;
        }).join("");
    } else {
        // If no channel selected, clear audio list
        const audioList = document.getElementById("audio-list");
        audioList.innerHTML = "";
    }

    updateEnterButtonState();
}

function onAudioCheckboxChange(checkbox) {
    const val = checkbox.value;
    if (checkbox.checked && !checkedAudioFiles.includes(val)) {
        checkedAudioFiles.push(val);
    } else if (!checkbox.checked && checkedAudioFiles.includes(val)) {
        checkedAudioFiles = checkedAudioFiles.filter(item => item !== val);
    }
    updateEnterButtonState();
}

/*******************************************
 * Step 3: Choose or Create Spotify Playlist
 ******************************************/
async function renderStep3() {
    // Fetch existing playlists
    try {
        let res = await fetch(`${SERVER_URL}/playlists`);
        let data = await res.json();
        existingPlaylists = data.playlists || [];
    } catch (err) {
        console.error("Error fetching playlists:", err);
        existingPlaylists = [];
    }

    selectedPlaylist = null;
    isNewPlaylist = false;
    newPlaylistName = "";

    let existingListHTML = existingPlaylists.map(pl => {
        return `
      <label>
        <input type="radio" name="playlistChoice" value="${pl}"
               onchange="onPlaylistRadioChange(false, '${pl}')">
        ${pl}
      </label>
    `;
    }).join("");

    const html = `
    <div class="modal-header">Select or Create Spotify Playlist</div>
    <div class="playlist-options">
      <div>
        <strong>Existing Playlists:</strong>
        ${existingListHTML}
      </div>
      <div style="margin-top: 10px;">
        <label>
          <input type="radio" name="playlistChoice"
                 onchange="onPlaylistRadioChange(true, '')">
          Create New Playlist
        </label>
        <br>
        <input type="text" id="new-playlist-name" placeholder="New Playlist Name"
               style="width:100%;box-sizing:border-box;" disabled>
      </div>
    </div>
  `;
    updateModalContent(html, 3, () => {
        const newPlaylistInput = document.getElementById("new-playlist-name");
        newPlaylistInput.addEventListener("input", (e) => {
            onNewPlaylistNameChange(e.target.value);
        });
    });
}

function onPlaylistRadioChange(newVal, plName) {
    isNewPlaylist = newVal;
    if (newVal) {
        selectedPlaylist = null;
        document.getElementById("new-playlist-name").disabled = false;
    } else {
        selectedPlaylist = plName;
        document.getElementById("new-playlist-name").value = "";
        document.getElementById("new-playlist-name").disabled = true;
    }
    updateEnterButtonState();
}

function onNewPlaylistNameChange(value) {
    newPlaylistName = value;
    updateEnterButtonState();
}

/*******************************************
 * Step 4: Review & Final Upload
 ******************************************/
async function renderStep4() {
    const playlistNameToShow = isNewPlaylist ? newPlaylistName : (selectedPlaylist || "N/A");
    const reviewHTML = `
    <div class="modal-header">Review Your Choices</div>
    <p><strong>Telegram Channel:</strong> ${selectedChannel}</p>
    <p><strong>Number of Songs:</strong> ${checkedAudioFiles.length}</p>
    <p><strong>Playlist Name:</strong> ${playlistNameToShow}</p>
    <div class="progress" id="progress-area">
      <!-- This will show final results after upload -->
      <p>Ready to upload. Press ENTER to proceed.</p>
    </div>
  `;
    updateModalContent(reviewHTML, 4);
}

async function finalizeUpload() {
    const progressArea = document.getElementById("progress-area");
    if (!progressArea) return;

    // If user decided to create a new playlist, create it first
    let finalPlaylistName = selectedPlaylist;
    if (isNewPlaylist && newPlaylistName.trim().length > 0) {
        try {
            let res = await fetch(`${SERVER_URL}/create_playlist`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newPlaylistName })
            });
            let data = await res.json();
            if (data.success) {
                finalPlaylistName = data.playlistName;
            } else {
                // Possibly the playlist already exists or error
                progressArea.innerHTML = `<p>Error creating playlist: ${data.error || "Unknown error"}</p>`;
                return;
            }
        } catch (err) {
            progressArea.innerHTML = `<p>Error creating playlist: ${err}</p>`;
            return;
        }
    }

    // Now upload songs
    progressArea.innerHTML = "<p>Uploading songs, please wait...</p>";
    try {
        let res = await fetch(`${SERVER_URL}/upload_songs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                channel: selectedChannel,
                songs: checkedAudioFiles,
                playlist: finalPlaylistName
            })
        });
        let data = await res.json();
        const { successCount, failCount, failedSongs } = data;
        let resultHTML = `
      <p>Upload complete!</p>
      <p>Success: ${successCount}</p>
      <p>Failed: ${failCount}</p>
    `;
        if (failCount > 0 && Array.isArray(failedSongs)) {
            resultHTML += `<p>Failed Songs:<br>${failedSongs.map(s => "- " + s).join("<br>")}</p>`;
        }
        progressArea.innerHTML = resultHTML;
    } catch (err) {
        console.error("Error uploading songs:", err);
        progressArea.innerHTML = `<p>Error uploading songs: ${err}</p>`;
    }
}

/*******************************************
 * Navigation / Enter Handling
 ******************************************/
function goNextStep() {
    switch (currentStep) {
        case 1:
            // Step 1 -> Step 2
            renderStep2();
            break;
        case 2:
            // Step 2 -> Step 3
            renderStep3();
            break;
        case 3:
            // Step 3 -> Step 4
            renderStep4();
            break;
        case 4:
            // Final: upload
            finalizeUpload();
            break;
        default:
            break;
    }
}

enterButton.addEventListener("click", () => {
    if (!enterButton.disabled) {
        goNextStep();
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !enterButton.disabled) {
        goNextStep();
    }
});

/*******************************************
 * On Page Load: Always start at Step 1
 ******************************************/
window.onload = function() {
    renderStep1();
};
