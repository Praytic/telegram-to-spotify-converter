> **IMPORTANT:**
> Repository is archived in favor of https://github.com/Praytic/praytic-spotify-telegram-mini-app.

# telegram-to-spotify-playlist-converter

<p align="center" style="text-align:center;">
<img width="1136" alt="Screenshot 2025-02-16 at 7 23 08 PM" src="https://github.com/user-attachments/assets/491e6aad-c848-46dd-bcd1-29abc5bffdf4" />
<i>Home page screenshot</i>
</p>

## How run locally

1. Install python libs
   ```
   pip install -r requirements.txt
   ```

2. You will need to create self-signed certificates and `ngrok` in order to make your backend available by domain name under secured HTTP protocol.
   1. Follow these instructions: https://gist.github.com/lyoshenka/002b7fbd801d0fd21f2f.
   2. After you aquire a domain name, copy it as `https://<your-domain>` and use in the next steps as your redirect URI.
   3. Replace all `my.ngrok-free.app` occurrences in code with `<your-domain>`.

3. Create Spotify developer account at https://developer.spotify.com/. Add `SPOTIPY_CLIENT_ID`, `SPOTIPY_CLIENT_SECRET`, `SPOTIPY_REDIRECT_URI` secrets to .env file in the project root dir

4. Create Telegram app at https://my.telegram.org/apps. It's required to make Telegram API requests on behalf of the user. Add `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` secrets to the same .env file.

5. Create Telegram bot using [@BotFather](https://t.me/botfather). It is required for the web flow authentication via [Telegram Login Widgets](https://core.telegram.org/widgets/login). Add `BOT_TOKEN` to .env file. Set bot domain to `<your-domain>`.

6. Create random `FLASK_SECRET_KEY` at https://flask.palletsprojects.com/en/stable/config/#SECRET_KEY and add it to .env file. It is will be used for securely signing the session cookie.

7. Run Redis locally for storing user sessions. If you have Docker installed:
   ```
    docker run -d -p 6379:6379 redis
   ```
   
8. Run backend with frontend. Use proper paths to self-signed certificate and create a [nopass](https://serverfault.com/questions/366372/is-it-possible-to-generate-rsa-key-without-pass-phrase) key if you defined a passphrase. 
   ```
   flask run --port 8000 --debug --cert=~/.ssh/localhost.crt --key=~/.ssh/localhost-nopass.key
   ```


