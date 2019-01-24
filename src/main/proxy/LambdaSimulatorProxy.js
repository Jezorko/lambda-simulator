const LambdaResponse = require('../LambdaResponse');

/**
 * Allows request and response transformation.
 * The request transformation is applied in place of default body handling.
 * The response is transformed after it has been created by the Lambda Simulator.
 */
class LambdaSimulatorProxy {
    /**
     * @param {function(string, string, *, *): *} requestTransformer a function that accepts httpMethod, url, requestBody and queryParams and returns a response body
     * @param {function(LambdaResponse): LambdaResponse} responseTransformer a function that accepts an instance of {LambdaResponse} and returns a transformed {LambdaResponse}
     */
    constructor(requestTransformer, responseTransformer) {
        this.requestTransformer = requestTransformer;
        this.responseTransformer = responseTransformer;
    }
}

module.exports = {LambdaSimulatorProxy};