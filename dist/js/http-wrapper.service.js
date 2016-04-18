///<reference path="_app_references.ts" />
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
                        if (!url || !method) {
                            _this.$log.error("URL & METHOD parameters are necessary for httpWrapper calls. Aborting.");
                            return null;
                        }
                        //TODO MGA: hard cast is not safe, we may forget to set url & method parameters. TOFIX.
                        // automatically get all non-filtered parameters & keep them for this new object.
                        var configFull = config;
                        //TODO MGA: support mapping between upload & post here ?
                        configFull.method = method.toString();
                        configFull.url = url;
                        if (config.apiEndpoint && (!_this.apiConfig ||
                            !_this.apiConfig.jwtToken ||
                            !_this.apiConfig.currentUserRole)) {
                            _this.$log.error('[InternalError] coreApi call intended without necessary capi credentials. Aborting.');
                            return null;
                        }
                        configFull.headers = config.headers || {};
                        if (!config.apiEndpoint) {
                            configFull.url = _this.tryGetFullUrl(url);
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
                    this.initPromise = this.$http.get(this.tryGetFullUrl('CoreApiAuth/GetCoreApiConfig'))
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
                    return this.ajax(this.configureHttpCall(HttpMethod.GET, url, config));
                };
                HttpWrapperService.prototype.delete = function (url, config) {
                    return this.ajax(this.configureHttpCall(HttpMethod.GET, url, config));
                };
                HttpWrapperService.prototype.post = function (url, data, config) {
                    config = config || {};
                    config.data = data;
                    return this.ajax(this.configureHttpCall(HttpMethod.POST, url, config));
                };
                HttpWrapperService.prototype.put = function (url, data, config) {
                    config = config || {};
                    config.data = data;
                    return this.ajax(this.configureHttpCall(HttpMethod.PUT, url, config));
                };
                HttpWrapperService.prototype.upload = function (url, file, config) {
                    var _this = this;
                    if (!file && (!config || !config.file)) {
                        this.$log.error('Cannot start upload with null {file} parameter.');
                        return null;
                    }
                    config = this.configureHttpCall(HttpMethod.POST, url, config);
                    config.file = file || config.file; //TODO MGA : do not expose file in IHttpWrapperConfig ?
                    if (config.uploadInBase64Json) {
                        this.initPromise.then(function () {
                            //TODO MGA: make sure this delays next call and upload is not done before base64 encoding is finished, even if promise is already resolved ???
                            return _this.Upload.base64DataUrl(file).then(function (fileBase64Url) {
                                //TODO MGA: decide best behavior ? upload takes url params for target & file as payload ?
                                config.data = config.data || {};
                                config.data.fileBase64Url = fileBase64Url;
                            });
                        });
                    }
                    else {
                        config.data = {
                            file: file,
                            //fileName: 'doc.jpg' or ['1.jpg', '2.jpg', ...] // to modify the name of the file(s)
                            fileFormDataName: 'file' // file formData name ('Content-Disposition'), server side request form name
                        };
                    }
                    return this.initPromise.then(function () {
                        //TODO MGA : not safe hard cast
                        return _this.Upload.upload(config)
                            .then(_this.success(url), _this.error, config.uploadProgress) //TODO MGA : uploadProgress callback ok ?
                            .finally(_this.finally);
                    });
                };
                //#endregion
                //#region private methods
                /**
                 * Utility method.
                 * Main caller that all wrapper calls (get, delete, post, put) must use to share common behavior.
                 * @param config
                 */
                HttpWrapperService.prototype.ajax = function (config) {
                    var _this = this;
                    //TODO MGA : make sure initPromise resolve automatically without overhead once first call sucessfull.
                    return this.initPromise.then(function () {
                        return _this.$http(config)
                            .then(_this.success(config.url), _this.error)
                            .finally(_this.finally);
                    });
                };
                //TODO MGA : method to document and improve robustness + use in OE outside of angular // mutualize
                // Tries to parse the input url :
                // If it seems to be a full URL, then return as is (considers it external Url)
                // Otherwise, tries to find the base URL of the current BlueSky app with or without the included Controller and returns the full Url
                HttpWrapperService.prototype.tryGetFullUrl = function (urlInput) {
                    // Url starts with http:// or https:// => leave as this
                    if (urlInput.slice(0, 'http://'.length) === 'http://' ||
                        urlInput.slice(0, 'https://'.length) === 'https://') {
                        return urlInput;
                    }
                    // Boolean used to try to determine correct full url (add / or not before the url fragment depending on if found or not)
                    var urlFragmentStartsWithSlash = urlInput.slice(0, '/'.length) === '/';
                    // Regex trying to determine if the input fragment contains a / between two character suites => controller given as input, otherwise, action on same controller expected
                    var controllerIsPresentRegex = /\w+\/\w+/;
                    var actionIsOnSameController = !controllerIsPresentRegex.test(urlInput);
                    var baseUrl = this.getUrlPath(actionIsOnSameController);
                    return baseUrl + (urlFragmentStartsWithSlash ? urlInput : ('/' + urlInput));
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
            angular.module('ng.httpWrapper', ['toaster', 'ngFileUpload'])
                .service('httpWrapperService', HttpWrapperService);
        })(services = core.services || (core.services = {}));
    })(core = bluesky.core || (bluesky.core = {}));
})(bluesky || (bluesky = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHAtd3JhcHBlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBDQUEwQztBQUMxQyxJQUFPLE9BQU8sQ0FzV2I7QUF0V0QsV0FBTyxPQUFPO0lBQUMsSUFBQSxJQUFJLENBc1dsQjtJQXRXYyxXQUFBLElBQUk7UUFBQyxJQUFBLFFBQVEsQ0FzVzNCO1FBdFdtQixXQUFBLFFBQVEsRUFBQyxDQUFDO1lBZTFCLElBQUssVUFBcUM7WUFBMUMsV0FBSyxVQUFVO2dCQUFHLHlDQUFHLENBQUE7Z0JBQUUsMkNBQUksQ0FBQTtnQkFBRSx5Q0FBRyxDQUFBO2dCQUFFLCtDQUFNLENBQUE7WUFBQyxDQUFDLEVBQXJDLFVBQVUsS0FBVixVQUFVLFFBQTJCO1lBQUEsQ0FBQztZQXlCM0M7O2VBRUc7WUFDSDtnQkFPSSxZQUFZO2dCQUVaLGNBQWM7Z0JBRWQsZUFBZTtnQkFDZiw0QkFDWSxLQUFzQixFQUN0QixPQUEwQixFQUMxQixJQUFvQixFQUNwQixFQUFnQixFQUNoQixTQUE4QixFQUM5QixNQUEyQyxFQUMzQyxPQUFrQztvQkFuQmxELGlCQW1UQztvQkF0U2UsVUFBSyxHQUFMLEtBQUssQ0FBaUI7b0JBQ3RCLFlBQU8sR0FBUCxPQUFPLENBQW1CO29CQUMxQixTQUFJLEdBQUosSUFBSSxDQUFnQjtvQkFDcEIsT0FBRSxHQUFGLEVBQUUsQ0FBYztvQkFDaEIsY0FBUyxHQUFULFNBQVMsQ0FBcUI7b0JBQzlCLFdBQU0sR0FBTixNQUFNLENBQXFDO29CQUMzQyxZQUFPLEdBQVAsT0FBTyxDQUEyQjtvQkEyRjlDOzs7Ozs7OztzQkFRRTtvQkFDTSxzQkFBaUIsR0FBRyxVQUFDLE1BQWtCLEVBQUUsR0FBVyxFQUFFLE1BQTBCO3dCQUVwRixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7NEJBQ2xCLEtBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLHdFQUF3RSxDQUFDLENBQUM7NEJB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QUFNLENBQUMsRUFBRSxDQUFDO29CQUNkLENBQUM7b0JBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUIsQ0FBQztnQkFHTCx5QkFBQztZQUFELENBblRBLEFBbVRDLElBQUE7WUFuVFksMkJBQWtCLHFCQW1UOUIsQ0FBQTtZQUVELE9BQU8sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7aUJBS3hELE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELENBQUMsRUF0V21CLFFBQVEsR0FBUixhQUFRLEtBQVIsYUFBUSxRQXNXM0I7SUFBRCxDQUFDLEVBdFdjLElBQUksR0FBSixZQUFJLEtBQUosWUFBSSxRQXNXbEI7QUFBRCxDQUFDLEVBdFdNLE9BQU8sS0FBUCxPQUFPLFFBc1diIiwiZmlsZSI6Imh0dHAtd3JhcHBlci5zZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vPHJlZmVyZW5jZSBwYXRoPVwiX2FwcF9yZWZlcmVuY2VzLnRzXCIgLz5cclxubW9kdWxlIGJsdWVza3kuY29yZS5zZXJ2aWNlcyB7XHJcblxyXG4gICAgaW1wb3J0IEFwaUNvbmZpZyA9IGJsdWVza3kuY29yZS5tb2RlbHMuQXBpQ29uZmlnO1xyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUh0dHBXcmFwcGVyQ29uZmlnIGV4dGVuZHMgbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogbWFpbiBBUEkgZW5kcG9pbnQgdG8gdXNlIGFzIGRlZmF1bHQgb25lIGlmIHVybCBpcyBub3QgZnVsbC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBhcGlFbmRwb2ludD86IGJvb2xlYW47XHJcbiAgICAgICAgZmlsZT86IEZpbGUsXHJcbiAgICAgICAgdXBsb2FkSW5CYXNlNjRKc29uPzogYm9vbGVhbjtcclxuICAgICAgICB1cGxvYWRQcm9ncmVzcz86ICgpID0+IGFueTtcclxuICAgICAgICBkaXNhYmxlWG1sSHR0cFJlcXVlc3RIZWFkZXI/OiBib29sZWFuO1xyXG4gICAgfVxyXG5cclxuICAgIGVudW0gSHR0cE1ldGhvZCB7IEdFVCwgUE9TVCwgUFVULCBERUxFVEUgfTtcclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElIdHRwV3JhcHBlclNlcnZpY2Uge1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBBbGwgc3J2LXNpZGUgY29uZmlndXJhdGlvbiBvZiBtYWluIEFQSSBwcm92aWRlZCBieSB0aGUgZG9tYWluIGZyb20gd2hpY2ggdGhpcyBzY3JpcHQgd2FzIGxvYWRlZCwgQCB0aGUgdXJsICdDb3JlQXBpQXV0aC9HZXRDb3JlQXBpQ29uZmlnJy5cclxuICAgICAgICAgKiBUT0RPIE1HQSBmaXggaGFyZCBjb2RlZCBwYXRoLlxyXG4gICAgICAgICAqIFRoaXMgY29uZmlndXJhdGlvbiBkYXRhIGlzIGxvYWRlZCB1cG9uIGluaXRpYWxpemF0aW9uIG9mIHRoaXMgc2VydmljZSAodG8gYmUgdXNlZCBhcyBhIHNpbmdsZXRvbiBpbiB0aGUgYXBwKS4gQWxsIG90aGVyIHdlYiBjYWxscyBhcmUgYmxvY2tlZCBhcyBsb25nIGFzIHRoaXMgb25lIGlzIG5vdCBmaW5pc2hlZC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBhcGlDb25maWc6IEFwaUNvbmZpZztcclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQTogZm9yIGZvbGxvd2luZyBtZXRob2RzLCByZXR1cm4gSVByb21pc2UgYW5kIGFzc3VtZSBhYnN0cmFjdGlvbiBvciBsZXQgYmVsb3cgc2VydmljZXMgaGFuZGxlIElIdHRwUHJvbWlzZXMgP1xyXG5cclxuICAgICAgICBnZXQ8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBkZWxldGU8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBwb3N0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBwdXQ8VD4odXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIC8vVE9ETyBNR0EgaW1wcm92ZSB0eXBpbmcgd2l0aCBhbmd1bGFyLXVwbG9hZCB0c2QgZXRjXHJcbiAgICAgICAgdXBsb2FkPFQ+KHVybDogc3RyaW5nLCBmaWxlOiBGaWxlLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRPRE8gTUdBIDogdGhpcyBtYXkgbm90IG5lZWQgdG8gYmUgYSBkZWRpY2F0ZWQgc2VydmljZSwgaXQgY2FuIGFsc28gYmUgaW5jb3Jwb3JhdGVkIGludG8gdGhlIGh0dHBJbnRlcmNlcHRvci4gRGVjaWRlIGJlc3QgYXBwcm9hY2ggZGVwZW5kaW5nIG9uIHBsYW5uZWQgdXNlLlxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgSHR0cFdyYXBwZXJTZXJ2aWNlIGltcGxlbWVudHMgSUh0dHBXcmFwcGVyU2VydmljZSB7XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwcm9wZXJ0aWVzXHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5pdFByb21pc2U6IG5nLklQcm9taXNlPGFueT47XHJcbiAgICAgICAgcHVibGljIGFwaUNvbmZpZzogQXBpQ29uZmlnO1xyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIGN0b3JcclxuXHJcbiAgICAgICAgLyogQG5nSW5qZWN0ICovXHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGh0dHA6IG5nLklIdHRwU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkbG9nOiBuZy5JTG9nU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRsb2NhdGlvbjogbmcuSUxvY2F0aW9uU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSBVcGxvYWQ6IG5nLmFuZ3VsYXJGaWxlVXBsb2FkLklVcGxvYWRTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlIHRvYXN0ZXI6IG5ndG9hc3Rlci5JVG9hc3RlclNlcnZpY2VcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgLy8gaW5pdCBjb3JlIGFwaSBjb25maWcgZGF0YSBvbiBjdG9yXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBoYXJkIGNvZGVkIHBhdGggZm9yIENvcmVyQXBpQXV0aEN0cmwgdG8gaW5qZWN0XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdFByb21pc2UgPSB0aGlzLiRodHRwLmdldDxBcGlDb25maWc+KHRoaXMudHJ5R2V0RnVsbFVybCgnQ29yZUFwaUF1dGgvR2V0Q29yZUFwaUNvbmZpZycpKVxyXG4gICAgICAgICAgICAgICAgLnN1Y2Nlc3MoKGNvcmVBcGlDb25maWcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwaUNvbmZpZyA9IGNvcmVBcGlDb25maWc7XHJcbiAgICAgICAgICAgICAgICB9KS5lcnJvcigoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ1VuYWJsZSB0byByZXRyaWV2ZSBBUEkgY29uZmlnLiBBYm9ydGluZyBodHRwV3JhcHBlclNlcnZpY2UgaW5pdGlhbGl6YXRpb24uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICAvLyNyZWdpb24gcHVibGljIG1ldGhvZHNcclxuXHJcbiAgICAgICAgZ2V0PFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4odGhpcy5jb25maWd1cmVIdHRwQ2FsbChIdHRwTWV0aG9kLkdFVCwgdXJsLCBjb25maWcpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlbGV0ZTxUPih1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KHRoaXMuY29uZmlndXJlSHR0cENhbGwoSHR0cE1ldGhvZC5HRVQsIHVybCwgY29uZmlnKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwb3N0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xyXG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGRhdGE7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KHRoaXMuY29uZmlndXJlSHR0cENhbGwoSHR0cE1ldGhvZC5QT1NULCB1cmwsIGNvbmZpZykpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHV0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xyXG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGRhdGE7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KHRoaXMuY29uZmlndXJlSHR0cENhbGwoSHR0cE1ldGhvZC5QVVQsIHVybCwgY29uZmlnKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGxvYWQ8VD4odXJsOiBzdHJpbmcsIGZpbGU6IEZpbGUsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuXHJcbiAgICAgICAgICAgIGlmICghZmlsZSAmJiAoIWNvbmZpZyB8fCAhY29uZmlnLmZpbGUpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ0Nhbm5vdCBzdGFydCB1cGxvYWQgd2l0aCBudWxsIHtmaWxlfSBwYXJhbWV0ZXIuJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uZmlnID0gdGhpcy5jb25maWd1cmVIdHRwQ2FsbChIdHRwTWV0aG9kLlBPU1QsIHVybCwgY29uZmlnKTtcclxuXHJcbiAgICAgICAgICAgIGNvbmZpZy5maWxlID0gZmlsZSB8fCBjb25maWcuZmlsZTsgLy9UT0RPIE1HQSA6IGRvIG5vdCBleHBvc2UgZmlsZSBpbiBJSHR0cFdyYXBwZXJDb25maWcgP1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbmZpZy51cGxvYWRJbkJhc2U2NEpzb24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW5pdFByb21pc2UudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogbWFrZSBzdXJlIHRoaXMgZGVsYXlzIG5leHQgY2FsbCBhbmQgdXBsb2FkIGlzIG5vdCBkb25lIGJlZm9yZSBiYXNlNjQgZW5jb2RpbmcgaXMgZmluaXNoZWQsIGV2ZW4gaWYgcHJvbWlzZSBpcyBhbHJlYWR5IHJlc29sdmVkID8/P1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLlVwbG9hZC5iYXNlNjREYXRhVXJsKGZpbGUpLnRoZW4oKGZpbGVCYXNlNjRVcmwpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogZGVjaWRlIGJlc3QgYmVoYXZpb3IgPyB1cGxvYWQgdGFrZXMgdXJsIHBhcmFtcyBmb3IgdGFyZ2V0ICYgZmlsZSBhcyBwYXlsb2FkID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnLmRhdGEgPSBjb25maWcuZGF0YSB8fCB7fTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uZmlnLmRhdGEuZmlsZUJhc2U2NFVybCA9IGZpbGVCYXNlNjRVcmw7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZy5kYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpbGU6IGZpbGUsIC8vIHNpbmdsZSBmaWxlIG9yIGEgbGlzdCBvZiBmaWxlcy4gbGlzdCBpcyBvbmx5IGZvciBodG1sNVxyXG4gICAgICAgICAgICAgICAgICAgIC8vZmlsZU5hbWU6ICdkb2MuanBnJyBvciBbJzEuanBnJywgJzIuanBnJywgLi4uXSAvLyB0byBtb2RpZnkgdGhlIG5hbWUgb2YgdGhlIGZpbGUocylcclxuICAgICAgICAgICAgICAgICAgICBmaWxlRm9ybURhdGFOYW1lOiAnZmlsZScgLy8gZmlsZSBmb3JtRGF0YSBuYW1lICgnQ29udGVudC1EaXNwb3NpdGlvbicpLCBzZXJ2ZXIgc2lkZSByZXF1ZXN0IGZvcm0gbmFtZVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5pdFByb21pc2UudGhlbigoKSA9PlxyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQSA6IG5vdCBzYWZlIGhhcmQgY2FzdFxyXG4gICAgICAgICAgICAgICAgdGhpcy5VcGxvYWQudXBsb2FkPFQ+KDxuZy5hbmd1bGFyRmlsZVVwbG9hZC5JRmlsZVVwbG9hZENvbmZpZ0ZpbGU+Y29uZmlnKVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuPFQ+KHRoaXMuc3VjY2VzczxUPih1cmwpLCB0aGlzLmVycm9yLCBjb25maWcudXBsb2FkUHJvZ3Jlc3MpICAvL1RPRE8gTUdBIDogdXBsb2FkUHJvZ3Jlc3MgY2FsbGJhY2sgb2sgP1xyXG4gICAgICAgICAgICAgICAgICAgIC5maW5hbGx5KHRoaXMuZmluYWxseSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwcml2YXRlIG1ldGhvZHNcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVXRpbGl0eSBtZXRob2QuXHJcbiAgICAgICAgICogTWFpbiBjYWxsZXIgdGhhdCBhbGwgd3JhcHBlciBjYWxscyAoZ2V0LCBkZWxldGUsIHBvc3QsIHB1dCkgbXVzdCB1c2UgdG8gc2hhcmUgY29tbW9uIGJlaGF2aW9yLlxyXG4gICAgICAgICAqIEBwYXJhbSBjb25maWdcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGFqYXg8VD4oY29uZmlnOiBuZy5JUmVxdWVzdENvbmZpZykge1xyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogbWFrZSBzdXJlIGluaXRQcm9taXNlIHJlc29sdmUgYXV0b21hdGljYWxseSB3aXRob3V0IG92ZXJoZWFkIG9uY2UgZmlyc3QgY2FsbCBzdWNlc3NmdWxsLlxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbml0UHJvbWlzZS50aGVuKCgpID0+XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRodHRwPFQ+KGNvbmZpZylcclxuICAgICAgICAgICAgICAgICAgICAudGhlbjxUPih0aGlzLnN1Y2Nlc3M8VD4oY29uZmlnLnVybCksIHRoaXMuZXJyb3IpXHJcbiAgICAgICAgICAgICAgICAgICAgLmZpbmFsbHkodGhpcy5maW5hbGx5KSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAqIFByZXBhcmVzIGEge0BsaW5rIG5nIyRodHRwI2NvbmZpZyBjb25maWd9IG9iamVjdCBmb3IgJGh0dHAgY2FsbC5cclxuICAgICAgICAqIFRoZSBvcGVyYXRpb25zIGluY2x1ZGUgc2V0dGluZyBkZWZhdWx0IHZhbHVlcyB3aGVuIG5vdCBwcm92aWRlZCwgYW5kIHNldHRpbmcgaHR0cCBoZWFkZXJzIGlmIG5lZWRlZCBmb3IgOlxyXG4gICAgICAgICogIC0gQWpheCBjYWxsc1xyXG4gICAgICAgICogIC0gQXV0aG9yaXphdGlvbiB0b2tlblxyXG4gICAgICAgICogIC0gQ3VycmVudCBVc2VyUm9sZS4gICBcclxuICAgICAgICAqIEBwYXJhbSBvcHRpb25zXHJcbiAgICAgICAgKiBAcmV0dXJucyB7bmcuJGh0dHAuY29uZmlnfSB0aGUgY29uZmlndXJhdGlvbiBvYmplY3QgcmVhZHkgdG8gYmUgaW5qZWN0ZWQgaW50byBhICRodHRwIGNhbGwuIFxyXG4gICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBjb25maWd1cmVIdHRwQ2FsbCA9IChtZXRob2Q6IEh0dHBNZXRob2QsIHVybDogc3RyaW5nLCBjb25maWc6IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklSZXF1ZXN0Q29uZmlnID0+IHtcclxuXHJcbiAgICAgICAgICAgIGlmICghdXJsIHx8ICFtZXRob2QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihcIlVSTCAmIE1FVEhPRCBwYXJhbWV0ZXJzIGFyZSBuZWNlc3NhcnkgZm9yIGh0dHBXcmFwcGVyIGNhbGxzLiBBYm9ydGluZy5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFyZCBjYXN0IGlzIG5vdCBzYWZlLCB3ZSBtYXkgZm9yZ2V0IHRvIHNldCB1cmwgJiBtZXRob2QgcGFyYW1ldGVycy4gVE9GSVguXHJcbiAgICAgICAgICAgIC8vIGF1dG9tYXRpY2FsbHkgZ2V0IGFsbCBub24tZmlsdGVyZWQgcGFyYW1ldGVycyAmIGtlZXAgdGhlbSBmb3IgdGhpcyBuZXcgb2JqZWN0LlxyXG4gICAgICAgICAgICB2YXIgY29uZmlnRnVsbCA9IDxuZy5JUmVxdWVzdENvbmZpZz5jb25maWc7XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBOiBzdXBwb3J0IG1hcHBpbmcgYmV0d2VlbiB1cGxvYWQgJiBwb3N0IGhlcmUgP1xyXG4gICAgICAgICAgICBjb25maWdGdWxsLm1ldGhvZCA9IG1ldGhvZC50b1N0cmluZygpO1xyXG4gICAgICAgICAgICBjb25maWdGdWxsLnVybCA9IHVybDtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb25maWcuYXBpRW5kcG9pbnQgJiYgKCF0aGlzLmFwaUNvbmZpZyB8fFxyXG4gICAgICAgICAgICAgICAgIXRoaXMuYXBpQ29uZmlnLmp3dFRva2VuIHx8XHJcbiAgICAgICAgICAgICAgICAhdGhpcy5hcGlDb25maWcuY3VycmVudFVzZXJSb2xlKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdbSW50ZXJuYWxFcnJvcl0gY29yZUFwaSBjYWxsIGludGVuZGVkIHdpdGhvdXQgbmVjZXNzYXJ5IGNhcGkgY3JlZGVudGlhbHMuIEFib3J0aW5nLicpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbmZpZ0Z1bGwuaGVhZGVycyA9IGNvbmZpZy5oZWFkZXJzIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgaWYgKCFjb25maWcuYXBpRW5kcG9pbnQpIHsgLy8gaWYgbm90IHNldCwgZXZhbHVhdGVzIHRvIGZhbHNlXHJcbiAgICAgICAgICAgICAgICBjb25maWdGdWxsLnVybCA9IHRoaXMudHJ5R2V0RnVsbFVybCh1cmwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGNvcmUgYXBpIGVuZHBvaW50ICdhcGkvJyBoYXJkY29kZWQsIHRvIHB1dCBpbiBjb25maWdGdWxsICEgc2hvdWxkIG5vdCBrbm93IHRoYXQgaGVyZS5cclxuICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwudXJsID0gdGhpcy5hcGlDb25maWcuY29yZUFwaVVybCArICdhcGkvJyArIHVybDtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5hcGlDb25maWcuand0VG9rZW4gJiYgdGhpcy5hcGlDb25maWcuY3VycmVudFVzZXJSb2xlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFyZCBjb2RlZCBoZWFkZXJzLCBub3QgZ29vZCwgdG8gaW5qZWN0XHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnRnVsbC5oZWFkZXJzWydPQS1Vc2VyUm9sZSddID0gdGhpcy5hcGlDb25maWcuY3VycmVudFVzZXJSb2xlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwuaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gJ0JlYXJlciAnICsgdGhpcy5hcGlDb25maWcuand0VG9rZW47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghY29uZmlnLmRpc2FibGVYbWxIdHRwUmVxdWVzdEhlYWRlcikgLy8gaWYgbm90IHNldCwgZXZhbHVhdGVzIHRvIGZhbHNlXHJcbiAgICAgICAgICAgICAgICBjb25maWdGdWxsLmhlYWRlcnNbJ1gtUmVxdWVzdGVkLVdpdGgnXSA9ICdYTUxIdHRwUmVxdWVzdCc7XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBOiBPRSBzcGVjaWZpYyBjb2RlLCB0byByZW1vdmVcclxuICAgICAgICAgICAgaWYgKCg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgIT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8gTUdBIDogdHlwZSBjYXN0aW5nLCBpcyBpdCBva2F5IG9yIG5vdCA/IGJldHRlciBhcHByb2FjaCA/XHJcbiAgICAgICAgICAgICAgICAoPGFueT50aGlzLiR3aW5kb3cpLnByZXZlbnRCbG9ja1VJID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBjb25maWdGdWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU3VjY2VzcyBoYW5kbGVyXHJcbiAgICAgICAgICogVE9ETyBNR0EgOiB3aGF0IGlzIHVybCB1c2VkIGZvciA/Pz9cclxuICAgICAgICAgKiBAcGFyYW0gdXJsIFxyXG4gICAgICAgICAqIEByZXR1cm5zIHt9IFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgc3VjY2VzcyA9IDxUPih1cmw6IHN0cmluZyk6IChwcm9taXNlQ2FsbGJhY2s6IG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPFQ+KSA9PiBUIHwgbmcuSVByb21pc2U8YW55PiA9PiB7XHJcblxyXG4gICAgICAgICAgICAvLyBKUyB0cmljayA6IGNhcHR1cmUgdXJsIHZhcmlhYmxlIGluc2lkZSBjbG9zdXJlIHNjb3BlIHRvIHN0b3JlIGl0IGZvciBjYWxsYmFjayB3aGljaCBjYW5ub3QgYmUgY2FsbGVkIHdpdGggMiBhcmd1bWVudHNcclxuICAgICAgICAgICAgcmV0dXJuIChwcm9taXNlQ2FsbGJhY2s6IG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPFQ+KTogVCB8IG5nLklQcm9taXNlPGFueT4gPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghcHJvbWlzZUNhbGxiYWNrIHx8ICFwcm9taXNlQ2FsbGJhY2suZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IHRoaW5rIGFib3V0IHRoaXMgLi4uIE1heSBub3QgYmUgYWNjdXJhdGUgPyBvciBtYXkgbm90IGJlIGFuIGVycm9yIGlmIHJldHVybiB0eXBlIGlzIG51bGwgaW4gY2FzZSBubyBkYXRhIGZvdW5kXHJcbiAgICAgICAgICAgICAgICAgICAgLy9yZXNwb25zZS5zdGF0dXMgPSA1MDM7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKHByb21pc2VDYWxsYmFjayk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b2FzdGVyLndhcm5pbmcoJ1VuZXhwZWN0ZWQgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyJywgJ0NhbGwgc3VjY2Vzc2Z1bGwsIGJ1dCBubyBkYXRhIGZvdW5kJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBmaW5kIG91dCBob3cgdG8gaGFuZGxlIHRoYXQgYXMgdG8gZXhwZWN0ZCByZXR1cm4gdHlwZSA/XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHEucmVqZWN0KHByb21pc2VDYWxsYmFjayk7IC8vIFJlamVjdCBwcm9taXNlIGlmIG5vdCB3ZWxsLWZvcm1lZCBkYXRhXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmRlYnVnKHByb21pc2VDYWxsYmFjayk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2VDYWxsYmFjay5kYXRhOyAvLyByZXR1cm4gb25seSB0aGUgZGF0YSBleHBlY3RlZCBmb3IgY2FsbGVyXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBFcnJvciBoYW5kbGVyXHJcbiAgICAgICAgICogQHBhcmFtIHJlc3BvbnNlIFxyXG4gICAgICAgICAqIEByZXR1cm5zIHt9IFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgZXJyb3IgPSAocmVzcG9uc2U6IG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPGFueT4pOiBuZy5JUHJvbWlzZTxuZy5JSHR0cFByb21pc2VDYWxsYmFja0FyZzxhbnk+PiA9PiB7IC8vIGRvIHNvbWV0aGluZyBvbiBlcnJvclxyXG5cclxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UuZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YSA9ICdTZXJ2ZXIgbm90IHJlc3BvbmRpbmcnO1xyXG4gICAgICAgICAgICAgICAgcmVzcG9uc2Uuc3RhdHVzID0gNTAzO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9IFN0cmluZyhyZXNwb25zZS5kYXRhKSArICdcXG4gU3RhdHVzOiAnICsgcmVzcG9uc2Uuc3RhdHVzLnRvU3RyaW5nKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRvYXN0ZXIuZXJyb3IoJ1NlcnZlciByZXNwb25zZSBlcnJvcicsIG1lc3NhZ2UpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKHJlc3BvbnNlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFdlIGRvbid0IHJlY292ZXIgZnJvbSBlcnJvciwgc28gd2UgcHJvcGFnYXRlIGl0IDogYmVsb3cgaGFuZGxlcnMgaGF2ZSB0aGUgY2hvaWNlIG9mIHJlYWRpbmcgdGhlIGVycm9yIHdpdGggYW4gZXJyb3IgaGFuZGxlciBvciBub3QuIFNlZSAkcSBwcm9taXNlcyBiZWhhdmlvciBoZXJlIDogaHR0cHM6Ly9naXRodWIuY29tL2tyaXNrb3dhbC9xXHJcbiAgICAgICAgICAgIC8vIFRoaXMgYmVoYXZpb3IgaXMgZGVzaXJlZCBzbyB0aGF0IHdlIHNob3cgZXJyb3IgaW5zaWRlIHNwZWNpZmljIHNlcnZlciBjb21tdW5pY2F0aW9uIG1vZGFscyBhdCBzcGVjaWZpYyBwbGFjZXMgaW4gdGhlIGFwcCwgb3RoZXJ3aXNlIHNob3cgYSBnbG9iYWwgYWxlcnQgbWVzc2FnZSwgb3IgZXZlbiBkbyBub3Qgc2hvdyBhbnl0aGluZyBpZiBub3QgbmVjZXNzYXJ5IChkbyBub3QgYWQgYW4gZXJyb3IgaGFuZGxlciBpbiBiZWxvdyBoYW5kbGVycyBvZiB0aGlzIHByb21pc2UpLlxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy4kcS5yZWplY3QocmVzcG9uc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRnVuY3Rpb24gY2FsbGVkIGF0IHRoZSBlbmQgb2YgYW4gYWpheCBjYWxsLCByZWdhcmRsZXNzIG9mIGl0J3Mgc3VjY2VzcyBvciBmYWlsdXJlLlxyXG4gICAgICAgICAqIEBwYXJhbSByZXNwb25zZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgZmluYWxseSA9ICgpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogT0Utc3BlY2lmaWMgY29kZVxyXG4gICAgICAgICAgICBpZiAoKDxhbnk+dGhpcy4kd2luZG93KS5wcmV2ZW50QmxvY2tVSSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyBNR0EgOiB0eXBlIGNhc3RpbmcsIGlzIGl0IG9rYXkgb3Igbm90ID8gYmV0dGVyIGFwcHJvYWNoID9cclxuICAgICAgICAgICAgICAgICg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vVE9ETyBNR0EgOiBtZXRob2QgdG8gZG9jdW1lbnQgYW5kIGltcHJvdmUgcm9idXN0bmVzcyArIHVzZSBpbiBPRSBvdXRzaWRlIG9mIGFuZ3VsYXIgLy8gbXV0dWFsaXplXHJcbiAgICAgICAgLy8gVHJpZXMgdG8gcGFyc2UgdGhlIGlucHV0IHVybCA6XHJcbiAgICAgICAgLy8gSWYgaXQgc2VlbXMgdG8gYmUgYSBmdWxsIFVSTCwgdGhlbiByZXR1cm4gYXMgaXMgKGNvbnNpZGVycyBpdCBleHRlcm5hbCBVcmwpXHJcbiAgICAgICAgLy8gT3RoZXJ3aXNlLCB0cmllcyB0byBmaW5kIHRoZSBiYXNlIFVSTCBvZiB0aGUgY3VycmVudCBCbHVlU2t5IGFwcCB3aXRoIG9yIHdpdGhvdXQgdGhlIGluY2x1ZGVkIENvbnRyb2xsZXIgYW5kIHJldHVybnMgdGhlIGZ1bGwgVXJsXHJcbiAgICAgICAgcHJpdmF0ZSB0cnlHZXRGdWxsVXJsKHVybElucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICAvLyBVcmwgc3RhcnRzIHdpdGggaHR0cDovLyBvciBodHRwczovLyA9PiBsZWF2ZSBhcyB0aGlzXHJcbiAgICAgICAgICAgIGlmICh1cmxJbnB1dC5zbGljZSgwLCAnaHR0cDovLycubGVuZ3RoKSA9PT0gJ2h0dHA6Ly8nIHx8XHJcbiAgICAgICAgICAgICAgICB1cmxJbnB1dC5zbGljZSgwLCAnaHR0cHM6Ly8nLmxlbmd0aCkgPT09ICdodHRwczovLycpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB1cmxJbnB1dDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gQm9vbGVhbiB1c2VkIHRvIHRyeSB0byBkZXRlcm1pbmUgY29ycmVjdCBmdWxsIHVybCAoYWRkIC8gb3Igbm90IGJlZm9yZSB0aGUgdXJsIGZyYWdtZW50IGRlcGVuZGluZyBvbiBpZiBmb3VuZCBvciBub3QpXHJcbiAgICAgICAgICAgIHZhciB1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaCA9IHVybElucHV0LnNsaWNlKDAsICcvJy5sZW5ndGgpID09PSAnLyc7XHJcblxyXG4gICAgICAgICAgICAvLyBSZWdleCB0cnlpbmcgdG8gZGV0ZXJtaW5lIGlmIHRoZSBpbnB1dCBmcmFnbWVudCBjb250YWlucyBhIC8gYmV0d2VlbiB0d28gY2hhcmFjdGVyIHN1aXRlcyA9PiBjb250cm9sbGVyIGdpdmVuIGFzIGlucHV0LCBvdGhlcndpc2UsIGFjdGlvbiBvbiBzYW1lIGNvbnRyb2xsZXIgZXhwZWN0ZWRcclxuICAgICAgICAgICAgdmFyIGNvbnRyb2xsZXJJc1ByZXNlbnRSZWdleCA9IC9cXHcrXFwvXFx3Ky87XHJcblxyXG4gICAgICAgICAgICB2YXIgYWN0aW9uSXNPblNhbWVDb250cm9sbGVyID0gIWNvbnRyb2xsZXJJc1ByZXNlbnRSZWdleC50ZXN0KHVybElucHV0KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXNlVXJsID0gdGhpcy5nZXRVcmxQYXRoKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcik7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gYmFzZVVybCArICh1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaCA/IHVybElucHV0IDogKCcvJyArIHVybElucHV0KSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBUT0RPIE1HQSA6IHVzaW5nIG1ldGhvZCBmcm9tIExheW91dC5qcyA6IHRvIGRvY3VtZW50IHRvIG5vdCBoYW5kbGUgZHVwbGljYXRlIGNvZGUgISFcclxuICAgICAgICAvL1RPRE8gTUdBIDogbWFrZSBpdCBjYXBhYmxlIG9mIGhhbmRsaW5nIGZ1bGwgVVJMcyBvdXRzaWRlIG9mIE9FIDogZG8gbm90IHVzZSA/PyBob3cgdG8gP1xyXG4gICAgICAgIHByaXZhdGUgZ2V0VXJsUGF0aChhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXIpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXNlVXJsUmVnZXggPSAvKFxcL1xcdytcXC9cXChTXFwoXFx3K1xcKVxcKSlcXC9cXHcrLztcclxuICAgICAgICAgICAgdmFyIHVybCA9IHRoaXMuJHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZTtcclxuICAgICAgICAgICAgdmFyIGJhc2VVcmxNYXRjaGVzID0gYmFzZVVybFJlZ2V4LmV4ZWModXJsKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChiYXNlVXJsTWF0Y2hlcy5sZW5ndGggJiYgYmFzZVVybE1hdGNoZXMubGVuZ3RoID09PSAyKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGJhc2VVcmxXaXRoQ29udHJvbGxlck5hbWUgPSBiYXNlVXJsTWF0Y2hlc1swXTtcclxuICAgICAgICAgICAgICAgIHZhciBiYXNlVXJsID0gYmFzZVVybE1hdGNoZXNbMV07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBiYXNlVXJsV2l0aENvbnRyb2xsZXJOYW1lO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmFzZVVybDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuICcnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQTogT00tc3BlY2lmaWMgQVNQIE1WQyBjb2RlLCBub3QgdXNlZCBBVE0sIHRvIHJlbW92ZVxyXG4gICAgICAgIHByaXZhdGUgZ2V0Q3VycmVudFNlc3Npb25JRCgpIHtcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBtYWdpYyByZWdleHAgdG8gZmV0Y2ggU2Vzc2lvbklEIGluIFVSTCwgdG8gc3RvcmUgZWxzZXdoZXJlICFcclxuICAgICAgICAgICAgdmFyIHNlc3Npb25SZWdleCA9IC9odHRwczpcXC9cXC9bXFx3Ll0rXFwvW1xcdy5dK1xcLyhcXChTXFwoXFx3K1xcKVxcKSlcXC8uKi87XHJcbiAgICAgICAgICAgIC8vdmFyIHNlc3Npb25SZWdleCA9IC9odHRwczpcXC9cXC9bXFx3Ll0rXFwvT3JkZXJFbnRyeVxcLyhcXChTXFwoXFx3K1xcKVxcKSlcXC8uKi87XHJcblxyXG4gICAgICAgICAgICAvLyBUT0RPIE1HQSA6IHVwZGF0ZSByZWdleHAgdG8gdGhlIG9uZSBiZWxvd1xyXG4gICAgICAgICAgICAvL3ZhciBiYXNlVXJsUmVnZXggPSAvKGh0dHBzOlxcL1xcL1tcXHcuLV0rXFwvW1xcdy4tXStcXC9cXChTXFwoXFx3K1xcKVxcKVxcLylcXHcrLztcclxuXHJcblxyXG4gICAgICAgICAgICB2YXIgcGF0aCA9IHRoaXMuJGxvY2F0aW9uLmFic1VybCgpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHJlZ2V4cEFycmF5ID0gc2Vzc2lvblJlZ2V4LmV4ZWMocGF0aCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXJlZ2V4cEFycmF5KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJVbmFibGUgdG8gcmVjb2duaXplZCBzZWFyY2hlZCBwYXR0ZXJuIGluIGN1cnJlbnQgdXJsIGxvY2F0aW9uIHRvIHJldHJpZXZlIHNlc3Npb25JRC5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVnZXhwQXJyYXkubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJVbmFibGUgdG8gZmluZCBzZXNzaW9uSUQgaW4gc2VhcmNoZWQgcGF0dGVybiBpbiBjdXJyZW50IHVybC5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVnZXhwQXJyYXkubGVuZ3RoID4gMikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKFwiVG9vIG1hbnkgbWF0Y2hlcyBmb3VuZCBmb3IgdGhlIHNlc3Npb25JRCBzZWFyY2ggaW4gdGhlIGN1cnJlbnQgdXJsLlwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gcmVnZXhwQXJyYXlbMV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgnbmcuaHR0cFdyYXBwZXInLCBbJ3RvYXN0ZXInLCAnbmdGaWxlVXBsb2FkJ10pXHJcbiAgICAgICAgLy8gZG9uZSBpbiBjb25maWd1cmVIdHRwQ2FsbCBtZXRob2QuXHJcbiAgICAgICAgLy8uY29uZmlnKFsnJGh0dHBQcm92aWRlcicsICgkaHR0cFByb3ZpZGVyOiBuZy5JSHR0cFByb3ZpZGVyKSA9PiB7XHJcbiAgICAgICAgLy8gICAgJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vblsnWC1SZXF1ZXN0ZWQtV2l0aCddID0gJ1hNTEh0dHBSZXF1ZXN0JztcclxuICAgICAgICAvL31dKVxyXG4gICAgICAgIC5zZXJ2aWNlKCdodHRwV3JhcHBlclNlcnZpY2UnLCBIdHRwV3JhcHBlclNlcnZpY2UpO1xyXG59Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
