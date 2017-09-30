# The user that builds and deploys the system.
#
# The credentials for this user should *not* be made available to
# PRs, since that would result in unreviewed code running on the
# production system
# 
# Since PRs have read access to the state file, the credentials
# for this user must be created manually

resource "aws_iam_user" "geolog_ci_master" {
  name = "geolog_ci_master"
}

resource "aws_iam_policy" "geolog_ci_master" {
  name = "geolog_ci_master"
  policy = "${data.aws_iam_policy_document.geolog_ci_master.json}"
}

resource "aws_iam_user_policy_attachment" "geolog_ci_master" {
  user = "${aws_iam_user.geolog_ci_master.name}"
  policy_arn = "${aws_iam_policy.geolog_ci_master.arn}"
}

data "aws_iam_policy_document" "geolog_ci_master" {
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
      "ecr:*"
    ]
    resources = [
      "arn:aws:ecr:eu-west-1:772663561820:repository/geolog",
    ]
  }

  statement {
    effect = "Allow"
    actions = [
        "elasticbeanstalk:*",
        "ec2:*",
        "ecs:*",
        "elasticloadbalancing:*",
        "autoscaling:*",
        "cloudwatch:*",
        "s3:*",
        "sns:*",
        "cloudformation:*",
        "sqs:*",
        "route53:*"
    ]
    resources = [
      # So far couldn't get a more limited
      "*",
    ]
  }
}
