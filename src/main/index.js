const LambdaSimulator = require('./LambdaSimulator').LambdaSimulator;
const LambdaResponse = require('./LambdaResponse').LambdaResponse;
const LambdaSimulatorProxy = require('./proxy/LambdaSimulatorProxy').LambdaSimulatorProxy;
const AwsGatewayLambdaIntegrationProxy = require('./proxy/AwsGatewayLambdaIntegrationProxy').AwsGatewayLambdaIntegrationProxy;
const awsGatewayLambdaIntegrationProxy = new AwsGatewayLambdaIntegrationProxy(); // deprecated, only for backwards compatibility, TODO: remove in the future

module.exports = {
    LambdaSimulator,
    LambdaResponse,
    LambdaSimulatorProxy,
    AwsGatewayLambdaIntegrationProxy,
    awsGatewayLambdaIntegrationProxy // deprecated, only for backwards compatibility, TODO: remove in the future
};