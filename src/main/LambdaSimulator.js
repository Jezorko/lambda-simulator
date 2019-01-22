const http = require('http');


class LambdaResponse {
    constructor(httpStatusCode, body) {
        this.httpStatusCode = httpStatusCode;
        this.body = body;
    }

    toString() {
        return `HTTP ${this.httpStatusCode}: ${JSON.stringify(this.body)}`;
    }
}

const getJsonFromUrl = url => {
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

    constructor(handler) {
        this.handler = handler;
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
        // simulate sending body via wire
        const event = {
            ...getJsonFromUrl(url), // URL variables have lower priority and will be overwritten by request body
            ...JSON.parse(JSON.stringify(requestBody))
        };

        let finalResult;
        let finalError;

        const callback = (error, result) => {
            finalError = finalResult = null;
            if (error)
                finalError = {errorMessage: "" + error};
            else
                finalResult = result;
        };

        try {
            const result = await this.handler(event, {}, callback);
            // in case the async callback already set either of these
            if (!finalResult) finalResult = result;
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
        return new LambdaResponse(200, responseBody);
    }

}

module.exports = {LambdaSimulator, LambdaResponse};