#!/usr/bin/env python3
"""Read or bump AweFit's Android version in frontend/android/app/build.gradle.

    ./scripts/android-version.py show
    ./scripts/android-version.py bump              # versionCode +1, patch +1
    ./scripts/android-version.py bump --version 0.2.0
    ./scripts/android-version.py set-code 42       # repair a versionCode by hand

Why a script: `versionCode` must strictly increase for Android to install a new
APK over the old one, and every field lives in a Gradle file that is otherwise
hand-edited. Forgetting the bump produces the worst failure mode available here
— the build succeeds, the download succeeds, and the phone silently refuses the
install with INSTALL_FAILED_VERSION_DOWNGRADE.

Only the two literals are rewritten, via anchored regexes, and the file is
re-read afterwards to prove the change landed.
"""

import argparse
import re
import sys
from pathlib import Path

GRADLE = Path(__file__).resolve().parent.parent / "frontend" / "android" / "app" / "build.gradle"

CODE_RE = re.compile(r"^(\s*versionCode\s+)(\d+)(\s*)$", re.MULTILINE)
NAME_RE = re.compile(r'^(\s*versionName\s+")([^"]+)("[\s]*)$', re.MULTILINE)


def read(gradle_text):
    code = CODE_RE.search(gradle_text)
    name = NAME_RE.search(gradle_text)
    if not code or not name:
        raise SystemExit("could not find versionCode/versionName in %s" % GRADLE)
    return int(code.group(2)), name.group(2)


def write(gradle_text, code, name):
    text = CODE_RE.sub(lambda m: "%s%d%s" % (m.group(1), code, m.group(3)), gradle_text, count=1)
    text = NAME_RE.sub(lambda m: "%s%s%s" % (m.group(1), name, m.group(3)), text, count=1)
    GRADLE.write_text(text)
    new_code, new_name = read(GRADLE.read_text())
    if (new_code, new_name) != (code, name):
        raise SystemExit("version write did not land: got %s/%s" % (new_code, new_name))


def bump_name(version):
    parts = [int(p) for p in re.findall(r"\d+", version)]
    if len(parts) < 3:
        parts += [0] * (3 - len(parts))
    parts[2] += 1
    return ".".join(str(p) for p in parts[:3])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["show", "bump", "set-code"])
    ap.add_argument("--version", default=None, help="explicit versionName for bump")
    ap.add_argument("code", nargs="?", type=int, default=None, help="versionCode for set-code")
    args = ap.parse_args()

    text = GRADLE.read_text()
    code, name = read(text)

    if args.command == "show":
        print("versionCode %d  versionName %s" % (code, name))
        return 0

    if args.command == "set-code":
        if args.code is None:
            raise SystemExit("set-code needs a number")
        write(text, args.code, name)
        print("versionCode %d -> %d  versionName %s" % (code, args.code, name))
        return 0

    new_name = args.version or bump_name(name)
    write(text, code + 1, new_name)
    print("versionCode %d -> %d  versionName %s -> %s" % (code, code + 1, name, new_name))
    return 0


if __name__ == "__main__":
    sys.exit(main())
