#!/bin/sh
# Publish the site to GitHub Pages: build it for the repository's sub-path and
# push the built files to the gh-pages branch, which Pages serves.
#   npm run deploy
set -e
cd "$(dirname "$0")/.."
REMOTE=$(git config --get remote.origin.url)
REPO=$(basename -s .git "$REMOTE")
[ -n "$(git status --porcelain)" ] && echo "Note: there are uncommitted changes; they will be published too."
npm test
SITE_BASE="/$REPO/" npm run build
# Pages runs Jekyll by default, which drops folders starting with "_" (Astro's
# _astro folder holds every script and stylesheet). This file turns that off.
touch dist/.nojekyll
SHA=$(git rev-parse --short HEAD)
# Sign the publish commit the same way as the latest source commit.
NAME=$(git log -1 --format=%an); EMAIL=$(git log -1 --format=%ae)
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="$NAME" -c user.email="$EMAIL" commit -q -m "Publish $SHA"
git push -q -f "$REMOTE" gh-pages
rm -rf .git
echo "Published $SHA. It can take a minute to show at the Pages address."
