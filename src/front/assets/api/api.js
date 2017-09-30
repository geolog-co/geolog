'use strict';

const generateProbablyUniqueGuid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

class Api {
  constructor(
    AWS,
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
  }

  getJob() {
    this.apigClient.then((client) => {
      return client.apiJobsIdGet({id:1});
    });
  }

  upload(file) {
    this.creds.then((credentials) => {
      // We are only allowed to overwrite keys
      // with the current user's id as a prefix. At
      // worst, a user can mess-up their own previous
      // upload, so a probably unique ID is enough
      const keySuffix = generateProbablyUniqueGuid();

      const s3 = new this.AWS.S3({
        credentials: credentials
      });
      s3.putObject({
        Bucket: this.uploadBucket,
        Key: credentials.identityId + '/' + keySuffix,
        Body: file
      }).promise().then(() => {
      }, () => {
      });  
    })
  }
}

module.exports = Api;
