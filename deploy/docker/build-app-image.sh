#!/bin/sh
# Build the OpenBTP application image from this repository.
# This script does not push and does not read registry credentials.
# The local image id is not a registry digest. After an authorized push, record
# the registry digest and set image.repository / image.digest in the Helm values.
set -eu

ROOT=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
TAG=${1:-$(git -C "$ROOT" rev-parse HEAD)}
REPO=${IMAGE_REPOSITORY:-ghcr.io/romainlaisne/openbtp}

echo "Building ${REPO}:${TAG}"
echo "Context: ${ROOT}"
docker build \
  --file "${ROOT}/Dockerfile" \
  --build-arg "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-}" \
  --tag "${REPO}:${TAG}" \
  "${ROOT}"

echo
echo "Local image id (not a registry digest):"
docker image inspect --format '{{.Id}}' "${REPO}:${TAG}"
echo
echo "This script does not push. After an authorized push, the immutable reference is:"
echo "  docker buildx imagetools inspect ${REPO}:${TAG} --format '{{json .Manifest.Digest}}'"
echo "Set that digest in Helm as image.digest. The chart refuses to render without it."
