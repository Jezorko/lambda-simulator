const LambdaSimulatorProxy = require('./LambdaSimulatorProxy').LambdaSimulatorProxy;
const LambdaResponse = require('../LambdaResponse').LambdaResponse;

/**
 * This {@link LambdaSimulatorProxy} mimics the behavior of AWS Gateway proxy integration.
 * For more details, see {@link https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-create-api-as-simple-proxy-for-lambda.html}.
 */
class AwsGatewayLambdaIntegrationProxy extends LambdaSimulatorProxy {
    constructor() {
        super(
            AwsGatewayLambdaIntegrationProxy.transformRequest,
            AwsGatewayLambdaIntegrationProxy.transformResponse
        )
    }

    /**
     * @param {string} httpMethod HTTP method of this request
     * @param {string} url URL this request has been sent to
     * @param {Object} requestBody the JSON body of the request as an object
     * @param {Object} queryParams an object where keys are query parameter names and values are their values
     * @returns {*} the transformed request object used as the event in AWS Lambda handler method
     */
    static transformRequest(httpMethod, url, requestBody, queryParams) {
        return {
            httpMethod: httpMethod,
            path: url,
            body: JSON.stringify(requestBody),
            queryStringParameters: queryParams
        };
    }

    /**
     * @param {LambdaResponse} response response from the handler method
     * @returns {LambdaResponse} the transformed response
     */
    static transformResponse(response) {
        const body = response.body;
        try {
            return new LambdaResponse(
                body ? body.statusCode : 200,
                body ? JSON.parse(body.body) : "ERROR: body is missing"
            );
        } catch (e) {
            // For AWS Gateway, you need to JSON.stringify your body!
            return new LambdaResponse(502, 'malformed Lambda proxy response');
        }
    }

}

module.exports = {AwsGatewayLambdaIntegrationProxy};