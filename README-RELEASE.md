# Release Instructions

## Branch Strategy

- **`beta`** - Branch for beta/testing versions. We test new features here before merging to master
- **`main`/`master`** - Production branch, stable versions only

## Creating a Beta Release

### Automatic (Recommended)

1. **Make sure you're on beta branch:**
   ```bash
   git checkout beta
   ```

2. **Create and push a tag:**
   ```bash
   ./create-release.sh v25.0.1-beta
   ```
   
   Or manually:
   ```bash
   git tag -a v25.0.1-beta -m "Release v25.0.1-beta"
   git push origin v25.0.1-beta
   ```

3. **CI/CD will automatically:**
   - **GitHub Actions**: Automatically builds the package and creates a release on GitHub
   - **GitLab CI**: Builds the package (if using GitLab)
   - Artifacts will be available in Actions/Releases

4. **GitHub Release (automatic):**
   - Release will be created automatically by GitHub Actions
   - Contains packages: `.zip` and `.tar.gz`
   - Marked as "pre-release" (beta)

5. **GitLab Release (manual, if using GitLab):**
   - Go to **Repository > Releases** in GitLab
   - Click **New release**
   - Select tag: `v25.0.1-beta`
   - Add release notes
   - Attach the artifacts from the build job

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

After creating the release:

1. Go to **HACS → Frontend** in Home Assistant
2. Click the 3 dots (top right) → **Custom repositories**
3. Paste your repository URL: `https://github.com/dzaczek/lovelace-flip-clock-card`
4. Choose **Lovelace** as the category
5. Click **Add**, then install
6. Select version `v25.0.1-beta` from the releases (or select `beta` branch)

## Workflow: Beta → Master

1. **Testing on beta branch:**
   ```bash
   git checkout beta
   # ... make changes ...
   git commit -m "Feature: ..."
   git push origin beta
   ```

2. **Create beta release:**
   ```bash
   git tag -a v25.0.1-beta -m "Beta release"
   git push origin v25.0.1-beta
   ```

3. **After testing, merge to master:**
   ```bash
   git checkout main
   git merge beta
   git push origin main
   ```

4. **Create stable release:**
   ```bash
   git tag -a v25.0.1 -m "Stable release"
   git push origin v25.0.1
   ```

## Version Format

- Use semantic versioning: `MAJOR.MINOR.PATCH`
- For beta releases: `MAJOR.MINOR.PATCH-beta`
- Examples: `25.0.1`, `25.0.1-beta`, `25.1.0-rc1`


