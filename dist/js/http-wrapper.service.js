var bluesky;
(function (bluesky) {
    var core;
    (function (core) {
        var services;
        (function (services) {
            var HttpMethod;
            (function (HttpMethod) {
                HttpMethod[HttpMethod["GET"] = 0] = "GET";
                HttpMethod[HttpMethod["POST"] = 1] = "POST";
                HttpMethod[HttpMethod["PUT"] = 2] = "PUT";
                HttpMethod[HttpMethod["DELETE"] = 3] = "DELETE";
            })(HttpMethod || (HttpMethod = {}));
            ;
            /**
             * TODO MGA : this may not need to be a dedicated service, it can also be incorporated into the httpInterceptor. Decide best approach depending on planned use.
             */
            var HttpWrapperService = (function () {
                //#endregion
                //#region ctor
                /* @ngInject */
                function HttpWrapperService($http, $window, $log, $q, $location, Upload, toaster) {
                    var _this = this;
                    this.$http = $http;
                    this.$window = $window;
                    this.$log = $log;
                    this.$q = $q;
                    this.$location = $location;
                    this.Upload = Upload;
                    this.toaster = toaster;
                    /**
                    * Prepares a {@link ng#$http#config config} object for $http call.
                    * The operations include setting default values when not provided, and setting http headers if needed for :
                    *  - Ajax calls
                    *  - Authorization token
                    *  - Current UserRole.
                    * @param options
                    * @returns {ng.$http.config} the configuration object ready to be injected into a $http call.
                    */
                    this.configureHttpCall = function (method, url, config) {
                        if (!url || method === null || method === undefined) {
                            _this.$log.error('URL & METHOD parameters are necessary for httpWrapper calls. Aborting.');
                            return null;
                        }
                        //Init config even if not provided
                        config = config || {};
                        //TODO MGA: hard cast is not safe, we may forget to set url & method parameters. TOFIX.
                        // automatically get all non-filtered parameters & keep them for this new object.
                        var configFull = config;
                        //TODO MGA: support mapping between upload & post here ?
                        configFull.method = HttpMethod[method];
                        if (config.apiEndpoint && (!_this.apiConfig ||
                            !_this.apiConfig.jwtToken ||
                            !_this.apiConfig.currentUserRole)) {
                            _this.$log.error('[InternalError] [' + url + '] - coreApi call intended without necessary capi credentials. Aborting.');
                            return null;
                        }
                        configFull.headers = config.headers || {};
                        if (!config.apiEndpoint) {
                            configFull.url = _this.buildUrlFromContext(url);
                        }
                        else {
                            //TODO MGA : core api endpoint 'api/' hardcoded, to put in configFull ! should not know that here.
                            configFull.url = _this.apiConfig.coreApiUrl + 'api/' + url;
                            if (_this.apiConfig.jwtToken && _this.apiConfig.currentUserRole) {
                                //TODO MGA: hard coded headers, not good, to inject
                                configFull.headers['OA-UserRole'] = _this.apiConfig.currentUserRole;
                                configFull.headers['Authorization'] = 'Bearer ' + _this.apiConfig.jwtToken;
                            }
                        }
                        if (!config.disableXmlHttpRequestHeader)
                            configFull.headers['X-Requested-With'] = 'XMLHttpRequest';
                        //TODO MGA: OE specific code, to remove
                        if (_this.$window.preventBlockUI !== undefined)
                            // TODO MGA : type casting, is it okay or not ? better approach ?
                            _this.$window.preventBlockUI = true;
                        return configFull;
                    };
                    /**
                     * Success handler
                     * @returns {}
                     */
                    this.success = function (httpPromise) {
                        // JS trick : capture url variable inside closure scope to store it for callback which cannot be called with 2 arguments
                        if (!httpPromise) {
                            _this.$log.error('[HTTP] [' + httpPromise.config.url + '] Unexpected $http error, no return promise object could be found.');
                            _this.toaster.error('Unexpected behavior', 'Please contact your local support team.');
                            return _this.$q.reject(httpPromise); // Reject promise
                        }
                        //TODO MGA: handle when API is fixed. See http://stackoverflow.com/questions/11746894/what-is-the-proper-rest-response-code-for-a-valid-request-but-an-empty-data
                        //if ((promiseCallback.data === null || promiseCallback.data === undefined) && promiseCallback.status !== 204) {
                        //    this.$log.error('Unexpected response from the server, expected response data but none found.');
                        //    this.toaster.warning('Unexpected response', 'Please contact your local support team.');
                        //    return this.$q.reject(promiseCallback); // Reject promise if not well-formed data
                        //}
                        //TODO MGA: same behavior also on a GET request ? if request is GET and response is 200 with no data, return error ? (pass in parameter request context to log this error).
                        //TODO MGA: get full url of request
                        _this.$log.debug('[HTTP] [' + httpPromise.config.url + ']', httpPromise);
                        return httpPromise.data; // return only the data expected for caller
                    };
                    /**
                     * Error handler
                     * @param httpPromise
                     * @returns {}
                     */
                    this.error = function (httpPromise) {
                        // We suppose in case of no response that the srv didn't send any response.
                        // TODO MGA: may also be a fault in internal $http / ajax client side lib, to distinguish.
                        if (!httpPromise || !httpPromise.data) {
                            httpPromise.data = 'Server not responding';
                            httpPromise.status = 503;
                        }
                        var contentType = httpPromise.headers('Content-Type');
                        if (contentType && contentType.indexOf('application/json') > -1 || contentType.indexOf('text/plain') > -1) {
                            var message;
                            //TODO MGA: handle error handling more generically based on input error message contract instead of expecting specific error strcture.
                            //if (response.data.ModelState) {
                            //    //TODO MGA : handle this when well formatted server-side
                            //} else
                            if (httpPromise.data.Message) {
                                message = httpPromise.data.Message;
                            }
                            else {
                                message = httpPromise.data;
                            }
                            //TODO MGA: handle more response codes gracefully.
                            if (httpPromise.status === 404) {
                                _this.toaster.warning('Not Found', message);
                            }
                            else {
                                _this.toaster.error('Server response error', message + '\n Status: ' + httpPromise.status);
                            }
                        }
                        else {
                            _this.toaster.error('Internal server error', 'Status: ' + httpPromise.status);
                        }
                        //TODO MGA: get full url of request
                        _this.$log.error('[HTTP] [' + httpPromise.config.url + ']', httpPromise);
                        // We don't recover from error, so we propagate it : below handlers have the choice of reading the error with an error handler or not. See $q promises behavior here : https://github.com/kriskowal/q
                        // This behavior is desired so that we show error inside specific server communication modals at specific places in the app, otherwise show a global alert message, or even do not show anything if not necessary (do not ad an error handler in below handlers of this promise).
                        return _this.$q.reject(httpPromise);
                    };
                    /**
                     * Function called at the end of an ajax call, regardless of it's success or failure.
                     * @param response
                     */
                    this.finally = function () {
                        //TODO MGA: OE-specific code
                        if (_this.$window.preventBlockUI !== undefined)
                            // TODO MGA : type casting, is it okay or not ? better approach ?
                            _this.$window.preventBlockUI = false;
                    };
                    // init core api config data on ctor
                    //TODO MGA : hard coded path for CorerApiAuthCtrl to inject
                    this.initPromise = this.$http.get(this.buildUrlFromContext('CoreApiAuth/GetCoreApiConfig'))
                        .success(function (coreApiConfig) {
                        _this.apiConfig = coreApiConfig;
                    }).error(function (error) {
                        _this.$log.error('Unable to retrieve API config. Aborting httpWrapperService initialization.');
                        return $q.reject(error);
                    });
                }
                //#endregion
                //#region public methods
                HttpWrapperService.prototype.get = function (url, config) {
                    return this.ajax(HttpMethod.GET, url, config);
                };
                HttpWrapperService.prototype.delete = function (url, config) {
                    return this.ajax(HttpMethod.DELETE, url, config);
                };
                HttpWrapperService.prototype.post = function (url, data, config) {
                    config = config || {};
                    config.data = data || config.data;
                    ;
                    return this.ajax(HttpMethod.POST, url, config);
                };
                HttpWrapperService.prototype.put = function (url, data, config) {
                    config = config || {};
                    config.data = data || config.data;
                    return this.ajax(HttpMethod.PUT, url, config);
                };
                HttpWrapperService.prototype.upload = function (url, file, config) {
                    var _this = this;
                    if (!file && (!config || !config.file)) {
                        this.$log.error('Cannot start upload with null {file} parameter.');
                        return null;
                    }
                    config = config || {};
                    config.file = file || config.file; //TODO MGA : do not expose file in IHttpWrapperConfig ?
                    config.data = config.data || {};
                    if (config.uploadInBase64Json) {
                        //TODO MGA: make sure this delays next call and upload is not done before base64 encoding is finished, even if promise is already resolved ???
                        return this.Upload.base64DataUrl(file).then(function (fileBase64Url) {
                            //TODO MGA: hard-coded key to fetch base64 encoding, to parametrize with server-side !
                            config.data.fileBase64Url = fileBase64Url;
                            //normal post in case of base64-encoded data
                            return _this.ajax(HttpMethod.POST, url, config);
                        });
                    }
                    else {
                        config.data.fileFormDataName = 'file'; // file formData name ('Content-Disposition'), server side request form name
                        //TODO MGA : do not block if not call to internal API (initCall)
                        return this.initPromise.then(function () {
                            //TODO MGA : not safe hard cast
                            //TODO MGA : behavior duplication with this.ajax, not DRY, to improve
                            return _this.Upload.upload(_this.configureHttpCall(HttpMethod.POST, url, config))
                                .then(_this.success, _this.error, config.uploadProgress) //TODO MGA : uploadProgress callback ok ?
                                .finally(_this.finally);
                        });
                    }
                };
                //TODO MGA : method too specific to OM apps context, may not work outside of it, to adapt for public use ?
                /**
                 * Tries to parse the input url :
                 * If it seems to be a full URL, then return as is (considers it external Url)
                 * Otherwise, tries to find the base URL of the current BlueSky app with or without the included Controller and returns the full Url
                 * @param urlInput : TODO MGA: document different kind of urls that this method can take as input (full, partial etc)
                 */
                HttpWrapperService.prototype.buildUrlFromContext = function (urlInput) {
                    // 1 - Url starts with http:// or https:// => return as is.
                    if (urlInput.slice(0, 'http://'.length) === 'http://' ||
                        urlInput.slice(0, 'https://'.length) === 'https://') {
                        return urlInput;
                    }
                    // 2 - Otherwise, try to find correct controller
                    // Boolean used to try to determine correct full url (add / or not before the url fragment depending on if found or not)
                    var urlFragmentStartsWithSlash = urlInput.slice(0, '/'.length) === '/';
                    // Regex trying to determine if the input fragment contains a / between two character suites => controller given as input, otherwise, action on same controller expected
                    var controllerIsPresentRegex = /\w+\/\w+/;
                    var actionIsOnSameController = !controllerIsPresentRegex.test(urlInput);
                    var baseUrl = this.getUrlPath(actionIsOnSameController);
                    return baseUrl + (urlFragmentStartsWithSlash ? urlInput : ('/' + urlInput));
                };
                //#endregion
                //#region private methods
                /**
                 * Utility method.
                 * Main caller that all wrapper calls (get, delete, post, put) must use to share common behavior.
                 * @param config
                 */
                HttpWrapperService.prototype.ajax = function (method, url, config) {
                    var _this = this;
                    //TODO MGA : make sure initPromise resolve automatically without overhead once first call sucessfull.
                    //TODO MGA : do not block if not call to internal API (initCall)
                    return this.initPromise.then(function () {
                        return _this.$http(_this.configureHttpCall(method, url, config))
                            .then(_this.success, _this.error)
                            .finally(_this.finally);
                    });
                };
                // TODO MGA : using method from Layout.js : to document to not handle duplicate code !!
                //TODO MGA : make it capable of handling full URLs outside of OE : do not use ?? how to ?
                HttpWrapperService.prototype.getUrlPath = function (actionIsOnSameController) {
                    var baseUrlRegex = /(\/\w+\/\(S\(\w+\)\))\/\w+/;
                    var url = this.$window.location.pathname;
                    var baseUrlMatches = baseUrlRegex.exec(url);
                    if (baseUrlMatches.length && baseUrlMatches.length === 2) {
                        var baseUrlWithControllerName = baseUrlMatches[0];
                        var baseUrl = baseUrlMatches[1];
                        if (actionIsOnSameController) {
                            return baseUrlWithControllerName;
                        }
                        else {
                            return baseUrl;
                        }
                    }
                    return '';
                };
                //TODO MGA: OM-specific ASP MVC code, not used ATM, to remove
                HttpWrapperService.prototype.getCurrentSessionID = function () {
                    //TODO MGA : magic regexp to fetch SessionID in URL, to store elsewhere !
                    var sessionRegex = /https:\/\/[\w.]+\/[\w.]+\/(\(S\(\w+\)\))\/.*/;
                    //var sessionRegex = /https:\/\/[\w.]+\/OrderEntry\/(\(S\(\w+\)\))\/.*/;
                    // TODO MGA : update regexp to the one below
                    //var baseUrlRegex = /(https:\/\/[\w.-]+\/[\w.-]+\/\(S\(\w+\)\)\/)\w+/;
                    var path = this.$location.absUrl();
                    var regexpArray = sessionRegex.exec(path);
                    if (!regexpArray) {
                        this.$log.error("Unable to recognized searched pattern in current url location to retrieve sessionID.");
                        return "";
                    }
                    if (regexpArray.length === 1) {
                        this.$log.error("Unable to find sessionID in searched pattern in current url.");
                        return "";
                    }
                    if (regexpArray.length > 2) {
                        this.$log.error("Too many matches found for the sessionID search in the current url.");
                        return "";
                    }
                    return regexpArray[1];
                };
                return HttpWrapperService;
            }());
            services.HttpWrapperService = HttpWrapperService;
            angular.module('ng.httpWrapper', ['toaster', 'ngAnimate', 'ngFileUpload'])
                .service('httpWrapperService', HttpWrapperService);
        })(services = core.services || (core.services = {}));
    })(core = bluesky.core || (bluesky.core = {}));
})(bluesky || (bluesky = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHAtd3JhcHBlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJDQUEyQztBQUMzQyxJQUFPLE9BQU8sQ0F3WWI7QUF4WUQsV0FBTyxPQUFPO0lBQUMsSUFBQSxJQUFJLENBd1lsQjtJQXhZYyxXQUFBLElBQUk7UUFBQyxJQUFBLFFBQVEsQ0F3WTNCO1FBeFltQixXQUFBLFFBQVEsRUFBQyxDQUFDO1lBZTFCLElBQUssVUFBcUM7WUFBMUMsV0FBSyxVQUFVO2dCQUFHLHlDQUFHLENBQUE7Z0JBQUUsMkNBQUksQ0FBQTtnQkFBRSx5Q0FBRyxDQUFBO2dCQUFFLCtDQUFNLENBQUE7WUFBQyxDQUFDLEVBQXJDLFVBQVUsS0FBVixVQUFVLFFBQTJCO1lBQUEsQ0FBQztZQTJCM0M7O2VBRUc7WUFDSDtnQkFPSSxZQUFZO2dCQUVaLGNBQWM7Z0JBRWQsZUFBZTtnQkFDZiw0QkFDWSxLQUFzQixFQUN0QixPQUEwQixFQUMxQixJQUFvQixFQUNwQixFQUFnQixFQUNoQixTQUE4QixFQUM5QixNQUEyQyxFQUMzQyxPQUFrQztvQkFuQmxELGlCQW1WQztvQkF0VWUsVUFBSyxHQUFMLEtBQUssQ0FBaUI7b0JBQ3RCLFlBQU8sR0FBUCxPQUFPLENBQW1CO29CQUMxQixTQUFJLEdBQUosSUFBSSxDQUFnQjtvQkFDcEIsT0FBRSxHQUFGLEVBQUUsQ0FBYztvQkFDaEIsY0FBUyxHQUFULFNBQVMsQ0FBcUI7b0JBQzlCLFdBQU0sR0FBTixNQUFNLENBQXFDO29CQUMzQyxZQUFPLEdBQVAsT0FBTyxDQUEyQjtvQkF1SDlDOzs7Ozs7OztzQkFRRTtvQkFDTSxzQkFBaUIsR0FBRyxVQUFDLE1BQWtCLEVBQUUsR0FBVyxFQUFFLE1BQTJCO3dCQUVyRixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLE1BQU0sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDOzRCQUNsRCxLQUFJLENBQUMsSUFBSSxDQUFDLEtBQUss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Qzt3QkFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMscUVBQXFFLENBQUMsQ0FBQzt3QkFDdkYsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDZCxDQUFDO29CQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLENBQUM7Z0JBR0wseUJBQUM7WUFBRCxDQW5WQSxBQW1WQyxJQUFBO1lBblZZLDJCQUFrQixxQkFtVjlCLENBQUE7WUFFRCxPQUFPLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQztpQkFLckUsT0FBTyxDQUFDLG9CQUFvQixFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDM0QsQ0FBQyxFQXhZbUIsUUFBUSxHQUFSLGFBQVEsS0FBUixhQUFRLFFBd1kzQjtJQUFELENBQUMsRUF4WWMsSUFBSSxHQUFKLFlBQUksS0FBSixZQUFJLFFBd1lsQjtBQUFELENBQUMsRUF4WU0sT0FBTyxLQUFQLE9BQU8sUUF3WWIiLCJmaWxlIjoiaHR0cC13cmFwcGVyLnNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy88cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBpbmdzL3RzZC5kLnRzXCIgLz5cclxubW9kdWxlIGJsdWVza3kuY29yZS5zZXJ2aWNlcyB7XHJcblxyXG4gICAgaW1wb3J0IEFwaUNvbmZpZyA9IGJsdWVza3kuY29yZS5tb2RlbHMuQXBpQ29uZmlnO1xyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUh0dHBXcmFwcGVyQ29uZmlnIGV4dGVuZHMgbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogbWFpbiBBUEkgZW5kcG9pbnQgdG8gdXNlIGFzIGRlZmF1bHQgb25lIGlmIHVybCBpcyBub3QgZnVsbC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBhcGlFbmRwb2ludD86IGJvb2xlYW47XHJcbiAgICAgICAgZmlsZT86IEZpbGUsXHJcbiAgICAgICAgdXBsb2FkSW5CYXNlNjRKc29uPzogYm9vbGVhbjtcclxuICAgICAgICB1cGxvYWRQcm9ncmVzcz86ICgpID0+IGFueTtcclxuICAgICAgICBkaXNhYmxlWG1sSHR0cFJlcXVlc3RIZWFkZXI/OiBib29sZWFuO1xyXG4gICAgfVxyXG5cclxuICAgIGVudW0gSHR0cE1ldGhvZCB7IEdFVCwgUE9TVCwgUFVULCBERUxFVEUgfTtcclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElIdHRwV3JhcHBlclNlcnZpY2Uge1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBBbGwgc3J2LXNpZGUgY29uZmlndXJhdGlvbiBvZiBtYWluIEFQSSBwcm92aWRlZCBieSB0aGUgZG9tYWluIGZyb20gd2hpY2ggdGhpcyBzY3JpcHQgd2FzIGxvYWRlZCwgQCB0aGUgdXJsICdDb3JlQXBpQXV0aC9HZXRDb3JlQXBpQ29uZmlnJy5cclxuICAgICAgICAgKiBUT0RPIE1HQSBmaXggaGFyZCBjb2RlZCBwYXRoLlxyXG4gICAgICAgICAqIFRoaXMgY29uZmlndXJhdGlvbiBkYXRhIGlzIGxvYWRlZCB1cG9uIGluaXRpYWxpemF0aW9uIG9mIHRoaXMgc2VydmljZSAodG8gYmUgdXNlZCBhcyBhIHNpbmdsZXRvbiBpbiB0aGUgYXBwKS4gQWxsIG90aGVyIHdlYiBjYWxscyBhcmUgYmxvY2tlZCBhcyBsb25nIGFzIHRoaXMgb25lIGlzIG5vdCBmaW5pc2hlZC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBhcGlDb25maWc6IEFwaUNvbmZpZztcclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQTogZm9yIGZvbGxvd2luZyBtZXRob2RzLCByZXR1cm4gSVByb21pc2UgYW5kIGFzc3VtZSBhYnN0cmFjdGlvbiBvciBsZXQgYmVsb3cgc2VydmljZXMgaGFuZGxlIElIdHRwUHJvbWlzZXMgP1xyXG5cclxuICAgICAgICBnZXQ8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBkZWxldGU8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBwb3N0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBwdXQ8VD4odXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIC8vVE9ETyBNR0EgaW1wcm92ZSB0eXBpbmcgd2l0aCBhbmd1bGFyLXVwbG9hZCB0c2QgZXRjXHJcbiAgICAgICAgdXBsb2FkPFQ+KHVybDogc3RyaW5nLCBmaWxlOiBGaWxlLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgYnVpbGRVcmxGcm9tQ29udGV4dCh1cmxJbnB1dDogc3RyaW5nKTogc3RyaW5nO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVE9ETyBNR0EgOiB0aGlzIG1heSBub3QgbmVlZCB0byBiZSBhIGRlZGljYXRlZCBzZXJ2aWNlLCBpdCBjYW4gYWxzbyBiZSBpbmNvcnBvcmF0ZWQgaW50byB0aGUgaHR0cEludGVyY2VwdG9yLiBEZWNpZGUgYmVzdCBhcHByb2FjaCBkZXBlbmRpbmcgb24gcGxhbm5lZCB1c2UuXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBjbGFzcyBIdHRwV3JhcHBlclNlcnZpY2UgaW1wbGVtZW50cyBJSHR0cFdyYXBwZXJTZXJ2aWNlIHtcclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIHByb3BlcnRpZXNcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpbml0UHJvbWlzZTogbmcuSVByb21pc2U8YW55PjtcclxuICAgICAgICBwdWJsaWMgYXBpQ29uZmlnOiBBcGlDb25maWc7XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICAvLyNyZWdpb24gY3RvclxyXG5cclxuICAgICAgICAvKiBAbmdJbmplY3QgKi9cclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgcHJpdmF0ZSAkaHR0cDogbmcuSUh0dHBTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRsb2c6IG5nLklMb2dTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGxvY2F0aW9uOiBuZy5JTG9jYXRpb25TZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlIFVwbG9hZDogbmcuYW5ndWxhckZpbGVVcGxvYWQuSVVwbG9hZFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgdG9hc3Rlcjogbmd0b2FzdGVyLklUb2FzdGVyU2VydmljZVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICAvLyBpbml0IGNvcmUgYXBpIGNvbmZpZyBkYXRhIG9uIGN0b3JcclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGhhcmQgY29kZWQgcGF0aCBmb3IgQ29yZXJBcGlBdXRoQ3RybCB0byBpbmplY3RcclxuICAgICAgICAgICAgdGhpcy5pbml0UHJvbWlzZSA9IHRoaXMuJGh0dHAuZ2V0PEFwaUNvbmZpZz4odGhpcy5idWlsZFVybEZyb21Db250ZXh0KCdDb3JlQXBpQXV0aC9HZXRDb3JlQXBpQ29uZmlnJykpXHJcbiAgICAgICAgICAgICAgICAuc3VjY2VzcygoY29yZUFwaUNvbmZpZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBpQ29uZmlnID0gY29yZUFwaUNvbmZpZztcclxuICAgICAgICAgICAgICAgIH0pLmVycm9yKChlcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignVW5hYmxlIHRvIHJldHJpZXZlIEFQSSBjb25maWcuIEFib3J0aW5nIGh0dHBXcmFwcGVyU2VydmljZSBpbml0aWFsaXphdGlvbi4nKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwdWJsaWMgbWV0aG9kc1xyXG5cclxuICAgICAgICBnZXQ8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLkdFVCwgdXJsLCBjb25maWcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGVsZXRlPFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5ERUxFVEUsIHVybCwgY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHBvc3Q8VD4odXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XHJcbiAgICAgICAgICAgIGNvbmZpZy5kYXRhID0gZGF0YSB8fCBjb25maWcuZGF0YTs7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5QT1NULCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdXQ8VD4odXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XHJcbiAgICAgICAgICAgIGNvbmZpZy5kYXRhID0gZGF0YSB8fCBjb25maWcuZGF0YTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLlBVVCwgdXJsLCBjb25maWcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBsb2FkPFQ+KHVybDogc3RyaW5nLCBmaWxlOiBGaWxlLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWZpbGUgJiYgKCFjb25maWcgfHwgIWNvbmZpZy5maWxlKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdDYW5ub3Qgc3RhcnQgdXBsb2FkIHdpdGggbnVsbCB7ZmlsZX0gcGFyYW1ldGVyLicpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcclxuICAgICAgICAgICAgY29uZmlnLmZpbGUgPSBmaWxlIHx8IGNvbmZpZy5maWxlOyAvL1RPRE8gTUdBIDogZG8gbm90IGV4cG9zZSBmaWxlIGluIElIdHRwV3JhcHBlckNvbmZpZyA/XHJcbiAgICAgICAgICAgIGNvbmZpZy5kYXRhID0gY29uZmlnLmRhdGEgfHwge307XHJcblxyXG4gICAgICAgICAgICBpZiAoY29uZmlnLnVwbG9hZEluQmFzZTY0SnNvbikge1xyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogbWFrZSBzdXJlIHRoaXMgZGVsYXlzIG5leHQgY2FsbCBhbmQgdXBsb2FkIGlzIG5vdCBkb25lIGJlZm9yZSBiYXNlNjQgZW5jb2RpbmcgaXMgZmluaXNoZWQsIGV2ZW4gaWYgcHJvbWlzZSBpcyBhbHJlYWR5IHJlc29sdmVkID8/P1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuVXBsb2FkLmJhc2U2NERhdGFVcmwoZmlsZSkudGhlbigoZmlsZUJhc2U2NFVybCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhcmQtY29kZWQga2V5IHRvIGZldGNoIGJhc2U2NCBlbmNvZGluZywgdG8gcGFyYW1ldHJpemUgd2l0aCBzZXJ2ZXItc2lkZSAhXHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLmRhdGEuZmlsZUJhc2U2NFVybCA9IGZpbGVCYXNlNjRVcmw7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9ub3JtYWwgcG9zdCBpbiBjYXNlIG9mIGJhc2U2NC1lbmNvZGVkIGRhdGFcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuUE9TVCwgdXJsLCBjb25maWcpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25maWcuZGF0YS5maWxlRm9ybURhdGFOYW1lID0gJ2ZpbGUnOyAvLyBmaWxlIGZvcm1EYXRhIG5hbWUgKCdDb250ZW50LURpc3Bvc2l0aW9uJyksIHNlcnZlciBzaWRlIHJlcXVlc3QgZm9ybSBuYW1lXHJcblxyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGRvIG5vdCBibG9jayBpZiBub3QgY2FsbCB0byBpbnRlcm5hbCBBUEkgKGluaXRDYWxsKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5pdFByb21pc2UudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQSA6IG5vdCBzYWZlIGhhcmQgY2FzdFxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBiZWhhdmlvciBkdXBsaWNhdGlvbiB3aXRoIHRoaXMuYWpheCwgbm90IERSWSwgdG8gaW1wcm92ZVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLlVwbG9hZC51cGxvYWQ8VD4oPG5nLmFuZ3VsYXJGaWxlVXBsb2FkLklGaWxlVXBsb2FkQ29uZmlnRmlsZT50aGlzLmNvbmZpZ3VyZUh0dHBDYWxsKEh0dHBNZXRob2QuUE9TVCwgdXJsLCBjb25maWcpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbjxUPih0aGlzLnN1Y2Nlc3MsIHRoaXMuZXJyb3IsIGNvbmZpZy51cGxvYWRQcm9ncmVzcykgLy9UT0RPIE1HQSA6IHVwbG9hZFByb2dyZXNzIGNhbGxiYWNrIG9rID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmFsbHkodGhpcy5maW5hbGx5KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL1RPRE8gTUdBIDogbWV0aG9kIHRvbyBzcGVjaWZpYyB0byBPTSBhcHBzIGNvbnRleHQsIG1heSBub3Qgd29yayBvdXRzaWRlIG9mIGl0LCB0byBhZGFwdCBmb3IgcHVibGljIHVzZSA/XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVHJpZXMgdG8gcGFyc2UgdGhlIGlucHV0IHVybCA6XHJcbiAgICAgICAgICogSWYgaXQgc2VlbXMgdG8gYmUgYSBmdWxsIFVSTCwgdGhlbiByZXR1cm4gYXMgaXMgKGNvbnNpZGVycyBpdCBleHRlcm5hbCBVcmwpIFxyXG4gICAgICAgICAqIE90aGVyd2lzZSwgdHJpZXMgdG8gZmluZCB0aGUgYmFzZSBVUkwgb2YgdGhlIGN1cnJlbnQgQmx1ZVNreSBhcHAgd2l0aCBvciB3aXRob3V0IHRoZSBpbmNsdWRlZCBDb250cm9sbGVyIGFuZCByZXR1cm5zIHRoZSBmdWxsIFVybCBcclxuICAgICAgICAgKiBAcGFyYW0gdXJsSW5wdXQgOiBUT0RPIE1HQTogZG9jdW1lbnQgZGlmZmVyZW50IGtpbmQgb2YgdXJscyB0aGF0IHRoaXMgbWV0aG9kIGNhbiB0YWtlIGFzIGlucHV0IChmdWxsLCBwYXJ0aWFsIGV0YylcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgYnVpbGRVcmxGcm9tQ29udGV4dCh1cmxJbnB1dDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHJcbiAgICAgICAgICAgIC8vIDEgLSBVcmwgc3RhcnRzIHdpdGggaHR0cDovLyBvciBodHRwczovLyA9PiByZXR1cm4gYXMgaXMuXHJcbiAgICAgICAgICAgIGlmICh1cmxJbnB1dC5zbGljZSgwLCAnaHR0cDovLycubGVuZ3RoKSA9PT0gJ2h0dHA6Ly8nIHx8XHJcbiAgICAgICAgICAgICAgICB1cmxJbnB1dC5zbGljZSgwLCAnaHR0cHM6Ly8nLmxlbmd0aCkgPT09ICdodHRwczovLycpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB1cmxJbnB1dDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gMiAtIE90aGVyd2lzZSwgdHJ5IHRvIGZpbmQgY29ycmVjdCBjb250cm9sbGVyXHJcblxyXG4gICAgICAgICAgICAvLyBCb29sZWFuIHVzZWQgdG8gdHJ5IHRvIGRldGVybWluZSBjb3JyZWN0IGZ1bGwgdXJsIChhZGQgLyBvciBub3QgYmVmb3JlIHRoZSB1cmwgZnJhZ21lbnQgZGVwZW5kaW5nIG9uIGlmIGZvdW5kIG9yIG5vdClcclxuICAgICAgICAgICAgdmFyIHVybEZyYWdtZW50U3RhcnRzV2l0aFNsYXNoID0gdXJsSW5wdXQuc2xpY2UoMCwgJy8nLmxlbmd0aCkgPT09ICcvJztcclxuXHJcbiAgICAgICAgICAgIC8vIFJlZ2V4IHRyeWluZyB0byBkZXRlcm1pbmUgaWYgdGhlIGlucHV0IGZyYWdtZW50IGNvbnRhaW5zIGEgLyBiZXR3ZWVuIHR3byBjaGFyYWN0ZXIgc3VpdGVzID0+IGNvbnRyb2xsZXIgZ2l2ZW4gYXMgaW5wdXQsIG90aGVyd2lzZSwgYWN0aW9uIG9uIHNhbWUgY29udHJvbGxlciBleHBlY3RlZFxyXG4gICAgICAgICAgICB2YXIgY29udHJvbGxlcklzUHJlc2VudFJlZ2V4ID0gL1xcdytcXC9cXHcrLztcclxuXHJcbiAgICAgICAgICAgIHZhciBhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXIgPSAhY29udHJvbGxlcklzUHJlc2VudFJlZ2V4LnRlc3QodXJsSW5wdXQpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGJhc2VVcmwgPSB0aGlzLmdldFVybFBhdGgoYWN0aW9uSXNPblNhbWVDb250cm9sbGVyKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBiYXNlVXJsICsgKHVybEZyYWdtZW50U3RhcnRzV2l0aFNsYXNoID8gdXJsSW5wdXQgOiAoJy8nICsgdXJsSW5wdXQpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICAvLyNyZWdpb24gcHJpdmF0ZSBtZXRob2RzXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFV0aWxpdHkgbWV0aG9kLlxyXG4gICAgICAgICAqIE1haW4gY2FsbGVyIHRoYXQgYWxsIHdyYXBwZXIgY2FsbHMgKGdldCwgZGVsZXRlLCBwb3N0LCBwdXQpIG11c3QgdXNlIHRvIHNoYXJlIGNvbW1vbiBiZWhhdmlvci5cclxuICAgICAgICAgKiBAcGFyYW0gY29uZmlnXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBhamF4PFQ+KG1ldGhvZDogSHR0cE1ldGhvZCwgdXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZykge1xyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogbWFrZSBzdXJlIGluaXRQcm9taXNlIHJlc29sdmUgYXV0b21hdGljYWxseSB3aXRob3V0IG92ZXJoZWFkIG9uY2UgZmlyc3QgY2FsbCBzdWNlc3NmdWxsLlxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogZG8gbm90IGJsb2NrIGlmIG5vdCBjYWxsIHRvIGludGVybmFsIEFQSSAoaW5pdENhbGwpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluaXRQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJGh0dHA8VD4odGhpcy5jb25maWd1cmVIdHRwQ2FsbChtZXRob2QsIHVybCwgY29uZmlnKSlcclxuICAgICAgICAgICAgICAgICAgICAudGhlbjxUPih0aGlzLnN1Y2Nlc3MsIHRoaXMuZXJyb3IpXHJcbiAgICAgICAgICAgICAgICAgICAgLmZpbmFsbHkodGhpcy5maW5hbGx5KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAqIFByZXBhcmVzIGEge0BsaW5rIG5nIyRodHRwI2NvbmZpZyBjb25maWd9IG9iamVjdCBmb3IgJGh0dHAgY2FsbC5cclxuICAgICAgICAqIFRoZSBvcGVyYXRpb25zIGluY2x1ZGUgc2V0dGluZyBkZWZhdWx0IHZhbHVlcyB3aGVuIG5vdCBwcm92aWRlZCwgYW5kIHNldHRpbmcgaHR0cCBoZWFkZXJzIGlmIG5lZWRlZCBmb3IgOlxyXG4gICAgICAgICogIC0gQWpheCBjYWxsc1xyXG4gICAgICAgICogIC0gQXV0aG9yaXphdGlvbiB0b2tlblxyXG4gICAgICAgICogIC0gQ3VycmVudCBVc2VyUm9sZS4gICBcclxuICAgICAgICAqIEBwYXJhbSBvcHRpb25zXHJcbiAgICAgICAgKiBAcmV0dXJucyB7bmcuJGh0dHAuY29uZmlnfSB0aGUgY29uZmlndXJhdGlvbiBvYmplY3QgcmVhZHkgdG8gYmUgaW5qZWN0ZWQgaW50byBhICRodHRwIGNhbGwuIFxyXG4gICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBjb25maWd1cmVIdHRwQ2FsbCA9IChtZXRob2Q6IEh0dHBNZXRob2QsIHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUmVxdWVzdENvbmZpZyA9PiB7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXVybCB8fCBtZXRob2QgPT09IG51bGwgfHwgbWV0aG9kID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignVVJMICYgTUVUSE9EIHBhcmFtZXRlcnMgYXJlIG5lY2Vzc2FyeSBmb3IgaHR0cFdyYXBwZXIgY2FsbHMuIEFib3J0aW5nLicpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vSW5pdCBjb25maWcgZXZlbiBpZiBub3QgcHJvdmlkZWRcclxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFyZCBjYXN0IGlzIG5vdCBzYWZlLCB3ZSBtYXkgZm9yZ2V0IHRvIHNldCB1cmwgJiBtZXRob2QgcGFyYW1ldGVycy4gVE9GSVguXHJcbiAgICAgICAgICAgIC8vIGF1dG9tYXRpY2FsbHkgZ2V0IGFsbCBub24tZmlsdGVyZWQgcGFyYW1ldGVycyAmIGtlZXAgdGhlbSBmb3IgdGhpcyBuZXcgb2JqZWN0LlxyXG4gICAgICAgICAgICB2YXIgY29uZmlnRnVsbCA9IDxuZy5JUmVxdWVzdENvbmZpZz5jb25maWc7XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBOiBzdXBwb3J0IG1hcHBpbmcgYmV0d2VlbiB1cGxvYWQgJiBwb3N0IGhlcmUgP1xyXG4gICAgICAgICAgICBjb25maWdGdWxsLm1ldGhvZCA9IEh0dHBNZXRob2RbbWV0aG9kXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb25maWcuYXBpRW5kcG9pbnQgJiYgKCF0aGlzLmFwaUNvbmZpZyB8fFxyXG4gICAgICAgICAgICAgICAgIXRoaXMuYXBpQ29uZmlnLmp3dFRva2VuIHx8XHJcbiAgICAgICAgICAgICAgICAhdGhpcy5hcGlDb25maWcuY3VycmVudFVzZXJSb2xlKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdbSW50ZXJuYWxFcnJvcl0gWycgKyB1cmwgKyAnXSAtIGNvcmVBcGkgY2FsbCBpbnRlbmRlZCB3aXRob3V0IG5lY2Vzc2FyeSBjYXBpIGNyZWRlbnRpYWxzLiBBYm9ydGluZy4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25maWdGdWxsLmhlYWRlcnMgPSBjb25maWcuaGVhZGVycyB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgIGlmICghY29uZmlnLmFwaUVuZHBvaW50KSB7IC8vIGlmIG5vdCBzZXQsIGV2YWx1YXRlcyB0byBmYWxzZVxyXG4gICAgICAgICAgICAgICAgY29uZmlnRnVsbC51cmwgPSB0aGlzLmJ1aWxkVXJsRnJvbUNvbnRleHQodXJsKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBjb3JlIGFwaSBlbmRwb2ludCAnYXBpLycgaGFyZGNvZGVkLCB0byBwdXQgaW4gY29uZmlnRnVsbCAhIHNob3VsZCBub3Qga25vdyB0aGF0IGhlcmUuXHJcbiAgICAgICAgICAgICAgICBjb25maWdGdWxsLnVybCA9IHRoaXMuYXBpQ29uZmlnLmNvcmVBcGlVcmwgKyAnYXBpLycgKyB1cmw7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYXBpQ29uZmlnLmp3dFRva2VuICYmIHRoaXMuYXBpQ29uZmlnLmN1cnJlbnRVc2VyUm9sZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhcmQgY29kZWQgaGVhZGVycywgbm90IGdvb2QsIHRvIGluamVjdFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwuaGVhZGVyc1snT0EtVXNlclJvbGUnXSA9IHRoaXMuYXBpQ29uZmlnLmN1cnJlbnRVc2VyUm9sZTtcclxuICAgICAgICAgICAgICAgICAgICBjb25maWdGdWxsLmhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9ICdCZWFyZXIgJyArIHRoaXMuYXBpQ29uZmlnLmp3dFRva2VuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIWNvbmZpZy5kaXNhYmxlWG1sSHR0cFJlcXVlc3RIZWFkZXIpIC8vIGlmIG5vdCBzZXQsIGV2YWx1YXRlcyB0byBmYWxzZVxyXG4gICAgICAgICAgICAgICAgY29uZmlnRnVsbC5oZWFkZXJzWydYLVJlcXVlc3RlZC1XaXRoJ10gPSAnWE1MSHR0cFJlcXVlc3QnO1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogT0Ugc3BlY2lmaWMgY29kZSwgdG8gcmVtb3ZlXHJcbiAgICAgICAgICAgIGlmICgoPGFueT50aGlzLiR3aW5kb3cpLnByZXZlbnRCbG9ja1VJICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPIE1HQSA6IHR5cGUgY2FzdGluZywgaXMgaXQgb2theSBvciBub3QgPyBiZXR0ZXIgYXBwcm9hY2ggP1xyXG4gICAgICAgICAgICAgICAgKDxhbnk+dGhpcy4kd2luZG93KS5wcmV2ZW50QmxvY2tVSSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gY29uZmlnRnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFN1Y2Nlc3MgaGFuZGxlclxyXG4gICAgICAgICAqIEByZXR1cm5zIHt9IFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgc3VjY2VzcyA9IDxUPihodHRwUHJvbWlzZTogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8VD4pOiBUIHwgbmcuSVByb21pc2U8YW55PiA9PiB7XHJcblxyXG4gICAgICAgICAgICAvLyBKUyB0cmljayA6IGNhcHR1cmUgdXJsIHZhcmlhYmxlIGluc2lkZSBjbG9zdXJlIHNjb3BlIHRvIHN0b3JlIGl0IGZvciBjYWxsYmFjayB3aGljaCBjYW5ub3QgYmUgY2FsbGVkIHdpdGggMiBhcmd1bWVudHNcclxuICAgICAgICAgICAgaWYgKCFodHRwUHJvbWlzZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdbSFRUUF0gWycgKyBodHRwUHJvbWlzZS5jb25maWcudXJsICsgJ10gVW5leHBlY3RlZCAkaHR0cCBlcnJvciwgbm8gcmV0dXJuIHByb21pc2Ugb2JqZWN0IGNvdWxkIGJlIGZvdW5kLicpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy50b2FzdGVyLmVycm9yKCdVbmV4cGVjdGVkIGJlaGF2aW9yJywgJ1BsZWFzZSBjb250YWN0IHlvdXIgbG9jYWwgc3VwcG9ydCB0ZWFtLicpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHEucmVqZWN0KGh0dHBQcm9taXNlKTsgLy8gUmVqZWN0IHByb21pc2VcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFuZGxlIHdoZW4gQVBJIGlzIGZpeGVkLiBTZWUgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMTc0Njg5NC93aGF0LWlzLXRoZS1wcm9wZXItcmVzdC1yZXNwb25zZS1jb2RlLWZvci1hLXZhbGlkLXJlcXVlc3QtYnV0LWFuLWVtcHR5LWRhdGFcclxuICAgICAgICAgICAgLy9pZiAoKHByb21pc2VDYWxsYmFjay5kYXRhID09PSBudWxsIHx8IHByb21pc2VDYWxsYmFjay5kYXRhID09PSB1bmRlZmluZWQpICYmIHByb21pc2VDYWxsYmFjay5zdGF0dXMgIT09IDIwNCkge1xyXG4gICAgICAgICAgICAvLyAgICB0aGlzLiRsb2cuZXJyb3IoJ1VuZXhwZWN0ZWQgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLCBleHBlY3RlZCByZXNwb25zZSBkYXRhIGJ1dCBub25lIGZvdW5kLicpO1xyXG4gICAgICAgICAgICAvLyAgICB0aGlzLnRvYXN0ZXIud2FybmluZygnVW5leHBlY3RlZCByZXNwb25zZScsICdQbGVhc2UgY29udGFjdCB5b3VyIGxvY2FsIHN1cHBvcnQgdGVhbS4nKTtcclxuICAgICAgICAgICAgLy8gICAgcmV0dXJuIHRoaXMuJHEucmVqZWN0KHByb21pc2VDYWxsYmFjayk7IC8vIFJlamVjdCBwcm9taXNlIGlmIG5vdCB3ZWxsLWZvcm1lZCBkYXRhXHJcbiAgICAgICAgICAgIC8vfVxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBOiBzYW1lIGJlaGF2aW9yIGFsc28gb24gYSBHRVQgcmVxdWVzdCA/IGlmIHJlcXVlc3QgaXMgR0VUIGFuZCByZXNwb25zZSBpcyAyMDAgd2l0aCBubyBkYXRhLCByZXR1cm4gZXJyb3IgPyAocGFzcyBpbiBwYXJhbWV0ZXIgcmVxdWVzdCBjb250ZXh0IHRvIGxvZyB0aGlzIGVycm9yKS5cclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IGdldCBmdWxsIHVybCBvZiByZXF1ZXN0XHJcbiAgICAgICAgICAgIHRoaXMuJGxvZy5kZWJ1ZygnW0hUVFBdIFsnICsgaHR0cFByb21pc2UuY29uZmlnLnVybCArICddJywgaHR0cFByb21pc2UpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGh0dHBQcm9taXNlLmRhdGE7IC8vIHJldHVybiBvbmx5IHRoZSBkYXRhIGV4cGVjdGVkIGZvciBjYWxsZXJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEVycm9yIGhhbmRsZXJcclxuICAgICAgICAgKiBAcGFyYW0gaHR0cFByb21pc2UgXHJcbiAgICAgICAgICogQHJldHVybnMge30gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBlcnJvciA9IChodHRwUHJvbWlzZTogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8YW55PikgOiBuZy5JUHJvbWlzZTxuZy5JSHR0cFByb21pc2VDYWxsYmFja0FyZzxhbnk+PiA9PiB7IC8vIGRvIHNvbWV0aGluZyBvbiBlcnJvclxyXG5cclxuICAgICAgICAgICAgICAgIC8vIFdlIHN1cHBvc2UgaW4gY2FzZSBvZiBubyByZXNwb25zZSB0aGF0IHRoZSBzcnYgZGlkbid0IHNlbmQgYW55IHJlc3BvbnNlLlxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyBNR0E6IG1heSBhbHNvIGJlIGEgZmF1bHQgaW4gaW50ZXJuYWwgJGh0dHAgLyBhamF4IGNsaWVudCBzaWRlIGxpYiwgdG8gZGlzdGluZ3Vpc2guXHJcbiAgICAgICAgICAgICAgICBpZiAoIWh0dHBQcm9taXNlIHx8ICFodHRwUHJvbWlzZS5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaHR0cFByb21pc2UuZGF0YSA9ICdTZXJ2ZXIgbm90IHJlc3BvbmRpbmcnO1xyXG4gICAgICAgICAgICAgICAgICAgIGh0dHBQcm9taXNlLnN0YXR1cyA9IDUwMztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgY29udGVudFR5cGUgPSBodHRwUHJvbWlzZS5oZWFkZXJzKCdDb250ZW50LVR5cGUnKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoY29udGVudFR5cGUgJiYgY29udGVudFR5cGUuaW5kZXhPZignYXBwbGljYXRpb24vanNvbicpID4gLTEgfHwgY29udGVudFR5cGUuaW5kZXhPZigndGV4dC9wbGFpbicpID4gLTEpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhbmRsZSBlcnJvciBoYW5kbGluZyBtb3JlIGdlbmVyaWNhbGx5IGJhc2VkIG9uIGlucHV0IGVycm9yIG1lc3NhZ2UgY29udHJhY3QgaW5zdGVhZCBvZiBleHBlY3Rpbmcgc3BlY2lmaWMgZXJyb3Igc3RyY3R1cmUuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vaWYgKHJlc3BvbnNlLmRhdGEuTW9kZWxTdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vICAgIC8vVE9ETyBNR0EgOiBoYW5kbGUgdGhpcyB3aGVuIHdlbGwgZm9ybWF0dGVkIHNlcnZlci1zaWRlXHJcbiAgICAgICAgICAgICAgICAgICAgLy99IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaHR0cFByb21pc2UuZGF0YS5NZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBodHRwUHJvbWlzZS5kYXRhLk1lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGh0dHBQcm9taXNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYW5kbGUgbW9yZSByZXNwb25zZSBjb2RlcyBncmFjZWZ1bGx5LlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChodHRwUHJvbWlzZS5zdGF0dXMgPT09IDQwNCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRvYXN0ZXIud2FybmluZygnTm90IEZvdW5kJywgbWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b2FzdGVyLmVycm9yKCdTZXJ2ZXIgcmVzcG9uc2UgZXJyb3InLCBtZXNzYWdlICsgJ1xcbiBTdGF0dXM6ICcgKyBodHRwUHJvbWlzZS5zdGF0dXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b2FzdGVyLmVycm9yKCdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InLCAnU3RhdHVzOiAnICsgaHR0cFByb21pc2Uuc3RhdHVzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBnZXQgZnVsbCB1cmwgb2YgcmVxdWVzdFxyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdbSFRUUF0gWycgKyBodHRwUHJvbWlzZS5jb25maWcudXJsICsgJ10nLCBodHRwUHJvbWlzZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gV2UgZG9uJ3QgcmVjb3ZlciBmcm9tIGVycm9yLCBzbyB3ZSBwcm9wYWdhdGUgaXQgOiBiZWxvdyBoYW5kbGVycyBoYXZlIHRoZSBjaG9pY2Ugb2YgcmVhZGluZyB0aGUgZXJyb3Igd2l0aCBhbiBlcnJvciBoYW5kbGVyIG9yIG5vdC4gU2VlICRxIHByb21pc2VzIGJlaGF2aW9yIGhlcmUgOiBodHRwczovL2dpdGh1Yi5jb20va3Jpc2tvd2FsL3FcclxuICAgICAgICAgICAgICAgIC8vIFRoaXMgYmVoYXZpb3IgaXMgZGVzaXJlZCBzbyB0aGF0IHdlIHNob3cgZXJyb3IgaW5zaWRlIHNwZWNpZmljIHNlcnZlciBjb21tdW5pY2F0aW9uIG1vZGFscyBhdCBzcGVjaWZpYyBwbGFjZXMgaW4gdGhlIGFwcCwgb3RoZXJ3aXNlIHNob3cgYSBnbG9iYWwgYWxlcnQgbWVzc2FnZSwgb3IgZXZlbiBkbyBub3Qgc2hvdyBhbnl0aGluZyBpZiBub3QgbmVjZXNzYXJ5IChkbyBub3QgYWQgYW4gZXJyb3IgaGFuZGxlciBpbiBiZWxvdyBoYW5kbGVycyBvZiB0aGlzIHByb21pc2UpLlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHEucmVqZWN0KGh0dHBQcm9taXNlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEZ1bmN0aW9uIGNhbGxlZCBhdCB0aGUgZW5kIG9mIGFuIGFqYXggY2FsbCwgcmVnYXJkbGVzcyBvZiBpdCdzIHN1Y2Nlc3Mgb3IgZmFpbHVyZS5cclxuICAgICAgICAgKiBAcGFyYW0gcmVzcG9uc2VcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGZpbmFsbHkgPSAoKTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IE9FLXNwZWNpZmljIGNvZGVcclxuICAgICAgICAgICAgaWYgKCg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgIT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8gTUdBIDogdHlwZSBjYXN0aW5nLCBpcyBpdCBva2F5IG9yIG5vdCA/IGJldHRlciBhcHByb2FjaCA/XHJcbiAgICAgICAgICAgICAgICAoPGFueT50aGlzLiR3aW5kb3cpLnByZXZlbnRCbG9ja1VJID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBUT0RPIE1HQSA6IHVzaW5nIG1ldGhvZCBmcm9tIExheW91dC5qcyA6IHRvIGRvY3VtZW50IHRvIG5vdCBoYW5kbGUgZHVwbGljYXRlIGNvZGUgISFcclxuICAgICAgICAvL1RPRE8gTUdBIDogbWFrZSBpdCBjYXBhYmxlIG9mIGhhbmRsaW5nIGZ1bGwgVVJMcyBvdXRzaWRlIG9mIE9FIDogZG8gbm90IHVzZSA/PyBob3cgdG8gP1xyXG4gICAgICAgIHByaXZhdGUgZ2V0VXJsUGF0aChhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXIpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXNlVXJsUmVnZXggPSAvKFxcL1xcdytcXC9cXChTXFwoXFx3K1xcKVxcKSlcXC9cXHcrLztcclxuICAgICAgICAgICAgdmFyIHVybCA9IHRoaXMuJHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZTtcclxuICAgICAgICAgICAgdmFyIGJhc2VVcmxNYXRjaGVzID0gYmFzZVVybFJlZ2V4LmV4ZWModXJsKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChiYXNlVXJsTWF0Y2hlcy5sZW5ndGggJiYgYmFzZVVybE1hdGNoZXMubGVuZ3RoID09PSAyKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGJhc2VVcmxXaXRoQ29udHJvbGxlck5hbWUgPSBiYXNlVXJsTWF0Y2hlc1swXTtcclxuICAgICAgICAgICAgICAgIHZhciBiYXNlVXJsID0gYmFzZVVybE1hdGNoZXNbMV07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBiYXNlVXJsV2l0aENvbnRyb2xsZXJOYW1lO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmFzZVVybDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuICcnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQTogT00tc3BlY2lmaWMgQVNQIE1WQyBjb2RlLCBub3QgdXNlZCBBVE0sIHRvIHJlbW92ZVxyXG4gICAgICAgIHByaXZhdGUgZ2V0Q3VycmVudFNlc3Npb25JRCgpIHtcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBtYWdpYyByZWdleHAgdG8gZmV0Y2ggU2Vzc2lvbklEIGluIFVSTCwgdG8gc3RvcmUgZWxzZXdoZXJlICFcclxuICAgICAgICAgICAgdmFyIHNlc3Npb25SZWdleCA9IC9odHRwczpcXC9cXC9bXFx3Ll0rXFwvW1xcdy5dK1xcLyhcXChTXFwoXFx3K1xcKVxcKSlcXC8uKi87XHJcbiAgICAgICAgICAgIC8vdmFyIHNlc3Npb25SZWdleCA9IC9odHRwczpcXC9cXC9bXFx3Ll0rXFwvT3JkZXJFbnRyeVxcLyhcXChTXFwoXFx3K1xcKVxcKSlcXC8uKi87XHJcblxyXG4gICAgICAgICAgICAvLyBUT0RPIE1HQSA6IHVwZGF0ZSByZWdleHAgdG8gdGhlIG9uZSBiZWxvd1xyXG4gICAgICAgICAgICAvL3ZhciBiYXNlVXJsUmVnZXggPSAvKGh0dHBzOlxcL1xcL1tcXHcuLV0rXFwvW1xcdy4tXStcXC9cXChTXFwoXFx3K1xcKVxcKVxcLylcXHcrLztcclxuXHJcblxyXG4gICAgICAgICAgICB2YXIgcGF0aCA9IHRoaXMuJGxvY2F0aW9uLmFic1VybCgpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHJlZ2V4cEFycmF5ID0gc2Vzc2lvblJlZ2V4LmV4ZWMocGF0aCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXJlZ2V4cEFycmF5KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJVbmFibGUgdG8gcmVjb2duaXplZCBzZWFyY2hlZCBwYXR0ZXJuIGluIGN1cnJlbnQgdXJsIGxvY2F0aW9uIHRvIHJldHJpZXZlIHNlc3Npb25JRC5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVnZXhwQXJyYXkubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJVbmFibGUgdG8gZmluZCBzZXNzaW9uSUQgaW4gc2VhcmNoZWQgcGF0dGVybiBpbiBjdXJyZW50IHVybC5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVnZXhwQXJyYXkubGVuZ3RoID4gMikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKFwiVG9vIG1hbnkgbWF0Y2hlcyBmb3VuZCBmb3IgdGhlIHNlc3Npb25JRCBzZWFyY2ggaW4gdGhlIGN1cnJlbnQgdXJsLlwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gcmVnZXhwQXJyYXlbMV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgnbmcuaHR0cFdyYXBwZXInLCBbJ3RvYXN0ZXInLCAnbmdBbmltYXRlJywgJ25nRmlsZVVwbG9hZCddKVxyXG4gICAgICAgIC8vIGRvbmUgaW4gY29uZmlndXJlSHR0cENhbGwgbWV0aG9kLlxyXG4gICAgICAgIC8vLmNvbmZpZyhbJyRodHRwUHJvdmlkZXInLCAoJGh0dHBQcm92aWRlcjogbmcuSUh0dHBQcm92aWRlcikgPT4ge1xyXG4gICAgICAgIC8vICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtUmVxdWVzdGVkLVdpdGgnXSA9ICdYTUxIdHRwUmVxdWVzdCc7XHJcbiAgICAgICAgLy99XSlcclxuICAgICAgICAuc2VydmljZSgnaHR0cFdyYXBwZXJTZXJ2aWNlJywgSHR0cFdyYXBwZXJTZXJ2aWNlKTtcclxufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
