# Deployment Guide - Resonance Body Map

## GitHub Pages Deployment

### Quick Setup

1. **Create a GitHub repository**
   ```bash
   # In the resonance-body directory
   git init
   git add .
   git commit -m "Initial commit: Resonance Body Map"
   ```

2. **Create repository on GitHub**
   - Go to https://github.com/new
   - Name it: `resonance-body-map` (or any name you prefer)
   - Don't initialize with README (we already have one)
   - Click "Create repository"

3. **Push to GitHub**
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/resonance-body-map.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages**
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under "Source", select **main** branch
   - Click **Save**
   - Wait 1-2 minutes for deployment

5. **Access your app**
   - URL: `https://YOUR-USERNAME.github.io/resonance-body-map/`
   - GitHub will show you the URL in Settings → Pages

### Important Notes

⚠️ **HTTPS Required**: GitHub Pages uses HTTPS, which is perfect for microphone access (browsers require HTTPS for getUserMedia).

✅ **No Build Step**: This is a pure HTML/CSS/JS app, so it deploys instantly.

✅ **PWA Support**: The service worker will work on GitHub Pages.

### Custom Domain (Optional)

If you have a custom domain:

1. Add a `CNAME` file to the repository root:
   ```
   yourdomain.com
   ```

2. In GitHub Settings → Pages → Custom domain, enter your domain

3. Configure DNS at your domain registrar:
   - Add a CNAME record pointing to `YOUR-USERNAME.github.io`

---

## Alternative Hosting Options

### Option 2: Netlify (Free)

1. Go to https://netlify.com
2. Drag and drop the `resonance-body` folder
3. Done! You get a URL like `https://your-app.netlify.app`

**Advantages:**
- Instant deployment
- Automatic HTTPS
- Custom domain support
- Continuous deployment from GitHub

### Option 3: Vercel (Free)

1. Go to https://vercel.com
2. Import your GitHub repository
3. Deploy with one click

**Advantages:**
- Fast global CDN
- Automatic HTTPS
- Preview deployments for branches

### Option 4: Cloudflare Pages (Free)

1. Go to https://pages.cloudflare.com
2. Connect your GitHub repository
3. Deploy

**Advantages:**
- Fastest CDN
- Unlimited bandwidth
- DDoS protection

---

## Testing Before Deployment

Before deploying, test locally:

```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve -p 8080

# Using PHP
php -S localhost:8080
```

Then open: http://localhost:8080

---

## Troubleshooting

### Microphone not working on GitHub Pages

✅ **Should work** - GitHub Pages uses HTTPS by default

If it doesn't work:
- Check browser console (F12) for errors
- Ensure you clicked "Allow" for microphone permission
- Try in Chrome/Edge (best support)

### Service Worker not registering

- GitHub Pages path: Update `sw.js` if using a custom path
- Check `manifest.json` has correct `start_url`

### 404 Errors

- Ensure all file paths are relative (no leading `/`)
- Check case sensitivity (GitHub Pages is case-sensitive)

---

## Updating Your Deployment

After making changes:

```bash
git add .
git commit -m "Description of changes"
git push
```

GitHub Pages will automatically redeploy in 1-2 minutes.

---

## iPad Installation

Once deployed:

1. Open the GitHub Pages URL in Safari on iPad
2. Tap the Share button
3. Tap "Add to Home Screen"
4. The app will run in fullscreen standalone mode

Perfect for sound healing demonstrations!
