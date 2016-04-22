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
                            _this.$log.error("URL & METHOD parameters are necessary for httpWrapper calls. Aborting.");
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
                            _this.$log.error('[InternalError] coreApi call intended without necessary capi credentials. Aborting.');
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
                     * TODO MGA : what is url used for ???
                     * @param url
                     * @returns {}
                     */
                    this.success = function (url) {
                        // JS trick : capture url variable inside closure scope to store it for callback which cannot be called with 2 arguments
                        return function (promiseCallback) {
                            if (!promiseCallback || !promiseCallback.data) {
                                //TODO MGA: think about this ... May not be accurate ? or may not be an error if return type is null in case no data found
                                //response.status = 503;
                                _this.$log.error(promiseCallback);
                                _this.toaster.warning('Unexpected response from the server', 'Call successfull, but no data found');
                                //TODO MGA : find out how to handle that as to expectd return type ?
                                return _this.$q.reject(promiseCallback); // Reject promise if not well-formed data
                            }
                            _this.$log.debug(promiseCallback);
                            return promiseCallback.data; // return only the data expected for caller
                        };
                    };
                    /**
                     * Error handler
                     * @param response
                     * @returns {}
                     */
                    this.error = function (response) {
                        if (!response || !response.data) {
                            response.data = 'Server not responding';
                            response.status = 503;
                        }
                        var message = String(response.data) + '\n Status: ' + response.status.toString();
                        _this.toaster.error('Server response error', message);
                        _this.$log.error(response);
                        // We don't recover from error, so we propagate it : below handlers have the choice of reading the error with an error handler or not. See $q promises behavior here : https://github.com/kriskowal/q
                        // This behavior is desired so that we show error inside specific server communication modals at specific places in the app, otherwise show a global alert message, or even do not show anything if not necessary (do not ad an error handler in below handlers of this promise).
                        return _this.$q.reject(response);
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
                        return this.initPromise.then(function () {
                            //TODO MGA : not safe hard cast
                            //TODO MGA : behavior duplication with this.ajax, not DRY, to improve
                            return _this.Upload.upload(_this.configureHttpCall(HttpMethod.POST, url, config))
                                .then(_this.success(url), _this.error, config.uploadProgress) //TODO MGA : uploadProgress callback ok ?
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
                    return this.initPromise.then(function () {
                        return _this.$http(_this.configureHttpCall(method, url, config))
                            .then(_this.success(url), _this.error)
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHAtd3JhcHBlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJDQUEyQztBQUMzQyxJQUFPLE9BQU8sQ0E0V2I7QUE1V0QsV0FBTyxPQUFPO0lBQUMsSUFBQSxJQUFJLENBNFdsQjtJQTVXYyxXQUFBLElBQUk7UUFBQyxJQUFBLFFBQVEsQ0E0VzNCO1FBNVdtQixXQUFBLFFBQVEsRUFBQyxDQUFDO1lBZTFCLElBQUssVUFBcUM7WUFBMUMsV0FBSyxVQUFVO2dCQUFHLHlDQUFHLENBQUE7Z0JBQUUsMkNBQUksQ0FBQTtnQkFBRSx5Q0FBRyxDQUFBO2dCQUFFLCtDQUFNLENBQUE7WUFBQyxDQUFDLEVBQXJDLFVBQVUsS0FBVixVQUFVLFFBQTJCO1lBQUEsQ0FBQztZQTJCM0M7O2VBRUc7WUFDSDtnQkFPSSxZQUFZO2dCQUVaLGNBQWM7Z0JBRWQsZUFBZTtnQkFDZiw0QkFDWSxLQUFzQixFQUN0QixPQUEwQixFQUMxQixJQUFvQixFQUNwQixFQUFnQixFQUNoQixTQUE4QixFQUM5QixNQUEyQyxFQUMzQyxPQUFrQztvQkFuQmxELGlCQXVUQztvQkExU2UsVUFBSyxHQUFMLEtBQUssQ0FBaUI7b0JBQ3RCLFlBQU8sR0FBUCxPQUFPLENBQW1CO29CQUMxQixTQUFJLEdBQUosSUFBSSxDQUFnQjtvQkFDcEIsT0FBRSxHQUFGLEVBQUUsQ0FBYztvQkFDaEIsY0FBUyxHQUFULFNBQVMsQ0FBcUI7b0JBQzlCLFdBQU0sR0FBTixNQUFNLENBQXFDO29CQUMzQyxZQUFPLEdBQVAsT0FBTyxDQUEyQjtvQkFxSDlDOzs7Ozs7OztzQkFRRTtvQkFDTSxzQkFBaUIsR0FBRyxVQUFDLE1BQWtCLEVBQUUsR0FBVyxFQUFFLE1BQTJCO3dCQUVyRixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLE1BQU0sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDOzRCQUNsRCxLQUFJLENBQUMsSUFBSSxDQUFDLEtBQUss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Qzt3QkFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMscUVBQXFFLENBQUMsQ0FBQzt3QkFDdkYsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDZCxDQUFDO29CQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLENBQUM7Z0JBR0wseUJBQUM7WUFBRCxDQXZUQSxBQXVUQyxJQUFBO1lBdlRZLDJCQUFrQixxQkF1VDlCLENBQUE7WUFFRCxPQUFPLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQztpQkFLckUsT0FBTyxDQUFDLG9CQUFvQixFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDM0QsQ0FBQyxFQTVXbUIsUUFBUSxHQUFSLGFBQVEsS0FBUixhQUFRLFFBNFczQjtJQUFELENBQUMsRUE1V2MsSUFBSSxHQUFKLFlBQUksS0FBSixZQUFJLFFBNFdsQjtBQUFELENBQUMsRUE1V00sT0FBTyxLQUFQLE9BQU8sUUE0V2IiLCJmaWxlIjoiaHR0cC13cmFwcGVyLnNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy88cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBpbmdzL3RzZC5kLnRzXCIgLz5cclxubW9kdWxlIGJsdWVza3kuY29yZS5zZXJ2aWNlcyB7XHJcblxyXG4gICAgaW1wb3J0IEFwaUNvbmZpZyA9IGJsdWVza3kuY29yZS5tb2RlbHMuQXBpQ29uZmlnO1xyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUh0dHBXcmFwcGVyQ29uZmlnIGV4dGVuZHMgbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogbWFpbiBBUEkgZW5kcG9pbnQgdG8gdXNlIGFzIGRlZmF1bHQgb25lIGlmIHVybCBpcyBub3QgZnVsbC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBhcGlFbmRwb2ludD86IGJvb2xlYW47XHJcbiAgICAgICAgZmlsZT86IEZpbGUsXHJcbiAgICAgICAgdXBsb2FkSW5CYXNlNjRKc29uPzogYm9vbGVhbjtcclxuICAgICAgICB1cGxvYWRQcm9ncmVzcz86ICgpID0+IGFueTtcclxuICAgICAgICBkaXNhYmxlWG1sSHR0cFJlcXVlc3RIZWFkZXI/OiBib29sZWFuO1xyXG4gICAgfVxyXG5cclxuICAgIGVudW0gSHR0cE1ldGhvZCB7IEdFVCwgUE9TVCwgUFVULCBERUxFVEUgfTtcclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElIdHRwV3JhcHBlclNlcnZpY2Uge1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBBbGwgc3J2LXNpZGUgY29uZmlndXJhdGlvbiBvZiBtYWluIEFQSSBwcm92aWRlZCBieSB0aGUgZG9tYWluIGZyb20gd2hpY2ggdGhpcyBzY3JpcHQgd2FzIGxvYWRlZCwgQCB0aGUgdXJsICdDb3JlQXBpQXV0aC9HZXRDb3JlQXBpQ29uZmlnJy5cclxuICAgICAgICAgKiBUT0RPIE1HQSBmaXggaGFyZCBjb2RlZCBwYXRoLlxyXG4gICAgICAgICAqIFRoaXMgY29uZmlndXJhdGlvbiBkYXRhIGlzIGxvYWRlZCB1cG9uIGluaXRpYWxpemF0aW9uIG9mIHRoaXMgc2VydmljZSAodG8gYmUgdXNlZCBhcyBhIHNpbmdsZXRvbiBpbiB0aGUgYXBwKS4gQWxsIG90aGVyIHdlYiBjYWxscyBhcmUgYmxvY2tlZCBhcyBsb25nIGFzIHRoaXMgb25lIGlzIG5vdCBmaW5pc2hlZC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBhcGlDb25maWc6IEFwaUNvbmZpZztcclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQTogZm9yIGZvbGxvd2luZyBtZXRob2RzLCByZXR1cm4gSVByb21pc2UgYW5kIGFzc3VtZSBhYnN0cmFjdGlvbiBvciBsZXQgYmVsb3cgc2VydmljZXMgaGFuZGxlIElIdHRwUHJvbWlzZXMgP1xyXG5cclxuICAgICAgICBnZXQ8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBkZWxldGU8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBwb3N0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBwdXQ8VD4odXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIC8vVE9ETyBNR0EgaW1wcm92ZSB0eXBpbmcgd2l0aCBhbmd1bGFyLXVwbG9hZCB0c2QgZXRjXHJcbiAgICAgICAgdXBsb2FkPFQ+KHVybDogc3RyaW5nLCBmaWxlOiBGaWxlLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuICAgICAgICBcclxuICAgICAgICBidWlsZFVybEZyb21Db250ZXh0KHVybElucHV0OiBzdHJpbmcpOiBzdHJpbmc7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUT0RPIE1HQSA6IHRoaXMgbWF5IG5vdCBuZWVkIHRvIGJlIGEgZGVkaWNhdGVkIHNlcnZpY2UsIGl0IGNhbiBhbHNvIGJlIGluY29ycG9yYXRlZCBpbnRvIHRoZSBodHRwSW50ZXJjZXB0b3IuIERlY2lkZSBiZXN0IGFwcHJvYWNoIGRlcGVuZGluZyBvbiBwbGFubmVkIHVzZS5cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEh0dHBXcmFwcGVyU2VydmljZSBpbXBsZW1lbnRzIElIdHRwV3JhcHBlclNlcnZpY2Uge1xyXG5cclxuICAgICAgICAvLyNyZWdpb24gcHJvcGVydGllc1xyXG5cclxuICAgICAgICBwcml2YXRlIGluaXRQcm9taXNlOiBuZy5JUHJvbWlzZTxhbnk+O1xyXG4gICAgICAgIHB1YmxpYyBhcGlDb25maWc6IEFwaUNvbmZpZztcclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBjdG9yXHJcblxyXG4gICAgICAgIC8qIEBuZ0luamVjdCAqL1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICBwcml2YXRlICRodHRwOiBuZy5JSHR0cFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGxvZzogbmcuSUxvZ1NlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkbG9jYXRpb246IG5nLklMb2NhdGlvblNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgVXBsb2FkOiBuZy5hbmd1bGFyRmlsZVVwbG9hZC5JVXBsb2FkU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSB0b2FzdGVyOiBuZ3RvYXN0ZXIuSVRvYXN0ZXJTZXJ2aWNlXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIC8vIGluaXQgY29yZSBhcGkgY29uZmlnIGRhdGEgb24gY3RvclxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogaGFyZCBjb2RlZCBwYXRoIGZvciBDb3JlckFwaUF1dGhDdHJsIHRvIGluamVjdFxyXG4gICAgICAgICAgICB0aGlzLmluaXRQcm9taXNlID0gdGhpcy4kaHR0cC5nZXQ8QXBpQ29uZmlnPih0aGlzLmJ1aWxkVXJsRnJvbUNvbnRleHQoJ0NvcmVBcGlBdXRoL0dldENvcmVBcGlDb25maWcnKSlcclxuICAgICAgICAgICAgICAgIC5zdWNjZXNzKChjb3JlQXBpQ29uZmlnKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcGlDb25maWcgPSBjb3JlQXBpQ29uZmlnO1xyXG4gICAgICAgICAgICAgICAgfSkuZXJyb3IoKGVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdVbmFibGUgdG8gcmV0cmlldmUgQVBJIGNvbmZpZy4gQWJvcnRpbmcgaHR0cFdyYXBwZXJTZXJ2aWNlIGluaXRpYWxpemF0aW9uLicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIHB1YmxpYyBtZXRob2RzXHJcblxyXG4gICAgICAgIGdldDxUPih1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuR0VULCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkZWxldGU8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLkRFTEVURSwgdXJsLCBjb25maWcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcG9zdDxUPih1cmw6IHN0cmluZywgZGF0YTogYW55LCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcclxuICAgICAgICAgICAgY29uZmlnLmRhdGEgPSBkYXRhIHx8IGNvbmZpZy5kYXRhOztcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLlBPU1QsIHVybCwgY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1dDxUPih1cmw6IHN0cmluZywgZGF0YTogYW55LCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcclxuICAgICAgICAgICAgY29uZmlnLmRhdGEgPSBkYXRhIHx8IGNvbmZpZy5kYXRhO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuUFVULCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGxvYWQ8VD4odXJsOiBzdHJpbmcsIGZpbGU6IEZpbGUsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuXHJcbiAgICAgICAgICAgIGlmICghZmlsZSAmJiAoIWNvbmZpZyB8fCAhY29uZmlnLmZpbGUpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ0Nhbm5vdCBzdGFydCB1cGxvYWQgd2l0aCBudWxsIHtmaWxlfSBwYXJhbWV0ZXIuJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xyXG4gICAgICAgICAgICBjb25maWcuZmlsZSA9IGZpbGUgfHwgY29uZmlnLmZpbGU7IC8vVE9ETyBNR0EgOiBkbyBub3QgZXhwb3NlIGZpbGUgaW4gSUh0dHBXcmFwcGVyQ29uZmlnID9cclxuICAgICAgICAgICAgY29uZmlnLmRhdGEgPSBjb25maWcuZGF0YSB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb25maWcudXBsb2FkSW5CYXNlNjRKc29uKSB7XHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBtYWtlIHN1cmUgdGhpcyBkZWxheXMgbmV4dCBjYWxsIGFuZCB1cGxvYWQgaXMgbm90IGRvbmUgYmVmb3JlIGJhc2U2NCBlbmNvZGluZyBpcyBmaW5pc2hlZCwgZXZlbiBpZiBwcm9taXNlIGlzIGFscmVhZHkgcmVzb2x2ZWQgPz8/XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5VcGxvYWQuYmFzZTY0RGF0YVVybChmaWxlKS50aGVuKChmaWxlQmFzZTY0VXJsKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFyZC1jb2RlZCBrZXkgdG8gZmV0Y2ggYmFzZTY0IGVuY29kaW5nLCB0byBwYXJhbWV0cml6ZSB3aXRoIHNlcnZlci1zaWRlICFcclxuICAgICAgICAgICAgICAgICAgICBjb25maWcuZGF0YS5maWxlQmFzZTY0VXJsID0gZmlsZUJhc2U2NFVybDtcclxuICAgICAgICAgICAgICAgICAgICAvL25vcm1hbCBwb3N0IGluIGNhc2Ugb2YgYmFzZTY0LWVuY29kZWQgZGF0YVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5QT1NULCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZy5kYXRhLmZpbGVGb3JtRGF0YU5hbWUgPSAnZmlsZSc7IC8vIGZpbGUgZm9ybURhdGEgbmFtZSAoJ0NvbnRlbnQtRGlzcG9zaXRpb24nKSwgc2VydmVyIHNpZGUgcmVxdWVzdCBmb3JtIG5hbWVcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbml0UHJvbWlzZS50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBIDogbm90IHNhZmUgaGFyZCBjYXN0XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGJlaGF2aW9yIGR1cGxpY2F0aW9uIHdpdGggdGhpcy5hamF4LCBub3QgRFJZLCB0byBpbXByb3ZlXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuVXBsb2FkLnVwbG9hZDxUPig8bmcuYW5ndWxhckZpbGVVcGxvYWQuSUZpbGVVcGxvYWRDb25maWdGaWxlPnRoaXMuY29uZmlndXJlSHR0cENhbGwoSHR0cE1ldGhvZC5QT1NULCB1cmwsIGNvbmZpZykpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW48VD4odGhpcy5zdWNjZXNzPFQ+KHVybCksIHRoaXMuZXJyb3IsIGNvbmZpZy51cGxvYWRQcm9ncmVzcykgLy9UT0RPIE1HQSA6IHVwbG9hZFByb2dyZXNzIGNhbGxiYWNrIG9rID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmluYWxseSh0aGlzLmZpbmFsbHkpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vVE9ETyBNR0EgOiBtZXRob2QgdG9vIHNwZWNpZmljIHRvIE9NIGFwcHMgY29udGV4dCwgbWF5IG5vdCB3b3JrIG91dHNpZGUgb2YgaXQsIHRvIGFkYXB0IGZvciBwdWJsaWMgdXNlID9cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBUcmllcyB0byBwYXJzZSB0aGUgaW5wdXQgdXJsIDpcclxuICAgICAgICAgKiBJZiBpdCBzZWVtcyB0byBiZSBhIGZ1bGwgVVJMLCB0aGVuIHJldHVybiBhcyBpcyAoY29uc2lkZXJzIGl0IGV4dGVybmFsIFVybCkgXHJcbiAgICAgICAgICogT3RoZXJ3aXNlLCB0cmllcyB0byBmaW5kIHRoZSBiYXNlIFVSTCBvZiB0aGUgY3VycmVudCBCbHVlU2t5IGFwcCB3aXRoIG9yIHdpdGhvdXQgdGhlIGluY2x1ZGVkIENvbnRyb2xsZXIgYW5kIHJldHVybnMgdGhlIGZ1bGwgVXJsIFxyXG4gICAgICAgICAqIEBwYXJhbSB1cmxJbnB1dCA6IFRPRE8gTUdBOiBkb2N1bWVudCBkaWZmZXJlbnQga2luZCBvZiB1cmxzIHRoYXQgdGhpcyBtZXRob2QgY2FuIHRha2UgYXMgaW5wdXQgKGZ1bGwsIHBhcnRpYWwgZXRjKVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBidWlsZFVybEZyb21Db250ZXh0KHVybElucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG5cclxuICAgICAgICAgICAgLy8gMSAtIFVybCBzdGFydHMgd2l0aCBodHRwOi8vIG9yIGh0dHBzOi8vID0+IHJldHVybiBhcyBpcy5cclxuICAgICAgICAgICAgaWYgKHVybElucHV0LnNsaWNlKDAsICdodHRwOi8vJy5sZW5ndGgpID09PSAnaHR0cDovLycgfHxcclxuICAgICAgICAgICAgICAgIHVybElucHV0LnNsaWNlKDAsICdodHRwczovLycubGVuZ3RoKSA9PT0gJ2h0dHBzOi8vJykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVybElucHV0O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyAyIC0gT3RoZXJ3aXNlLCB0cnkgdG8gZmluZCBjb3JyZWN0IGNvbnRyb2xsZXJcclxuXHJcbiAgICAgICAgICAgIC8vIEJvb2xlYW4gdXNlZCB0byB0cnkgdG8gZGV0ZXJtaW5lIGNvcnJlY3QgZnVsbCB1cmwgKGFkZCAvIG9yIG5vdCBiZWZvcmUgdGhlIHVybCBmcmFnbWVudCBkZXBlbmRpbmcgb24gaWYgZm91bmQgb3Igbm90KVxyXG4gICAgICAgICAgICB2YXIgdXJsRnJhZ21lbnRTdGFydHNXaXRoU2xhc2ggPSB1cmxJbnB1dC5zbGljZSgwLCAnLycubGVuZ3RoKSA9PT0gJy8nO1xyXG5cclxuICAgICAgICAgICAgLy8gUmVnZXggdHJ5aW5nIHRvIGRldGVybWluZSBpZiB0aGUgaW5wdXQgZnJhZ21lbnQgY29udGFpbnMgYSAvIGJldHdlZW4gdHdvIGNoYXJhY3RlciBzdWl0ZXMgPT4gY29udHJvbGxlciBnaXZlbiBhcyBpbnB1dCwgb3RoZXJ3aXNlLCBhY3Rpb24gb24gc2FtZSBjb250cm9sbGVyIGV4cGVjdGVkXHJcbiAgICAgICAgICAgIHZhciBjb250cm9sbGVySXNQcmVzZW50UmVnZXggPSAvXFx3K1xcL1xcdysvO1xyXG5cclxuICAgICAgICAgICAgdmFyIGFjdGlvbklzT25TYW1lQ29udHJvbGxlciA9ICFjb250cm9sbGVySXNQcmVzZW50UmVnZXgudGVzdCh1cmxJbnB1dCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgYmFzZVVybCA9IHRoaXMuZ2V0VXJsUGF0aChhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXIpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGJhc2VVcmwgKyAodXJsRnJhZ21lbnRTdGFydHNXaXRoU2xhc2ggPyB1cmxJbnB1dCA6ICgnLycgKyB1cmxJbnB1dCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwcml2YXRlIG1ldGhvZHNcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVXRpbGl0eSBtZXRob2QuXHJcbiAgICAgICAgICogTWFpbiBjYWxsZXIgdGhhdCBhbGwgd3JhcHBlciBjYWxscyAoZ2V0LCBkZWxldGUsIHBvc3QsIHB1dCkgbXVzdCB1c2UgdG8gc2hhcmUgY29tbW9uIGJlaGF2aW9yLlxyXG4gICAgICAgICAqIEBwYXJhbSBjb25maWdcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGFqYXg8VD4obWV0aG9kOiBIdHRwTWV0aG9kLCB1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKSB7XHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBtYWtlIHN1cmUgaW5pdFByb21pc2UgcmVzb2x2ZSBhdXRvbWF0aWNhbGx5IHdpdGhvdXQgb3ZlcmhlYWQgb25jZSBmaXJzdCBjYWxsIHN1Y2Vzc2Z1bGwuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluaXRQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJGh0dHA8VD4odGhpcy5jb25maWd1cmVIdHRwQ2FsbChtZXRob2QsIHVybCwgY29uZmlnKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW48VD4odGhpcy5zdWNjZXNzPFQ+KHVybCksIHRoaXMuZXJyb3IpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maW5hbGx5KHRoaXMuZmluYWxseSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgKiBQcmVwYXJlcyBhIHtAbGluayBuZyMkaHR0cCNjb25maWcgY29uZmlnfSBvYmplY3QgZm9yICRodHRwIGNhbGwuXHJcbiAgICAgICAgKiBUaGUgb3BlcmF0aW9ucyBpbmNsdWRlIHNldHRpbmcgZGVmYXVsdCB2YWx1ZXMgd2hlbiBub3QgcHJvdmlkZWQsIGFuZCBzZXR0aW5nIGh0dHAgaGVhZGVycyBpZiBuZWVkZWQgZm9yIDpcclxuICAgICAgICAqICAtIEFqYXggY2FsbHNcclxuICAgICAgICAqICAtIEF1dGhvcml6YXRpb24gdG9rZW5cclxuICAgICAgICAqICAtIEN1cnJlbnQgVXNlclJvbGUuICAgXHJcbiAgICAgICAgKiBAcGFyYW0gb3B0aW9uc1xyXG4gICAgICAgICogQHJldHVybnMge25nLiRodHRwLmNvbmZpZ30gdGhlIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHJlYWR5IHRvIGJlIGluamVjdGVkIGludG8gYSAkaHR0cCBjYWxsLiBcclxuICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgY29uZmlndXJlSHR0cENhbGwgPSAobWV0aG9kOiBIdHRwTWV0aG9kLCB1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVJlcXVlc3RDb25maWcgPT4ge1xyXG5cclxuICAgICAgICAgICAgaWYgKCF1cmwgfHwgbWV0aG9kID09PSBudWxsIHx8IG1ldGhvZCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJVUkwgJiBNRVRIT0QgcGFyYW1ldGVycyBhcmUgbmVjZXNzYXJ5IGZvciBodHRwV3JhcHBlciBjYWxscy4gQWJvcnRpbmcuXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vSW5pdCBjb25maWcgZXZlbiBpZiBub3QgcHJvdmlkZWRcclxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFyZCBjYXN0IGlzIG5vdCBzYWZlLCB3ZSBtYXkgZm9yZ2V0IHRvIHNldCB1cmwgJiBtZXRob2QgcGFyYW1ldGVycy4gVE9GSVguXHJcbiAgICAgICAgICAgIC8vIGF1dG9tYXRpY2FsbHkgZ2V0IGFsbCBub24tZmlsdGVyZWQgcGFyYW1ldGVycyAmIGtlZXAgdGhlbSBmb3IgdGhpcyBuZXcgb2JqZWN0LlxyXG4gICAgICAgICAgICB2YXIgY29uZmlnRnVsbCA9IDxuZy5JUmVxdWVzdENvbmZpZz5jb25maWc7XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBOiBzdXBwb3J0IG1hcHBpbmcgYmV0d2VlbiB1cGxvYWQgJiBwb3N0IGhlcmUgP1xyXG4gICAgICAgICAgICBjb25maWdGdWxsLm1ldGhvZCA9IEh0dHBNZXRob2RbbWV0aG9kXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb25maWcuYXBpRW5kcG9pbnQgJiYgKCF0aGlzLmFwaUNvbmZpZyB8fFxyXG4gICAgICAgICAgICAgICAgIXRoaXMuYXBpQ29uZmlnLmp3dFRva2VuIHx8XHJcbiAgICAgICAgICAgICAgICAhdGhpcy5hcGlDb25maWcuY3VycmVudFVzZXJSb2xlKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdbSW50ZXJuYWxFcnJvcl0gY29yZUFwaSBjYWxsIGludGVuZGVkIHdpdGhvdXQgbmVjZXNzYXJ5IGNhcGkgY3JlZGVudGlhbHMuIEFib3J0aW5nLicpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbmZpZ0Z1bGwuaGVhZGVycyA9IGNvbmZpZy5oZWFkZXJzIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgaWYgKCFjb25maWcuYXBpRW5kcG9pbnQpIHsgLy8gaWYgbm90IHNldCwgZXZhbHVhdGVzIHRvIGZhbHNlXHJcbiAgICAgICAgICAgICAgICBjb25maWdGdWxsLnVybCA9IHRoaXMuYnVpbGRVcmxGcm9tQ29udGV4dCh1cmwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGNvcmUgYXBpIGVuZHBvaW50ICdhcGkvJyBoYXJkY29kZWQsIHRvIHB1dCBpbiBjb25maWdGdWxsICEgc2hvdWxkIG5vdCBrbm93IHRoYXQgaGVyZS5cclxuICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwudXJsID0gdGhpcy5hcGlDb25maWcuY29yZUFwaVVybCArICdhcGkvJyArIHVybDtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hcGlDb25maWcuand0VG9rZW4gJiYgdGhpcy5hcGlDb25maWcuY3VycmVudFVzZXJSb2xlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFyZCBjb2RlZCBoZWFkZXJzLCBub3QgZ29vZCwgdG8gaW5qZWN0XHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnRnVsbC5oZWFkZXJzWydPQS1Vc2VyUm9sZSddID0gdGhpcy5hcGlDb25maWcuY3VycmVudFVzZXJSb2xlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwuaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gJ0JlYXJlciAnICsgdGhpcy5hcGlDb25maWcuand0VG9rZW47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghY29uZmlnLmRpc2FibGVYbWxIdHRwUmVxdWVzdEhlYWRlcikgLy8gaWYgbm90IHNldCwgZXZhbHVhdGVzIHRvIGZhbHNlXHJcbiAgICAgICAgICAgICAgICBjb25maWdGdWxsLmhlYWRlcnNbJ1gtUmVxdWVzdGVkLVdpdGgnXSA9ICdYTUxIdHRwUmVxdWVzdCc7XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBOiBPRSBzcGVjaWZpYyBjb2RlLCB0byByZW1vdmVcclxuICAgICAgICAgICAgaWYgKCg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgIT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8gTUdBIDogdHlwZSBjYXN0aW5nLCBpcyBpdCBva2F5IG9yIG5vdCA/IGJldHRlciBhcHByb2FjaCA/XHJcbiAgICAgICAgICAgICAgICAoPGFueT50aGlzLiR3aW5kb3cpLnByZXZlbnRCbG9ja1VJID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBjb25maWdGdWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU3VjY2VzcyBoYW5kbGVyXHJcbiAgICAgICAgICogVE9ETyBNR0EgOiB3aGF0IGlzIHVybCB1c2VkIGZvciA/Pz9cclxuICAgICAgICAgKiBAcGFyYW0gdXJsIFxyXG4gICAgICAgICAqIEByZXR1cm5zIHt9IFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgc3VjY2VzcyA9IDxUPih1cmw6IHN0cmluZyk6IChwcm9taXNlQ2FsbGJhY2s6IG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPFQ+KSA9PiBUIHwgbmcuSVByb21pc2U8YW55PiA9PiB7XHJcblxyXG4gICAgICAgICAgICAvLyBKUyB0cmljayA6IGNhcHR1cmUgdXJsIHZhcmlhYmxlIGluc2lkZSBjbG9zdXJlIHNjb3BlIHRvIHN0b3JlIGl0IGZvciBjYWxsYmFjayB3aGljaCBjYW5ub3QgYmUgY2FsbGVkIHdpdGggMiBhcmd1bWVudHNcclxuICAgICAgICAgICAgcmV0dXJuIChwcm9taXNlQ2FsbGJhY2s6IG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPFQ+KTogVCB8IG5nLklQcm9taXNlPGFueT4gPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghcHJvbWlzZUNhbGxiYWNrIHx8ICFwcm9taXNlQ2FsbGJhY2suZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IHRoaW5rIGFib3V0IHRoaXMgLi4uIE1heSBub3QgYmUgYWNjdXJhdGUgPyBvciBtYXkgbm90IGJlIGFuIGVycm9yIGlmIHJldHVybiB0eXBlIGlzIG51bGwgaW4gY2FzZSBubyBkYXRhIGZvdW5kXHJcbiAgICAgICAgICAgICAgICAgICAgLy9yZXNwb25zZS5zdGF0dXMgPSA1MDM7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKHByb21pc2VDYWxsYmFjayk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b2FzdGVyLndhcm5pbmcoJ1VuZXhwZWN0ZWQgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyJywgJ0NhbGwgc3VjY2Vzc2Z1bGwsIGJ1dCBubyBkYXRhIGZvdW5kJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBmaW5kIG91dCBob3cgdG8gaGFuZGxlIHRoYXQgYXMgdG8gZXhwZWN0ZCByZXR1cm4gdHlwZSA/XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHEucmVqZWN0KHByb21pc2VDYWxsYmFjayk7IC8vIFJlamVjdCBwcm9taXNlIGlmIG5vdCB3ZWxsLWZvcm1lZCBkYXRhXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmRlYnVnKHByb21pc2VDYWxsYmFjayk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2VDYWxsYmFjay5kYXRhOyAvLyByZXR1cm4gb25seSB0aGUgZGF0YSBleHBlY3RlZCBmb3IgY2FsbGVyXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBFcnJvciBoYW5kbGVyXHJcbiAgICAgICAgICogQHBhcmFtIHJlc3BvbnNlIFxyXG4gICAgICAgICAqIEByZXR1cm5zIHt9IFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgZXJyb3IgPSAocmVzcG9uc2U6IG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPGFueT4pOiBuZy5JUHJvbWlzZTxuZy5JSHR0cFByb21pc2VDYWxsYmFja0FyZzxhbnk+PiA9PiB7IC8vIGRvIHNvbWV0aGluZyBvbiBlcnJvclxyXG5cclxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UuZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YSA9ICdTZXJ2ZXIgbm90IHJlc3BvbmRpbmcnO1xyXG4gICAgICAgICAgICAgICAgcmVzcG9uc2Uuc3RhdHVzID0gNTAzO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9IFN0cmluZyhyZXNwb25zZS5kYXRhKSArICdcXG4gU3RhdHVzOiAnICsgcmVzcG9uc2Uuc3RhdHVzLnRvU3RyaW5nKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRvYXN0ZXIuZXJyb3IoJ1NlcnZlciByZXNwb25zZSBlcnJvcicsIG1lc3NhZ2UpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKHJlc3BvbnNlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFdlIGRvbid0IHJlY292ZXIgZnJvbSBlcnJvciwgc28gd2UgcHJvcGFnYXRlIGl0IDogYmVsb3cgaGFuZGxlcnMgaGF2ZSB0aGUgY2hvaWNlIG9mIHJlYWRpbmcgdGhlIGVycm9yIHdpdGggYW4gZXJyb3IgaGFuZGxlciBvciBub3QuIFNlZSAkcSBwcm9taXNlcyBiZWhhdmlvciBoZXJlIDogaHR0cHM6Ly9naXRodWIuY29tL2tyaXNrb3dhbC9xXHJcbiAgICAgICAgICAgIC8vIFRoaXMgYmVoYXZpb3IgaXMgZGVzaXJlZCBzbyB0aGF0IHdlIHNob3cgZXJyb3IgaW5zaWRlIHNwZWNpZmljIHNlcnZlciBjb21tdW5pY2F0aW9uIG1vZGFscyBhdCBzcGVjaWZpYyBwbGFjZXMgaW4gdGhlIGFwcCwgb3RoZXJ3aXNlIHNob3cgYSBnbG9iYWwgYWxlcnQgbWVzc2FnZSwgb3IgZXZlbiBkbyBub3Qgc2hvdyBhbnl0aGluZyBpZiBub3QgbmVjZXNzYXJ5IChkbyBub3QgYWQgYW4gZXJyb3IgaGFuZGxlciBpbiBiZWxvdyBoYW5kbGVycyBvZiB0aGlzIHByb21pc2UpLlxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy4kcS5yZWplY3QocmVzcG9uc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRnVuY3Rpb24gY2FsbGVkIGF0IHRoZSBlbmQgb2YgYW4gYWpheCBjYWxsLCByZWdhcmRsZXNzIG9mIGl0J3Mgc3VjY2VzcyBvciBmYWlsdXJlLlxyXG4gICAgICAgICAqIEBwYXJhbSByZXNwb25zZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgZmluYWxseSA9ICgpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogT0Utc3BlY2lmaWMgY29kZVxyXG4gICAgICAgICAgICBpZiAoKDxhbnk+dGhpcy4kd2luZG93KS5wcmV2ZW50QmxvY2tVSSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyBNR0EgOiB0eXBlIGNhc3RpbmcsIGlzIGl0IG9rYXkgb3Igbm90ID8gYmV0dGVyIGFwcHJvYWNoID9cclxuICAgICAgICAgICAgICAgICg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFRPRE8gTUdBIDogdXNpbmcgbWV0aG9kIGZyb20gTGF5b3V0LmpzIDogdG8gZG9jdW1lbnQgdG8gbm90IGhhbmRsZSBkdXBsaWNhdGUgY29kZSAhIVxyXG4gICAgICAgIC8vVE9ETyBNR0EgOiBtYWtlIGl0IGNhcGFibGUgb2YgaGFuZGxpbmcgZnVsbCBVUkxzIG91dHNpZGUgb2YgT0UgOiBkbyBub3QgdXNlID8/IGhvdyB0byA/XHJcbiAgICAgICAgcHJpdmF0ZSBnZXRVcmxQYXRoKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcikge1xyXG5cclxuICAgICAgICAgICAgdmFyIGJhc2VVcmxSZWdleCA9IC8oXFwvXFx3K1xcL1xcKFNcXChcXHcrXFwpXFwpKVxcL1xcdysvO1xyXG4gICAgICAgICAgICB2YXIgdXJsID0gdGhpcy4kd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lO1xyXG4gICAgICAgICAgICB2YXIgYmFzZVVybE1hdGNoZXMgPSBiYXNlVXJsUmVnZXguZXhlYyh1cmwpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGJhc2VVcmxNYXRjaGVzLmxlbmd0aCAmJiBiYXNlVXJsTWF0Y2hlcy5sZW5ndGggPT09IDIpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgYmFzZVVybFdpdGhDb250cm9sbGVyTmFtZSA9IGJhc2VVcmxNYXRjaGVzWzBdO1xyXG4gICAgICAgICAgICAgICAgdmFyIGJhc2VVcmwgPSBiYXNlVXJsTWF0Y2hlc1sxXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYWN0aW9uSXNPblNhbWVDb250cm9sbGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJhc2VVcmxXaXRoQ29udHJvbGxlck5hbWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBiYXNlVXJsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gJyc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL1RPRE8gTUdBOiBPTS1zcGVjaWZpYyBBU1AgTVZDIGNvZGUsIG5vdCB1c2VkIEFUTSwgdG8gcmVtb3ZlXHJcbiAgICAgICAgcHJpdmF0ZSBnZXRDdXJyZW50U2Vzc2lvbklEKCkge1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IG1hZ2ljIHJlZ2V4cCB0byBmZXRjaCBTZXNzaW9uSUQgaW4gVVJMLCB0byBzdG9yZSBlbHNld2hlcmUgIVxyXG4gICAgICAgICAgICB2YXIgc2Vzc2lvblJlZ2V4ID0gL2h0dHBzOlxcL1xcL1tcXHcuXStcXC9bXFx3Ll0rXFwvKFxcKFNcXChcXHcrXFwpXFwpKVxcLy4qLztcclxuICAgICAgICAgICAgLy92YXIgc2Vzc2lvblJlZ2V4ID0gL2h0dHBzOlxcL1xcL1tcXHcuXStcXC9PcmRlckVudHJ5XFwvKFxcKFNcXChcXHcrXFwpXFwpKVxcLy4qLztcclxuXHJcbiAgICAgICAgICAgIC8vIFRPRE8gTUdBIDogdXBkYXRlIHJlZ2V4cCB0byB0aGUgb25lIGJlbG93XHJcbiAgICAgICAgICAgIC8vdmFyIGJhc2VVcmxSZWdleCA9IC8oaHR0cHM6XFwvXFwvW1xcdy4tXStcXC9bXFx3Li1dK1xcL1xcKFNcXChcXHcrXFwpXFwpXFwvKVxcdysvO1xyXG5cclxuXHJcbiAgICAgICAgICAgIHZhciBwYXRoID0gdGhpcy4kbG9jYXRpb24uYWJzVXJsKCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgcmVnZXhwQXJyYXkgPSBzZXNzaW9uUmVnZXguZXhlYyhwYXRoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghcmVnZXhwQXJyYXkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihcIlVuYWJsZSB0byByZWNvZ25pemVkIHNlYXJjaGVkIHBhdHRlcm4gaW4gY3VycmVudCB1cmwgbG9jYXRpb24gdG8gcmV0cmlldmUgc2Vzc2lvbklELlwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyZWdleHBBcnJheS5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihcIlVuYWJsZSB0byBmaW5kIHNlc3Npb25JRCBpbiBzZWFyY2hlZCBwYXR0ZXJuIGluIGN1cnJlbnQgdXJsLlwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyZWdleHBBcnJheS5sZW5ndGggPiAyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJUb28gbWFueSBtYXRjaGVzIGZvdW5kIGZvciB0aGUgc2Vzc2lvbklEIHNlYXJjaCBpbiB0aGUgY3VycmVudCB1cmwuXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiByZWdleHBBcnJheVsxXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKCduZy5odHRwV3JhcHBlcicsIFsndG9hc3RlcicsICduZ0FuaW1hdGUnLCAnbmdGaWxlVXBsb2FkJ10pXHJcbiAgICAgICAgLy8gZG9uZSBpbiBjb25maWd1cmVIdHRwQ2FsbCBtZXRob2QuXHJcbiAgICAgICAgLy8uY29uZmlnKFsnJGh0dHBQcm92aWRlcicsICgkaHR0cFByb3ZpZGVyOiBuZy5JSHR0cFByb3ZpZGVyKSA9PiB7XHJcbiAgICAgICAgLy8gICAgJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vblsnWC1SZXF1ZXN0ZWQtV2l0aCddID0gJ1hNTEh0dHBSZXF1ZXN0JztcclxuICAgICAgICAvL31dKVxyXG4gICAgICAgIC5zZXJ2aWNlKCdodHRwV3JhcHBlclNlcnZpY2UnLCBIdHRwV3JhcHBlclNlcnZpY2UpO1xyXG59Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
