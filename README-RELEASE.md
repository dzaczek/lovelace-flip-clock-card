# Release Instructions

## Branch Strategy

- **`beta`** - Branch dla wersji beta/testowych. Tutaj testujemy nowe funkcje przed merge do master
- **`main`/`master`** - Branch produkcyjny, tylko stabilne wersje

## Creating a Beta Release

### Automatic (Recommended)

1. **Upewnij się że jesteś na branch beta:**
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
   - **GitHub Actions**: Automatycznie zbuduje paczkę i utworzy release na GitHub
   - **GitLab CI**: Zbuduje paczkę (jeśli używasz GitLab)
   - Artifacts będą dostępne w Actions/Releases

4. **GitHub Release (automatyczny):**
   - Release zostanie utworzony automatycznie przez GitHub Actions
   - Zawiera paczki: `.zip` i `.tar.gz`
   - Oznaczony jako "pre-release" (beta)

5. **GitLab Release (manual, jeśli używasz GitLab):**
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
6. Select version `v25.0.1-beta` from the releases (lub wybierz branch `beta`)

## Workflow: Beta → Master

1. **Testowanie na branch beta:**
   ```bash
   git checkout beta
   # ... wprowadź zmiany ...
   git commit -m "Feature: ..."
   git push origin beta
   ```

2. **Utwórz beta release:**
   ```bash
   git tag -a v25.0.1-beta -m "Beta release"
   git push origin v25.0.1-beta
   ```

3. **Po testach, merge do master:**
   ```bash
   git checkout main
   git merge beta
   git push origin main
   ```

4. **Utwórz stabilny release:**
   ```bash
   git tag -a v25.0.1 -m "Stable release"
   git push origin v25.0.1
   ```

## Version Format

- Use semantic versioning: `MAJOR.MINOR.PATCH`
- For beta releases: `MAJOR.MINOR.PATCH-beta`
- Examples: `25.0.1`, `25.0.1-beta`, `25.1.0-rc1`


