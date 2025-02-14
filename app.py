#!/usr/bin/env python3
"""
Mock backend for the multi-step modal UI.
Provides endpoints for:
- Telegram login (random success)
- Spotify login (random success)
- Retrieving Telegram channels
- Retrieving channel audio files
- Listing and creating Spotify playlists
- Uploading songs (simulated with random success/fail)
"""

import random
from flask import Flask, request, jsonify

app = Flask(__name__)

# In-memory mock data (global variables)
CHANNELS = ["Channel A", "Channel B", "Channel C"]
SONGS = {
    "Channel A": ["Song 1", "Song 2", "Song 3"],
    "Channel B": ["Song 4", "Song 5", "Song 6"],
    "Channel C": ["Song 7", "Song 8", "Song 9"],
}
PLAYLISTS = ["My Favorites", "Road Trip", "Gym Tunes"]

@app.route('/telegram_login', methods=['GET'])
def telegram_login():
    """
    Mocks Telegram login via web auth.
    Returns random success/fail (80% chance success).
    """
    success = (random.random() < 0.8)
    return jsonify({"success": success})

@app.route('/spotify_login', methods=['GET'])
def spotify_login():
    """
    Mocks Spotify login via web auth.
    Returns random success/fail (80% chance success).
    """
    success = (random.random() < 0.8)
    return jsonify({"success": success})

@app.route('/channels', methods=['GET'])
def get_channels():
    """
    Returns the list of Telegram channels in memory.
    """
    return jsonify({"channels": CHANNELS})

@app.route('/songs', methods=['POST'])
def get_songs():
    """
    Expects JSON: { "channel": "<ChannelName>" }
    Returns the songs for that channel as { "songs": [...] }
    """
    data = request.get_json(force=True)
    channel_name = data.get("channel", "")
    songs_for_channel = SONGS.get(channel_name, [])
    return jsonify({"songs": songs_for_channel})

@app.route('/playlists', methods=['GET'])
def get_playlists():
    """
    Returns the list of Spotify playlists in memory.
    """
    return jsonify({"playlists": PLAYLISTS})

@app.route('/create_playlist', methods=['POST'])
def create_playlist():
    """
    Expects JSON: { "name": "<NewPlaylistName>" }
    Adds a new playlist to the in-memory list if it doesn't already exist.
    Returns { "success": bool, "playlistName": "..."}.
    """
    data = request.get_json(force=True)
    new_name = data.get("name", "").strip()
    if not new_name:
        return jsonify({"success": False, "error": "Playlist name is empty"}), 400

    if new_name in PLAYLISTS:
        return jsonify({"success": False, "error": "Playlist already exists"}), 400

    PLAYLISTS.append(new_name)
    return jsonify({"success": True, "playlistName": new_name})

@app.route('/upload_songs', methods=['POST'])
def upload_songs():
    """
    Expects JSON:
    {
      "channel": "Channel A",
      "songs": ["Song 1", "Song 2", ...],
      "playlist": "My Favorites"
    }

    Simulates uploading songs to the Spotify playlist with random success/failure.
    Returns a summary:
    {
      "successCount": <int>,
      "failCount": <int>,
      "failedSongs": [ ... ]
    }
    """
    data = request.get_json(force=True)
    selected_songs = data.get("songs", [])

    total = len(selected_songs)
    success_count = 0
    failed_songs = []

    # Randomly mark ~80% as success
    for song in selected_songs:
        if random.random() < 0.8:
            success_count += 1
        else:
            failed_songs.append(song)

    fail_count = len(failed_songs)
    return jsonify({
        "successCount": success_count,
        "failCount": fail_count,
        "failedSongs": failed_songs
    })

if __name__ == '__main__':
    # Run on localhost:5000 by default
    app.run(debug=True)
