const LambdaSimulator = require('./LambdaSimulator').LambdaSimulator;
const LambdaResponse = require('./LambdaResponse').LambdaResponse;
const LambdaSimulatorProxy = require('./LambdaSimulatorProxy').LambdaSimulatorProxy;
const awsGatewayLambdaIntegrationProxy = require('./LambdaSimulatorProxy').awsGatewayLambdaIntegrationProxy;

module.exports = {
    LambdaSimulator,
    LambdaResponse,
    LambdaSimulatorProxy,
    awsGatewayLambdaIntegrationProxy
};