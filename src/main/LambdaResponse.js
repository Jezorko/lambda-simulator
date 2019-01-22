/**
 * Simple wrapper over a response from Lambda, used internally.
 * Do NOT use it in your handler method!
 */
class LambdaResponse {
    /**
     * @param {number} httpStatusCode response's status code
     * @param {*?} body the body of the response
     */
    constructor(httpStatusCode, body) {
        this.httpStatusCode = httpStatusCode;
        this.body = body;
    }

    toString() {
        return `HTTP ${this.httpStatusCode}: ${JSON.stringify(this.body)}`;
    }
}

module.exports = {LambdaResponse};