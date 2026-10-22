# ScreenSidekick

An AI companion layer for whatever you're "watching" on Fire TV.
Watch → Ask → Explore → Learn.

## What's in here
- `index.html` / `style.css` — TV-safe UI (large focus states, 5% safe margins, dark theme)
- `content.json` — curated content library (stands in for live content recognition — see PROMPTS.md for why)
- `content.js` — loads the library
- `ai.js` — **the only file you need to edit** to go from mock demo → real Bedrock calls
- `app.js` — screen state machine + D-pad navigation
- `PROMPTS.md` — the 3 LLM prompts (Ask / Explore / Quiz) and demo notes

## 1. Run it in a browser first (fastest way to iterate)
No build step — it's plain HTML/JS/CSS.

```
cd screensidekick
python3 -m http.server 8080
```

Open `http://localhost:8080` and use arrow keys + Enter to navigate,
exactly like a Fire TV remote would. `MOCK_MODE` is `true` by default
in `ai.js`, so the whole Watch → Ask → Explore → Learn loop works
immediately with no API key.

## 2. Test it on your actual Fire TV
1. On your Fire TV: **Settings → My Fire TV → Developer Options → ADB debugging → ON**
2. Install **"Web App Tester"** from the Fire TV Appstore (search for it — it's Amazon's official tool for this).
3. Host this folder somewhere reachable by your TV — easiest options:
   - Run the same `python3 -m http.server 8080` on your laptop and use your laptop's LAN IP (`http://192.168.x.x:8080`) — TV and laptop must be on the same Wi-Fi
   - Or push it to any static host (GitHub Pages, Netlify) for a public URL
4. Open Web App Tester on the Fire TV, enter that URL, and launch. Your physical Fire TV remote's D-pad and Select/Back buttons map directly to the arrow keys / Enter / Backspace handling already in `app.js`.



## 3. Wire up real AI 


1. **Create your AWS account first** and finish signup so credits are active.
2. **Create an IAM user** with programmatic access: IAM → Users → Create user → attach policy `AmazonBedrockFullAccess` (fine for a hackathon; a real product would scope this to just `bedrock:InvokeModel`). Generate an Access Key + Secret Key for it and save them somewhere safe — AWS only shows the secret once.
4. **Install the Bedrock SDK** :
   ```
   npm install
   ```
   (this reads `package.json`, which already lists the dependency)
5. **Set your AWS credentials** as environment variables:
   ```
   export AWS_ACCESS_KEY_ID=your-access-key-id
   export AWS_SECRET_ACCESS_KEY=your-secret-access-key
   export AWS_REGION=us-east-1
   ```
  
6. Run it:
   ```
   node server-bedrock.js
   ```
   You should see `Creds: detected ✔`. If you see an error about credentials or model access when you actually ask a question, re-check steps 2 and 3 — those are the two things that go wrong most often.
7. In `ai.js`, set `MOCK_MODE = false` (same as Option A — `AI_ENDPOINT` is already `/api/ai`).

**If Bedrock gives you a "model not found" or access-denied error:** open the Bedrock console's Model access page and copy the *exact* model ID shown there for the Claude model you were granted — paste it into `MODEL_ID` near the top of `server-bedrock.js`, replacing the current value. Model IDs occasionally differ by account/region, and this is the #1 cause of Bedrock errors.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
