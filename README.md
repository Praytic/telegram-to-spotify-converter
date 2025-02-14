# telegram-to-spotify-converter

## How to setup

1. Install python libs
   ```
   pip install -r requirements.txt
   ```

2. Create Spotify developer account at https://developer.spotify.com/

3. Add `SPOTIPY_CLIENT_ID`, `SPOTIPY_CLIENT_SECRET`, `SPOTIPY_REDIRECT_URI` secrets to .env file in the project root dir

4. Create Telegram app at https://core.telegram.org/api/obtaining_api_id

5. Add `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` secrets to the same .env file

6. Run backend with frontend
   ```
   ./start.sh
   ```

Follow instructions in the std output.
