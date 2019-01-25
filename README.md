[![License: WTFPL](https://img.shields.io/badge/License-WTFPL-red.svg)](http://www.wtfpl.net/txt/copying/)
[![Build status](https://travis-ci.org/Jezorko/lambda-simulator.svg?branch=master)](https://travis-ci.org/Jezorko/lambda-simulator)

## What is this?
This is a simple project that allows you to unit test your AWS Lambda handlers.
Additionally, you can use it to run the Lambda locally for some manual testing.

Do *not* use this as a replacement for AWS Lambda services in production.
This would be a terrible idea.

## How do I use it?

### Unit testing
First, add the project as a test dependency in `package.json` file:

```json
"devDependencies": {
    "lambda-simulator": "^0.0.3"
    ...
}
```

Next, import it in your unit test along with your AWS Lambda handler:

```javascript
const LambdaSimulator = require('lambda-simulator').LambdaSimulator;
const handler = require('../index').handler;
```

Additionally, if you're planning to proxy your requests through AWS Gateway, import the proxy:

```javascript
const AwsGatewayLambdaIntegrationProxy = require('lambda-simulator').AwsGatewayLambdaIntegrationProxy;
```

Finally, create the simulator in your test and add assertions:

```javascript
describe('my AWS Lambda handler', function() {
   
    const simulator = new LambdaSimulator(handler, new AwsGatewayLambdaIntegrationProxy()); // proxy is optional
    
    it('should reply with status 200', async () => {
        // when:
        const response = await simulator.sendPostRequest('/', { someField: "someValue" });
        
        // then:
        assert.deepStrictEqual(response.httpStatusCode, 200);
    });
    
});
```

#### Path parameters
If you'd like the path parameters to be parsed by the AwsGatewayLambdaIntegrationProxy, you need to provide a URL template.
For example this proxy object:

```javascript
new AwsGatewayLambdaIntegrationProxy('/resource/:resourceId/sub-resource/:subResourceId')
```

Will yield the following pathParameters object in your Lambda:

```json
{
  "resourceId": "5",
  "subResourceId": "bla"
}
```

### Manual testing
If you'd like to test your Lambda manually, start the `LambdaSimulator` server by calling the `listen` method:

```javascript
const LambdaSimulator = require('lambda-simulator').LambdaSimulator;
const handler = require('../index').handler;

new LambdaSimulator(handler).listen();
```

Now, you can send requests directly to your Lambda:

```bash
curl -vsX POST \
     -d '{"testVariable": "testValue"}' \
     'http://localhost:3000/test?testQueryParam=testValue'
```

## What features does it have?
Very few. It merely mimics AWS Lambda and, therefore, will never be perfect.
It's good enough for testing though.

Stuff that is missing, from the top of my head:
 * headers handling
 * many fields when using the [AWS API Gateway proxy](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-as-simple-proxy-for-lambda.html)
 * other proxy implementations
 * memory allocation statistics (not sure if possible with Node) 
 
## Contribution guidelines
All I ask for is tests and documentation in form of JS docstrings.
Feel free to submit a PR if you feel like it.