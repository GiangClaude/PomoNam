# PomoNam - Deployment Guide

## Setup YouTube API Key (IMPORTANT!)

### Before Deploying:

1. **Remove hardcoded key from git history** (nếu đã commit):
   ```bash
   git log --all --full-history -- js/youtube.js
   git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch js/youtube.js' --prune-empty --tag-name-filter cat -- --all
   ```

2. **Copy `.env.example` to `.env`**:
   ```bash
   cp .env.example .env
   ```

3. **Get YouTube API Key**:
   - Vào https://console.cloud.google.com/
   - Tạo new project hoặc chọn project hiện tại
   - Enable "YouTube Data API v3"
   - Tạo API key (Credentials > Create Credentials > API key)
   - Copy key và paste vào `.env`:
     ```
     VITE_YOUTUBE_API_KEY=YOUR_KEY_HERE
     ```

4. **Verify `.env` is in `.gitignore`** (không commit credentials):
   ```bash
   cat .gitignore | grep ".env"
   ```

---

## Deploy to Netlify (Recommended)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Setup deployment configuration"
git push origin main
```

### Step 2: Connect to Netlify
1. Vào https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Chọn GitHub → authorize
4. Chọn repository `PomoNam`
5. Build settings:
   - Build command: (leave empty for static site)
   - Publish directory: `/` (root, vì project là static)

### Step 3: Set Environment Variables
1. Site settings → "Build & deploy" → "Environment"
2. Click "Edit variables"
3. Add new variable:
   - Key: `VITE_YOUTUBE_API_KEY`
   - Value: (paste your YouTube API key)
4. Save

### Step 4: Deploy
- Netlify sẽ tự deploy khi bạn push lên GitHub
- Xem logs ở "Deploys" tab

---

## Deploy to GitHub Pages

### Step 1: Create `.nojekyll` file (optional, nếu có file ẩn)
```bash
touch .nojekyll
git add .nojekyll
git commit -m "Add .nojekyll for GitHub Pages"
git push
```

### Step 2: Enable GitHub Pages
1. Repository settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` → root folder
4. Save

### Note: GitHub Pages không hỗ trợ environment variables, nên cần cách khác:
- Tạo file `config.js` public và hardcode key (KHÔNG AN TOÀN)
- Hoặc dùng Netlify/Vercel (khuyến nghị)

---

## Verify Asset Paths

Kiểm tra tất cả ảnh và assets có đúng đường dẫn:
- `/BackgrFrame.png` ✓ (root)
- `/FrameNoNameSong.png` ✓ (root)
- `/TextFrame.png` ✓ (root)
- `./gifs/*.gif` ✓ (gifs folder)
- `./sounds/*.wav` ✓ (sounds folder)

Nếu assets không load, check browser DevTools → Network tab.

---

## Test Live Deployment

1. Vào URL của site deploy (Netlify sẽ cho URL như `xxxxx.netlify.app`)
2. Test:
   - ✓ Timer chạy (click BẮT ĐẦU)
   - ✓ GIF hiện lên
   - ✓ Audio phát (click để unlock nếu cần)
   - ✓ Dán YouTube playlist link → hiện danh sách
   - ✓ Click video → phát được
   - ✓ Settings modal hoạt động

---

## Troubleshooting

### "YouTube API Key not found" warning
→ Lỗi: `.env` không được load  
→ Fix: Đảm bảo `VITE_YOUTUBE_API_KEY` đã set ở Netlify/Vercel dashboard

### Assets (images/sounds) không load
→ Lỗi: Đường dẫn không đúng  
→ Fix: Kiểm tra DevTools → Network, điều chỉnh đường dẫn trong CSS/JS

### "Access to XMLHttpRequest blocked by CORS"
→ Lỗi: YouTube API bị chặn từ domain khác  
→ Fix: Thêm domain vào YouTube API console → Credentials → Restrict to HTTP referrer

---

## Summary

Bạn cần:
1. ✓ Tạo `.env` từ `.env.example` và paste YouTube API key
2. ✓ Push lên GitHub (`.env` sẽ bị ignored)
3. ✓ Deploy lên Netlify (kết nối GitHub)
4. ✓ Set `VITE_YOUTUBE_API_KEY` ở Netlify dashboard
5. ✓ Test live URL

Xong! 🚀
