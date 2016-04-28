'use strict';

/**
 * A Connection handler for Amazon ES.
 *
 * Uses the aws-sdk to make signed requests to an Amazon ES endpoint.
 * Define the Amazon ES config and the connection handler
 * in the client configuration:
 *
 * var es = require('elasticsearch').Client({
 *  hosts: 'https://amazon-es-host.us-east-1.es.amazonaws.com',
 *  connectionClass: require('http-aws-es'),
 *  amazonConfig: {
 *    region: 'us-east-1' // Optional - fallback to ENV or 'us-east-1'
 *  }
 * });
 *
 * @param client {Client} - The Client that this class belongs to
 * @param config {Object} - Configuration options
 * @param [config.protocol=http:] {String} - The HTTP protocol that this connection will use, can be set to https:
 * @class HttpConnector
 */

var AWS = require('aws-sdk');
var HttpConnector = require('elasticsearch/src/lib/connectors/http');
var zlib = require('zlib');

function getCredentials(next) {
  var chain = new AWS.CredentialProviderChain();

  chain.resolve(function resolveChain(err, creds) {
    if (err) {
      return next(err);
    }

    next(null, creds);
  });
}

class HttpAmazonESConnector extends HttpConnector {
  constructor(host, config) {
    super(host, config);
    this.endpoint = new AWS.Endpoint(host.host);
    this.amazonConfig = config.amazonConfig || {};

    getCredentials(function findCreds(err, creds) {
      this.credentials = creds;
    }.bind(this));
  }

  request(params, cb) {
    var incoming;
    var timeoutId;
    var request;
    var req;
    var status = 0;
    var headers = {};
    var log = this.log;
    var response;

    var reqParams = this.makeReqParams(params);
    // general clean-up procedure to run after the request
    // completes, has an error, or is aborted.
    function cleanUp(err) {
      clearTimeout(timeoutId);

      if (req) {
        req.removeAllListeners();
      }

      if (incoming) {
        incoming.removeAllListeners();
      }

      if ((err instanceof Error) === false) {
        err = undefined;
      }

      log.trace(params.method, reqParams, params.body, response, status);
      if (err) {
        cb(err);
      } else {
        cb(err, response, status, headers);
      }
    }

    request = new AWS.HttpRequest(this.endpoint);

    // copy across params
    Object.keys(reqParams).forEach(function mapParams(key) {
      request[key] = reqParams[key];
    });

    request.region = this.amazonConfig.region || process.env.AWS_REGION || 'us-east-1';

    if (params.body) {
      request.body = params.body;
    }

    if (!request.headers) {
      request.headers = {};
    }

    request.headers['presigned-expires'] = false;
    request.headers.Host = this.endpoint.host;

    // Sign the request (Sigv4)
    var signer = new AWS.Signers.V4(request, 'es');
    signer.addAuthorization(this.credentials, new Date());

    var send = new AWS.NodeHttpClient();
    req = send.handleRequest(request, null, function handleRequest(_incoming) {
      incoming = _incoming;
      status = incoming.statusCode;
      headers = incoming.headers;
      response = '';

      var encoding = (headers['content-encoding'] || '').toLowerCase();
      if (encoding === 'gzip' || encoding === 'deflate') {
        incoming = incoming.pipe(zlib.createUnzip());
      }

      incoming.setEncoding('utf8');
      incoming.on('data', function (d) {
        response += d;
      });

      incoming.on('error', cleanUp);
      incoming.on('end', cleanUp);
    }, cleanUp);

    req.on('error', cleanUp);

    req.setNoDelay(true);
    req.setSocketKeepAlive(true);

    return function abortRequest() {
      req.abort();
    };
  }
}

module.exports = HttpAmazonESConnector;
