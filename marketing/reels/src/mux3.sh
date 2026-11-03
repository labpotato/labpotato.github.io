#!/bin/sh
# usage: mux3.sh out/reelN duration   (music + sfx, and an sfx-only version)
set -e
python3 sfx3.py $1.sfx.json $1.music.json $2 $1.wav 1
python3 sfx3.py $1.sfx.json $1.music.json $2 $1_sfx-only.wav 0
for s in "" _sfx-only; do ffmpeg -y -loglevel error -i $1.video.mp4 -i $1$s.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart $1$s.mp4; done
