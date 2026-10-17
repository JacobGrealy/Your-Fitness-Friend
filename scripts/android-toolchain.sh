#!/usr/bin/env bash
# android-toolchain.sh — install the Android build toolchain without root.
#
#   ./scripts/android-toolchain.sh          # install anything missing
#   ./scripts/android-toolchain.sh --check  # report only, change nothing
#
# Puts everything under ~/tools (the same convention as ~/tools/godot):
#   ~/tools/jdk-21                       Temurin JDK 21
#   ~/tools/android-sdk/cmdline-tools/   sdkmanager
#   ~/tools/android-sdk/platforms/       android-35
#   ~/tools/android-sdk/build-tools/     35.0.0
#   ~/tools/android-sdk/platform-tools/  adb
#   ~/tools/android-sdk/env.sh           exports for any shell that needs it
#
# Capacitor 8 requires JDK 21, compileSdk 36 and AGP 8.13 (targetSdk 36); this
# host's system Java is 8, so everything installs locally instead of via apt.
# Roughly 1.5 GB of downloads; idempotent, and safe to re-run after a failure.

set -uo pipefail

TOOLS=${TOOLS:-$HOME/tools}
JDK_DIR=$TOOLS/jdk-21
SDK_DIR=$TOOLS/android-sdk
CMDLINE_ZIP=commandlinetools-linux-13114758_latest.zip
CMDLINE_URL=https://dl.google.com/android/repository/$CMDLINE_ZIP
COMPILE_SDK=36
BUILD_TOOLS=36.0.0
CHECK_ONLY=0
[ "${1:-}" = "--check" ] && CHECK_ONLY=1

FAILED=()
say() { printf '%s\n' "$*"; }
ok()  { printf '  ok   %s\n' "$*"; }
bad() { printf '  MISS %s\n' "$*"; FAILED+=("$*"); }

# --- JDK 21 -----------------------------------------------------------------
if [ -x "$JDK_DIR/bin/java" ]; then
    ok "JDK 21 already at $JDK_DIR ($("$JDK_DIR/bin/java" -version 2>&1 | head -1))"
elif [ "$CHECK_ONLY" = 1 ]; then
    bad "JDK 21 missing at $JDK_DIR (run without --check)"
else
    say "installing Temurin JDK 21 into $JDK_DIR"
    mkdir -p "$TOOLS" || exit 1
    tmp=$(mktemp -d) || exit 1
    if curl -fsSL --retry 3 -o "$tmp/jdk21.tar.gz" \
        "https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse"; then
        mkdir -p "$tmp/extract"
        tar -xzf "$tmp/jdk21.tar.gz" -C "$tmp/extract" || bad "JDK 21 extract failed"
        src=$(find "$tmp/extract" -maxdepth 1 -mindepth 1 -type d | head -1)
        if [ -n "$src" ] && [ -x "$src/bin/java" ]; then
            rm -rf "$JDK_DIR"
            mv "$src" "$JDK_DIR"
            ok "JDK 21 installed ($("$JDK_DIR/bin/java" -version 2>&1 | head -1))"
        else
            bad "JDK 21 archive did not contain a jdk (got $src)"
        fi
    else
        bad "JDK 21 download failed"
    fi
    rm -rf "$tmp"
fi

export JAVA_HOME="$JDK_DIR"
export PATH="$JDK_DIR/bin:$PATH"

# --- Android SDK cmdline-tools ----------------------------------------------
SDKMANAGER="$SDK_DIR/cmdline-tools/latest/bin/sdkmanager"
if [ -x "$SDKMANAGER" ]; then
    ok "sdkmanager present"
elif [ "$CHECK_ONLY" = 1 ]; then
    bad "sdkmanager missing at $SDKMANAGER (run without --check)"
elif [ ! -x "$JDK_DIR/bin/java" ]; then
    bad "cannot install the SDK without a JDK (fix the JDK step first)"
else
    say "installing Android cmdline-tools into $SDK_DIR"
    tmp=$(mktemp -d) || exit 1
    if curl -fsSL --retry 3 -o "$tmp/cmdline.zip" "$CMDLINE_URL"; then
        unzip -q "$tmp/cmdline.zip" -d "$tmp/unzip" || bad "cmdline-tools unzip failed"
        if [ -d "$tmp/unzip/cmdline-tools" ]; then
            mkdir -p "$SDK_DIR/cmdline-tools"
            rm -rf "$SDK_DIR/cmdline-tools/latest"
            mv "$tmp/unzip/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"
            ok "sdkmanager installed"
        else
            bad "cmdline-tools archive had an unexpected layout"
        fi
    else
        bad "cmdline-tools download failed"
    fi
    rm -rf "$tmp"
fi

# --- SDK packages -----------------------------------------------------------
export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="$SDK_DIR"

need_pkgs=0
for pkg in "$SDK_DIR/platforms/android-$COMPILE_SDK" \
           "$SDK_DIR/build-tools/$BUILD_TOOLS" \
           "$SDK_DIR/platform-tools"; do
    [ -d "$pkg" ] || need_pkgs=1
done

if [ "$need_pkgs" = 0 ]; then
    ok "SDK packages present (platform $COMPILE_SDK, build-tools $BUILD_TOOLS, platform-tools)"
elif [ "$CHECK_ONLY" = 1 ]; then
    bad "SDK packages incomplete"
elif [ -x "$SDKMANAGER" ]; then
    say "accepting SDK licences and installing packages (this is the slow part)"
    # `yes` floods sdkmanager's licence prompt; a failure here means a licence
    # changed, so it is reported rather than swallowed.
    yes | "$SDKMANAGER" --sdk_root="$SDK_DIR" --licenses >/dev/null 2>&1 || true
    if "$SDKMANAGER" --sdk_root="$SDK_DIR" \
        "platform-tools" "platforms;android-$COMPILE_SDK" "build-tools;$BUILD_TOOLS"; then
        ok "SDK packages installed"
    else
        bad "sdkmanager package install failed"
    fi
fi

# --- env file ---------------------------------------------------------------
if [ "$CHECK_ONLY" = 1 ]; then
    if [ -f "$SDK_DIR/env.sh" ]; then ok "env file present"; else bad "env file missing (run without --check)"; fi
else
    mkdir -p "$SDK_DIR" 2>/dev/null
    cat > "$SDK_DIR/env.sh" <<EOF
# Generated by scripts/android-toolchain.sh — source this to build AweFit.
export JAVA_HOME="$JDK_DIR"
export ANDROID_HOME="$SDK_DIR"
export ANDROID_SDK_ROOT="$SDK_DIR"
export PATH="\$JAVA_HOME/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/cmdline-tools/latest/bin:\$PATH"
EOF
    ok "env file at $SDK_DIR/env.sh"
fi

# --- verify -----------------------------------------------------------------
say ""
say "verification:"
[ -x "$JDK_DIR/bin/java" ] && java_major=$("$JDK_DIR/bin/java" -version 2>&1 | sed -n 's/.*version "\([0-9]*\).*/\1/p' | head -1) || java_major=""
if [ "${java_major:-}" = "21" ]; then ok "java 21"; else bad "java 21 not active (got '${java_major:-none}')"; fi
if [ -x "$SDKMANAGER" ]; then ok "sdkmanager responds"; else bad "sdkmanager not executable"; fi
for pkg in "platforms/android-$COMPILE_SDK" "build-tools/$BUILD_TOOLS" "platform-tools"; do
    if [ -d "$SDK_DIR/$pkg" ]; then ok "$pkg"; else bad "$pkg"; fi
done
if [ -x "$SDK_DIR/platform-tools/adb" ]; then
    ok "adb ($("$SDK_DIR/platform-tools/adb" version 2>&1 | head -1))"
else
    bad "adb"
fi

say ""
if [ "${#FAILED[@]}" -gt 0 ]; then
    say "INCOMPLETE — ${#FAILED[@]} item(s):"
    for f in "${FAILED[@]}"; do say "  - $f"; done
    exit 1
fi
say "TOOLCHAIN READY — source $SDK_DIR/env.sh before building"
