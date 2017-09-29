#! /bin/bash

set -e

SHA1=$1
DATE=$(date +"%Y-%m-%d-%H-%M-%S")
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
echo "Fetching environments..."

LOAD_BALANCER_BLUE=$(aws elasticbeanstalk describe-environment-resources --environment-name geolog-blue --region eu-west-1 | jq '.EnvironmentResources | .LoadBalancers | .[0] | .Name' | sed "s/\"//g")
LOAD_BALANCER_BLUE_DETAILS=$(aws elb describe-load-balancers --load-balancer-names $LOAD_BALANCER_BLUE --region eu-west-1 | jq '.LoadBalancerDescriptions | .[0]')
LOAD_BALANCER_BLUE_ZONE_NAME=$(echo $LOAD_BALANCER_BLUE_DETAILS | jq '.CanonicalHostedZoneName' | sed "s/\"//g" | tr '[:upper:]' '[:lower:]').
LOAD_BALANCER_BLUE_ZONE_ID=$(echo $LOAD_BALANCER_BLUE_DETAILS | jq '.CanonicalHostedZoneNameID' | sed "s/\"//g")
echo "Found blue"

LOAD_BALANCER_GREEN=$(aws elasticbeanstalk describe-environment-resources --environment-name geolog-green --region eu-west-1 | jq '.EnvironmentResources | .LoadBalancers | .[0] | .Name' | sed "s/\"//g")
LOAD_BALANCER_GREEN_DETAILS=$(aws elb describe-load-balancers --load-balancer-names $LOAD_BALANCER_GREEN --region eu-west-1 | jq '.LoadBalancerDescriptions | .[0]')
LOAD_BALANCER_GREEN_ZONE_NAME=$(echo $LOAD_BALANCER_GREEN_DETAILS | jq '.CanonicalHostedZoneName' | sed "s/\"//g" | tr '[:upper:]' '[:lower:]').
LOAD_BALANCER_GREEN_ZONE_ID=$(echo $LOAD_BALANCER_GREEN_DETAILS | jq '.CanonicalHostedZoneNameID' | sed "s/\"//g")
echo "Found green"

echo "Finding production environment..."
ZONE_ID=$(aws route53 list-hosted-zones | jq '.HostedZones | map(select(.Name == "geolog.co.")) | .[0] | .Id' | sed "s/\"//g")
RECORDS=$(aws route53 list-resource-record-sets --hosted-zone-id $ZONE_ID)
PRODUCTION_NAME=$(echo $RECORDS | jq '.ResourceRecordSets | .[0] | .AliasTarget | .DNSName' | sed "s/\"//g")

if [ $PRODUCTION_NAME == $LOAD_BALANCER_BLUE_ZONE_NAME ]; then
  echo "Production: blue"
  DEPLOY_ENV="geolog-green"
  DEPLOY_ZONE_ID=$LOAD_BALANCER_GREEN_ZONE_ID
  DEPLOY_ZONE_NAME=$LOAD_BALANCER_GREEN_ZONE_NAME
  CERT_ZONE_ID=$LOAD_BALANCER_BLUE_ZONE_ID
  CERT_ZONE_NAME=$LOAD_BALANCER_BLUE_ZONE_NAME
elif [ $PRODUCTION_NAME == $LOAD_BALANCER_GREEN_ZONE_NAME ]; then
  echo "Production: green"
  DEPLOY_ENV="geolog-blue"
  DEPLOY_ZONE_ID=$LOAD_BALANCER_BLUE_ZONE_ID
  DEPLOY_ZONE_NAME=$LOAD_BALANCER_BLUE_ZONE_NAME
  CERT_ZONE_ID=$LOAD_BALANCER_GREEN_ZONE_ID
  CERT_ZONE_NAME=$LOAD_BALANCER_GREEN_ZONE_NAME
else
  echo "Unable to find production environment"
  exit 1
fi

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


echo "Swapping domains..."
CHANGES=$(cat <<EOF
{
  "Comment": "Deploy",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "geolog.co.",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$DEPLOY_ZONE_ID",
          "DNSName": "$DEPLOY_ZONE_NAME",
          "EvaluateTargetHealth": false
        }
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "certification.geolog.co.",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$CERT_ZONE_ID",
          "DNSName": "$CERT_ZONE_NAME",
          "EvaluateTargetHealth": false
        }
      }
    }
  ]
}
EOF)

echo $CHANGES
aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" --change-batch "$CHANGES"
echo "Swapped"

echo "Deployment done"