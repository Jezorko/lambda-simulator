const LambdaSimulator = require("../main/LambdaSimulator").LambdaSimulator;
const LambdaResponse = require("../main/LambdaSimulator").LambdaResponse;

const assert = require("assert");

describe(LambdaSimulator.name, function () {

    describe('sendRequest', () => {

        [ // given:
            {
                get testCaseDescription() {
                    return `should return ${this.expectedResult} for a simple POST request`
                },
                eventHandler: async event => event,
                request: {
                    url: '/',
                    method: 'GET',
                    body: {field: "value"}
                },
                get expectedResult() {
                    return new LambdaResponse(200, this.request.body)
                }
            },

            {
                get testCaseDescription() {
                    return `should ignore query params with same names as body fields`
                },
                eventHandler: async event => event,
                request: {
                    url: '/test?field=invalidValue',
                    method: 'POST',
                    body: {field: "value"}
                },
                get expectedResult() {
                    return new LambdaResponse(200, this.request.body)
                }
            },

            {
                get testCaseDescription() {
                    return `should parse URL query and append it to the event returning ${this.expectedResult}`
                },
                eventHandler: async event => event,
                request: {
                    url: '/test?anotherField=anotherValue',
                    method: 'POST',
                    body: {field: "value"}
                },
                get expectedResult() {
                    return new LambdaResponse(200, {...this.request.body, anotherField: 'anotherValue'})
                }
            },

            {
                get testCaseDescription() {
                    return `should return error as object if error was thrown`
                },
                error: new Error('test'),
                get eventHandler() {
                    return async () => {
                        throw this.error
                    }
                },
                request: {
                    url: '/',
                    method: 'POST',
                    body: {field: "value"}
                },
                get validateResult() {
                    return actualResult => {
                        assert.strictEqual(actualResult.body.errorMessage, this.error.message);
                        assert.strictEqual(actualResult.body.errorType, this.error.name);
                        assert(actualResult.body.stackTrace.length !== 0)
                    }
                }
            },
            {
                get testCaseDescription() {
                    return `should prioritize result from callback over thrown error`
                },
                error: new Error('test'),
                get eventHandler() {
                    return async (event, context, callback) => {
                        callback(null, this.request.body);
                        throw new Error("this should not be returned")
                    }
                },
                request: {
                    url: '/',
                    method: 'POST',
                    body: {field: "value"}
                },
                get expectedResult() {
                    return new LambdaResponse(200, this.request.body)
                }
            },
            {
                get testCaseDescription() {
                    return `should not throw error if older lambda style`
                },
                error: new Error('test'),
                get eventHandler() {
                    return async (event, context) => {
                        context.succeed();
                    }
                },
                request: {
                    url: '/',
                    method: 'POST',
                    body: {field: "value"}
                },
                get expectedResult() {
                    return new LambdaResponse(200)
                }
            },
            {
                get testCaseDescription() {
                    return `should not throw error if no return given`
                },
                error: new Error('test'),
                get eventHandler() {
                    return async (event, context) => {}
                },
                request: {
                    url: '/',
                    method: 'POST',
                    body: {field: "value"}
                },
                get expectedResult() {
                    return new LambdaResponse(200)
                }
            }
        ].forEach(dataSet => it(dataSet.testCaseDescription, async () => {
            // given:
            const simulator = new LambdaSimulator(dataSet.eventHandler);

            // when:
            const actualResult = await simulator.sendRequest(dataSet.request.method, dataSet.request.url, dataSet.request.body);

            // then:
            if (dataSet.validateResult) {
                dataSet.validateResult(actualResult);
            } else if (dataSet.expectedResult) {
                assert.deepStrictEqual(actualResult.httpStatusCode, dataSet.expectedResult.httpStatusCode);
                assert.deepStrictEqual(actualResult.body, dataSet.expectedResult.body);
            } else {
                throw new Error('test case must define either a result validation function or an expected result');
            }
        }));

        it('should append default headers to the response', async () => {
            // given:
            const eventHandler = () => undefined;
            const simulator = new LambdaSimulator(eventHandler);

            // when:
            const actualResult = await simulator.sendRequest('GET', '/', {});

            // then:
            assert.strictEqual(actualResult.headers['Content-Type'], 'application/json');
            assert(!!actualResult.headers['X-Amzn-RequestId']);
        });

    })

});
