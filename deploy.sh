#! /bin/bash

SHA1=$1

docker build --rm=false -t 772663561820.dkr.ecr.eu-west-1.amazonaws.com/geolog:$SHA1 src/back

# Push image to ECR
$(aws ecr get-login --region eu-west-1)
docker push 772663561820.dkr.ecr.eu-west-1.amazonaws.com/geolog:$SHA1

# Create new Elastic Beanstalk version
EB_BUCKET=deploy.geolog.co
DOCKERRUN_FILE=$SHA1-Dockerrun.aws.json
sed "s/<TAG>/$SHA1/" < Dockerrun.aws.json.template > $DOCKERRUN_FILE
aws s3 cp $DOCKERRUN_FILE s3://$EB_BUCKET/$DOCKERRUN_FILE --region eu-west-1
aws elasticbeanstalk create-application-version --application-name geolog \
    --version-label $SHA1 --source-bundle S3Bucket=$EB_BUCKET,S3Key=$DOCKERRUN_FILE \
    --region eu-west-1

# Get current certification
DEPLOY_ENV=$(aws elasticbeanstalk describe-environments --region=eu-west-1 --application-name=geolog | jq '.Environments | map(select(.CNAME == "certification-api-geolog.eu-west-1.elasticbeanstalk.com"))[0] | .EnvironmentName' | sed "s/\"//g")

# Update Elastic Beanstalk environment to new version
aws elasticbeanstalk update-environment --application-name geolog --environment-name $DEPLOY_ENV --version-label $SHA1 --region eu-west-1

# Swap CNAMES
aws elasticbeanstalk swap-environment-cnames --region eu-west-1 --application-name geolog --source-environment-name geolog-blue --destination-environment-name geolog-green