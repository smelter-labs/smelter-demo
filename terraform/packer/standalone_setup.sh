#!/usr/bin/env bash

set -eou pipefail

export DEBIAN_FRONTEND=noninteractive
sleep 30
sudo apt-get update
sudo apt-get dist-upgrade -y
sudo apt-get install -y ffmpeg

# Build deps
sudo apt-get install -y \
  libegl1-mesa-dev libgl1-mesa-dri libxcb-xfixes0-dev \
  ffmpeg libavcodec-dev libavformat-dev libavfilter-dev libavdevice-dev libopus-dev \
  curl git build-essential libssl-dev pkg-config libclang-dev

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

if [[ "$ENABLE_GPU" -eq "1" ]]; then
  sudo apt-get install -y ubuntu-drivers-common
  sudo ubuntu-drivers install
fi

cd /home/ubuntu
git clone https://github.com/software-mansion/smelter.git
cd smelter
git checkout @wkozyra95/benchmark-scenes
#cargo build -r --bin process_helper
#cd integration_tests
#cargo build -r --bin benchmark
