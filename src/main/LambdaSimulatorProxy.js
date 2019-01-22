const LambdaResponse = require("./LambdaSimulator").LambdaResponse;

class LambdaSimulatorProxy {
    constructor(requestTransformer, responseTransformer) {
        this.requestTransformer = requestTransformer;
        this.responseTransformer = responseTransformer;
    }
}

const awsGatewayLambdaIntegrationProxy = new LambdaSimulatorProxy(
    (httpMethod, url, requestBody, queryParams) => {
        return {
            httpMethod: httpMethod,
            path: url,
            body: JSON.stringify(requestBody),
            queryStringParameters: queryParams
        };
    },
    response => {
        const body = response.body;
        return new LambdaResponse(
            response.statusCode,
            {
                body: body ? body.body : null // ... said the gravedigger
            }
        );
    });


module.exports = {LambdaSimulatorProxy, awsGatewayLambdaIntegrationProxy};