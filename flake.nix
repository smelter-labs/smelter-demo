{
  description = "Dev shell for Smelter demo";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" "x86_64-darwin" ];
      perSystem = { config, self', inputs', pkgs, system, lib, ... }:
        let
          smelter-sdk = pkgs.python3Packages.buildPythonPackage rec {
            pname = "smelter-sdk";
            version = "0.1.0";
            format = "wheel";
            src = pkgs.fetchPypi {
              inherit version format;
              pname = "smelter_sdk";
              dist = "py3";
              python = "py3";
              hash = "sha256-M4+shyOW6YcVRmC2dhPA8tw4g6WBPjOMypx+FUIeNKY=";
            };
            propagatedBuildInputs = [ pkgs.python3Packages.numpy ];
            doCheck = false;
          };

          silero-vad = pkgs.python3Packages.buildPythonPackage rec {
            pname = "silero-vad";
            version = "5.1.2";
            pyproject = true;
            src = pkgs.fetchPypi {
              inherit version;
              pname = "silero_vad";
              hash = "sha256-xEKXEWACbS16oK2D8MfuhsiXl6ZSif5iXI6ln8b7go0=";
            };
            nativeBuildInputs = [ pkgs.python3Packages.hatchling ];
            propagatedBuildInputs = with pkgs.python3Packages; [
              torch
              torchaudio
              onnxruntime
            ];
            doCheck = false;
          };

          pythonEnv = pkgs.python3.withPackages (ps: with ps; [
            faster-whisper
            websockets
            numpy
            smelter-sdk
            silero-vad
            pip
          ]);
        in
        {
          devShells = {
            default = pkgs.mkShell {
              packages = with pkgs; [
                pnpm
                nodejs
                ffmpeg
                pythonEnv
                nodePackages.vercel
                docker-compose
              ];
            };
          };
        };
    };
}
