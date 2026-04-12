#!/bin/bash
set -e

if mongosh --host mongo1:27017 --quiet --eval "rs.status().ok" >/dev/null 2>&1; then
  echo "Replica set already initialized"
  exit 0
fi

mongosh --host mongo1:27017 --eval "
rs.initiate({
  _id: 'rs0',
  members: [
    { _id: 0, host: 'mongo1:27017', priority: 2 },
    { _id: 1, host: 'mongo2:27017', priority: 1 },
    { _id: 2, host: 'mongo3:27017', priority: 1 }
  ]
});
"
