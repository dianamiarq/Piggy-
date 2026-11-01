# Piggy

A private expense tracker that saves toward a home. It runs as a Progressive Web App (PWA): install it on your iPhone from Safari, use it full screen and offline, and keep every number on your own device.

## How your data is stored

- Everything you enter is saved in the app's own storage on the device (`localStorage`). Nothing is sent to a server, and the website only serves the app's code.
- Piggy asks the browser to keep this storage permanently (`navigator.storage.persist()`).
- On iPhone, the home-screen app has its **own storage, separate from Safari**. Install the app first, then import or enter your data inside the installed app.
- Back up once a month: Settings → *Back up data*, and save the file to iCloud Drive or Files. If you ever delete the app or change phones, Settings → *Import or restore* brings everything back.
- Never commit backup or import files to this repository. `.gitignore` already excludes `piggy-*.json`, `*.csv` and `*.xlsx`.

## Run it on your computer

```bash
npm install
npm run dev        # opens a local version at http://localhost:5173
npm run build      # builds the PWA into dist/ (app, manifest, icons, offline service worker)
npm run preview    # serves dist/ at http://localhost:4173 to test the built app
```

## Publish it free on GitHub Pages

1. Create a free account at github.com if you don't have one.
2. Create a new repository, for example `piggy`. On GitHub's free plan, Pages works with **public** repositories. That's fine: the repository only contains the app's code, never your expenses.
3. Upload this folder's contents (everything except `node_modules` and `dist`). The simplest way: on the empty repository page, choose *uploading an existing file* and drag the files in, keeping the `.github` folder.
4. In the repository, open **Settings → Pages**, and under *Build and deployment* set **Source** to **GitHub Actions**.
5. The workflow in `.github/workflows/deploy.yml` runs automatically. After a minute or two, the **Actions** tab shows a green tick and Settings → Pages shows your address: `https://<your-username>.github.io/piggy/`.

## Install on iPhone

1. Open the address in **Safari**.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open Piggy from the home screen. It runs full screen with its own icon, and works offline after the first launch.

## Updating the app

Change the code, commit and push to `main`. GitHub rebuilds and publishes. The next time you open Piggy online it loads the new version; your data is untouched.

## Notes

- `npm run build:artifact` builds the single-page preview used during design (not needed for the PWA).
- Market figures in the house calculator are a dated snapshot (October 2026) in `src/market.ts`; the app never fetches data from the internet.
