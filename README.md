# Scentbook – perfume sales tracker

Customers, orders, queries, dispatch, samples and follow-ups in one installable app. Data stays on your device.

## Put it online (GitHub Pages)
1. Create a new **private or public** GitHub repo and upload all files from this folder.
2. Repo **Settings → Pages → Deploy from branch → main / (root)**.
3. Open the Pages link in **Chrome** → menu ⋮ → **Install app** (or Settings → Install in the app).

## Privacy
- All data lives in your browser on that device only. Nothing is sent anywhere.
- Set a PIN in Settings. Export a backup regularly (Settings → Export backup). Clearing browser data erases the app data.
- A public GitHub Pages URL only hosts the empty app, never your customers.

## Updating later
Edit files, commit, and bump `V` in `sw.js` (e.g. scentbook-v2) so phones pick up the new version.

## WhatsApp messages (future)
A browser app cannot read your WhatsApp. To show incoming messages you need the **WhatsApp Business Cloud API** (Meta) plus a small server/webhook that stores messages and sends them to this app. Your number is saved in Settings and chat buttons already open WhatsApp. Ask to build the server part when ready.
