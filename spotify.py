# spotify.py
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from spotipy.oauth2 import SpotifyClientCredentials
import json


def user_playlist_get_or_create(spotify: spotipy.Spotify, username, name):
    print(f"Getting user [{username}] playlist with name [{name}].")
    all_playlists = spotify.user_playlists(username)
    for playlist in all_playlists['items']:
        if playlist['name'] == name:
            return playlist['id']
    return spotify.user_playlist_create(username, name)['id']


def process_songs(spotify: spotipy.Spotify, username, playlist_name, songs):
    """
    Creates (or retrieves) the playlist, searches for the songs, adds them in pages of 100.
    """
    playlist_id = user_playlist_get_or_create(spotify, username, playlist_name)

    unfound = []
    tracks = []

    for song in songs:
        print(f"Searching for song [{song}].")
        results = spotify.search(q=song, limit=3)['tracks']['items']
        if len(results) > 0:
            first_result = results[0]
            uri = first_result['uri']
            tracks.append(uri)
            print(f"Successfully found song [{song}].")
        else:
            unfound.append(song)
            print(f"Failed to find song [{song}] on Spotify.")

    # Paginate addition (Spotify imposes limit of 100 items at a time)
    paginate = 0
    while paginate < len(tracks):
        next_page = paginate + 100
        paged_tracks = tracks[paginate:next_page]
        paginate = next_page
        print(f"Add [{len(paged_tracks)}] songs to playlist [{playlist_id}].")
        spotify.playlist_add_items(playlist_id, paged_tracks)

    # Optionally write out `unfound`
    if unfound:
        with open("failed_spotify.json", "w", encoding="utf-8") as f:
            json.dump(unfound, f, ensure_ascii=False, separators=(",\n", ": "))

    return {
        "playlist_id": playlist_id,
        "total_requested": len(songs),
        "not_found": unfound
    }
