#!/bin/bash
#
# lets get this right
test -f /tmp/aido-next.sh && rm /tmp/aido-next.sh

node $(dirname "$0")/../lib/node_modules/aido/dist/index.js "$@"

if [ -f "/tmp/aido-next.sh" ];then
  echo "We are sourcing this file..."
  hist=$(cat /tmp/aido-next.sh)
  eval "$hist"
  # rm /tmp/aido-next.sh
fi
