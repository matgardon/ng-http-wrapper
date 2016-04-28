var bluesky;
(function (bluesky) {
    var core;
    (function (core) {
        var models;
        (function (models) {
            /**
             * TODO MGA : export an interface too ?
             */
            var ApiConfig = (function () {
                function ApiConfig(coreApiUrl, 
                    //TODO MGA : to inject as generic list of custom headers to pass to $http service ?
                    jwtToken, currentUserRole) {
                    this.coreApiUrl = coreApiUrl;
                    this.jwtToken = jwtToken;
                    this.currentUserRole = currentUserRole;
                }
                return ApiConfig;
            }());
            models.ApiConfig = ApiConfig;
        })(models = core.models || (core.models = {}));
    })(core = bluesky.core || (bluesky.core = {}));
})(bluesky || (bluesky = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwaS1jb25maWcubW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBVSxPQUFPLENBWWhCO0FBWkQsV0FBVSxPQUFPO0lBQUMsSUFBQSxJQUFJLENBWXJCO0lBWmlCLFdBQUEsSUFBSTtRQUFDLElBQUEsTUFBTSxDQVk1QjtRQVpzQixXQUFBLE1BQU0sRUFBQyxDQUFDO1lBQzNCOztlQUVHO1lBQ0g7Z0JBQ0ksbUJBQ1csVUFBa0I7b0JBQ3pCLG1GQUFtRjtvQkFDNUUsUUFBZ0IsRUFDaEIsZUFBdUI7b0JBSHZCLGVBQVUsR0FBVixVQUFVLENBQVE7b0JBRWxCLGFBQVEsR0FBUixRQUFRLENBQVE7b0JBQ2hCLG9CQUFlLEdBQWYsZUFBZSxDQUFRO2dCQUM5QixDQUFDO2dCQUNULGdCQUFDO1lBQUQsQ0FQQSxBQU9DLElBQUE7WUFQWSxnQkFBUyxZQU9yQixDQUFBO1FBQ0wsQ0FBQyxFQVpzQixNQUFNLEdBQU4sV0FBTSxLQUFOLFdBQU0sUUFZNUI7SUFBRCxDQUFDLEVBWmlCLElBQUksR0FBSixZQUFJLEtBQUosWUFBSSxRQVlyQjtBQUFELENBQUMsRUFaUyxPQUFPLEtBQVAsT0FBTyxRQVloQiIsImZpbGUiOiJhcGktY29uZmlnLm1vZGVsLmpzIiwic291cmNlc0NvbnRlbnQiOlsibmFtZXNwYWNlIGJsdWVza3kuY29yZS5tb2RlbHMge1xyXG4gICAgLyoqXHJcbiAgICAgKiBUT0RPIE1HQSA6IGV4cG9ydCBhbiBpbnRlcmZhY2UgdG9vID9cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEFwaUNvbmZpZyB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgIHB1YmxpYyBjb3JlQXBpVXJsOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiB0byBpbmplY3QgYXMgZ2VuZXJpYyBsaXN0IG9mIGN1c3RvbSBoZWFkZXJzIHRvIHBhc3MgdG8gJGh0dHAgc2VydmljZSA/XHJcbiAgICAgICAgICAgIHB1YmxpYyBqd3RUb2tlbjogc3RyaW5nLFxyXG4gICAgICAgICAgICBwdWJsaWMgY3VycmVudFVzZXJSb2xlOiBzdHJpbmdcclxuICAgICAgICApIHsgfVxyXG4gICAgfVxyXG59Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9

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
                HttpWrapperService.$inject = ["$http", "$window", "$log", "$q", "$location", "Upload", "toaster"];
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
                            _this.$log.error("[InternalError] [" + configFull.method + " / " + url + "] - coreApi call intended without necessary capi credentials. Aborting.");
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
                            _this.$log.error("[HTTP " + httpPromise.config.method + "] [" + httpPromise.config.url + "] Unexpected $http error, no return promise object could be found.");
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
                        _this.$log.debug("[HTTP " + httpPromise.config.method + "] [" + httpPromise.config.url + "]", httpPromise);
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
                        if (contentType && (contentType.indexOf('application/json') > -1 || contentType.indexOf('text/plain') > -1)) {
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
                        _this.$log.error("[HTTP " + httpPromise.config.method + "] [" + httpPromise.config.url + "]", httpPromise);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHAtd3JhcHBlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQVUsT0FBTyxDQXdZaEI7QUF4WUQsV0FBVSxPQUFPO0lBQUMsSUFBQSxJQUFJLENBd1lyQjtJQXhZaUIsV0FBQSxJQUFJO1FBQUMsSUFBQSxRQUFRLENBd1k5QjtRQXhZc0IsV0FBQSxRQUFRLEVBQUMsQ0FBQztZQWU3QixJQUFLLFVBQXFDO1lBQTFDLFdBQUssVUFBVTtnQkFBRyx5Q0FBRyxDQUFBO2dCQUFFLDJDQUFJLENBQUE7Z0JBQUUseUNBQUcsQ0FBQTtnQkFBRSwrQ0FBTSxDQUFBO1lBQUMsQ0FBQyxFQUFyQyxVQUFVLEtBQVYsVUFBVSxRQUEyQjtZQUFBLENBQUM7WUEyQjNDOztlQUVHO1lBQ0g7Z0JBT0ksWUFBWTtnQkFFWixjQUFjO2dCQUVkLGVBQWU7Z0JBQ2YsNEJBQ1ksS0FBc0IsRUFDdEIsT0FBMEIsRUFDMUIsSUFBb0IsRUFDcEIsRUFBZ0IsRUFDaEIsU0FBOEIsRUFDOUIsTUFBMkMsRUFDM0MsT0FBa0M7b0JBbkJsRCxpQkFtVkM7b0JBdFVlLFVBQUssR0FBTCxLQUFLLENBQWlCO29CQUN0QixZQUFPLEdBQVAsT0FBTyxDQUFtQjtvQkFDMUIsU0FBSSxHQUFKLElBQUksQ0FBZ0I7b0JBQ3BCLE9BQUUsR0FBRixFQUFFLENBQWM7b0JBQ2hCLGNBQVMsR0FBVCxTQUFTLENBQXFCO29CQUM5QixXQUFNLEdBQU4sTUFBTSxDQUFxQztvQkFDM0MsWUFBTyxHQUFQLE9BQU8sQ0FBMkI7b0JBdUg5Qzs7Ozs7Ozs7c0JBUUU7b0JBQ00sc0JBQWlCLEdBQUcsVUFBQyxNQUFrQixFQUFFLEdBQVcsRUFBRSxNQUEyQjt3QkFFckYsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksTUFBTSxLQUFLLElBQUksSUFBSSxNQUFNLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQzs0QkFDbEQsS0FBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsd0VBQXdF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QkFDZCxDQUFDO29CQUNELEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMscUVBQXFFLENBQUMsQ0FBQzt3QkFDdkYsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDZCxDQUFDO29CQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLENBQUM7Z0JBR0wseUJBQUM7WUFBRCxDQW5WQSxBQW1WQyxJQUFBO1lBblZZLDJCQUFrQixxQkFtVjlCLENBQUE7WUFFRCxPQUFPLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQztpQkFLckUsT0FBTyxDQUFDLG9CQUFvQixFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDM0QsQ0FBQyxFQXhZc0IsUUFBUSxHQUFSLGFBQVEsS0FBUixhQUFRLFFBd1k5QjtJQUFELENBQUMsRUF4WWlCLElBQUksR0FBSixZQUFJLEtBQUosWUFBSSxRQXdZckI7QUFBRCxDQUFDLEVBeFlTLE9BQU8sS0FBUCxPQUFPLFFBd1loQiIsImZpbGUiOiJodHRwLXdyYXBwZXIuc2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIm5hbWVzcGFjZSBibHVlc2t5LmNvcmUuc2VydmljZXMge1xyXG5cclxuICAgIGltcG9ydCBBcGlDb25maWcgPSBibHVlc2t5LmNvcmUubW9kZWxzLkFwaUNvbmZpZztcclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElIdHRwV3JhcHBlckNvbmZpZyBleHRlbmRzIG5nLklSZXF1ZXN0U2hvcnRjdXRDb25maWcge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIG1haW4gQVBJIGVuZHBvaW50IHRvIHVzZSBhcyBkZWZhdWx0IG9uZSBpZiB1cmwgaXMgbm90IGZ1bGwuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgYXBpRW5kcG9pbnQ/OiBib29sZWFuO1xyXG4gICAgICAgIGZpbGU/OiBGaWxlLFxyXG4gICAgICAgIHVwbG9hZEluQmFzZTY0SnNvbj86IGJvb2xlYW47XHJcbiAgICAgICAgdXBsb2FkUHJvZ3Jlc3M/OiAoKSA9PiBhbnk7XHJcbiAgICAgICAgZGlzYWJsZVhtbEh0dHBSZXF1ZXN0SGVhZGVyPzogYm9vbGVhbjtcclxuICAgIH1cclxuXHJcbiAgICBlbnVtIEh0dHBNZXRob2QgeyBHRVQsIFBPU1QsIFBVVCwgREVMRVRFIH07XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJSHR0cFdyYXBwZXJTZXJ2aWNlIHtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQWxsIHNydi1zaWRlIGNvbmZpZ3VyYXRpb24gb2YgbWFpbiBBUEkgcHJvdmlkZWQgYnkgdGhlIGRvbWFpbiBmcm9tIHdoaWNoIHRoaXMgc2NyaXB0IHdhcyBsb2FkZWQsIEAgdGhlIHVybCAnQ29yZUFwaUF1dGgvR2V0Q29yZUFwaUNvbmZpZycuXHJcbiAgICAgICAgICogVE9ETyBNR0EgZml4IGhhcmQgY29kZWQgcGF0aC5cclxuICAgICAgICAgKiBUaGlzIGNvbmZpZ3VyYXRpb24gZGF0YSBpcyBsb2FkZWQgdXBvbiBpbml0aWFsaXphdGlvbiBvZiB0aGlzIHNlcnZpY2UgKHRvIGJlIHVzZWQgYXMgYSBzaW5nbGV0b24gaW4gdGhlIGFwcCkuIEFsbCBvdGhlciB3ZWIgY2FsbHMgYXJlIGJsb2NrZWQgYXMgbG9uZyBhcyB0aGlzIG9uZSBpcyBub3QgZmluaXNoZWQuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgYXBpQ29uZmlnOiBBcGlDb25maWc7XHJcblxyXG4gICAgICAgIC8vVE9ETyBNR0E6IGZvciBmb2xsb3dpbmcgbWV0aG9kcywgcmV0dXJuIElQcm9taXNlIGFuZCBhc3N1bWUgYWJzdHJhY3Rpb24gb3IgbGV0IGJlbG93IHNlcnZpY2VzIGhhbmRsZSBJSHR0cFByb21pc2VzID9cclxuXHJcbiAgICAgICAgZ2V0PFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgZGVsZXRlPFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgcG9zdDxUPih1cmw6IHN0cmluZywgZGF0YTogYW55LCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgcHV0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICAvL1RPRE8gTUdBIGltcHJvdmUgdHlwaW5nIHdpdGggYW5ndWxhci11cGxvYWQgdHNkIGV0Y1xyXG4gICAgICAgIHVwbG9hZDxUPih1cmw6IHN0cmluZywgZmlsZTogRmlsZSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIGJ1aWxkVXJsRnJvbUNvbnRleHQodXJsSW5wdXQ6IHN0cmluZyk6IHN0cmluZztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRPRE8gTUdBIDogdGhpcyBtYXkgbm90IG5lZWQgdG8gYmUgYSBkZWRpY2F0ZWQgc2VydmljZSwgaXQgY2FuIGFsc28gYmUgaW5jb3Jwb3JhdGVkIGludG8gdGhlIGh0dHBJbnRlcmNlcHRvci4gRGVjaWRlIGJlc3QgYXBwcm9hY2ggZGVwZW5kaW5nIG9uIHBsYW5uZWQgdXNlLlxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgSHR0cFdyYXBwZXJTZXJ2aWNlIGltcGxlbWVudHMgSUh0dHBXcmFwcGVyU2VydmljZSB7XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwcm9wZXJ0aWVzXHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5pdFByb21pc2U6IG5nLklQcm9taXNlPGFueT47XHJcbiAgICAgICAgcHVibGljIGFwaUNvbmZpZzogQXBpQ29uZmlnO1xyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIGN0b3JcclxuXHJcbiAgICAgICAgLyogQG5nSW5qZWN0ICovXHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGh0dHA6IG5nLklIdHRwU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkbG9nOiBuZy5JTG9nU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRsb2NhdGlvbjogbmcuSUxvY2F0aW9uU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSBVcGxvYWQ6IG5nLmFuZ3VsYXJGaWxlVXBsb2FkLklVcGxvYWRTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlIHRvYXN0ZXI6IG5ndG9hc3Rlci5JVG9hc3RlclNlcnZpY2VcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgLy8gaW5pdCBjb3JlIGFwaSBjb25maWcgZGF0YSBvbiBjdG9yXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBoYXJkIGNvZGVkIHBhdGggZm9yIENvcmVyQXBpQXV0aEN0cmwgdG8gaW5qZWN0XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdFByb21pc2UgPSB0aGlzLiRodHRwLmdldDxBcGlDb25maWc+KHRoaXMuYnVpbGRVcmxGcm9tQ29udGV4dCgnQ29yZUFwaUF1dGgvR2V0Q29yZUFwaUNvbmZpZycpKVxyXG4gICAgICAgICAgICAgICAgLnN1Y2Nlc3MoKGNvcmVBcGlDb25maWcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwaUNvbmZpZyA9IGNvcmVBcGlDb25maWc7XHJcbiAgICAgICAgICAgICAgICB9KS5lcnJvcigoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ1VuYWJsZSB0byByZXRyaWV2ZSBBUEkgY29uZmlnLiBBYm9ydGluZyBodHRwV3JhcHBlclNlcnZpY2UgaW5pdGlhbGl6YXRpb24uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICAvLyNyZWdpb24gcHVibGljIG1ldGhvZHNcclxuXHJcbiAgICAgICAgZ2V0PFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5HRVQsIHVybCwgY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlbGV0ZTxUPih1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuREVMRVRFLCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwb3N0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xyXG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGRhdGEgfHwgY29uZmlnLmRhdGE7O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuUE9TVCwgdXJsLCBjb25maWcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHV0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xyXG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGRhdGEgfHwgY29uZmlnLmRhdGE7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5QVVQsIHVybCwgY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwbG9hZDxUPih1cmw6IHN0cmluZywgZmlsZTogRmlsZSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG5cclxuICAgICAgICAgICAgaWYgKCFmaWxlICYmICghY29uZmlnIHx8ICFjb25maWcuZmlsZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignQ2Fubm90IHN0YXJ0IHVwbG9hZCB3aXRoIG51bGwge2ZpbGV9IHBhcmFtZXRlci4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XHJcbiAgICAgICAgICAgIGNvbmZpZy5maWxlID0gZmlsZSB8fCBjb25maWcuZmlsZTsgLy9UT0RPIE1HQSA6IGRvIG5vdCBleHBvc2UgZmlsZSBpbiBJSHR0cFdyYXBwZXJDb25maWcgP1xyXG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGNvbmZpZy5kYXRhIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbmZpZy51cGxvYWRJbkJhc2U2NEpzb24pIHtcclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IG1ha2Ugc3VyZSB0aGlzIGRlbGF5cyBuZXh0IGNhbGwgYW5kIHVwbG9hZCBpcyBub3QgZG9uZSBiZWZvcmUgYmFzZTY0IGVuY29kaW5nIGlzIGZpbmlzaGVkLCBldmVuIGlmIHByb21pc2UgaXMgYWxyZWFkeSByZXNvbHZlZCA/Pz9cclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLlVwbG9hZC5iYXNlNjREYXRhVXJsKGZpbGUpLnRoZW4oKGZpbGVCYXNlNjRVcmwpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYXJkLWNvZGVkIGtleSB0byBmZXRjaCBiYXNlNjQgZW5jb2RpbmcsIHRvIHBhcmFtZXRyaXplIHdpdGggc2VydmVyLXNpZGUgIVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5kYXRhLmZpbGVCYXNlNjRVcmwgPSBmaWxlQmFzZTY0VXJsO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vbm9ybWFsIHBvc3QgaW4gY2FzZSBvZiBiYXNlNjQtZW5jb2RlZCBkYXRhXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLlBPU1QsIHVybCwgY29uZmlnKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uZmlnLmRhdGEuZmlsZUZvcm1EYXRhTmFtZSA9ICdmaWxlJzsgLy8gZmlsZSBmb3JtRGF0YSBuYW1lICgnQ29udGVudC1EaXNwb3NpdGlvbicpLCBzZXJ2ZXIgc2lkZSByZXF1ZXN0IGZvcm0gbmFtZVxyXG5cclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBkbyBub3QgYmxvY2sgaWYgbm90IGNhbGwgdG8gaW50ZXJuYWwgQVBJIChpbml0Q2FsbClcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmluaXRQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBub3Qgc2FmZSBoYXJkIGNhc3RcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBIDogYmVoYXZpb3IgZHVwbGljYXRpb24gd2l0aCB0aGlzLmFqYXgsIG5vdCBEUlksIHRvIGltcHJvdmVcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5VcGxvYWQudXBsb2FkPFQ+KDxuZy5hbmd1bGFyRmlsZVVwbG9hZC5JRmlsZVVwbG9hZENvbmZpZ0ZpbGU+dGhpcy5jb25maWd1cmVIdHRwQ2FsbChIdHRwTWV0aG9kLlBPU1QsIHVybCwgY29uZmlnKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW48VD4odGhpcy5zdWNjZXNzLCB0aGlzLmVycm9yLCBjb25maWcudXBsb2FkUHJvZ3Jlc3MpIC8vVE9ETyBNR0EgOiB1cGxvYWRQcm9ncmVzcyBjYWxsYmFjayBvayA/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maW5hbGx5KHRoaXMuZmluYWxseSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQSA6IG1ldGhvZCB0b28gc3BlY2lmaWMgdG8gT00gYXBwcyBjb250ZXh0LCBtYXkgbm90IHdvcmsgb3V0c2lkZSBvZiBpdCwgdG8gYWRhcHQgZm9yIHB1YmxpYyB1c2UgP1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFRyaWVzIHRvIHBhcnNlIHRoZSBpbnB1dCB1cmwgOlxyXG4gICAgICAgICAqIElmIGl0IHNlZW1zIHRvIGJlIGEgZnVsbCBVUkwsIHRoZW4gcmV0dXJuIGFzIGlzIChjb25zaWRlcnMgaXQgZXh0ZXJuYWwgVXJsKSBcclxuICAgICAgICAgKiBPdGhlcndpc2UsIHRyaWVzIHRvIGZpbmQgdGhlIGJhc2UgVVJMIG9mIHRoZSBjdXJyZW50IEJsdWVTa3kgYXBwIHdpdGggb3Igd2l0aG91dCB0aGUgaW5jbHVkZWQgQ29udHJvbGxlciBhbmQgcmV0dXJucyB0aGUgZnVsbCBVcmwgXHJcbiAgICAgICAgICogQHBhcmFtIHVybElucHV0IDogVE9ETyBNR0E6IGRvY3VtZW50IGRpZmZlcmVudCBraW5kIG9mIHVybHMgdGhhdCB0aGlzIG1ldGhvZCBjYW4gdGFrZSBhcyBpbnB1dCAoZnVsbCwgcGFydGlhbCBldGMpXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGJ1aWxkVXJsRnJvbUNvbnRleHQodXJsSW5wdXQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblxyXG4gICAgICAgICAgICAvLyAxIC0gVXJsIHN0YXJ0cyB3aXRoIGh0dHA6Ly8gb3IgaHR0cHM6Ly8gPT4gcmV0dXJuIGFzIGlzLlxyXG4gICAgICAgICAgICBpZiAodXJsSW5wdXQuc2xpY2UoMCwgJ2h0dHA6Ly8nLmxlbmd0aCkgPT09ICdodHRwOi8vJyB8fFxyXG4gICAgICAgICAgICAgICAgdXJsSW5wdXQuc2xpY2UoMCwgJ2h0dHBzOi8vJy5sZW5ndGgpID09PSAnaHR0cHM6Ly8nKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdXJsSW5wdXQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIDIgLSBPdGhlcndpc2UsIHRyeSB0byBmaW5kIGNvcnJlY3QgY29udHJvbGxlclxyXG5cclxuICAgICAgICAgICAgLy8gQm9vbGVhbiB1c2VkIHRvIHRyeSB0byBkZXRlcm1pbmUgY29ycmVjdCBmdWxsIHVybCAoYWRkIC8gb3Igbm90IGJlZm9yZSB0aGUgdXJsIGZyYWdtZW50IGRlcGVuZGluZyBvbiBpZiBmb3VuZCBvciBub3QpXHJcbiAgICAgICAgICAgIHZhciB1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaCA9IHVybElucHV0LnNsaWNlKDAsICcvJy5sZW5ndGgpID09PSAnLyc7XHJcblxyXG4gICAgICAgICAgICAvLyBSZWdleCB0cnlpbmcgdG8gZGV0ZXJtaW5lIGlmIHRoZSBpbnB1dCBmcmFnbWVudCBjb250YWlucyBhIC8gYmV0d2VlbiB0d28gY2hhcmFjdGVyIHN1aXRlcyA9PiBjb250cm9sbGVyIGdpdmVuIGFzIGlucHV0LCBvdGhlcndpc2UsIGFjdGlvbiBvbiBzYW1lIGNvbnRyb2xsZXIgZXhwZWN0ZWRcclxuICAgICAgICAgICAgdmFyIGNvbnRyb2xsZXJJc1ByZXNlbnRSZWdleCA9IC9cXHcrXFwvXFx3Ky87XHJcblxyXG4gICAgICAgICAgICB2YXIgYWN0aW9uSXNPblNhbWVDb250cm9sbGVyID0gIWNvbnRyb2xsZXJJc1ByZXNlbnRSZWdleC50ZXN0KHVybElucHV0KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXNlVXJsID0gdGhpcy5nZXRVcmxQYXRoKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcik7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gYmFzZVVybCArICh1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaCA/IHVybElucHV0IDogKCcvJyArIHVybElucHV0KSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIHByaXZhdGUgbWV0aG9kc1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBVdGlsaXR5IG1ldGhvZC5cclxuICAgICAgICAgKiBNYWluIGNhbGxlciB0aGF0IGFsbCB3cmFwcGVyIGNhbGxzIChnZXQsIGRlbGV0ZSwgcG9zdCwgcHV0KSBtdXN0IHVzZSB0byBzaGFyZSBjb21tb24gYmVoYXZpb3IuXHJcbiAgICAgICAgICogQHBhcmFtIGNvbmZpZ1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgYWpheDxUPihtZXRob2Q6IEh0dHBNZXRob2QsIHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpIHtcclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IG1ha2Ugc3VyZSBpbml0UHJvbWlzZSByZXNvbHZlIGF1dG9tYXRpY2FsbHkgd2l0aG91dCBvdmVyaGVhZCBvbmNlIGZpcnN0IGNhbGwgc3VjZXNzZnVsbC5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGRvIG5vdCBibG9jayBpZiBub3QgY2FsbCB0byBpbnRlcm5hbCBBUEkgKGluaXRDYWxsKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbml0UHJvbWlzZS50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRodHRwPFQ+KHRoaXMuY29uZmlndXJlSHR0cENhbGwobWV0aG9kLCB1cmwsIGNvbmZpZykpXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW48VD4odGhpcy5zdWNjZXNzLCB0aGlzLmVycm9yKVxyXG4gICAgICAgICAgICAgICAgICAgIC5maW5hbGx5KHRoaXMuZmluYWxseSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgKiBQcmVwYXJlcyBhIHtAbGluayBuZyMkaHR0cCNjb25maWcgY29uZmlnfSBvYmplY3QgZm9yICRodHRwIGNhbGwuXHJcbiAgICAgICAgKiBUaGUgb3BlcmF0aW9ucyBpbmNsdWRlIHNldHRpbmcgZGVmYXVsdCB2YWx1ZXMgd2hlbiBub3QgcHJvdmlkZWQsIGFuZCBzZXR0aW5nIGh0dHAgaGVhZGVycyBpZiBuZWVkZWQgZm9yIDpcclxuICAgICAgICAqICAtIEFqYXggY2FsbHNcclxuICAgICAgICAqICAtIEF1dGhvcml6YXRpb24gdG9rZW5cclxuICAgICAgICAqICAtIEN1cnJlbnQgVXNlclJvbGUuICAgXHJcbiAgICAgICAgKiBAcGFyYW0gb3B0aW9uc1xyXG4gICAgICAgICogQHJldHVybnMge25nLiRodHRwLmNvbmZpZ30gdGhlIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHJlYWR5IHRvIGJlIGluamVjdGVkIGludG8gYSAkaHR0cCBjYWxsLiBcclxuICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgY29uZmlndXJlSHR0cENhbGwgPSAobWV0aG9kOiBIdHRwTWV0aG9kLCB1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVJlcXVlc3RDb25maWcgPT4ge1xyXG5cclxuICAgICAgICAgICAgaWYgKCF1cmwgfHwgbWV0aG9kID09PSBudWxsIHx8IG1ldGhvZCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ1VSTCAmIE1FVEhPRCBwYXJhbWV0ZXJzIGFyZSBuZWNlc3NhcnkgZm9yIGh0dHBXcmFwcGVyIGNhbGxzLiBBYm9ydGluZy4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvL0luaXQgY29uZmlnIGV2ZW4gaWYgbm90IHByb3ZpZGVkXHJcbiAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhcmQgY2FzdCBpcyBub3Qgc2FmZSwgd2UgbWF5IGZvcmdldCB0byBzZXQgdXJsICYgbWV0aG9kIHBhcmFtZXRlcnMuIFRPRklYLlxyXG4gICAgICAgICAgICAvLyBhdXRvbWF0aWNhbGx5IGdldCBhbGwgbm9uLWZpbHRlcmVkIHBhcmFtZXRlcnMgJiBrZWVwIHRoZW0gZm9yIHRoaXMgbmV3IG9iamVjdC5cclxuICAgICAgICAgICAgdmFyIGNvbmZpZ0Z1bGwgPSA8bmcuSVJlcXVlc3RDb25maWc+Y29uZmlnO1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogc3VwcG9ydCBtYXBwaW5nIGJldHdlZW4gdXBsb2FkICYgcG9zdCBoZXJlID9cclxuICAgICAgICAgICAgY29uZmlnRnVsbC5tZXRob2QgPSBIdHRwTWV0aG9kW21ldGhvZF07XHJcblxyXG4gICAgICAgICAgICBpZiAoY29uZmlnLmFwaUVuZHBvaW50ICYmICghdGhpcy5hcGlDb25maWcgfHxcclxuICAgICAgICAgICAgICAgICF0aGlzLmFwaUNvbmZpZy5qd3RUb2tlbiB8fFxyXG4gICAgICAgICAgICAgICAgIXRoaXMuYXBpQ29uZmlnLmN1cnJlbnRVc2VyUm9sZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihgW0ludGVybmFsRXJyb3JdIFske2NvbmZpZ0Z1bGwubWV0aG9kfSAvICR7dXJsfV0gLSBjb3JlQXBpIGNhbGwgaW50ZW5kZWQgd2l0aG91dCBuZWNlc3NhcnkgY2FwaSBjcmVkZW50aWFscy4gQWJvcnRpbmcuYCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uZmlnRnVsbC5oZWFkZXJzID0gY29uZmlnLmhlYWRlcnMgfHwge307XHJcblxyXG4gICAgICAgICAgICBpZiAoIWNvbmZpZy5hcGlFbmRwb2ludCkgeyAvLyBpZiBub3Qgc2V0LCBldmFsdWF0ZXMgdG8gZmFsc2VcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwudXJsID0gdGhpcy5idWlsZFVybEZyb21Db250ZXh0KHVybCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBIDogY29yZSBhcGkgZW5kcG9pbnQgJ2FwaS8nIGhhcmRjb2RlZCwgdG8gcHV0IGluIGNvbmZpZ0Z1bGwgISBzaG91bGQgbm90IGtub3cgdGhhdCBoZXJlLlxyXG4gICAgICAgICAgICAgICAgY29uZmlnRnVsbC51cmwgPSB0aGlzLmFwaUNvbmZpZy5jb3JlQXBpVXJsICsgJ2FwaS8nICsgdXJsO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFwaUNvbmZpZy5qd3RUb2tlbiAmJiB0aGlzLmFwaUNvbmZpZy5jdXJyZW50VXNlclJvbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYXJkIGNvZGVkIGhlYWRlcnMsIG5vdCBnb29kLCB0byBpbmplY3RcclxuICAgICAgICAgICAgICAgICAgICBjb25maWdGdWxsLmhlYWRlcnNbJ09BLVVzZXJSb2xlJ10gPSB0aGlzLmFwaUNvbmZpZy5jdXJyZW50VXNlclJvbGU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnRnVsbC5oZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSAnQmVhcmVyICcgKyB0aGlzLmFwaUNvbmZpZy5qd3RUb2tlbjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFjb25maWcuZGlzYWJsZVhtbEh0dHBSZXF1ZXN0SGVhZGVyKSAvLyBpZiBub3Qgc2V0LCBldmFsdWF0ZXMgdG8gZmFsc2VcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwuaGVhZGVyc1snWC1SZXF1ZXN0ZWQtV2l0aCddID0gJ1hNTEh0dHBSZXF1ZXN0JztcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IE9FIHNwZWNpZmljIGNvZGUsIHRvIHJlbW92ZVxyXG4gICAgICAgICAgICBpZiAoKDxhbnk+dGhpcy4kd2luZG93KS5wcmV2ZW50QmxvY2tVSSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyBNR0EgOiB0eXBlIGNhc3RpbmcsIGlzIGl0IG9rYXkgb3Igbm90ID8gYmV0dGVyIGFwcHJvYWNoID9cclxuICAgICAgICAgICAgICAgICg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZ0Z1bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTdWNjZXNzIGhhbmRsZXJcclxuICAgICAgICAgKiBAcmV0dXJucyB7fSBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIHN1Y2Nlc3MgPSA8VD4oaHR0cFByb21pc2U6IG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPFQ+KTogVCB8IG5nLklQcm9taXNlPGFueT4gPT4ge1xyXG5cclxuICAgICAgICAgICAgLy8gSlMgdHJpY2sgOiBjYXB0dXJlIHVybCB2YXJpYWJsZSBpbnNpZGUgY2xvc3VyZSBzY29wZSB0byBzdG9yZSBpdCBmb3IgY2FsbGJhY2sgd2hpY2ggY2Fubm90IGJlIGNhbGxlZCB3aXRoIDIgYXJndW1lbnRzXHJcbiAgICAgICAgICAgIGlmICghaHR0cFByb21pc2UpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihgW0hUVFAgJHtodHRwUHJvbWlzZS5jb25maWcubWV0aG9kfV0gWyR7aHR0cFByb21pc2UuY29uZmlnLnVybH1dIFVuZXhwZWN0ZWQgJGh0dHAgZXJyb3IsIG5vIHJldHVybiBwcm9taXNlIG9iamVjdCBjb3VsZCBiZSBmb3VuZC5gKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudG9hc3Rlci5lcnJvcignVW5leHBlY3RlZCBiZWhhdmlvcicsICdQbGVhc2UgY29udGFjdCB5b3VyIGxvY2FsIHN1cHBvcnQgdGVhbS4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRxLnJlamVjdChodHRwUHJvbWlzZSk7IC8vIFJlamVjdCBwcm9taXNlXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhbmRsZSB3aGVuIEFQSSBpcyBmaXhlZC4gU2VlIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTE3NDY4OTQvd2hhdC1pcy10aGUtcHJvcGVyLXJlc3QtcmVzcG9uc2UtY29kZS1mb3ItYS12YWxpZC1yZXF1ZXN0LWJ1dC1hbi1lbXB0eS1kYXRhXHJcbiAgICAgICAgICAgIC8vaWYgKChwcm9taXNlQ2FsbGJhY2suZGF0YSA9PT0gbnVsbCB8fCBwcm9taXNlQ2FsbGJhY2suZGF0YSA9PT0gdW5kZWZpbmVkKSAmJiBwcm9taXNlQ2FsbGJhY2suc3RhdHVzICE9PSAyMDQpIHtcclxuICAgICAgICAgICAgLy8gICAgdGhpcy4kbG9nLmVycm9yKCdVbmV4cGVjdGVkIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciwgZXhwZWN0ZWQgcmVzcG9uc2UgZGF0YSBidXQgbm9uZSBmb3VuZC4nKTtcclxuICAgICAgICAgICAgLy8gICAgdGhpcy50b2FzdGVyLndhcm5pbmcoJ1VuZXhwZWN0ZWQgcmVzcG9uc2UnLCAnUGxlYXNlIGNvbnRhY3QgeW91ciBsb2NhbCBzdXBwb3J0IHRlYW0uJyk7XHJcbiAgICAgICAgICAgIC8vICAgIHJldHVybiB0aGlzLiRxLnJlamVjdChwcm9taXNlQ2FsbGJhY2spOyAvLyBSZWplY3QgcHJvbWlzZSBpZiBub3Qgd2VsbC1mb3JtZWQgZGF0YVxyXG4gICAgICAgICAgICAvL31cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogc2FtZSBiZWhhdmlvciBhbHNvIG9uIGEgR0VUIHJlcXVlc3QgPyBpZiByZXF1ZXN0IGlzIEdFVCBhbmQgcmVzcG9uc2UgaXMgMjAwIHdpdGggbm8gZGF0YSwgcmV0dXJuIGVycm9yID8gKHBhc3MgaW4gcGFyYW1ldGVyIHJlcXVlc3QgY29udGV4dCB0byBsb2cgdGhpcyBlcnJvcikuXHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBOiBnZXQgZnVsbCB1cmwgb2YgcmVxdWVzdFxyXG4gICAgICAgICAgICB0aGlzLiRsb2cuZGVidWcoYFtIVFRQICR7aHR0cFByb21pc2UuY29uZmlnLm1ldGhvZH1dIFske2h0dHBQcm9taXNlLmNvbmZpZy51cmx9XWAsIGh0dHBQcm9taXNlKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBodHRwUHJvbWlzZS5kYXRhOyAvLyByZXR1cm4gb25seSB0aGUgZGF0YSBleHBlY3RlZCBmb3IgY2FsbGVyXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBFcnJvciBoYW5kbGVyXHJcbiAgICAgICAgICogQHBhcmFtIGh0dHBQcm9taXNlIFxyXG4gICAgICAgICAqIEByZXR1cm5zIHt9IFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgZXJyb3IgPSAoaHR0cFByb21pc2U6IG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPGFueT4pOiBuZy5JUHJvbWlzZTxuZy5JSHR0cFByb21pc2VDYWxsYmFja0FyZzxhbnk+PiA9PiB7IC8vIGRvIHNvbWV0aGluZyBvbiBlcnJvclxyXG5cclxuICAgICAgICAgICAgLy8gV2Ugc3VwcG9zZSBpbiBjYXNlIG9mIG5vIHJlc3BvbnNlIHRoYXQgdGhlIHNydiBkaWRuJ3Qgc2VuZCBhbnkgcmVzcG9uc2UuXHJcbiAgICAgICAgICAgIC8vIFRPRE8gTUdBOiBtYXkgYWxzbyBiZSBhIGZhdWx0IGluIGludGVybmFsICRodHRwIC8gYWpheCBjbGllbnQgc2lkZSBsaWIsIHRvIGRpc3Rpbmd1aXNoLlxyXG4gICAgICAgICAgICBpZiAoIWh0dHBQcm9taXNlIHx8ICFodHRwUHJvbWlzZS5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBodHRwUHJvbWlzZS5kYXRhID0gJ1NlcnZlciBub3QgcmVzcG9uZGluZyc7XHJcbiAgICAgICAgICAgICAgICBodHRwUHJvbWlzZS5zdGF0dXMgPSA1MDM7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBjb250ZW50VHlwZSA9IGh0dHBQcm9taXNlLmhlYWRlcnMoJ0NvbnRlbnQtVHlwZScpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbnRlbnRUeXBlICYmIChjb250ZW50VHlwZS5pbmRleE9mKCdhcHBsaWNhdGlvbi9qc29uJykgPiAtMSB8fCBjb250ZW50VHlwZS5pbmRleE9mKCd0ZXh0L3BsYWluJykgPiAtMSkpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZTtcclxuXHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYW5kbGUgZXJyb3IgaGFuZGxpbmcgbW9yZSBnZW5lcmljYWxseSBiYXNlZCBvbiBpbnB1dCBlcnJvciBtZXNzYWdlIGNvbnRyYWN0IGluc3RlYWQgb2YgZXhwZWN0aW5nIHNwZWNpZmljIGVycm9yIHN0cmN0dXJlLlxyXG5cclxuICAgICAgICAgICAgICAgIC8vaWYgKHJlc3BvbnNlLmRhdGEuTW9kZWxTdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgLy9UT0RPIE1HQSA6IGhhbmRsZSB0aGlzIHdoZW4gd2VsbCBmb3JtYXR0ZWQgc2VydmVyLXNpZGVcclxuICAgICAgICAgICAgICAgIC8vfSBlbHNlXHJcbiAgICAgICAgICAgICAgICBpZiAoaHR0cFByb21pc2UuZGF0YS5NZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGh0dHBQcm9taXNlLmRhdGEuTWVzc2FnZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGh0dHBQcm9taXNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFuZGxlIG1vcmUgcmVzcG9uc2UgY29kZXMgZ3JhY2VmdWxseS5cclxuICAgICAgICAgICAgICAgIGlmIChodHRwUHJvbWlzZS5zdGF0dXMgPT09IDQwNCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudG9hc3Rlci53YXJuaW5nKCdOb3QgRm91bmQnLCBtZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b2FzdGVyLmVycm9yKCdTZXJ2ZXIgcmVzcG9uc2UgZXJyb3InLCBtZXNzYWdlICsgJ1xcbiBTdGF0dXM6ICcgKyBodHRwUHJvbWlzZS5zdGF0dXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50b2FzdGVyLmVycm9yKCdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InLCAnU3RhdHVzOiAnICsgaHR0cFByb21pc2Uuc3RhdHVzKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogZ2V0IGZ1bGwgdXJsIG9mIHJlcXVlc3RcclxuICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKGBbSFRUUCAke2h0dHBQcm9taXNlLmNvbmZpZy5tZXRob2R9XSBbJHtodHRwUHJvbWlzZS5jb25maWcudXJsfV1gLCBodHRwUHJvbWlzZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBXZSBkb24ndCByZWNvdmVyIGZyb20gZXJyb3IsIHNvIHdlIHByb3BhZ2F0ZSBpdCA6IGJlbG93IGhhbmRsZXJzIGhhdmUgdGhlIGNob2ljZSBvZiByZWFkaW5nIHRoZSBlcnJvciB3aXRoIGFuIGVycm9yIGhhbmRsZXIgb3Igbm90LiBTZWUgJHEgcHJvbWlzZXMgYmVoYXZpb3IgaGVyZSA6IGh0dHBzOi8vZ2l0aHViLmNvbS9rcmlza293YWwvcVxyXG4gICAgICAgICAgICAvLyBUaGlzIGJlaGF2aW9yIGlzIGRlc2lyZWQgc28gdGhhdCB3ZSBzaG93IGVycm9yIGluc2lkZSBzcGVjaWZpYyBzZXJ2ZXIgY29tbXVuaWNhdGlvbiBtb2RhbHMgYXQgc3BlY2lmaWMgcGxhY2VzIGluIHRoZSBhcHAsIG90aGVyd2lzZSBzaG93IGEgZ2xvYmFsIGFsZXJ0IG1lc3NhZ2UsIG9yIGV2ZW4gZG8gbm90IHNob3cgYW55dGhpbmcgaWYgbm90IG5lY2Vzc2FyeSAoZG8gbm90IGFkIGFuIGVycm9yIGhhbmRsZXIgaW4gYmVsb3cgaGFuZGxlcnMgb2YgdGhpcyBwcm9taXNlKS5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHEucmVqZWN0KGh0dHBQcm9taXNlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEZ1bmN0aW9uIGNhbGxlZCBhdCB0aGUgZW5kIG9mIGFuIGFqYXggY2FsbCwgcmVnYXJkbGVzcyBvZiBpdCdzIHN1Y2Nlc3Mgb3IgZmFpbHVyZS5cclxuICAgICAgICAgKiBAcGFyYW0gcmVzcG9uc2VcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGZpbmFsbHkgPSAoKTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IE9FLXNwZWNpZmljIGNvZGVcclxuICAgICAgICAgICAgaWYgKCg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgIT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8gTUdBIDogdHlwZSBjYXN0aW5nLCBpcyBpdCBva2F5IG9yIG5vdCA/IGJldHRlciBhcHByb2FjaCA/XHJcbiAgICAgICAgICAgICAgICAoPGFueT50aGlzLiR3aW5kb3cpLnByZXZlbnRCbG9ja1VJID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBUT0RPIE1HQSA6IHVzaW5nIG1ldGhvZCBmcm9tIExheW91dC5qcyA6IHRvIGRvY3VtZW50IHRvIG5vdCBoYW5kbGUgZHVwbGljYXRlIGNvZGUgISFcclxuICAgICAgICAvL1RPRE8gTUdBIDogbWFrZSBpdCBjYXBhYmxlIG9mIGhhbmRsaW5nIGZ1bGwgVVJMcyBvdXRzaWRlIG9mIE9FIDogZG8gbm90IHVzZSA/PyBob3cgdG8gP1xyXG4gICAgICAgIHByaXZhdGUgZ2V0VXJsUGF0aChhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXIpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXNlVXJsUmVnZXggPSAvKFxcL1xcdytcXC9cXChTXFwoXFx3K1xcKVxcKSlcXC9cXHcrLztcclxuICAgICAgICAgICAgdmFyIHVybCA9IHRoaXMuJHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZTtcclxuICAgICAgICAgICAgdmFyIGJhc2VVcmxNYXRjaGVzID0gYmFzZVVybFJlZ2V4LmV4ZWModXJsKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChiYXNlVXJsTWF0Y2hlcy5sZW5ndGggJiYgYmFzZVVybE1hdGNoZXMubGVuZ3RoID09PSAyKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGJhc2VVcmxXaXRoQ29udHJvbGxlck5hbWUgPSBiYXNlVXJsTWF0Y2hlc1swXTtcclxuICAgICAgICAgICAgICAgIHZhciBiYXNlVXJsID0gYmFzZVVybE1hdGNoZXNbMV07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBiYXNlVXJsV2l0aENvbnRyb2xsZXJOYW1lO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmFzZVVybDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuICcnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQTogT00tc3BlY2lmaWMgQVNQIE1WQyBjb2RlLCBub3QgdXNlZCBBVE0sIHRvIHJlbW92ZVxyXG4gICAgICAgIHByaXZhdGUgZ2V0Q3VycmVudFNlc3Npb25JRCgpIHtcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBtYWdpYyByZWdleHAgdG8gZmV0Y2ggU2Vzc2lvbklEIGluIFVSTCwgdG8gc3RvcmUgZWxzZXdoZXJlICFcclxuICAgICAgICAgICAgdmFyIHNlc3Npb25SZWdleCA9IC9odHRwczpcXC9cXC9bXFx3Ll0rXFwvW1xcdy5dK1xcLyhcXChTXFwoXFx3K1xcKVxcKSlcXC8uKi87XHJcbiAgICAgICAgICAgIC8vdmFyIHNlc3Npb25SZWdleCA9IC9odHRwczpcXC9cXC9bXFx3Ll0rXFwvT3JkZXJFbnRyeVxcLyhcXChTXFwoXFx3K1xcKVxcKSlcXC8uKi87XHJcblxyXG4gICAgICAgICAgICAvLyBUT0RPIE1HQSA6IHVwZGF0ZSByZWdleHAgdG8gdGhlIG9uZSBiZWxvd1xyXG4gICAgICAgICAgICAvL3ZhciBiYXNlVXJsUmVnZXggPSAvKGh0dHBzOlxcL1xcL1tcXHcuLV0rXFwvW1xcdy4tXStcXC9cXChTXFwoXFx3K1xcKVxcKVxcLylcXHcrLztcclxuXHJcblxyXG4gICAgICAgICAgICB2YXIgcGF0aCA9IHRoaXMuJGxvY2F0aW9uLmFic1VybCgpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHJlZ2V4cEFycmF5ID0gc2Vzc2lvblJlZ2V4LmV4ZWMocGF0aCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXJlZ2V4cEFycmF5KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJVbmFibGUgdG8gcmVjb2duaXplZCBzZWFyY2hlZCBwYXR0ZXJuIGluIGN1cnJlbnQgdXJsIGxvY2F0aW9uIHRvIHJldHJpZXZlIHNlc3Npb25JRC5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVnZXhwQXJyYXkubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJVbmFibGUgdG8gZmluZCBzZXNzaW9uSUQgaW4gc2VhcmNoZWQgcGF0dGVybiBpbiBjdXJyZW50IHVybC5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVnZXhwQXJyYXkubGVuZ3RoID4gMikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKFwiVG9vIG1hbnkgbWF0Y2hlcyBmb3VuZCBmb3IgdGhlIHNlc3Npb25JRCBzZWFyY2ggaW4gdGhlIGN1cnJlbnQgdXJsLlwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gcmVnZXhwQXJyYXlbMV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgnbmcuaHR0cFdyYXBwZXInLCBbJ3RvYXN0ZXInLCAnbmdBbmltYXRlJywgJ25nRmlsZVVwbG9hZCddKVxyXG4gICAgICAgIC8vIGRvbmUgaW4gY29uZmlndXJlSHR0cENhbGwgbWV0aG9kLlxyXG4gICAgICAgIC8vLmNvbmZpZyhbJyRodHRwUHJvdmlkZXInLCAoJGh0dHBQcm92aWRlcjogbmcuSUh0dHBQcm92aWRlcikgPT4ge1xyXG4gICAgICAgIC8vICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtUmVxdWVzdGVkLVdpdGgnXSA9ICdYTUxIdHRwUmVxdWVzdCc7XHJcbiAgICAgICAgLy99XSlcclxuICAgICAgICAuc2VydmljZSgnaHR0cFdyYXBwZXJTZXJ2aWNlJywgSHR0cFdyYXBwZXJTZXJ2aWNlKTtcclxufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
