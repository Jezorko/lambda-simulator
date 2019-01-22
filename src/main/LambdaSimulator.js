const http = require('http');
const uuidv4 = require('uuid/v4');


class LambdaResponse {
    constructor(httpStatusCode, body) {
        this.httpStatusCode = httpStatusCode;
        this.body = body;
    }

    toString() {
        return `HTTP ${this.httpStatusCode}: ${JSON.stringify(this.body)}`;
    }
}

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

class LambdaSimulator {

    constructor(handler, proxy) {
        this.handler = handler;
        if (proxy) this.proxy = proxy;
    }

    listen(port, hostName) {
        if (!port) port = 3000;
        if (!hostName) hostName = '127.0.0.1';
        const server = http.createServer((request, response) => {
            if (request.method !== 'GET') {
                let bodyAsString = '';
                request.on('data', chunk => {
                    bodyAsString += chunk.toString();
                });
                request.on('end', () => {
                    this.sendRequest(request.method, request.url, JSON.parse(bodyAsString))
                        .then(result => {
                            response.statusCode = result.httpStatusCode;
                            response.setHeader('Content-Type', 'application/json');
                            response.end(JSON.stringify(result.body));
                        });
                });
            } else {
                this.sendGetRequest(request.url).then(result => {
                    console.log(`result: ${result}`);
                    response.statusCode = result.httpStatusCode;
                    response.setHeader('Content-Type', 'application/json');
                    response.end(JSON.stringify(result.body))
                })
            }

        });

        return new Promise(resolve => {
            server.listen(port, hostName, () => {
                console.log(`${LambdaSimulator.name} listening on port ${port}`);
                resolve()
            })
        });
    }

    async sendGetRequest(url) {
        return await this.sendRequest('GET', url, {});
    }

    async sendPostRequest(url, requestBody) {
        return await this.sendRequest('POST', url, requestBody);
    }

    async sendRequest(httpMethod, url, requestBody) {
        const context = {
            functionName: 'lambda-simulator',
            functionVersion: '$LATEST',
            awsRequestId: uuidv4()
        };

        console.log(`START RequestId: ${context.awsRequestId} Version: ${context.functionVersion}`);
        const oldConsoleLog = console.log;
        console.log = (...params) => {
            const message = params[0];
            if (typeof message === 'string') {
                oldConsoleLog(`${new Date().toISOString()} ${context.awsRequestId} ${message}`, ...(params.slice(1)));
            } else {
                oldConsoleLog(`${new Date().toISOString()} ${context.awsRequestId}`, message, ...(params.slice(1)));
            }
        };

        // simulate sending body via wire
        const queryParams = getQueryParamsFromUrl(url);
        let event;
        if (this.proxy) {
            event = this.proxy.requestTransformer(httpMethod, url, requestBody, queryParams);
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
                finalResult = JSON.parse(JSON.stringify(result));
        };

        const lambdaStartTime = new Date();
        try {
            const result = await this.handler(event, context, callback);
            // in case the async callback already set either of these
            if (!finalResult) finalResult = JSON.parse(JSON.stringify(result));
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
        console.log(`END RequestId: ${context.awsRequestId}`);
        console.log(`REPORT RequestId: ${context.awsRequestId} Duration: ${duration} ms`);
        let lambdaResponse = new LambdaResponse(200, responseBody);
        if (this.proxy) lambdaResponse = this.proxy.responseTransformer(lambdaResponse);
        return lambdaResponse;
    }

}

module.exports = {LambdaSimulator, LambdaResponse};