# AWS Academy (voclabs) does not allow creating IAM roles or policies.
# We reuse the pre-existing LabRole, which has broad permissions including
# ECR pull, CloudWatch Logs write, and SSM Parameter Store read.

data "aws_iam_role" "lab_role" {
  name = "LabRole"
}
