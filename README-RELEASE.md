# Release Instructions

## Creating a Release

### Automatic (Recommended)

1. **Create and push a tag:**
   ```bash
   ./create-release.sh 25.0.1-beta
   ```
   
   Or manually:
   ```bash
   git tag -a 25.0.1-beta -m "Release 25.0.1-beta"
   git push origin 25.0.1-beta
   ```

2. **GitLab CI will automatically:**
   - Build the package (zip and tar.gz)
   - Create artifacts in the build job

3. **Create GitLab Release:**
   - Go to **Repository > Releases** in GitLab
   - Click **New release**
   - Select tag: `25.0.1-beta`
   - Add release notes
   - Attach the artifacts from the build job:
     - `flip-clock-card-25.0.1-beta.zip`
     - `flip-clock-card-25.0.1-beta.tar.gz`

### Manual Build

If you need to build manually:

```bash
mkdir -p dist/flip-clock-card
cp flip-clock-card.js dist/flip-clock-card/
cp hacs.json dist/flip-clock-card/
cp README.md dist/flip-clock-card/
cp LICENSE dist/flip-clock-card/
cp -r img dist/flip-clock-card/
cd dist
zip -r flip-clock-card-25.0.1-beta.zip flip-clock-card/
tar -czf flip-clock-card-25.0.1-beta.tar.gz flip-clock-card/
```

## HACS Installation

After creating the release in GitLab:

1. Go to **HACS → Frontend** in Home Assistant
2. Click the 3 dots (top right) → **Custom repositories**
3. Paste your GitLab repository URL
4. Choose **Lovelace** as the category
5. Click **Add**, then install
6. Select version `25.0.1-beta` from the releases

## Version Format

- Use semantic versioning: `MAJOR.MINOR.PATCH`
- For beta releases: `MAJOR.MINOR.PATCH-beta`
- Examples: `25.0.1`, `25.0.1-beta`, `25.1.0-rc1`

