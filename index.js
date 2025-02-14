/*******************************************
 * Simple State Management
 ******************************************/
let currentStep = 1;

// Track login statuses
let telegramLoggedIn = false;
let spotifyLoggedIn = false;

// Data from the backend (placeholders)
let availableChannels = ["Channel A", "Channel B", "Channel C"];
let selectedChannel = null;
let channelAudioFiles = [
    "Song 1", "Song 2", "Song 3",
    "Song 4", "Song 5", "Song 6"
];
let checkedAudioFiles = [];

let existingPlaylists = ["My Favorites", "Road Trip", "Gym Tunes"];
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
 * Utility: Soft Transition
 ******************************************/
function updateModalContent(html, nextStep) {
    // Fade out
    modal.classList.add("fade-out");

    setTimeout(() => {
        // Update step
        if (typeof nextStep === "number") currentStep = nextStep;
        // Update breadcrumb
        breadcrumb.textContent = `Step ${currentStep} of 4`;

        // Update content
        modalContent.innerHTML = html;

        // Fade in
        modal.classList.remove("fade-out");

        // Re-check if the ENTER should be enabled or disabled
        updateEnterButtonState();
    }, 400); // matches our CSS transition duration (0.4s)
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
            // Must have a channel selected and at least one audio file checked
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
            // Final step: always enable for the final upload
            enterButton.disabled = false;
            break;
        default:
            break;
    }
}

/*******************************************
 * Step 1: Telegram & Spotify Login
 ******************************************/
function renderStep1() {
    let telegramStatus = telegramLoggedIn
        ? `<span class="status-icon success">&#10003;</span>`  // check mark
        : `<span class="status-icon fail">&#10007;</span>`;    // red X

    let spotifyStatus = spotifyLoggedIn
        ? `<span class="status-icon success">&#10003;</span>`
        : `<span class="status-icon fail">&#10007;</span>`;

    const html = `
    <div class="modal-header">Login Required</div>
    <div class="login-split">
      <div class="login-half">
        <button onclick="loginTelegram()">Login with Telegram</button>
        ${telegramStatus}
      </div>
      <div class="login-half">
        <button onclick="loginSpotify()">Login with Spotify</button>
        ${spotifyStatus}
      </div>
    </div>
  `;
    updateModalContent(html, 1);
}

// Simulate Telegram login flow
function loginTelegram() {
    // In a real implementation, you'd redirect to your Telegram OAuth flow
    setTimeout(() => {
        // Simulate success 80% of the time
        telegramLoggedIn = Math.random() < 0.8;
        renderStep1();
    }, 500);
}

// Simulate Spotify login flow
function loginSpotify() {
    // In a real implementation, you'd redirect to your Spotify OAuth flow
    setTimeout(() => {
        // Simulate success 80% of the time
        spotifyLoggedIn = Math.random() < 0.8;
        renderStep1();
    }, 500);
}

/*******************************************
 * Step 2: Choose Telegram Channel, then show list of Audio
 ******************************************/
function renderStep2() {
    let channelsHTML = availableChannels.map(ch => {
        return `<option value="${ch}">${ch}</option>`;
    }).join("");

    // Build checkboxes for audio files
    let audioListHTML = channelAudioFiles.map(file => {
        // If previously checked, keep it checked
        const checked = checkedAudioFiles.includes(file) ? "checked" : "";
        return `
      <label>
        <input type="checkbox" value="${file}" ${checked} onchange="onAudioCheckboxChange(this)">
        ${file}
      </label>
    `;
    }).join("");

    const html = `
    <div class="modal-header">Choose Telegram Channel</div>
    <select onchange="onChannelChange(this.value)">
      <option value="">-- Select Channel --</option>
      ${channelsHTML}
    </select>

    <div class="scrollable-list">
      <!-- Audio file checkboxes -->
      ${audioListHTML}
    </div>
  `;
    updateModalContent(html, 2);
}

function onChannelChange(value) {
    selectedChannel = value;
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
function renderStep3() {
    let existingListHTML = existingPlaylists.map(pl => {
        const isSelected = (!isNewPlaylist && selectedPlaylist === pl) ? "checked" : "";
        return `
      <label>
        <input type="radio" name="playlistChoice" value="${pl}" ${isSelected}
               onchange="onPlaylistRadioChange(false, '${pl}')">
        ${pl}
      </label>
    `;
    }).join("");

    // If user previously typed a new name
    const newPlaylistRadioChecked = isNewPlaylist ? "checked" : "";

    const html = `
    <div class="modal-header">Select or Create Spotify Playlist</div>
    
    <div class="playlist-options">
      <div>
        <strong>Existing Playlists:</strong>
        ${existingListHTML}
      </div>
      
      <div style="margin-top: 10px;">
        <label>
          <input type="radio" name="playlistChoice" ${newPlaylistRadioChecked}
                 onchange="onPlaylistRadioChange(true, '')">
          Create New Playlist
        </label>
        <br>
        <input type="text" placeholder="New Playlist Name" 
               style="width:100%;box-sizing:border-box;"
               value="${newPlaylistName}"
               oninput="onNewPlaylistNameChange(this.value)"
               ${isNewPlaylist ? "" : "disabled"}>
      </div>
    </div>
  `;
    updateModalContent(html, 3);
}

function onPlaylistRadioChange(newVal, plName) {
    isNewPlaylist = newVal;
    if (newVal) {
        selectedPlaylist = null;
        document.querySelector("input[type='text']").disabled = false;
    } else {
        selectedPlaylist = plName;
        document.querySelector("input[type='text']").disabled = true;
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
function renderStep4() {
    const playlistNameToShow = isNewPlaylist
        ? newPlaylistName
        : (selectedPlaylist || "N/A");
    const reviewHTML = `
    <div class="modal-header">Review Your Choices</div>
    <p><strong>Telegram Channel:</strong> ${selectedChannel}</p>
    <p><strong>Number of Songs:</strong> ${checkedAudioFiles.length}</p>
    <p><strong>Playlist Name:</strong> ${playlistNameToShow}</p>
    <div class="progress" id="progress-area">
      <!-- Progress and final results will appear here -->
      <p>Ready to upload. Press ENTER to proceed.</p>
    </div>
  `;
    updateModalContent(reviewHTML, 4);
}

function finalizeUpload() {
    const progressArea = document.getElementById("progress-area");
    if (!progressArea) return;

    // Simulate a "long" connection
    let total = checkedAudioFiles.length;
    let successCount = 0;
    let failCount = 0;
    let index = 0;
    let failedSongs = [];

    progressArea.innerHTML = `<p>Uploading ${total} songs...</p>`;

    let interval = setInterval(() => {
        if (index >= total) {
            clearInterval(interval);
            // Final results
            progressArea.innerHTML = `
        <p>Upload complete!</p>
        <p>Success: ${successCount}</p>
        <p>Failed: ${failCount}</p>
        ${
                failCount > 0
                    ? "<p>Failed Songs:<br>" + failedSongs.map(s => "- " + s).join("<br>") + "</p>"
                    : ""
            }
      `;
            return;
        }

        const currentSong = checkedAudioFiles[index];
        // Simulate success/fail
        if (Math.random() < 0.8) {
            successCount++;
        } else {
            failCount++;
            failedSongs.push(currentSong);
        }
        index++;

        progressArea.innerHTML = `
      <p>Uploading... ${index}/${total}</p>
      <p>Success so far: ${successCount}</p>
      <p>Failed so far: ${failCount}</p>
    `;
    }, 500);
}

/*******************************************
 * Navigation / Enter Handling
 ******************************************/
function goNextStep() {
    switch (currentStep) {
        case 1:
            renderStep2();
            break;
        case 2:
            renderStep3();
            break;
        case 3:
            renderStep4();
            break;
        case 4:
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

// Also trigger "ENTER" on keyboard press
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !enterButton.disabled) {
        goNextStep();
    }
});

/*******************************************
 * On Page Load: Always start at Step 1
 ******************************************/
window.onload = function() {
    // Always load Step 1 initially
    renderStep1();
};
