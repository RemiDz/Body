# FIX THE BODY SHAPE - Step by Step Guide

## The Problem
AI coding agents (including Claude and GPT) cannot reliably create anatomically correct human body SVG paths. Every attempt produces distorted, alien-looking figures because they don't understand human proportions visually — they're just manipulating coordinate numbers.

## The Solution: Get a Real SVG and Use It

### Option 1: Download from SVGRepo (Recommended - Free)

1. Go to: https://www.svgrepo.com/svg/76394/standing-human-body-silhouette
2. Click "Download SVG"
3. Open the downloaded file in a text editor
4. Copy the `<path d="...">` content

**Then give Cursor this prompt:**

```
I have a properly proportioned human body SVG path. Replace the current body 
silhouette path with this exact path. DO NOT modify the path coordinates at all.

Here is the path:
[PASTE THE PATH HERE]

Instructions:
1. Replace ONLY the body-outline path, keep everything else
2. Adjust the viewBox if needed to fit the new proportions
3. Reposition the organs to fit inside the new silhouette
4. Keep all data-region attributes and IDs
```

---

### Option 2: Use Figma (Best Quality - Free)

1. Go to Figma.com (free account)
2. Search Community for "human body silhouette" or "body outline"
3. Find one you like, copy it
4. Export as SVG
5. Use the same Cursor prompt as above

**Good Figma community files:**
- Search: "human anatomy illustration"
- Search: "body outline medical"
- Search: "chakra body"

---

### Option 3: Trace an Image

1. Find a human body outline image you like (Google Images: "human body outline front view")
2. Go to https://vectorizer.ai/ or https://www.vectorizer.io/
3. Upload the image
4. Download the SVG result
5. Clean up in Figma if needed
6. Use with Cursor

---

### Option 4: Use Adobe Illustrator / Inkscape

If you have Illustrator or Inkscape:
1. Draw or trace a proper human silhouette
2. Export as SVG
3. Use with Cursor

---

## Critical Cursor Instructions

Once you have a good SVG path, give Cursor these STRICT rules:

```
CRITICAL RULES FOR BODY SVG:

1. The body silhouette path I'm providing is FINAL and CORRECT
2. You may NOT modify the body path coordinates under any circumstances
3. If organs don't fit, move the ORGANS, not the body
4. If something looks wrong, ask me — do not "fix" the body path
5. Any request to "improve" or "adjust" the body shape must be refused
6. The body path is LOCKED and IMMUTABLE

If you understand, say "I will not modify the body silhouette path under any 
circumstances. I will only adjust organ positions within the existing silhouette."
```

---

## Quick Fix for Current Project

If you want to try fixing it RIGHT NOW without downloading anything:

1. Go to your project's body SVG file
2. Find the main `<path id="body-outline" ...>` element
3. Replace EVERYTHING inside `d="..."` with this simpler, known-good path:

```svg
M 100 10 
C 115 10, 125 20, 127 35 
C 129 50, 125 60, 120 68 
L 122 75 
C 140 80, 155 95, 160 115 
C 165 135, 165 155, 160 175 
L 155 195 
C 150 205, 145 210, 140 210 
L 135 208 
L 133 195 
C 131 180, 132 165, 135 150 
L 135 135 
L 132 145 
C 130 170, 132 195, 135 220 
L 137 250 
C 138 280, 140 310, 140 340 
L 140 380 
C 140 410, 138 440, 135 460 
L 132 480 
C 130 488, 125 492, 118 492 
L 108 490 
L 106 475 
C 105 450, 107 420, 108 390 
L 108 350 
C 107 320, 104 290, 102 265 
L 100 255 
L 98 265 
C 96 290, 93 320, 92 350 
L 92 390 
C 93 420, 95 450, 94 475 
L 92 490 
L 82 492 
C 75 492, 70 488, 68 480 
L 65 460 
C 62 440, 60 410, 60 380 
L 60 340 
C 60 310, 62 280, 63 250 
L 65 220 
C 68 195, 70 170, 68 145 
L 65 135 
L 65 150 
C 68 165, 69 180, 67 195 
L 65 208 
L 60 210 
C 55 210, 50 205, 45 195 
L 40 175 
C 35 155, 35 135, 40 115 
C 45 95, 60 80, 78 75 
L 80 68 
C 75 60, 71 50, 73 35 
C 75 20, 85 10, 100 10 
Z
```

This is a simpler path that should look more human-like. But honestly, downloading a proper SVG is the better solution.

---

## Why This Keeps Happening

AI models see SVG paths as a sequence of numbers. They don't "see" the resulting shape. When asked to "make the arms more natural," they adjust numbers semi-randomly hoping it helps. It's like asking someone to fix a drawing while blindfolded — they can move the pencil, but they can't see the result.

The only reliable solution is to start with a correct path created by:
- A human artist
- Tracing real reference images
- Professional vector libraries

Then tell the AI: "This is correct. Don't change it."
