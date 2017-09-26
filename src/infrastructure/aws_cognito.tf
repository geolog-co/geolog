# Can't actually setup cognito, but can setup permissions / roles
# After pool is created, must select the authenticated and
# unauthenticaed roles manually in the console

# Are this minimum set of permissions for cognito to do stuff?
data "aws_iam_policy_document" "geolog_cognito_minimum" {
  statement {
    sid = ""
    effect = "Allow"
    actions = [
      "mobileanalytics:PutEvents",
      "cognito-sync:*"
    ]
    resources = [
      "*"
    ]
  }
}

resource "aws_iam_policy" "geolog_cognito_minimum" {
  name = "geolog_cognito_minimum"
  policy = "${data.aws_iam_policy_document.geolog_cognito_minimum.json}"
}


resource "aws_iam_role" "geolog_cognito_unauthenticated" {
    name = "geolog_cognito_unauthenticated"
    assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "cognito-identity.amazonaws.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": "eu-west-1:fdeb8cdc-38e2-4963-9578-5a4f03efdfed"
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "unauthenticated"
        }
      }
    }
  ]
}
EOF
}

resource "aws_iam_role" "geolog_cognito_authenticated" {
    name = "geolog_cognito_authenticated"
    assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "cognito-identity.amazonaws.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": "eu-west-1:fdeb8cdc-38e2-4963-9578-5a4f03efdfed"
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "authenticated"
        }
      }
    }
  ]
}
EOF
}


resource "aws_iam_role_policy_attachment" "geolog_cognito_minimum" {
  role = "${aws_iam_role.geolog_cognito_unauthenticated.name}"
  policy_arn = "${aws_iam_policy.geolog_cognito_minimum.arn}"
}
