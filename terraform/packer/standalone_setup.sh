#!/usr/bin/env bash

set -eou pipefail
set -x

export DEBIAN_FRONTEND=noninteractive
sleep 30
sudo apt-get update
sudo apt-get dist-upgrade -y
sudo apt-get install -y ffmpeg

# Build deps
sudo apt-get install -y \
  libegl1-mesa-dev libgl1-mesa-dri libxcb-xfixes0-dev \
  ffmpeg libavcodec-dev libavformat-dev libavfilter-dev libavdevice-dev libopus-dev \
  curl git build-essential libssl-dev pkg-config libclang-dev \
  nginx golang streamlink

sudo cp /tmp/smelter.service /etc/systemd/system/smelter.service
sudo cp /tmp/nextjs.service /etc/systemd/system/nextjs.service
sudo cp /tmp/broadcaster.service /etc/systemd/system/broadcaster.service
sudo cp /tmp/proxy.conf /etc/nginx/conf.d/proxy.conf
sudo systemctl enable smelter.service
sudo systemctl enable nextjs.service
sudo systemctl enable broadcaster.service
sudo systemctl enable nginx.service

export NODE_VERSION=22.16.0

sudo curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz" \
  && sudo tar -xJf "node-v$NODE_VERSION-linux-x64.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
  && sudo ln -s /usr/local/bin/node /usr/local/bin/nodejs \
  && node --version \
  && npm --version \
  && sudo rm -rf /tmp/*

wget -qO- https://get.pnpm.io/install.sh | ENV="$HOME/.bashrc" SHELL="$(which bash)" bash -
export PNPM_HOME="/home/ubuntu/.local/share/pnpm"
export PATH="/home/ubuntu/.local/share/pnpm:$PATH"

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source "$HOME/.cargo/env"

sudo apt-get install -y ubuntu-drivers-common
sudo ubuntu-drivers install

cd /home/ubuntu
git clone https://github.com/software-mansion/smelter.git
git clone https://github.com/Glimesh/broadcast-box.git

cd /home/ubuntu/smelter
git checkout @wkozyra95/fixes-for-demo
cargo build -r --no-default-features

cd /home/ubuntu/broadcast-box
go build .

cd /home/ubuntu/smelter/ts
pnpm install
pnpm build:all

cd /home/ubuntu/smelter/ts/examples/smelter-app
pnpm build

cd /home/ubuntu/project
pnpm install
pnpm build


