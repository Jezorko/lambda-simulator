/**
 * Simple wrapper over a response from Lambda, to be used internally.
 * Do NOT use it in your handler method!
 */
class LambdaResponse {
    /**
     * @param {number} httpStatusCode response's status code
     * @param {*?} body the body of the response
     * @param headers the response headers
     */
    constructor(httpStatusCode, body, headers) {
        this.httpStatusCode = httpStatusCode;
        this.body = body;
        this.headers = headers ? headers : {};
    }

    toString() {
        return `HTTP ${this.httpStatusCode}: ${JSON.stringify(this.body)}`;
    }
}

module.exports = {LambdaResponse};