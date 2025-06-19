#!/bin/bash

# Resolve symlinks to find the script's real directory
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do # resolve $SOURCE until the file is no longer a symlink
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE" # if $SOURCE was a relative symlink, we need to resolve it relative to the path where the symlink file was located
done
SCRIPT_DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

# The main script is in ../dist from this script's location
MAIN_SCRIPT="$SCRIPT_DIR/../dist/index.js"

# lets get this right
test -f /tmp/aido-next.sh && rm /tmp/aido-next.sh

node "$MAIN_SCRIPT" "$@"

if [ -f "/tmp/aido-next.sh" ];then
  echo "We are sourcing this file..."
  hist=$(cat /tmp/aido-next.sh)
  eval "$hist"
  # rm /tmp/aido-next.sh
fi
