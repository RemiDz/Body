#!/bin/bash
# Quick deployment script for Resonance Body Map

echo "🎵 Resonance Body Map - Deployment Script"
echo "=========================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    echo ""
fi

# Check if remote exists
if ! git remote | grep -q origin; then
    echo "⚠️  No git remote found."
    echo "Please enter your GitHub repository URL:"
    echo "Example: https://github.com/username/resonance-body-map.git"
    read -p "Repository URL: " repo_url
    
    if [ -n "$repo_url" ]; then
        git remote add origin "$repo_url"
        echo "✅ Remote added: $repo_url"
    else
        echo "❌ No URL provided. Exiting."
        exit 1
    fi
    echo ""
fi

# Stage all changes
echo "📝 Staging changes..."
git add .
echo ""

# Commit
echo "Please enter a commit message (or press Enter for default):"
read -p "Message: " commit_msg

if [ -z "$commit_msg" ]; then
    commit_msg="Update Resonance Body Map"
fi

git commit -m "$commit_msg"
echo ""

# Push
echo "🚀 Pushing to GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📱 Next steps:"
echo "1. Go to your GitHub repository"
echo "2. Click Settings → Pages"
echo "3. Select 'main' branch as source"
echo "4. Wait 1-2 minutes for deployment"
echo "5. Your app will be live at: https://YOUR-USERNAME.github.io/REPO-NAME/"
echo ""
echo "🎉 Done!"
