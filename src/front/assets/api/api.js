'use strict';

class Api {
  constructor(
    AWS,
    apigClientFactory,
    config
  ) {
    this.AWS = AWS;
    this.uploadBucket = config.uploadBucket;

    const creds = new this.AWS.CognitoIdentityCredentials({
      IdentityPoolId: config.identityPoolId
    });

    AWS.config.update({
      region: config.region,
      credentials: creds
    });

    this.creds = creds.getPromise().then(() => {
      return creds;
    });

    this.apigClient = this.creds.then(() => {
      return apigClientFactory.newClient({
        accessKey: creds.accessKeyId,
        secretKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
        region: config.region
      });    
    });
  }

  getJob() {
    this.apigClient.then((client) => {
      return client.apiJobsIdGet({id:1});
    });
  }

  upload(file) {
    this.creds.then((credentials) => {
      const s3 = new this.AWS.S3({
        credentials: credentials
      });
      s3.putObject({
        Bucket: this.uploadBucket,
        Key: credentials.identityId + '/some-key',
        Body: file
      }).promise().then(() => {
      }, () => {
      });  
    })
  }
}

module.exports = Api;
