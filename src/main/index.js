const LambdaSimulator = require('./LambdaSimulator').LambdaSimulator;
const LambdaResponse = require('./LambdaSimulator').LambdaResponse;
const LambdaSimulatorProxy = require('./LambdaSimulatorProxy').LambdaSimulatorProxy;
const awsGatewayLambdaIntegrationProxy = require('./LambdaSimulatorProxy').awsGatewayLambdaIntegrationProxy;

module.exports = {
    LambdaSimulator,
    LambdaResponse,
    LambdaSimulatorProxy,
    awsGatewayLambdaIntegrationProxy
};