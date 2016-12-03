'use strict';

const parallelLimit = require('async/parallelLimit');
const AWS = require('aws-sdk');
const babelify = require("babelify");
const browserify = require('browserify');
const transformTools = require('browserify-transform-tools');
const browserifyShim = require('browserify-shim');
const childProcess = require('child_process');
const concurrent = require('concurrent-transform');
const del = require('del');
const gulp = require('gulp');
const awspublish = require('gulp-awspublish');
const streamToBuffer = require('gulp-buffer');
const connect = require('gulp-connect');
const coveralls = require('gulp-coveralls');
const decompress = require('gulp-decompress');
const download = require("gulp-download-stream");
const eslint = require('gulp-eslint');
const gulpHandlebars = require('gulp-compile-handlebars');
const htmlhint = require("gulp-htmlhint");
const istanbul = require('gulp-istanbul');
const mocha = require('gulp-mocha');
const rev = require('gulp-rev');
const revReplace = require('gulp-rev-replace');
// const uglify = require('gulp-uglify');
const gutil = require('gulp-util');
const webdriver = require('gulp-webdriver');
const zip = require('gulp-zip');
const handlebars = require('handlebars');
const os = require('os');
const plato = require('plato');
const http = require('http');
const mergeStream = require('merge-stream');
const net = require('net');
const stream = require('stream');
const buffer = require('vinyl-buffer');
const source = require('vinyl-source-stream');

AWS.config.region = 'eu-west-1';
AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: 'default'});
const apigateway = new AWS.APIGateway();
const lambda = new AWS.Lambda();

const exec = childProcess.exec;

const LAMBDA_NAME = 'geolog-api';
// There is no production lambda alias.
// The certification alias is for debugging
const LAMBDA_ALIAS_CERTIFICATION = 'certification';
const BUILD_DIR = 'build';
const API_GATEWAY_STAGE_CERTIFICATION = 'certification';
const API_GATEWAY_STAGE_PRODUCTION = 'production';

// Slightly horrible that can't find a better (less global)
// way of getting this is the way to get options into the
// AWS SDK builder
process.env.MINIFY = '1'
process.env.AWS_SERVICES ='cognitoidentity,s3'

const RESULTS_DIR = (process.env.CIRCLECI ? process.env.CIRCLE_TEST_REPORTS + '/' : '') + 'results'
const COVERAGE_DIR = RESULTS_DIR + '/coverage'
const ANALYSIS_DIR = RESULTS_DIR + '/analysis'

const HOSTED_GRAPHITE_API_KEY = process.env.HOSTED_GRAPHITE_API_KEY;

const TERRAFORM_DIR = 'bin'
const TERRAFORM = 'bin/terraform';

const FIRST_DEPLOYMENT = 'blue';
const NEXT_DEPLOYMENTS = {
  'blue': 'green',
  'green': 'blue',
};

const BUCKETS = {
  'assets': 'assets.geolog.co',
  'blue': 'blue.geolog.co',
  'green': 'green.geolog.co'
};

const DEVELOPMENT_SITE_PORT = '8080';
const DEVELOPMENT_ASSETS_PORT = '8081';

const ENVIRONMENTS = {
  'production': {
    'assetsBase': 'https://assets.geolog.co'
  },
  'development': {
    'assetsBase': 'http://localhost:' + DEVELOPMENT_ASSETS_PORT
  }
}

const IDENTITY_POOL_ID = 'eu-west-1:fdeb8cdc-38e2-4963-9578-5a4f03efdfed';
const REGION = 'eu-west-1';

function getTerraformOutput(name) {
  return new Promise((resolve) => {
    exec(TERRAFORM + ' output ' + name, (err, stdout) => {
      resolve(stdout.trim());
    });
  }); 
}

function getApiGatewayId() {
  return getTerraformOutput('aws_api_gateway_rest_api.geolog.id');
}

function getUploadBucket() {
  return getTerraformOutput('aws_s3_bucket.uploads_geolog_co.id');
}

function updateLambda(zippedCode) {
  gutil.log('Updating lambda');
  return lambda.updateFunctionCode({
    Publish: true,
    FunctionName: 'geolog-api',
    ZipFile: zippedCode
  }).promise().then((resource) => {
    gutil.log('Lambda updated with version: ' + resource.Version);
    return lambda.updateAlias({
      FunctionName: LAMBDA_NAME,
      FunctionVersion: resource.Version,
      Name: LAMBDA_ALIAS_CERTIFICATION
    }).promise();
  });
}

// Slightly horrible way of getting current deployment,
// but it has the benefit of getting it from the actual
// deployment as AWS sees it (not via Cloud Front), and so
function getCurrentDeployment() {
  return getApiGatewayId().then((apiGatewayId) => {
    return apigateway.getExport({
      restApiId: apiGatewayId,
      stageName: API_GATEWAY_STAGE_PRODUCTION,
      exportType: 'swagger',
      accepts: 'application/json',
      parameters: {extensions: 'integrations,authorizers'}
    }).promise();
  }).then((result) => {
    const swagger = JSON.parse(result.body);
    const responses = swagger.paths['/_deployment'].get['x-amazon-apigateway-integration'].responses;
    if (!responses) {
      // Slightly annoying first-time case when there is no deployment
      return null
    }
    const deploymentResponse = responses.default.responseTemplates['application/json'];
    const deployment = JSON.parse(deploymentResponse).deployment;
    return deployment;
  });
}

function getNextDeployment() {
  return getCurrentDeployment().then((deployment) => {
    return deployment ? NEXT_DEPLOYMENTS[deployment] : FIRST_DEPLOYMENT;
  });
}

function apiDeployToCertification(schema) {
  gutil.log('Deploying API to certification');
  return getApiGatewayId().then((apiGatewayId) => {
    return apigateway.putRestApi({
      body: schema,
      restApiId: apiGatewayId,
      mode: 'overwrite',
      failOnWarnings: true
    }).promise().then(() => {
      return apigateway.createDeployment({
        restApiId: apiGatewayId,
        stageName: API_GATEWAY_STAGE_CERTIFICATION,
      }).promise();
    });
  }).then((res) => {
    gutil.log('Deployed to certification: ' + res.id);
  });
}

function apiDeployToProduction() {
  return getApiGatewayId().then((apiGatewayId) => {
    return apigateway.getStage({
      restApiId: apiGatewayId,
      stageName: API_GATEWAY_STAGE_CERTIFICATION,
    }).promise().then((certificationStage) => {
      gutil.log('Deploying to production: ' + certificationStage.deploymentId)
      return apigateway.updateStage({
        restApiId: apiGatewayId,
        stageName: API_GATEWAY_STAGE_PRODUCTION,
        patchOperations: [{
          op: 'replace',
          path: '/deploymentId',
          value: certificationStage.deploymentId
        }]
      }).promise();
    });
  });
}

// Returns a transform stream that calls the original
// function for each file contents in the stream
function streamIfy(original) {
  return stream.Transform({
    objectMode: true,
    transform: function (file, enc, callback) {
      original(file.contents).then((results) => {
        this.push(results);
        callback();
      }, (error) => {
        this.emit('error', error);
      });
    }
  });
}

function streamToPromise(stream) {
  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

function submitMetric(name, value, callback) {
  const socket = net.createConnection(2003, "560b32d8.carbon.hostedgraphite.com", () => {
    socket.write(HOSTED_GRAPHITE_API_KEY + "." + name + " " + value + "\n");
    socket.end();
    callback();
  });
}

function submitMetrics(data, callback) {
  const funcs = data.map((point) => {
    return (callback) => submitMetric(point.name, point.value, callback);
  });
  parallelLimit(funcs, 16, callback)
}

gulp.task('lint-javascript', () => {
  return gulp.src(['src/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('lint-html', () => {
  return gulp.src(['src/**/*.html'])
    .pipe(htmlhint())
    .pipe(htmlhint.failReporter());
});

gulp.task('test-unit-front-run', () => {
  return gulp.src(['src/front/**/*.spec.js'], {read: false})
    .pipe(mocha({
    }));
})

gulp.task('test-unit-back-coverage-setup', () => {
  return gulp.src(['src/back/**/*.js', '!src/back/**/*.spec.js'])
    .pipe(istanbul())
    .pipe(istanbul.hookRequire());
});

gulp.task('test-unit-back-run', () => {
  return gulp.src(['src/back/**/*.spec.js'], {read: false})
    .pipe(mocha({
    }))
    .pipe(mocha({
      reporter: 'mocha-junit-reporter',
      reporterOptions: {
        mochaFile: RESULTS_DIR + '/unit.xml'
      }
    }))
    .pipe(istanbul.writeReports({
      dir: COVERAGE_DIR
    }));
});

gulp.task('test-unit-coverage-submit-graphana', (cb) => {
  const coverage = istanbul.summarizeCoverage();
  submitMetrics([
    {name: "test.unit.lines.total", value: coverage.lines.total},
    {name: "test.unit.lines.covered", value: coverage.lines.covered},
    {name: "test.unit.lines.skipped", value: coverage.lines.skipped},
    {name: "test.unit.statements.total", value: coverage.statements.total},
    {name: "test.unit.statements.covered", value: coverage.statements.covered},
    {name: "test.unit.statements.skipped", value: coverage.statements.skipped},
    {name: "test.unit.functions.total", value: coverage.functions.total},
    {name: "test.unit.functions.covered", value: coverage.functions.covered},
    {name: "test.unit.functions.skipped", value: coverage.functions.skipped},
    {name: "test.unit.branches.total", value: coverage.branches.total},
    {name: "test.unit.branches.covered", value: coverage.branches.covered},
    {name: "test.unit.branches.skipped", value: coverage.branches.skipped}
  ], cb);
});

gulp.task('test-unit-coverage-submit-coveralls', () => {
  return gulp.src(COVERAGE_DIR + '/lcov.info')
    .pipe(coveralls());
});

gulp.task('static-analysis-run', (done) => {
  plato.inspect(['src'], ANALYSIS_DIR, {recurse: true}, () => {
    done()
  });
});

gulp.task('static-analysis-submit-graphana', () => {
  return gulp.src([ANALYSIS_DIR + '/report.json'])
    .pipe(stream.Transform({
      objectMode: true,
      transform: function(file, enc, callback) {
        const complexity = JSON.parse(file.contents);
        submitMetrics([
          {name: "analysis.static.total.sloc", value: complexity.summary.total.sloc},
          {name: "analysis.static.total.maintainability", value: complexity.summary.total.maintainability},
          {name: "analysis.static.average.sloc", value: complexity.summary.average.sloc},
          {name: "analysis.static.average.maintainability", value: complexity.summary.average.maintainability},
        ], callback);

        // complexity.reports.forEach((report) => {
        //   console.log(report.path);
        // });
      }
    }));
});

// One-time task
gulp.task('permit-lambda', () => {
  return lambda.addPermission({
    Action: 'lambda:InvokeFunction',
    FunctionName: 'geolog-api',
    Principal: 'apigateway.amazonaws.com',
    StatementId: 'api-gateway',
    Qualifier: 'production'
  }).promise();
});

gulp.task('back-deploy', () => {
  return gulp.src(['src/back/index.js'])
    .pipe(zip('index.zip'))
    .pipe(streamIfy(updateLambda))
});

gulp.task('api-validate', (cb) => {
  exec('node_modules/.bin/swagger-tools validate src/api/schema.yml', (err) => {
    cb(err);
  });
});

gulp.task('get-current-deployment', () => {
  return getCurrentDeployment();
});

gulp.task('api-deploy-certification', () => {
  const lambdaPromise = lambda.getAlias({
    FunctionName: LAMBDA_NAME,
    Name: LAMBDA_ALIAS_CERTIFICATION
  }).promise().then((alias) => {
    return alias.FunctionVersion;
  });

  const deploymentPromise = getNextDeployment();

  return Promise.all([lambdaPromise, deploymentPromise]).then((results) => {
    const lambdaVersion = results[0];
    const deployment = results[1];

    gutil.log('Deploying API as \'' + deployment + '\' with lambda version ' + lambdaVersion);

    return streamToPromise(gulp.src(['src/api/schema.yml'])
      .pipe(gulpHandlebars({
        deployment: deployment,
        lambdaVersion: lambdaVersion
      }))
      .pipe(streamIfy(apiDeployToCertification))
    )
  });
});

gulp.task('api-deploy-to-production', () => {
  return apiDeployToProduction();
});

gulp.task('front-clean', () => {
  return del([BUILD_DIR + '/**', '!' + BUILD_DIR]);
});

const buildDir = (environment) => {
  return BUILD_DIR + '/' + environment
}

const siteBuildDir = (environment) => {
  return buildDir(environment) + '/site'
}

const assetsBuildDir = (environment) => {
  return buildDir(environment) + '/assets'
}

const frontBuild = (environment) => {
  return getUploadBucket().then((uploadBucket) => {
    const scripts = browserify({
        entries: 'src/front/assets/app.jsx',
        extensions: ['.js', '.jsx']
      })
      .transform(transformTools.makeStringTransform("template", {
        includeExtensions: ['config.js']
      }, (content, transformOptions, done) => {
        const template = handlebars.compile(content);
        const data = {
          identityPoolId: IDENTITY_POOL_ID,
          region: REGION,
          uploadBucket: uploadBucket
        };
        done(null, template(data));
      }))
      .transform(babelify, {presets: ["react"]})
      .transform(browserifyShim)
      .bundle()
      .pipe(source('app.js'))
      .pipe(buffer())
      // uglify(),
      .pipe(rev())
      .pipe(gulp.dest(assetsBuildDir(environment)))
      .pipe(rev.manifest());

    const files = gulp.src(['index.html'], {cwd: 'src/front/site', base: 'src/front/site'})
      .pipe(gulpHandlebars({
        assetsBase: ENVIRONMENTS[environment].assetsBase,
      }))
      .pipe(revReplace({manifest: scripts}))
      .pipe(gulp.dest(siteBuildDir(environment)));

    return streamToPromise(mergeStream(scripts, files));
  });
}

gulp.task('front-build-development', () => {
  return frontBuild('development')
});

gulp.task('front-build-production', () => {
  return frontBuild('production')
});

function serveFront() {
  connect.server({
    root: siteBuildDir('development'),
    port: DEVELOPMENT_SITE_PORT
  });
  connect.server({
    root: assetsBuildDir('development'),
    port: DEVELOPMENT_ASSETS_PORT
  });
}

gulp.task('test-e2e-run-local', () => {
  // There is a race condition here, but
  // starting the server seems to be much
  // quicker than starting the tests
  serveFront()

  return gulp.src('wdio.conf.js')
    .pipe(webdriver({
      baseUrl: 'http://localhost:8080'
    }))
    .on('finish', () => {
      connect.serverClose()
    });
});

gulp.task('test-e2e-run-certification', () => {
  return gulp.src('wdio.conf.js')
    .pipe(webdriver({
      baseUrl: 'https://certification.geolog.co'
    }));
});

gulp.task('front-watch', () => {
  gulp.watch(['package.json', 'src/**/*'], gulp.series('front-build-development'));
});

gulp.task('front-serve', () => {
  serveFront()
});

gulp.task('back-serve', () => {
  const index = require('../back/index.js');
  http
    .createServer((request, response) => {
      const lambdaRequest = {
        httpMethod: request.method,
        body: null, // Need to do something with request stream to get it?
      }
      index.handler(lambdaRequest, null, (err, json) => {
        response.end(json.body);
      });
    })
    .listen(8081);
});

// All assets have MD5-cachebusted names,
// so they can be deployed to live
gulp.task('front-assets-deploy-production', () => {
  const publisher = awspublish.create({
    params: {
      Bucket: BUCKETS.assets
    }
  });

  // All files are forced since gulp-awspublish doesn't
  // sync if there are just http header changes
  function publish(headers) {
    return concurrent(publisher.publish(headers, {force: true}), 8);
  }

  // Cache 1 week
  const js = gulp.src('**/*.js', {cwd: assetsBuildDir('production'), base: assetsBuildDir('production')})
    .pipe(publish({
      'Cache-Control': 'max-age=' + 60 * 60 * 24 * 7 + ', public',
      'Content-Type': 'application/javascript; charset=utf-8'
    }));

  return js;
});

gulp.task('front-html-deploy-certification', () => {
  return getNextDeployment().then((deployment) => {
    const bucket = BUCKETS[deployment];
    gutil.log('Deploying HTML to ' + bucket);
    const publisher = awspublish.create({
      params: {
        Bucket: bucket
      }
    });

    // All files are forced since gulp-awspublish doesn't
    // sync if there are just http header changes
    function publish(headers) {
      return concurrent(publisher.publish(headers, {force: true}), 8);
    }

    // Cache 1 min
    const index = gulp.src('index.html', {cwd: siteBuildDir('production'), base: siteBuildDir('production')})
      .pipe(publish({
        'Cache-Control': 'max-age=' + 60 * 1 + ', public',
        'Content-Type': 'text/html; charset=utf-8'
      }));

    return index
      .pipe(publisher.sync());
  });
});

gulp.task('terraform-install', () => {
  const platform = os.platform();
  const version = '0.7.9';

  gutil.log(`Terraform installing to ${TERRAFORM}...`);
  return streamToPromise(
    download(`https://releases.hashicorp.com/terraform/${version}/terraform_${version}_${platform}_amd64.zip`)
      .pipe(streamToBuffer()) // decompress does not support streams
      .pipe(decompress())
      .pipe(gulp.dest(TERRAFORM_DIR)
    )
  ).then(() => gutil.log(`Terraform installed to ${TERRAFORM}`));
});

gulp.task('terraform-init', (cb) => {
  exec(TERRAFORM + ' remote config -backend=S3 -backend-config="bucket=geolog-state-production" -backend-config="key=geolog.tfstate" -backend-config="region=eu-west-1"', (err) => {
    cb(err);
  });
});

gulp.task('develop', 
  gulp.parallel(
    'front-build-development',
    'front-serve',
    'front-watch'
  )
)

gulp.task('test-run', gulp.parallel(
  'api-validate',
  'lint-javascript',
  'lint-html',
  'static-analysis-run',
  'test-unit-front-run',
  gulp.series('test-unit-back-coverage-setup', 'test-unit-back-run')
));

gulp.task('test-submit', gulp.parallel(
  'static-analysis-submit-graphana',
  'test-unit-coverage-submit-graphana',
  'test-unit-coverage-submit-coveralls'
))

gulp.task('test-pr', gulp.series(
  'test-run'
));

gulp.task('test-master', gulp.series(
  'test-run',
  'test-submit'
));

gulp.task('deploy-master', () => {
  // Need IDs of resources to deploy to
  'terraform-install',
  'terraform-init',
  gulp.parallel(
    gulp.series(
      'front-clean',
      'front-build-production',
      gulp.parallel(
        'front-assets-deploy-production',
        'front-html-deploy-certification'
      )
    ),
    gulp.series(
      'back-deploy',
      'api-deploy-certification'
    )
  ),
  'test-e2e-run-certification',
  'api-deploy-to-production'
});

gulp.task('default', gulp.series('test-run'));
