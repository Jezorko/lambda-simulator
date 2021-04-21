const http = require('http');
const uuidv4 = require('uuid').v4;
const LambdaResponse = require('./LambdaResponse').LambdaResponse;
const LambdaSimulatorProxy = require('./proxy/LambdaSimulatorProxy').LambdaSimulatorProxy;
const Base64 = require('js-base64').Base64;

/**
 * Extracts query parameters from a URL.
 *
 * @param {string} url a valid URL
 * @returns {Object} an object where keys are query parameter names and values are their values
 */
const getQueryParamsFromUrl = url => {
    const result = {};
    if (url) {
        const query = url.split("?")[1];
        if (query) {
            query.split("&").forEach(part => {
                const item = part.split("=");
                result[item[0]] = decodeURIComponent(item[1]);
            });
        }
    }
    return result;
};

/**
 * Wrapper over AWS Lambda handler methods that makes them easy to unit test.
 */
class LambdaSimulator {

    /**
     * @param {function} handler the AWS Lambda handler method
     * @param {LambdaSimulatorProxy?} proxy transformer for requests / responses from the handler method
     */
    constructor(handler, proxy) {
        this.handler = handler;
        if (proxy) this.proxy = proxy;
    }

    /**
     * Starts a simple {http} server that sends all the requests to the AWS Lambda Handler.
     * @param {number?} port the port this server will listen on, random by default
     * @param {string?} hostName the hostname this server will listen on, localhost by default
     * @returns {Promise<*>} the promise that resolves when the server starts
     */
    listen(port, hostName) {
        if (typeof port !== 'number') port = 0;
        if (!hostName) hostName = '127.0.0.1';
        const server = http.createServer((request, response) => {
            if (request.method !== 'GET') {
                let bodyAsString = '';
                request.on('data', chunk => {
                    bodyAsString += chunk.toString();
                });
                request.on('end', () => {
                    if (!bodyAsString) {
                        console.log("fatal error: request body is empty");
                        bodyAsString = '{}';
                    }
                    this.sendRequest(request.method, request.url, JSON.parse(bodyAsString), request.headers)
                        .then(result => {
                            response.statusCode = result.httpStatusCode;
                            Object.entries(result.headers).forEach(([name, value]) => response.setHeader(name, value));
                            response.end(JSON.stringify(result.body));
                        });
                });
            } else {
                this.sendGetRequest(request.url, request.headers).then(result => {
                    console.log(`result: ${result}`);
                    response.statusCode = result.httpStatusCode;
                    Object.entries(result.headers).forEach(([name, value]) => response.setHeader(name, value));
                    response.end(JSON.stringify(result.body))
                })
            }

        });

        return new Promise(resolve => {
            server.listen(port, hostName, () => {
                console.log(`${LambdaSimulator.name} listening on port ${server.address().port}`);
                resolve()
            })
        });
    }

    /**
     * Shorthand for sendRequest with 'GET' as the first parameter and an empty body.
     * @param {string} url to send the request to
     * @param {*?} headers a string->string map containing the request headers
     * @returns {Promise<LambdaResponse>} the response from the AWS Lambda
     */
    async sendGetRequest(url, headers) {
        return await this.sendRequest('GET', url, {}, headers);
    }

    /**
     * Shorthand for sendRequest with 'POST' as the first parameter.
     * @param {string} url to send the request to
     * @param {*} requestBody that will be sent as an event to AWS Lambda Handler
     * @param {*?} headers a string->string map containing the request headers
     * @returns {Promise<LambdaResponse>} the response from the AWS Lambda
     */
    async sendPostRequest(url, requestBody, headers) {
        return await this.sendRequest('POST', url, requestBody, headers);
    }

    /**
     * Sends given request to the AWS Lambda handler.
     * @param {string} httpMethod to use with this request
     * @param {string} url to send the request to
     * @param {*} requestBody that will be sent as an event to AWS Lambda Handler
     * @param {*?} headers a string->string map containing the request headers
     * @returns {Promise<LambdaResponse>} the response from the AWS Lambda
     */
    async sendRequest(httpMethod, url, requestBody, headers) {
        const context = {
            functionName: 'lambda-simulator',
            functionVersion: '$LATEST',
            awsRequestId: uuidv4(),
            succeed: () => {}, // Stub out to test older lambdas
        };

        let startLog = `START RequestId: ${context.awsRequestId} Version: ${context.functionVersion}`;
        console.log(startLog);
        const logs = [startLog];

        const oldConsoleLog = console.log;
        console.log = (...params) => {
            const message = params[0];
            if (typeof message === 'string') {
                logs.push(params.slice(1).map(JSON.stringify).reduce((a,b) => a + "\t" + b, `${new Date().toISOString()} ${context.awsRequestId} ${message}`));
                oldConsoleLog(`${new Date().toISOString()} ${context.awsRequestId} ${message}`, ...(params.slice(1)));
            } else {
                logs.push(params.map(JSON.stringify).reduce((a,b) => a + "\t" + b, `${new Date().toISOString()} ${context.awsRequestId}`));
                oldConsoleLog(`${new Date().toISOString()} ${context.awsRequestId}`, message, ...(params.slice(1)));
            }
        };

        // simulate sending body via wire
        const queryParams = getQueryParamsFromUrl(url);
        let event;
        if (this.proxy) {
            event = this.proxy.requestTransformer(httpMethod, url, requestBody, queryParams, headers);
        } else {
            event = {
                ...queryParams, // URL query params have lower priority and will be overwritten by request body
                ...JSON.parse(JSON.stringify(requestBody))
            };
        }

        let finalResult;
        let finalError;

        const callback = (error, result) => {
            finalError = finalResult = null;
            if (error)
                finalError = {errorMessage: "" + error};
            else
                finalResult = (result) ? JSON.parse(JSON.stringify(result)) : finalResult;
        };

        const lambdaStartTime = new Date();
        try {
            const result = await this.handler(event, context, callback);
            // in case the async callback already set either of these
            if (!finalResult) finalResult = (result) ? JSON.parse(JSON.stringify(result)) : finalResult;
        } catch (error) {
            // in case the async callback already set either of these
            if (!finalError && !finalResult) {
                finalError = {
                    errorMessage: error.message,
                    errorType: error.name,
                    stackTrace: error.stack.split('\n')
                        .map(it => it.trim())
                        .filter(it => it.startsWith('at '))
                        .map(it => it.slice('at '.length))
                };
            }
        }

        const responseBody = finalError ? finalError : finalResult;

        const lambdaEndTime = new Date();
        const duration = lambdaEndTime - lambdaStartTime;
        console.log = oldConsoleLog;
        let endLog = `END RequestId: ${context.awsRequestId}`;
        console.log(endLog);
        logs.push(endLog);
        let reportLog = `REPORT RequestId: ${context.awsRequestId} Duration: ${duration} ms`;
        console.log(reportLog);
        logs.push(reportLog);
        let lambdaResponse = new LambdaResponse(200, responseBody, {
            'X-Amzn-RequestId': context.awsRequestId,
            'Content-Type': 'application/json',
            'X-Amz-Log-Results': Base64.encode(logs.reduce((a, b) => a + '\n' + b, '')),
            'X-Amz-Executed-Version': context.functionVersion
        });
        if (this.proxy) lambdaResponse = this.proxy.responseTransformer(lambdaResponse);
        return lambdaResponse;
    }

}

module.exports = {LambdaSimulator, LambdaResponse};
