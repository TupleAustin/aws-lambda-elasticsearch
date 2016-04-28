## HttpAmazonESConnector

* Extends: <code>HttpConnector</code>
* See: [https://github.com/elastic/elasticsearch-js/blob/master/src/lib/connectors/http.js](https://github.com/elastic/elasticsearch-js/blob/master/src/lib/connectors/http.js)

A Connection handler for Amazon ES.

Uses the aws-sdk to make signed requests to an Amazon ES endpoint.
Define the Amazon ES config and the connection handler
in the client configuration.

Ported from: https://www.npmjs.com/package/http-aws-es

| Param | Type | Description |
| --- | --- | --- |
| client | <code>Object</code> | The options object passed to the `Client` class |
| client.connectionClass | <code>Class</code> | The new connection class `aws-lambda-elasticsearch` |
| [client.amazonConfig] | <code>Object</code> | Specify Amazon specific configuration |
| [client.amazonConfig.region] | <code>String</code> | The region of the search cluster. Falls back to `process.env.AWS_REGION` or 'us-east-1' |

**Example**
```js
var es = require('elasticsearch').Client({
 hosts: 'https://amazon-es-host.us-east-1.es.amazonaws.com',
 connectionClass: require('aws-lambda-elasticsearch'),
 amazonConfig: {
   region: 'us-east-1'
 }
});
```
