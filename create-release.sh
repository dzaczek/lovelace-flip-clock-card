#!/bin/bash

# Script to create a GitLab release tag
# Usage: ./create-release.sh [version]

VERSION=${1:-"25.0.1-beta"}

echo "Creating release tag: ${VERSION}"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Check if tag already exists
if git rev-parse "${VERSION}" >/dev/null 2>&1; then
    echo "Warning: Tag ${VERSION} already exists"
    read -p "Do you want to delete and recreate it? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git tag -d "${VERSION}"
        git push origin :refs/tags/"${VERSION}" 2>/dev/null || true
    else
        echo "Aborted"
        exit 1
    fi
fi

# Create and push tag
git tag -a "${VERSION}" -m "Release ${VERSION}"
git push origin "${VERSION}"

echo "Tag ${VERSION} created and pushed successfully!"
echo "GitLab CI will now build the package automatically."


