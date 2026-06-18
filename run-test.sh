#!/bin/bash
nohup npx tsx test-scheme-direct.ts > test-output.stdout 2> test-output.stderr &
echo "Started background task."
