# app.py
import asyncio
import base64
import hashlib
import os
import re
import secrets
import string
import requests
import urllib.parse
import json, hmac, time, urllib.parse

from dotenv import load_dotenv
from flask import Flask, request, jsonify, session, redirect, url_for, send_from_directory
from flask_cors import CORS
from flask_session import Session
from datetime import timedelta

# For Spotify
import spotipy
from spotipy.oauth2 import SpotifyOAuth

# For Telethon
from telethon import TelegramClient, sync, errors, functions
from telethon.tl import functions as f, types as t

# Our separate logic
import spotify as spint
import tele

load_dotenv()

# Flask app setup
app = Flask(__name__,  static_folder='static', static_url_path='')
SECRET_KEY = os.getenv('FLASK_SECRET_KEY')
PERMANENT_SESSION_LIFETIME = timedelta(days=1)
SESSION_TYPE = "redis"
SESSION_COOKIE_SAMESITE = "None"
SESSION_COOKIE_SECURE = True  # Set True in production with HTTPS
TELEGRAM_API_HASH = os.getenv('TELEGRAM_API_HASH')
TELEGRAM_API_ID = os.getenv('TELEGRAM_API_ID')
app.config.from_object(__name__)

Session(app)
CORS(app, resources={
    r"/*": {
        "origins": [re.compile(r"^https://localhost:\d+$"), "https://your-production-site.com"]
    }
})

# Telegram credentials
TELEGRAM_API_ID = os.getenv('TELEGRAM_API_ID')
TELEGRAM_API_ID = int(TELEGRAM_API_ID) if TELEGRAM_API_ID is not None else None
TELEGRAM_API_HASH = os.getenv('TELEGRAM_API_HASH')
TELEGRAM_BOT_TOKEN = os.getenv('BOT_TOKEN')
TELEGRAM_BOT_NAME = os.getenv('BOT_NAME')

SPOTIFY_USERNAME = os.getenv('USERNAME', '')
SPOTIPY_CLIENT_ID = os.getenv('SPOTIPY_CLIENT_ID')
SPOTIPY_CLIENT_SECRET = os.getenv('SPOTIPY_CLIENT_SECRET')
SPOTIPY_REDIRECT_URI = os.getenv('SPOTIPY_REDIRECT_URI')

# We'll keep a single Telethon client in memory or a session file on disk:
TELETHON_SESSION_NAME = 'web-telethon-session'  # or any name
telethon_client = None

# Read more about Authorization Code Flow with Spotify:
# https://spotipy.readthedocs.io/en/2.11.2/#authorization-code-flow
scope = 'playlist-modify-public'
spotify_oauth = SpotifyOAuth(scope=scope)

try:
    asyncio.get_running_loop()
except RuntimeError:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

@app.route('/', methods=['GET'])
def redirect_to_index():
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
    return send_from_directory(root, 'index.html')

#################################################
# TELEGRAM AUTH
#################################################

@app.route('/telegram/check_authorization', methods=['GET'])
def telegram_check_authorization():
    auth_data = request.args.to_dict()
    try:
        check_hash = auth_data.get('hash')

        if not check_hash:
            return "Missing hash", 400

        data = {k: v for k, v in auth_data.items() if k != 'hash'}
        data_check_arr = [f"{k}={v}" for k, v in data.items()]
        data_check_arr.sort()
        data_check_string = "\n".join(data_check_arr)
        secret_key = hashlib.sha256(TELEGRAM_BOT_TOKEN.encode("utf-8")).digest()
        computed_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()

        if computed_hash != check_hash:
            return "Data is NOT from Telegram", 403

        auth_date = int(data.get('auth_date', 0))

        if (time.time() - auth_date) > 86400:
            return "Data is outdated", 403

        auth_data_json = json.dumps(auth_data)
        response = redirect('/telegram/me')
        response.set_cookie('tg_user', urllib.parse.quote(auth_data_json))
        return response
    except Exception as e:
        return str(e), 400


@app.route('/telegram/me', methods=['GET'])
def telegram_me():
    tg_user_json = request.cookies.get('tg_user')
    if tg_user_json:
        tg_user = json.loads(urllib.parse.unquote(tg_user_json))
        session["telegram_user_hash"] = tg_user["hash"]
        session["telegram_user_id"] = tg_user["id"]
        session["telegram_user_name"] = tg_user["username"]
        session.modified = True
        return jsonify(tg_user)
    else:
        html = f"""<h1>Hello, anonymous!</h1>
<script async src="https://telegram.org/js/telegram-widget.js?22" data-telegram-login="${TELEGRAM_BOT_NAME}" data-size="large" data-auth-url="https://my.ngrok-free.app/telegram/check_authorization"></script>"""
        return html


@app.route("/telegram/channels", methods=["GET"])
def get_telegram_channels():
    user_hash = session.get("telegram_user_hash")
    username = session.get("telegram_user_name")
    if not user_hash or not username:
        return jsonify({"error": "User has not authorized with Telegram"}), 401

    try:
        result = loop.run_until_complete(fetch_channels(user_hash, username))
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def format_for_spotify(query_str):
    return (query_str.replace("&", ",")
            .replace("feat.", ",")
            .replace("feat", ",")
            .replace("...", "")
            .replace("..", "")
            .replace("•", "")
            .replace("/","")
            .replace(".", " ."))


async def fetch_channels(phone_code_hash, session_name):
    client = TelegramClient(session_name, TELEGRAM_API_ID, TELEGRAM_API_HASH)
    await client.start()

    songs = []
    broken_songs = []

    async for message in client.iter_messages("@test_praytic_music"):
        media = message.media
        if media and hasattr(media, 'document'):
            attributes = media.document.attributes[0]
            try:
                if hasattr(attributes, 'performer') and attributes.performer:
                    # If there's a separate 'title'
                    title = attributes.title or ""
                    search_str = title + ' ' + attributes.performer
                    search_str = format_for_spotify(search_str)
                    if not search_str.strip():
                        # fallback to the message text if we can't parse
                        search_str = message.message.split("\n")[-1]

                    songs.append(search_str)
                else:
                    # fallback or ignoring if no performer
                    pass
            except Exception as ex:
                broken_str = f"{attributes.performer} {attributes.title}" if attributes else "unknown"
                broken_songs.append(broken_str)

    client.disconnect()

    return songs


@app.route('/telegram/songs', methods=['POST'])
def telegram_songs():
    """
    Expects JSON: { "chat": "some_channel_or_group_id" }
    Uses the Telethon client to read messages and return a list of parsed songs.
    """
    global telethon_client
    if not (telethon_client and telethon_client.is_user_authorized()):
        return jsonify({"error": "Telegram not logged in"}), 401

    data = request.get_json(force=True)
    chat = data.get('chat', None)
    if not chat:
        return jsonify({"error": "No chat specified"}), 400

    # Use tele.py logic
    songs = tele.get_songs_from_telegram(telethon_client, chat)
    return jsonify({"songs": songs})


#################################################
# SPOTIFY AUTH
#################################################

@app.route('/spotify/login', methods=['GET'])
def spotify_login():
    session.permanent = True

    code_verifier = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(64))
    hashed = hashlib.sha256(code_verifier.encode("utf-8")).digest()
    code_challenge = base64.urlsafe_b64encode(hashed).decode("utf-8").rstrip("=")
    session["code_verifier"] = code_verifier
    params = {
        "client_id": SPOTIPY_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": SPOTIPY_REDIRECT_URI,
        "scope": scope,
        "code_challenge_method": "S256",
        "code_challenge": code_challenge
    }
    url = "https://accounts.spotify.com/authorize?" + urllib.parse.urlencode(params)
    return redirect(url)

@app.route('/spotify/callback', methods=['GET'])
def spotify_callback():
    """
    Spotify redirects here after the user logs in and authorizes.
    We'll fetch the token and store it in the session.
    """
    code = request.args.get("code")
    if not code:
        return "No code returned."
    code_verifier = session.get("code_verifier")
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": SPOTIPY_REDIRECT_URI,
        "client_id": SPOTIPY_CLIENT_ID,
        "code_verifier": code_verifier
    }
    r = requests.post("https://accounts.spotify.com/api/token", data=data)
    token_info = r.json()

    session["access_token"] = token_info.get("access_token")

    return redirect("/")

@app.route('/spotify/me', methods=['GET'])
def spotify_me():
    access_token = session.get("access_token")
    if not access_token:
        return jsonify({"error": "Not logged in"}), 401
    headers = {"Authorization": f"Bearer {access_token}"}
    r = requests.get("https://api.spotify.com/v1/me", headers=headers)
    return jsonify(r.json())

#################################################
# ADD SONGS TO SPOTIFY
#################################################

@app.route('/spotify/add_songs', methods=['POST'])
def spotify_add_songs():
    """
    Expects JSON: {
      "playlistName": "MyPlaylist",
      "songs": ["Song A", "Song B", ...]
    }
    Creates or retrieves the playlist, searches songs, adds them.
    """
    sp_client = get_spotify_client_from_session()
    if not sp_client:
        return jsonify({"error": "Not logged in to Spotify"}), 401

    data = request.get_json(force=True)
    playlist_name = data.get("playlistName", "New Playlist")
    songs = data.get("songs", [])

    if not songs:
        return jsonify({"error": "No songs provided"}), 400

    result = spint.process_songs(sp_client, SPOTIFY_USERNAME, playlist_name, songs)
    return jsonify(result)


#################################################
# HELPER: GET SPOTIFY CLIENT FROM SESSION
#################################################

def get_spotify_client_from_session():
    """
    Uses session['spotify_token_info'] to build a valid Spotify client.
    Also refreshes token if needed.
    """
    if 'spotify_token_info' not in session:
        return None

    token_info = session['spotify_token_info']
    # Check if token is expired
    if spotify_oauth.is_token_expired(token_info):
        token_info = spotify_oauth.refresh_access_token(token_info['refresh_token'])
        session['spotify_token_info'] = token_info

    # Return a spotipy client
    sp = spotipy.Spotify(auth=token_info['access_token'])
    return sp
