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