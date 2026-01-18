# Deployment

## GitHub Pages (recommended)

1. In GitHub: **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` (or your default branch)
4. Folder: `/ (root)`
5. Save.

Your app will be served under:

- `https://github.com/RemiDz/Body/`

### Notes

- This project is a PWA. The `manifest.json` and `sw.js` are configured to work correctly under the GitHub Pages repo sub-path.
- If you update files and want to force-refresh caches, bump the `CACHE_NAME` in `sw.js`.
