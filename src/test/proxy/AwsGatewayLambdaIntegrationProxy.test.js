const AwsGatewayLambdaIntegrationProxy = require('../../main/proxy/AwsGatewayLambdaIntegrationProxy').AwsGatewayLambdaIntegrationProxy;
const LambdaResponse = require('../../main/LambdaResponse').LambdaResponse;
const assert = require('assert');

describe(AwsGatewayLambdaIntegrationProxy.name, function () {

    const simpleProxy = new AwsGatewayLambdaIntegrationProxy();
    const proxyWithUrlTemplate = new AwsGatewayLambdaIntegrationProxy('/resource/:resourceId/sub-resource/:subResourceId');

    describe('requestTransformer', () => {

        it('should append path parameters if URL template is provided', () => {
            // when:
            const result = proxyWithUrlTemplate.requestTransformer('ANY', '/resource/5/sub-resource/bla', {}, {});

            // then:
            assert.strictEqual(result.pathParameters.resourceId, '5');
            assert.strictEqual(result.pathParameters.subResourceId, 'bla');
        });

        it('should stringify request body and put it inside a "body" event field', () => {
            // given:
            const testBody = {testField: 'testValue'};

            // when:
            const result = simpleProxy.requestTransformer('ANY', '', testBody, {});

            // then:
            assert.strictEqual(result.body, JSON.stringify(testBody));
        });

        it('should put HTTP method in a "httpMethod" event field', () => {
            // given:
            const testHttpMethod = 'TEST_METHOD';

            // when:
            const result = simpleProxy.requestTransformer(testHttpMethod, '', {}, {});

            // then:
            assert.strictEqual(result.httpMethod, testHttpMethod);
        });

        it('should put url in a "path" event field', () => {
            // given:
            const testUrl = '/test/url';

            // when:
            const result = simpleProxy.requestTransformer('ANY', testUrl, {}, {});

            // then:
            assert.strictEqual(result.path, testUrl);
        });

        it('should put query parameters in a "queryStringParameters" event field', () => {
            // given:
            const testQueryParameters = {testParameterName: 'testParameterValue'};

            // when:
            const result = simpleProxy.requestTransformer('ANY', '', {}, testQueryParameters);

            // then:
            assert.deepStrictEqual(result.queryStringParameters, testQueryParameters);
        });

        it('should put all headers in a "headers" event field and multi value headers in "multiValueHeaders" field', () => {
            // given:
            const testRequestHeaders = {
                singleValueHeader: 'test/bla',
                multiValueHeader: 'first, second, test/third'
            };
            const testHeadersAsMultiValueHeaders = {
                singleValueHeader: ['test/bla'],
                multiValueHeader: ['first', 'second', 'test/third']
            };

            // when:
            const result = simpleProxy.requestTransformer('ANY', '', {}, {}, testRequestHeaders);

            // then:
            assert.deepStrictEqual(result.headers, testRequestHeaders);
            assert.deepStrictEqual(result.multiValueHeaders, testHeadersAsMultiValueHeaders);
        });

        it('should not put any headers if there are none', () => {
            // given:
            const testRequestHeaders = {};
            const testHeadersAsMultiValueHeaders = {};

            // when:
            const result = simpleProxy.requestTransformer('ANY', '', {}, {}, testRequestHeaders);

            // then:
            assert.deepStrictEqual(result.headers, testRequestHeaders);
            assert.deepStrictEqual(result.multiValueHeaders, testHeadersAsMultiValueHeaders);
        });

    });

    describe('responseTransformer', () => {

        it('should return 502 if body is not a valid JSON string', () => {
            // when:
            const result = simpleProxy.responseTransformer(new LambdaResponse(200, {body: 'not a JSON'}));

            // then:
            assert.strictEqual(result.httpStatusCode, 502);
        });

        it('should return HTTP 200 if statusCode field is missing in the body', () => {
            // when:
            const result = simpleProxy.responseTransformer(new LambdaResponse(200, {
                body: '{}'
            }));

            // then:
            assert.strictEqual(result.httpStatusCode, 200);
        });

        it('should return HTTP status equal to statusCode field in the body', () => {
            // given:
            const testStatusCode = 666;

            // when:
            const result = simpleProxy.responseTransformer(new LambdaResponse(200, {
                statusCode: testStatusCode,
                body: '{}'
            }));

            // then:
            assert.strictEqual(result.httpStatusCode, testStatusCode);
        });

        it('should return parsed body if body field is valid in the response', () => {
            // given:
            const testBody = {testVariable: 'testValue'};

            // when:
            const result = simpleProxy.responseTransformer(new LambdaResponse(200, {
                body: JSON.stringify(testBody)
            }));

            // then:
            assert.deepStrictEqual(result.body, testBody);
        });

    });


});