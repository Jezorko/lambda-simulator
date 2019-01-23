const LambdaResponse = require("./LambdaResponse").LambdaResponse;

/**
 * Allows request and response transformation.
 * The request transformation is applied in place of default body handling.
 * The response is transformed after it has been created by the Lambda Simulator.
 */
class LambdaSimulatorProxy {
    /**
     * @param {function} requestTransformer a function that accepts httpMethod, url, requestBody and queryParams and returns a response body
     * @param {function} responseTransformer a function that accepts an instance of {LambdaResponse} and returns a transformed {LambdaResponse}
     */
    constructor(requestTransformer, responseTransformer) {
        this.requestTransformer = requestTransformer;
        this.responseTransformer = responseTransformer;
    }
}

const awsGatewayLambdaIntegrationProxy = new LambdaSimulatorProxy(
    /**
     * @param {string} httpMethod HTTP method of this request
     * @param {string} url URL this request has been sent to
     * @param {Object} requestBody the JSON body of the request as an object
     * @param {Object} queryParams an object where keys are query parameter names and values are their values
     * @returns {*} the transformed request object used as the event in AWS Lambda handler method
     */
    (httpMethod, url, requestBody, queryParams) => {
        return {
            httpMethod: httpMethod,
            path: url,
            body: JSON.stringify(requestBody),
            queryStringParameters: queryParams
        };
    },
    /**
     * @param {LambdaResponse} response response from the handler method
     * @returns {LambdaResponse} the transformed response
     */
    response => {
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
    });


module.exports = {LambdaSimulatorProxy, awsGatewayLambdaIntegrationProxy};