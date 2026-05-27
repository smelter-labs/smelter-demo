FROM ghcr.io/smelter-labs/smelter-rc:362799df-x86_64

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ARG USERNAME=smelter

ENV DEBIAN_FRONTEND=noninteractive
ENV NVIDIA_DRIVER_CAPABILITIES=compute,graphics,utility
ENV NODE_VERSION=24.6.0

USER root
WORKDIR /tmp

RUN apt-get update -y -qq && \
  apt-get install -y \
    sudo build-essential curl ffmpeg pipx \
    python3 python3-pip python3-venv \
    libegl1-mesa-dev libgl1-mesa-dri libxcb-xfixes0-dev mesa-vulkan-drivers && \
  rm -rf /var/lib/apt/lists/*

RUN ARCH= && dpkgArch="$(dpkg --print-architecture)" \
  && case "${dpkgArch##*-}" in \
    amd64) ARCH='x64';; \
    ppc64el) ARCH='ppc64le';; \
    s390x) ARCH='s390x';; \
    arm64) ARCH='arm64';; \
    armhf) ARCH='armv7l';; \
    i386) ARCH='x86';; \
    *) echo "unsupported architecture"; exit 1 ;; \
  esac \
  && curl -fsSLO --compressed "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$ARCH.tar.xz" \
  && tar -xJf "node-v$NODE_VERSION-linux-$ARCH.tar.xz" -C /usr/local --strip-components=1 --no-same-owner \
  && ln -s /usr/local/bin/node /usr/local/bin/nodejs \
  && node --version \
  && npm --version \
  && npm install -i pnpm \
  && rm -rf /tmp/*

## Build
USER $USERNAME
ENV SMELTER_PATH=/home/smelter/smelter/main_process

RUN sudo npm install -g pnpm

RUN pipx install streamlink
ENV PATH=/home/smelter/.local/bin:$PATH

COPY --chown=$USERNAME:$USERNAME  . /home/$USERNAME/demo
WORKDIR /home/$USERNAME/demo/server
RUN CI=1 pnpm install --filter smelter-app... && pnpm build

# Whisper sidecar lives in its own venv so its torch/faster-whisper install
# stays out of the system Python and doesn't fight pipx-managed streamlink.
# CPU-only torch wheel saves ~2 GB vs the default CUDA build (whisper runs
# on CPU per sidecar.py).
ENV SIDECAR_PYTHON=/home/$USERNAME/sidecar-venv/bin/python3
RUN python3 -m venv /home/$USERNAME/sidecar-venv && \
  $SIDECAR_PYTHON -m pip install --no-cache-dir --upgrade pip && \
  $SIDECAR_PYTHON -m pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu && \
  $SIDECAR_PYTHON -m pip install --no-cache-dir -r sidecar/requirements.txt

# Pre-fetch whisper-base (~140 MB) and silero-vad (~2 MB) model weights so
# the first WHIP connection doesn't pay the download tax. Caches land under
# /home/smelter/.cache/{huggingface,torch}.
RUN $SIDECAR_PYTHON -c "from faster_whisper import WhisperModel; WhisperModel('base', device='cpu', compute_type='int8')" && \
  $SIDECAR_PYTHON -c "from silero_vad import load_silero_vad; load_silero_vad()"

ENTRYPOINT ["node", "./dist/index.js"]
