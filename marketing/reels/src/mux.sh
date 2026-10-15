#!/bin/sh
# usage: mux.sh out/reelN duration
set -e
python3 sfx.py $1.sfx.json $2 $1.wav 1
python3 sfx.py $1.sfx.json $2 $1_sfx-only.wav 0
for s in "" _sfx-only; do ffmpeg -y -loglevel error -i $1.video.mp4 -i $1$s.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart $1$s.mp4; done
