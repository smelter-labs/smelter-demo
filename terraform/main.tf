terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.7.0"
    }
  }

  required_version = ">= 1.2.0"
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "demo_vpc" {
  cidr_block           = "10.0.0.0/16"
  instance_tenancy     = "default"
  enable_dns_support   = "true"
  enable_dns_hostnames = "true"

  tags = {
    project = "smelter-demo"
  }
}

resource "aws_subnet" "demo_public_subnet" {
  vpc_id            = aws_vpc.demo_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"

  tags = {
    project = "smelter-demo"
  }
}

resource "aws_security_group" "demo_sg" {
  name = "demo_sg"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port       = 1
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.demo_elb_sg.id]
  }
  ingress {
    from_port   = 1
    to_port     = 65535
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  vpc_id     = aws_vpc.demo_vpc.id
  depends_on = [aws_vpc.demo_vpc]

  tags = {
    project = "smelter-demo"
  }
}

resource "aws_internet_gateway" "demo_ig" {
  vpc_id     = aws_vpc.demo_vpc.id
  depends_on = [aws_vpc.demo_vpc]

  tags = {
    project = "smelter-demo"
  }
}

resource "aws_route_table" "demo_public_rt" {
  vpc_id = aws_vpc.demo_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.demo_ig.id
  }

  route {
    ipv6_cidr_block = "::/0"
    gateway_id      = aws_internet_gateway.demo_ig.id
  }

  tags = {
    project = "smelter-demo"
  }
}

resource "aws_route_table_association" "demo_public_rt_1" {
  subnet_id      = aws_subnet.demo_public_subnet.id
  route_table_id = aws_route_table.demo_public_rt.id
}

resource "aws_security_group" "demo_elb_sg" {
  name = "demo_elb_sg"

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  vpc_id     = aws_vpc.demo_vpc.id
  depends_on = [aws_vpc.demo_vpc]

  tags = {
    project = "smelter-demo"
  }
}

resource "aws_elb" "demo_elb" {
  name            = "smelter-demo-elb"
  subnets         = [aws_subnet.demo_public_subnet.id]
  security_groups = [aws_security_group.demo_elb_sg.id]

  listener {
    instance_port     = 8000
    instance_protocol = "http"
    lb_port           = 80
    lb_protocol       = "http"
  }

  listener {
    instance_port      = 8000
    instance_protocol  = "http"
    lb_port            = 443
    lb_protocol        = "https"
    ssl_certificate_id = "arn:aws:acm:us-east-1:105239478464:certificate/8e68591f-e332-46cd-a5e8-495b95f7155c"
  }

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 3
    target              = "HTTP:3000/"
    interval            = 30
  }

  instances                   = [aws_instance.demo_instance.id]
  cross_zone_load_balancing   = true
  idle_timeout                = 400
  connection_draining         = true
  connection_draining_timeout = 400

  tags = {
    project = "smelter-demo"
  }
}

resource "aws_instance" "demo_instance" {
  ami = "ami-022876f7e38a6b064"

  instance_type = "g4dn.4xlarge"
  #instance_type = "t3.micro"

  key_name = "wojtek-compositor-demo"

  subnet_id                   = aws_subnet.demo_public_subnet.id
  vpc_security_group_ids      = [aws_security_group.demo_sg.id]
  associate_public_ip_address = true

  tags = {
    project = "smelter-demo"
  }
}

