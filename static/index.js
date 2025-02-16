const SERVER_URL = "https://5e18-2601-647-4d82-9ec0-d9eb-b4df-6af4-6611.ngrok-free.app";
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
<div class="login-split" style="
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
">
  <div class="login-half" style="
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
  ">
    <div id="telegram-login-widget"></div>
  </div>

  <div class="login-half" style="
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    flex-wrap: wrap;
    align-content: center;
  ">
    <button id="spotify-login-button" onclick="loginSpotify()" style="
      background-color: #1ED760;
      color: #000;
      border: none;
      border-radius: 999px;
      padding: 10px 20px;
      font-family: Arial, sans-serif;
      font-size: 16px;
      font-weight: 500;
      text-overflow: ellipsis;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      margin-right: 8px;
    ">
      <svg style="width: 27px; height: 30px; margin-right: 8px;" viewBox="0 0 230 200" xmlns="http://www.w3.org/2000/svg">
        <path fill="#000" d="m122.37,3.31C61.99.91,11.1,47.91,8.71,108.29c-2.4,60.38,44.61,111.26,104.98,113.66,60.38,2.4,111.26-44.6,113.66-104.98C229.74,56.59,182.74,5.7,122.37,3.31Zm46.18,160.28c-1.36,2.4-4.01,3.6-6.59,3.24-.79-.11-1.58-.37-2.32-.79-14.46-8.23-30.22-13.59-46.84-15.93-16.62-2.34-33.25-1.53-49.42,2.4-3.51.85-7.04-1.3-7.89-4.81-.85-3.51,1.3-7.04,4.81-7.89,17.78-4.32,36.06-5.21,54.32-2.64,18.26,2.57,35.58,8.46,51.49,17.51,3.13,1.79,4.23,5.77,2.45,8.91Zm14.38-28.72c-2.23,4.12-7.39,5.66-11.51,3.43-16.92-9.15-35.24-15.16-54.45-17.86-19.21-2.7-38.47-1.97-57.26,2.16-1.02.22-2.03.26-3.01.12-3.41-.48-6.33-3.02-7.11-6.59-1.01-4.58,1.89-9.11,6.47-10.12,20.77-4.57,42.06-5.38,63.28-2.4,21.21,2.98,41.46,9.62,60.16,19.74,4.13,2.23,5.66,7.38,3.43,11.51Zm15.94-32.38c-2.1,4.04-6.47,6.13-10.73,5.53-1.15-.16-2.28-.52-3.37-1.08-19.7-10.25-40.92-17.02-63.07-20.13-22.15-3.11-44.42-2.45-66.18,1.97-5.66,1.15-11.17-2.51-12.32-8.16-1.15-5.66,2.51-11.17,8.16-12.32,24.1-4.89,48.74-5.62,73.25-2.18,24.51,3.44,47.99,10.94,69.81,22.29,5.12,2.66,7.11,8.97,4.45,14.09Z"></path>
      </svg>
      <span>Log in via Spotify</span>
    </button>
    <img id="spotify-profile-pic" src="" style="width: 40px; height: 40px; border-radius: 50%;" alt="spotify-profile-photo">
  </div>
</div>
`;
    updateModalContent(html, 1, async () => {
        const container = document.getElementById("telegram-login-widget");
        if (container) {
            const script = document.createElement("script");
            script.src = "https://telegram.org/js/telegram-widget.js?22";
            script.async = true;
            // Replace 'YourBotUsername' with your actual bot username or a global variable
            script.setAttribute("data-telegram-login", "PrayticSpotifyBot");
            script.setAttribute("data-size", "large");
            script.setAttribute("data-auth-url", `https://5e18-2601-647-4d82-9ec0-d9eb-b4df-6af4-6611.ngrok-free.app/telegram/check_authorization`);
            script.addEventListener("load", () => {
                fetch("/telegram/me")
                    .then(response => {
                        telegramLoggedIn = response.ok
                        updateEnterButtonState()
                    })
            });
            container.appendChild(script);
        }
        await checkSpotifyStatus()
    });
}

function loginSpotify() {
  window.location.href = `${SERVER_URL}/spotify/login`;
}

async function checkSpotifyStatus() {
    try {
        const res = await fetch(`${SERVER_URL}/spotify/me`, { credentials: 'include' });
        const button = document.getElementById("spotify-login-button");
        const profilePic = document.getElementById("spotify-profile-pic");
        if (res.ok) {
            const user = await res.json();
            spotifyLoggedIn = !!user.id;
            const photoUrl = (user.images && user.images.length) ? user.images[0].url : "";
            button.innerHTML = `
                <svg style="width: 27px; height: 30px; margin-top: -6px; margin-left: -12px; margin-right: 10px; margin-bottom: -4px" viewBox="0 0 230 200" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#000" d="m122.37,3.31C61.99.91,11.1,47.91,8.71,108.29c-2.4,60.38,44.61,111.26,104.98,113.66,60.38,2.4,111.26-44.6,113.66-104.98C229.74,56.59,182.74,5.7,122.37,3.31Zm46.18,160.28c-1.36,2.4-4.01,3.6-6.59,3.24-.79-.11-1.58-.37-2.32-.79-14.46-8.23-30.22-13.59-46.84-15.93-16.62-2.34-33.25-1.53-49.42,2.4-3.51.85-7.04-1.3-7.89-4.81-.85-3.51,1.3-7.04,4.81-7.89,17.78-4.32,36.06-5.21,54.32-2.64,18.26,2.57,35.58,8.46,51.49,17.51,3.13,1.79,4.23,5.77,2.45,8.91Zm14.38-28.72c-2.23,4.12-7.39,5.66-11.51,3.43-16.92-9.15-35.24-15.16-54.45-17.86-19.21-2.7-38.47-1.97-57.26,2.16-1.02.22-2.03.26-3.01.12-3.41-.48-6.33-3.02-7.11-6.59-1.01-4.58,1.89-9.11,6.47-10.12,20.77-4.57,42.06-5.38,63.28-2.4,21.21,2.98,41.46,9.62,60.16,19.74,4.13,2.23,5.66,7.38,3.43,11.51Zm15.94-32.38c-2.1,4.04-6.47,6.13-10.73,5.53-1.15-.16-2.28-.52-3.37-1.08-19.7-10.25-40.92-17.02-63.07-20.13-22.15-3.11-44.42-2.45-66.18,1.97-5.66,1.15-11.17-2.51-12.32-8.16-1.15-5.66,2.51-11.17,8.16-12.32,24.1-4.89,48.74-5.62,73.25-2.18,24.51,3.44,47.99,10.94,69.81,22.29,5.12,2.66,7.11,8.97,4.45,14.09Z"/>
                </svg>
                <span style="margin-right: 8px;">Log in as ${user.display_name}</span>
              `;
            profilePic.setAttribute("src", photoUrl)
        } else {
            spotifyLoggedIn = false
            button.innerHTML = `
                <svg style="width: 27px; height: 30px; margin-top: -6px; margin-left: -12px; margin-right: 10px; margin-bottom: -4px" viewBox="0 0 230 200" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#000" d="m122.37,3.31C61.99.91,11.1,47.91,8.71,108.29c-2.4,60.38,44.61,111.26,104.98,113.66,60.38,2.4,111.26-44.6,113.66-104.98C229.74,56.59,182.74,5.7,122.37,3.31Zm46.18,160.28c-1.36,2.4-4.01,3.6-6.59,3.24-.79-.11-1.58-.37-2.32-.79-14.46-8.23-30.22-13.59-46.84-15.93-16.62-2.34-33.25-1.53-49.42,2.4-3.51.85-7.04-1.3-7.89-4.81-.85-3.51,1.3-7.04,4.81-7.89,17.78-4.32,36.06-5.21,54.32-2.64,18.26,2.57,35.58,8.46,51.49,17.51,3.13,1.79,4.23,5.77,2.45,8.91Zm14.38-28.72c-2.23,4.12-7.39,5.66-11.51,3.43-16.92-9.15-35.24-15.16-54.45-17.86-19.21-2.7-38.47-1.97-57.26,2.16-1.02.22-2.03.26-3.01.12-3.41-.48-6.33-3.02-7.11-6.59-1.01-4.58,1.89-9.11,6.47-10.12,20.77-4.57,42.06-5.38,63.28-2.4,21.21,2.98,41.46,9.62,60.16,19.74,4.13,2.23,5.66,7.38,3.43,11.51Zm15.94-32.38c-2.1,4.04-6.47,6.13-10.73,5.53-1.15-.16-2.28-.52-3.37-1.08-19.7-10.25-40.92-17.02-63.07-20.13-22.15-3.11-44.42-2.45-66.18,1.97-5.66,1.15-11.17-2.51-12.32-8.16-1.15-5.66,2.51-11.17,8.16-12.32,24.1-4.89,48.74-5.62,73.25-2.18,24.51,3.44,47.99,10.94,69.81,22.29,5.12,2.66,7.11,8.97,4.45,14.09Z"/>
                </svg>
                <span>Log in via Spotify</span>
              `;
            profilePic.setAttribute("src", "")
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

