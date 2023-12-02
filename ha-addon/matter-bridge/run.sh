#!/usr/bin/with-contenv bashio

export LOG_LEVEL=$(bashio::config 'loglevel')

echo "Starting Matter Bridge..."

node dist/main.js --config /data/options.json --store /data/.device-node --hassUrl http://supervisor --hassAccessToken "${SUPERVISOR_TOKEN}" --addon true

echo "Matter Bridge stopped."
