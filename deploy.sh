#! /bin/bash

set -e

SHA1=$1
DATE=$(date +"%Y-%m-%d-%H:%M:%S")
VERSION="$DATE-$SHA1"

echo "Version: $VERSION"

echo "Bulding docker image..."
docker build --rm=false -t 772663561820.dkr.ecr.eu-west-1.amazonaws.com/geolog:$VERSION src/back
echo "Build docker image"

echo "Logging into docker..."
$(aws ecr get-login --region eu-west-1)
echo "Logged into docker"
docker push 772663561820.dkr.ecr.eu-west-1.amazonaws.com/geolog:$VERSION

echo "Creating new EB version..."
EB_BUCKET=deploy.geolog.co
DOCKERRUN_FILE=$VERSION-Dockerrun.aws.json
sed "s/<TAG>/$VERSION/" < Dockerrun.aws.json.template > $DOCKERRUN_FILE
aws s3 cp $DOCKERRUN_FILE s3://$EB_BUCKET/$DOCKERRUN_FILE --region eu-west-1
aws elasticbeanstalk create-application-version --application-name geolog \
    --version-label $VERSION --source-bundle S3Bucket=$EB_BUCKET,S3Key=$DOCKERRUN_FILE \
    --region eu-west-1
echo "Created new EB version"

# Get current certification
echo "Fetching certification cluster to deploy to..."
DEPLOY_ENV=$(aws elasticbeanstalk describe-environments --region=eu-west-1 --application-name=geolog | jq '.Environments | map(select(.CNAME == "certification-api-geolog.eu-west-1.elasticbeanstalk.com"))[0] | .EnvironmentName' | sed "s/\"//g")
echo "Certification environment: $DEPLOY_ENV"

# Update Elastic Beanstalk environment to new version
echo "Updating certification environment to new version..."
aws elasticbeanstalk update-environment --application-name geolog --environment-name $DEPLOY_ENV --version-label $VERSION --region eu-west-1
echo "Updated certification environment"

# Wait until ready and healthy
READY=false
while [ ! $READY = true ]
do
  echo "Sleeping until status and health ok to swap URLs..."
  sleep 10
  ENVIRONMENT=$(aws elasticbeanstalk describe-environments --region=eu-west-1 --application-name=geolog | jq '.Environments | map(select(.CNAME == "certification-api-geolog.eu-west-1.elasticbeanstalk.com")) | .[0]')
  STATUS=$(echo $ENVIRONMENT | jq '.Status' | sed "s/\"//g")
  HEALTH=$(echo $ENVIRONMENT | jq '.Health' | sed "s/\"//g")
  echo "Status: $STATUS"
  echo "Health: $HEALTH"
  if [ "$STATUS" = "Ready" ] && [ "$HEALTH" = "Green" ]; then
    READY=true
  fi
done

# Swap CNAMES
echo "Swapping URLs..."
aws elasticbeanstalk swap-environment-cnames --region eu-west-1 --source-environment-name geolog-blue --destination-environment-name geolog-green
echo "Swapped"

echo "Deployment done"