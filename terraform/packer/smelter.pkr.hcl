packer {
  required_plugins {
    vsphere = {
      version = ">= 1.2.9"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "region" {
  type    = string
  default = "us-east-1"
}

variable "with-gpu" {
  type    = bool
  default = false
}

source "amazon-ebs" "image" {
  ami_name      = var.with-gpu ? "smelter_with_gpu_ubuntu_24.04_{{timestamp}}" : "smelter_ubuntu_24.04_{{timestamp}}"
  instance_type = var.with-gpu ? "g4dn.xlarge" : "c5.4xlarge"
  region        = var.region
  source_ami_filter {
    filters = {
      name                = "ubuntu/images/*ubuntu-noble-24.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    most_recent = true
    owners      = ["099720109477"] // Canonical
  }
  ssh_username = "ubuntu"
  launch_block_device_mappings {
    device_name = "/dev/sda1"
    volume_size = 50
    volume_type = "gp2"
    delete_on_termination = true
  }
}

build {
  sources = ["source.amazon-ebs.image"]

  provisioner "shell" {
    script = "./standalone_setup.sh"
    env = {
      ENABLE_GPU = var.with-gpu ? "1" : "0"
    }
  }
}
