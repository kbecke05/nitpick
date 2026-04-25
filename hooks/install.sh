#!/bin/sh
# Installs the nitpick pre-commit hook into .git/hooks/

REPO_ROOT=$(git rev-parse --show-toplevel)
TARGET="$REPO_ROOT/.git/hooks/pre-commit"

if [ -f "$TARGET" ]; then
    echo "A pre-commit hook already exists at $TARGET"
    printf "Overwrite it? [y/N] "
    read REPLY
    case "$REPLY" in
        y|Y) ;;
        *) echo "Aborted."; exit 1 ;;
    esac
fi

cp "$REPO_ROOT/hooks/pre-commit" "$TARGET"
chmod +x "$TARGET"
echo "nitpick hook installed at $TARGET"
