# tele.py
from telethon.sync import TelegramClient
from telethon.tl.types import MessageMediaPhoto
from colorama import init
from termcolor import cprint
import json

init()

def print_red_onwhite(x):
    cprint(x, 'red', 'on_white')

def print_green_onwhite(x):
    cprint(x, 'green', 'on_white')

def print_red(x):
    cprint(x, 'red')

def format_for_spotify(query_str):
    return (query_str.replace("&", ",")
            .replace("feat.", ",")
            .replace("feat", ",")
            .replace("...", "")
            .replace("..", "")
            .replace("•", "")
            .replace("/","")
            .replace(".", " ."))

def save_file(songs, filename):
    print("Saving songs to file: {}".format(filename))
    with open(filename + ".json", "w", encoding="utf-8") as file:
        json.dump(songs, file, ensure_ascii=False, separators=(",\n", ": "))

async def get_songs_from_telegram(client: TelegramClient, chat):
    """
    Uses an *authenticated* Telethon client to iterate messages and build a list of songs.
    """
    songs = []
    broken_songs = []

    async for message in client.iter_messages(chat):
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
                print_red_onwhite(f"Failed to parse telegram song {broken_str}")

    # Optionally save broken
    if broken_songs:
        save_file(broken_songs, "tele_fail")

    return songs
