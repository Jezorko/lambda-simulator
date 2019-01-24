const LambdaSimulatorProxy = require('./LambdaSimulatorProxy').LambdaSimulatorProxy;
const LambdaResponse = require('../LambdaResponse').LambdaResponse;
const Route = require('route-parser');


const EMPTY_ROUTE = new Route('/');

/**
 * Allows request transformation that mimics AWS Gateway Lambda integration.
 */
class AwsGatewayLambdaIntegrationRequestTransformer {

    /**
     * @param {string?} urlTemplate to be used for path parameters parsing
     */
    constructor(urlTemplate) {
        this.route = urlTemplate ? new Route(urlTemplate) : EMPTY_ROUTE;
    }

    /**
     * @param {string} httpMethod HTTP method of this request
     * @param {string} url URL this request has been sent to
     * @param {Object} requestBody the JSON body of the request as an object
     * @param {Object} queryParams an object where keys are query parameter names and values are their values
     * @returns {Object} the transformed request object used as the event in AWS Lambda handler method
     */
    transformRequest(httpMethod, url, requestBody, queryParams) {
        const pathParameters = this.route.match(url);
        return {
            httpMethod: httpMethod,
            path: url,
            body: JSON.stringify(requestBody),
            pathParameters: pathParameters !== false ? pathParameters : {},
            queryStringParameters: queryParams
        };
    }

}

/**
 * Allows response transformation that mimics AWS Gateway Lambda integration.
 */
class AwsGatewayLambdaIntegrationResponseTransformer {

    /**
     * @param {LambdaResponse} response response from the handler method
     * @returns {LambdaResponse} the transformed response
     */
    static transformResponse(response) {
        const body = response.body;
        try {
            return new LambdaResponse(
                body ? body.statusCode ? body.statusCode : 200 : 200,
                body ? JSON.parse(body.body) : "ERROR: body is missing"
            );
        } catch (e) {
            // For AWS Gateway, you need to JSON.stringify your body!
            return new LambdaResponse(502, 'malformed Lambda proxy response');
        }
    }

}

/**
 * This {@link LambdaSimulatorProxy} mimics the behavior of AWS Gateway proxy integration.
 * For more details, see {@link https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-as-simple-proxy-for-lambda.html}.
 */
class AwsGatewayLambdaIntegrationProxy extends LambdaSimulatorProxy {

    /**
     * @param {string?} urlTemplate to be used for path parameters parsing
     */
    constructor(urlTemplate) {
        super(
            // make it into an in-line Lambda to prevent leaking 'this', eh JS...
            (...args) => new AwsGatewayLambdaIntegrationRequestTransformer(urlTemplate).transformRequest(...args),
            AwsGatewayLambdaIntegrationResponseTransformer.transformResponse
        );
    }

}

module.exports = {AwsGatewayLambdaIntegrationProxy};