# AWS EC2 benchmark

### Build AMI (Amazon Machine Image)

`packer build -var 'with-gpu=true' TEMPLATE_PATH.pkr.hcl`

### Deploy terraform config

- Update `ami` field in `aws_instance.demo_instance` in **main.tf** with the value from the previous step.
- Depending on how you built your AMI, run either
  - `terraform apply -var="with-gpu=true"` in **aws-ec2-terraform** directory to deploy image on GPU instance.
  - `terraform apply` in **aws-ec2-terraform** directory to deploy image on CPU-only instance.
