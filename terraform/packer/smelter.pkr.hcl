packer {
  required_plugins {
    vsphere = {
      version = ">= 1.2.9"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

source "amazon-ebs" "image" {
  ami_name      = "smelter_demo_{{timestamp}}"
  instance_type = "g4dn.4xlarge"
  region        = "us-east-1" 
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

  provisioner "file" {
    source = "../../app"
    destination = "/home/ubuntu/project"
  }

  provisioner "file" {
    source = "./smelter.service"
    destination = "/tmp/smelter.service"
  }

  provisioner "file" {
    source = "./nextjs.service"
    destination = "/tmp/nextjs.service"
  }

  provisioner "file" {
    source = "./broadcaster.service"
    destination = "/tmp/broadcaster.service"
  }
  
  provisioner "file" {
    source = "./proxy.conf"
    destination = "/tmp/proxy.conf"
  }

  provisioner "shell" {
    script = "./standalone_setup.sh"
  }
}
