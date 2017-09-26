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
      "s3:ListAllMyBuckets"
    ]
    resources = [
      "arn:aws:s3:::*"
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "s3:Get*",
      "s3:List*"
    ]
    resources = [
      "arn:aws:s3:::geolog-state-production/*"
    ]
  }

  statement {
    effect = "Allow"
    actions = [
      "s3:*"
    ]
    resources = [
      "arn:aws:s3:::blue.geolog.co",
      "arn:aws:s3:::blue.geolog.co/*",
      "arn:aws:s3:::green.geolog.co",
      "arn:aws:s3:::green.geolog.co/*",
      "arn:aws:s3:::assets.geolog.co",
      "arn:aws:s3:::assets.geolog.co/*"
    ]
  }
}
