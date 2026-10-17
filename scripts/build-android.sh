#!/usr/bin/env bash
# build-android.sh — build, sign and publish the AweFit APK.
#
#   ./scripts/build-android.sh              # build the current version
#   ./scripts/build-android.sh --bump       # versionCode+1, versionName patch+1 first
#   ./scripts/build-android.sh --no-sync    # skip the web build + cap sync
#
# Output: a signed APK copied to app/static/download/, which the running server
# already serves — so the phone updates itself over the LAN with no cable:
#
#   http://<host>:5001/download/awefit.apk        (Tailscale: 100.84.29.20)
#
# Also writes app/static/download/version.json for the in-app update check
# (FF-0009) and prints the versionCode, sha256 and download URLs.
#
# The APK is NOT committed (app/static/download/ is gitignored): it is a build
# artifact, and a 4 MB binary in git for every build is not worth it.

set -uo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT" || exit 1

export PATH="/home/angrygiant/.nvm/versions/node/v22.22.2/bin:$PATH"
SDK_ENV="$HOME/tools/android-sdk/env.sh"
BUMP=0
SYNC=1

for arg in "$@"; do
    case "$arg" in
        --bump) BUMP=1 ;;
        --no-sync) SYNC=0 ;;
        -h|--help) sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
        *) echo "unknown option: $arg" >&2; exit 2 ;;
    esac
done

if [ ! -f "$SDK_ENV" ]; then
    echo "ERROR: no Android toolchain at $SDK_ENV" >&2
    echo "       run ./scripts/android-toolchain.sh first" >&2
    exit 1
fi
# shellcheck disable=SC1090
source "$SDK_ENV"

# The server the app talks to is baked into the build at sync time.
export ANDROID_SERVER_URL="${ANDROID_SERVER_URL:-http://100.84.29.20:5001}"

if [ "$BUMP" = 1 ]; then
    ./scripts/android-version.py bump || exit 1
fi
version=$("./scripts/android-version.py" show) || exit 1
echo "== AweFit: $version"
echo "== server: $ANDROID_SERVER_URL"

if [ "$SYNC" = 1 ]; then
    echo "== web build + cap sync"
    ( cd frontend && npm run android:sync ) || { echo "ERROR: sync failed" >&2; exit 1; }
fi

echo "== gradle assembleRelease"
( cd frontend/android && ./gradlew assembleRelease --no-daemon --console=plain ) \
    || { echo "ERROR: gradle build failed" >&2; exit 1; }

APK="frontend/android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK" ]; then
    echo "ERROR: no APK at $APK" >&2
    exit 1
fi

# An unsigned APK is useless — it cannot be installed at all, and a wrong-key APK
# cannot be installed *over* the existing app. Check before publishing.
echo "== verifying signature"
if ! "$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --print-certs "$APK" > /tmp/apksigner.$$ 2>&1; then
    echo "ERROR: APK is not signed (is frontend/android/keystore.properties present?)" >&2
    cat /tmp/apksigner.$$ >&2
    rm -f /tmp/apksigner.$$
    exit 1
fi
signer=$(grep -m1 'certificate DN' /tmp/apksigner.$$ | sed 's/.*DN: //')
rm -f /tmp/apksigner.$$

# Publish where the server already looks.
DEST_DIR="app/static/download"
mkdir -p "$DEST_DIR"
version_name=$(echo "$version" | sed -n 's/.*versionName \([^ ]*\).*/\1/p')
version_code=$(echo "$version" | sed -n 's/.*versionCode \([0-9]*\).*/\1/p')
cp -f "$APK" "$DEST_DIR/awefit.apk"
cp -f "$APK" "$DEST_DIR/awefit-$version_name.apk"
sha=$(sha256sum "$DEST_DIR/awefit.apk" | cut -d' ' -f1)

cat > "$DEST_DIR/version.json" <<EOF
{
  "appId": "dev.awefit.app",
  "versionCode": $version_code,
  "versionName": "$version_name",
  "sha256": "$sha",
  "sizeBytes": $(stat -c %s "$DEST_DIR/awefit.apk"),
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "serverUrl": "$ANDROID_SERVER_URL",
  "signer": "$signer",
  "downloadPath": "/download/awefit.apk"
}
EOF

ip_lan=$(ip -4 addr show | sed -n 's/.*inet \([0-9.]*\)\/24 .*wl.*/\1/p' | head -1)
ip_ts=$(tailscale ip -4 2>/dev/null | head -1)

echo ""
echo "APK ready"
echo "  version    : $version_name (versionCode $version_code)"
echo "  signer     : $signer"
echo "  sha256     : $sha"
echo "  size       : $(du -h "$DEST_DIR/awefit.apk" | cut -f1)"
echo "  local      : http://127.0.0.1:5001/download/awefit.apk"
[ -n "$ip_lan" ] && echo "  lan        : http://$ip_lan:5001/download/awefit.apk"
[ -n "$ip_ts" ] && echo "  tailscale  : http://$ip_ts:5001/download/awefit.apk"
echo "  metadata   : /download/version.json"
echo ""
echo "On the phone: open the URL, download, and tap the file to install."
echo "Android will refuse if versionCode does not exceed the installed one."
