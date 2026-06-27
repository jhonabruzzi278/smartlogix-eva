# Referencia al bucket existente del backend de Terraform
data "aws_s3_bucket" "frontend" {
  bucket = var.terraform_backend_bucket
}

# Permite a CloudFront leer solo el prefijo /frontend/ del bucket
resource "aws_s3_bucket_policy" "frontend" {
  bucket = data.aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowCloudFrontFrontendPrefix"
      Effect = "Allow"
      Principal = {
        Service = "cloudfront.amazonaws.com"
      }
      Action   = "s3:GetObject"
      Resource = "${data.aws_s3_bucket.frontend.arn}/frontend/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
        }
      }
    }]
  })
}
