resource "aws_elastic_beanstalk_application" "geolog" {
  name        = "geolog"
  description = "geolog application"
}

resource "aws_elastic_beanstalk_environment" "geolog_blue" {
  name                = "geolog-blue"
  application         = "${aws_elastic_beanstalk_application.geolog.name}"
  solution_stack_name = "64bit Amazon Linux 2017.03 v2.7.4 running Docker 17.03.2-ce"

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = "${aws_iam_instance_profile.geolog_instance.name}"
  }

  # Swapped by deploy script
  cname_prefix        = "production-api-geolog"
  lifecycle {
    ignore_changes = ["cname_prefix"]
  }
}

resource "aws_elastic_beanstalk_environment" "geolog_green" {
  name                = "geolog-green"
  application         = "${aws_elastic_beanstalk_application.geolog.name}"
  solution_stack_name = "64bit Amazon Linux 2017.03 v2.7.4 running Docker 17.03.2-ce"

  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = "${aws_iam_instance_profile.geolog_instance.name}"
  }
  
  # Swapped by deploy script
  cname_prefix        = "certification-api-geolog"
  lifecycle {
    ignore_changes = ["cname_prefix"]
  }
}

resource "aws_s3_bucket" "deploy_geolog_co" {
  bucket = "deploy.geolog.co"
}

resource "aws_route53_record" "api_geolog_co" {
  zone_id = "${aws_route53_zone.geolog-co.zone_id}"
  name = "geolog.co."
  type = "A"

  # Manually entered after creation
  alias {
    name                   = "awseb-e-n-AWSEBLoa-39E4L1PG039A-1238440071.eu-west-1.elb.amazonaws.com"
    zone_id                = "Z32O12XQLNTSW2"
    evaluate_target_health = false
  }

  lifecycle {
    ignore_changes = ["alias"]
  }
}

resource "aws_route53_record" "api_certification_geolog_co" {
  zone_id = "${aws_route53_zone.geolog-co.zone_id}"
  name = "certification.geolog.co."
  type = "A"

  # Manually entered after creation
  alias {
    name                   = "awseb-e-i-AWSEBLoa-1X9Z58PDLAA9E-1948400899.eu-west-1.elb.amazonaws.com"
    zone_id                = "Z32O12XQLNTSW2"
    evaluate_target_health = false
  }

  lifecycle {
    ignore_changes = ["alias"]
  }
}

data "aws_iam_policy_document" "geolog_instance_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "geolog_instance" {
  name               = "geolog_instance"
  assume_role_policy = "${data.aws_iam_policy_document.geolog_instance_assume_role.json}"
}

resource "aws_iam_instance_profile" "geolog_instance" {
  name  = "geolog_instance"
  role = "${aws_iam_role.geolog_instance.name}"
}

resource "aws_iam_policy" "geolog_instance" {
  name = "geolog_instance"
  policy = "${data.aws_iam_policy_document.geolog_instance.json}"
}

resource "aws_iam_role_policy_attachment" "geolog_instance" {
    role       = "${aws_iam_role.geolog_instance.name}"
    policy_arn = "${aws_iam_policy.geolog_instance.arn}"
}

data "aws_iam_policy_document" "geolog_instance" {
  
  statement {
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken"
    ]
    resources = [
      "*",
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "ecr:GetAuthorizationToken",
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:GetRepositoryPolicy",
      "ecr:DescribeRepositories",
      "ecr:ListImages",
      "ecr:BatchGetImage"
    ]
    resources = [
      "arn:aws:ecr:eu-west-1:772663561820:repository/geolog"
    ]
  }

}