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
                        if (!url || method === null || method === undefined) {
                            _this.$log.error("URL & METHOD parameters are necessary for httpWrapper calls. Aborting.");
                            return null;
                        }
                        //TODO MGA: hard cast is not safe, we may forget to set url & method parameters. TOFIX.
                        // automatically get all non-filtered parameters & keep them for this new object.
                        var configFull = config;
                        //TODO MGA: support mapping between upload & post here ?
                        configFull.method = HttpMethod[method];
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
                    return this.ajax(HttpMethod.GET, url, config);
                };
                HttpWrapperService.prototype.delete = function (url, config) {
                    return this.ajax(HttpMethod.GET, url, config);
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
                    this.initPromise.then(function () {
                        config = _this.configureHttpCall(HttpMethod.POST, url, config);
                        if (config.uploadInBase64Json) {
                            //TODO MGA: make sure this delays next call and upload is not done before base64 encoding is finished, even if promise is already resolved ???
                            return _this.Upload.base64DataUrl(file).then(function (fileBase64Url) {
                                //TODO MGA: decide best behavior ? upload takes url params for target & file as payload ?
                                config.data = config.data || {};
                                config.data.fileBase64Url = fileBase64Url;
                                return config;
                            });
                        }
                        else {
                            config.data = {
                                file: file,
                                //fileName: 'doc.jpg' or ['1.jpg', '2.jpg', ...] // to modify the name of the file(s)
                                fileFormDataName: 'file' // file formData name ('Content-Disposition'), server side request form name
                            };
                            return config;
                        }
                    }).then(function (config) {
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
                HttpWrapperService.prototype.ajax = function (method, url, config) {
                    var _this = this;
                    //TODO MGA : make sure initPromise resolve automatically without overhead once first call sucessfull.
                    return this.initPromise.then(function () {
                        return _this.$http(_this.configureHttpCall(HttpMethod.GET, url, config))
                            .then(_this.success(url), _this.error)
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHAtd3JhcHBlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBDQUEwQztBQUMxQyxJQUFPLE9BQU8sQ0F3V2I7QUF4V0QsV0FBTyxPQUFPO0lBQUMsSUFBQSxJQUFJLENBd1dsQjtJQXhXYyxXQUFBLElBQUk7UUFBQyxJQUFBLFFBQVEsQ0F3VzNCO1FBeFdtQixXQUFBLFFBQVEsRUFBQyxDQUFDO1lBZTFCLElBQUssVUFBcUM7WUFBMUMsV0FBSyxVQUFVO2dCQUFHLHlDQUFHLENBQUE7Z0JBQUUsMkNBQUksQ0FBQTtnQkFBRSx5Q0FBRyxDQUFBO2dCQUFFLCtDQUFNLENBQUE7WUFBQyxDQUFDLEVBQXJDLFVBQVUsS0FBVixVQUFVLFFBQTJCO1lBQUEsQ0FBQztZQXlCM0M7O2VBRUc7WUFDSDtnQkFPSSxZQUFZO2dCQUVaLGNBQWM7Z0JBRWQsZUFBZTtnQkFDZiw0QkFDWSxLQUFzQixFQUN0QixPQUEwQixFQUMxQixJQUFvQixFQUNwQixFQUFnQixFQUNoQixTQUE4QixFQUM5QixNQUEyQyxFQUMzQyxPQUFrQztvQkFuQmxELGlCQXFUQztvQkF4U2UsVUFBSyxHQUFMLEtBQUssQ0FBaUI7b0JBQ3RCLFlBQU8sR0FBUCxPQUFPLENBQW1CO29CQUMxQixTQUFJLEdBQUosSUFBSSxDQUFnQjtvQkFDcEIsT0FBRSxHQUFGLEVBQUUsQ0FBYztvQkFDaEIsY0FBUyxHQUFULFNBQVMsQ0FBcUI7b0JBQzlCLFdBQU0sR0FBTixNQUFNLENBQXFDO29CQUMzQyxZQUFPLEdBQVAsT0FBTyxDQUEyQjtvQkE2RjlDOzs7Ozs7OztzQkFRRTtvQkFDTSxzQkFBaUIsR0FBRyxVQUFDLE1BQWtCLEVBQUUsR0FBVyxFQUFFLE1BQTBCO3dCQUVwRixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLE1BQU0sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDOzRCQUNsRCxLQUFJLENBQUMsSUFBSSxDQUFDLEtBQUss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LENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUN6QixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxxRUFBcUUsQ0FBQyxDQUFDO3dCQUN2RixNQUFNLENBQUMsRUFBRSxDQUFDO29CQUNkLENBQUM7b0JBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUIsQ0FBQztnQkFHTCx5QkFBQztZQUFELENBclRBLEFBcVRDLElBQUE7WUFyVFksMkJBQWtCLHFCQXFUOUIsQ0FBQTtZQUVELE9BQU8sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7aUJBS3hELE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELENBQUMsRUF4V21CLFFBQVEsR0FBUixhQUFRLEtBQVIsYUFBUSxRQXdXM0I7SUFBRCxDQUFDLEVBeFdjLElBQUksR0FBSixZQUFJLEtBQUosWUFBSSxRQXdXbEI7QUFBRCxDQUFDLEVBeFdNLE9BQU8sS0FBUCxPQUFPLFFBd1diIiwiZmlsZSI6Imh0dHAtd3JhcHBlci5zZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vPHJlZmVyZW5jZSBwYXRoPVwiX2FwcF9yZWZlcmVuY2VzLnRzXCIgLz5cclxubW9kdWxlIGJsdWVza3kuY29yZS5zZXJ2aWNlcyB7XHJcblxyXG4gICAgaW1wb3J0IEFwaUNvbmZpZyA9IGJsdWVza3kuY29yZS5tb2RlbHMuQXBpQ29uZmlnO1xyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUh0dHBXcmFwcGVyQ29uZmlnIGV4dGVuZHMgbmcuSVJlcXVlc3RTaG9ydGN1dENvbmZpZyB7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogbWFpbiBBUEkgZW5kcG9pbnQgdG8gdXNlIGFzIGRlZmF1bHQgb25lIGlmIHVybCBpcyBub3QgZnVsbC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBhcGlFbmRwb2ludD86IGJvb2xlYW47XHJcbiAgICAgICAgZmlsZT86IEZpbGUsXHJcbiAgICAgICAgdXBsb2FkSW5CYXNlNjRKc29uPzogYm9vbGVhbjtcclxuICAgICAgICB1cGxvYWRQcm9ncmVzcz86ICgpID0+IGFueTtcclxuICAgICAgICBkaXNhYmxlWG1sSHR0cFJlcXVlc3RIZWFkZXI/OiBib29sZWFuO1xyXG4gICAgfVxyXG5cclxuICAgIGVudW0gSHR0cE1ldGhvZCB7IEdFVCwgUE9TVCwgUFVULCBERUxFVEUgfTtcclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElIdHRwV3JhcHBlclNlcnZpY2Uge1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBBbGwgc3J2LXNpZGUgY29uZmlndXJhdGlvbiBvZiBtYWluIEFQSSBwcm92aWRlZCBieSB0aGUgZG9tYWluIGZyb20gd2hpY2ggdGhpcyBzY3JpcHQgd2FzIGxvYWRlZCwgQCB0aGUgdXJsICdDb3JlQXBpQXV0aC9HZXRDb3JlQXBpQ29uZmlnJy5cclxuICAgICAgICAgKiBUT0RPIE1HQSBmaXggaGFyZCBjb2RlZCBwYXRoLlxyXG4gICAgICAgICAqIFRoaXMgY29uZmlndXJhdGlvbiBkYXRhIGlzIGxvYWRlZCB1cG9uIGluaXRpYWxpemF0aW9uIG9mIHRoaXMgc2VydmljZSAodG8gYmUgdXNlZCBhcyBhIHNpbmdsZXRvbiBpbiB0aGUgYXBwKS4gQWxsIG90aGVyIHdlYiBjYWxscyBhcmUgYmxvY2tlZCBhcyBsb25nIGFzIHRoaXMgb25lIGlzIG5vdCBmaW5pc2hlZC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBhcGlDb25maWc6IEFwaUNvbmZpZztcclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQTogZm9yIGZvbGxvd2luZyBtZXRob2RzLCByZXR1cm4gSVByb21pc2UgYW5kIGFzc3VtZSBhYnN0cmFjdGlvbiBvciBsZXQgYmVsb3cgc2VydmljZXMgaGFuZGxlIElIdHRwUHJvbWlzZXMgP1xyXG5cclxuICAgICAgICBnZXQ8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBkZWxldGU8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBwb3N0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICBwdXQ8VD4odXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIC8vVE9ETyBNR0EgaW1wcm92ZSB0eXBpbmcgd2l0aCBhbmd1bGFyLXVwbG9hZCB0c2QgZXRjXHJcbiAgICAgICAgdXBsb2FkPFQ+KHVybDogc3RyaW5nLCBmaWxlOiBGaWxlLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRPRE8gTUdBIDogdGhpcyBtYXkgbm90IG5lZWQgdG8gYmUgYSBkZWRpY2F0ZWQgc2VydmljZSwgaXQgY2FuIGFsc28gYmUgaW5jb3Jwb3JhdGVkIGludG8gdGhlIGh0dHBJbnRlcmNlcHRvci4gRGVjaWRlIGJlc3QgYXBwcm9hY2ggZGVwZW5kaW5nIG9uIHBsYW5uZWQgdXNlLlxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgSHR0cFdyYXBwZXJTZXJ2aWNlIGltcGxlbWVudHMgSUh0dHBXcmFwcGVyU2VydmljZSB7XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwcm9wZXJ0aWVzXHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5pdFByb21pc2U6IG5nLklQcm9taXNlPGFueT47XHJcbiAgICAgICAgcHVibGljIGFwaUNvbmZpZzogQXBpQ29uZmlnO1xyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIGN0b3JcclxuXHJcbiAgICAgICAgLyogQG5nSW5qZWN0ICovXHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGh0dHA6IG5nLklIdHRwU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkbG9nOiBuZy5JTG9nU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRsb2NhdGlvbjogbmcuSUxvY2F0aW9uU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSBVcGxvYWQ6IG5nLmFuZ3VsYXJGaWxlVXBsb2FkLklVcGxvYWRTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlIHRvYXN0ZXI6IG5ndG9hc3Rlci5JVG9hc3RlclNlcnZpY2VcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgLy8gaW5pdCBjb3JlIGFwaSBjb25maWcgZGF0YSBvbiBjdG9yXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBoYXJkIGNvZGVkIHBhdGggZm9yIENvcmVyQXBpQXV0aEN0cmwgdG8gaW5qZWN0XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdFByb21pc2UgPSB0aGlzLiRodHRwLmdldDxBcGlDb25maWc+KHRoaXMudHJ5R2V0RnVsbFVybCgnQ29yZUFwaUF1dGgvR2V0Q29yZUFwaUNvbmZpZycpKVxyXG4gICAgICAgICAgICAgICAgLnN1Y2Nlc3MoKGNvcmVBcGlDb25maWcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwaUNvbmZpZyA9IGNvcmVBcGlDb25maWc7XHJcbiAgICAgICAgICAgICAgICB9KS5lcnJvcigoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ1VuYWJsZSB0byByZXRyaWV2ZSBBUEkgY29uZmlnLiBBYm9ydGluZyBodHRwV3JhcHBlclNlcnZpY2UgaW5pdGlhbGl6YXRpb24uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICAvLyNyZWdpb24gcHVibGljIG1ldGhvZHNcclxuXHJcbiAgICAgICAgZ2V0PFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5HRVQsIHVybCwgY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlbGV0ZTxUPih1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuR0VULCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwb3N0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xyXG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGRhdGEgfHwgY29uZmlnLmRhdGE7O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuUE9TVCwgdXJsLCBjb25maWcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHV0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xyXG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGRhdGEgfHwgY29uZmlnLmRhdGE7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5QVVQsIHVybCwgY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwbG9hZDxUPih1cmw6IHN0cmluZywgZmlsZTogRmlsZSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG5cclxuICAgICAgICAgICAgaWYgKCFmaWxlICYmICghY29uZmlnIHx8ICFjb25maWcuZmlsZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignQ2Fubm90IHN0YXJ0IHVwbG9hZCB3aXRoIG51bGwge2ZpbGV9IHBhcmFtZXRlci4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XHJcbiAgICAgICAgICAgIGNvbmZpZy5maWxlID0gZmlsZSB8fCBjb25maWcuZmlsZTsgLy9UT0RPIE1HQSA6IGRvIG5vdCBleHBvc2UgZmlsZSBpbiBJSHR0cFdyYXBwZXJDb25maWcgP1xyXG5cclxuICAgICAgICAgICAgdGhpcy5pbml0UHJvbWlzZS50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZyA9IHRoaXMuY29uZmlndXJlSHR0cENhbGwoSHR0cE1ldGhvZC5QT1NULCB1cmwsIGNvbmZpZyk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGNvbmZpZy51cGxvYWRJbkJhc2U2NEpzb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBtYWtlIHN1cmUgdGhpcyBkZWxheXMgbmV4dCBjYWxsIGFuZCB1cGxvYWQgaXMgbm90IGRvbmUgYmVmb3JlIGJhc2U2NCBlbmNvZGluZyBpcyBmaW5pc2hlZCwgZXZlbiBpZiBwcm9taXNlIGlzIGFscmVhZHkgcmVzb2x2ZWQgPz8/XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuVXBsb2FkLmJhc2U2NERhdGFVcmwoZmlsZSkudGhlbigoZmlsZUJhc2U2NFVybCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBkZWNpZGUgYmVzdCBiZWhhdmlvciA/IHVwbG9hZCB0YWtlcyB1cmwgcGFyYW1zIGZvciB0YXJnZXQgJiBmaWxlIGFzIHBheWxvYWQgP1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWcuZGF0YSA9IGNvbmZpZy5kYXRhIHx8IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25maWcuZGF0YS5maWxlQmFzZTY0VXJsID0gZmlsZUJhc2U2NFVybDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjb25maWc7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5kYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlOiBmaWxlLCAvLyBzaW5nbGUgZmlsZSBvciBhIGxpc3Qgb2YgZmlsZXMuIGxpc3QgaXMgb25seSBmb3IgaHRtbDVcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9maWxlTmFtZTogJ2RvYy5qcGcnIG9yIFsnMS5qcGcnLCAnMi5qcGcnLCAuLi5dIC8vIHRvIG1vZGlmeSB0aGUgbmFtZSBvZiB0aGUgZmlsZShzKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlRm9ybURhdGFOYW1lOiAnZmlsZScgLy8gZmlsZSBmb3JtRGF0YSBuYW1lICgnQ29udGVudC1EaXNwb3NpdGlvbicpLCBzZXJ2ZXIgc2lkZSByZXF1ZXN0IGZvcm0gbmFtZVxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbmZpZztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSkudGhlbigoY29uZmlnKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBIDogbm90IHNhZmUgaGFyZCBjYXN0XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5VcGxvYWQudXBsb2FkPFQ+KDxuZy5hbmd1bGFyRmlsZVVwbG9hZC5JRmlsZVVwbG9hZENvbmZpZ0ZpbGU+Y29uZmlnKVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuPFQ+KHRoaXMuc3VjY2VzczxUPih1cmwpLCB0aGlzLmVycm9yLCBjb25maWcudXBsb2FkUHJvZ3Jlc3MpIC8vVE9ETyBNR0EgOiB1cGxvYWRQcm9ncmVzcyBjYWxsYmFjayBvayA/XHJcbiAgICAgICAgICAgICAgICAgICAgLmZpbmFsbHkodGhpcy5maW5hbGx5KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwcml2YXRlIG1ldGhvZHNcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVXRpbGl0eSBtZXRob2QuXHJcbiAgICAgICAgICogTWFpbiBjYWxsZXIgdGhhdCBhbGwgd3JhcHBlciBjYWxscyAoZ2V0LCBkZWxldGUsIHBvc3QsIHB1dCkgbXVzdCB1c2UgdG8gc2hhcmUgY29tbW9uIGJlaGF2aW9yLlxyXG4gICAgICAgICAqIEBwYXJhbSBjb25maWdcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGFqYXg8VD4obWV0aG9kOiBIdHRwTWV0aG9kLCB1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKSB7XHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBtYWtlIHN1cmUgaW5pdFByb21pc2UgcmVzb2x2ZSBhdXRvbWF0aWNhbGx5IHdpdGhvdXQgb3ZlcmhlYWQgb25jZSBmaXJzdCBjYWxsIHN1Y2Vzc2Z1bGwuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluaXRQcm9taXNlLnRoZW4oKCkgPT5cclxuICAgICAgICAgICAgICAgIHRoaXMuJGh0dHA8VD4odGhpcy5jb25maWd1cmVIdHRwQ2FsbChIdHRwTWV0aG9kLkdFVCwgdXJsLCBjb25maWcpKVxyXG4gICAgICAgICAgICAgICAgICAgIC50aGVuPFQ+KHRoaXMuc3VjY2VzczxUPih1cmwpLCB0aGlzLmVycm9yKVxyXG4gICAgICAgICAgICAgICAgICAgIC5maW5hbGx5KHRoaXMuZmluYWxseSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgKiBQcmVwYXJlcyBhIHtAbGluayBuZyMkaHR0cCNjb25maWcgY29uZmlnfSBvYmplY3QgZm9yICRodHRwIGNhbGwuXHJcbiAgICAgICAgKiBUaGUgb3BlcmF0aW9ucyBpbmNsdWRlIHNldHRpbmcgZGVmYXVsdCB2YWx1ZXMgd2hlbiBub3QgcHJvdmlkZWQsIGFuZCBzZXR0aW5nIGh0dHAgaGVhZGVycyBpZiBuZWVkZWQgZm9yIDpcclxuICAgICAgICAqICAtIEFqYXggY2FsbHNcclxuICAgICAgICAqICAtIEF1dGhvcml6YXRpb24gdG9rZW5cclxuICAgICAgICAqICAtIEN1cnJlbnQgVXNlclJvbGUuICAgXHJcbiAgICAgICAgKiBAcGFyYW0gb3B0aW9uc1xyXG4gICAgICAgICogQHJldHVybnMge25nLiRodHRwLmNvbmZpZ30gdGhlIGNvbmZpZ3VyYXRpb24gb2JqZWN0IHJlYWR5IHRvIGJlIGluamVjdGVkIGludG8gYSAkaHR0cCBjYWxsLiBcclxuICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgY29uZmlndXJlSHR0cENhbGwgPSAobWV0aG9kOiBIdHRwTWV0aG9kLCB1cmw6IHN0cmluZywgY29uZmlnOiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUmVxdWVzdENvbmZpZyA9PiB7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXVybCB8fCBtZXRob2QgPT09IG51bGwgfHwgbWV0aG9kID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihcIlVSTCAmIE1FVEhPRCBwYXJhbWV0ZXJzIGFyZSBuZWNlc3NhcnkgZm9yIGh0dHBXcmFwcGVyIGNhbGxzLiBBYm9ydGluZy5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFyZCBjYXN0IGlzIG5vdCBzYWZlLCB3ZSBtYXkgZm9yZ2V0IHRvIHNldCB1cmwgJiBtZXRob2QgcGFyYW1ldGVycy4gVE9GSVguXHJcbiAgICAgICAgICAgIC8vIGF1dG9tYXRpY2FsbHkgZ2V0IGFsbCBub24tZmlsdGVyZWQgcGFyYW1ldGVycyAmIGtlZXAgdGhlbSBmb3IgdGhpcyBuZXcgb2JqZWN0LlxyXG4gICAgICAgICAgICB2YXIgY29uZmlnRnVsbCA9IDxuZy5JUmVxdWVzdENvbmZpZz5jb25maWc7XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBOiBzdXBwb3J0IG1hcHBpbmcgYmV0d2VlbiB1cGxvYWQgJiBwb3N0IGhlcmUgP1xyXG4gICAgICAgICAgICBjb25maWdGdWxsLm1ldGhvZCA9IEh0dHBNZXRob2RbbWV0aG9kXTtcclxuICAgICAgICAgICAgY29uZmlnRnVsbC51cmwgPSB1cmw7XHJcblxyXG4gICAgICAgICAgICBpZiAoY29uZmlnLmFwaUVuZHBvaW50ICYmICghdGhpcy5hcGlDb25maWcgfHxcclxuICAgICAgICAgICAgICAgICF0aGlzLmFwaUNvbmZpZy5qd3RUb2tlbiB8fFxyXG4gICAgICAgICAgICAgICAgIXRoaXMuYXBpQ29uZmlnLmN1cnJlbnRVc2VyUm9sZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignW0ludGVybmFsRXJyb3JdIGNvcmVBcGkgY2FsbCBpbnRlbmRlZCB3aXRob3V0IG5lY2Vzc2FyeSBjYXBpIGNyZWRlbnRpYWxzLiBBYm9ydGluZy4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25maWdGdWxsLmhlYWRlcnMgPSBjb25maWcuaGVhZGVycyB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgIGlmICghY29uZmlnLmFwaUVuZHBvaW50KSB7IC8vIGlmIG5vdCBzZXQsIGV2YWx1YXRlcyB0byBmYWxzZVxyXG4gICAgICAgICAgICAgICAgY29uZmlnRnVsbC51cmwgPSB0aGlzLnRyeUdldEZ1bGxVcmwodXJsKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBjb3JlIGFwaSBlbmRwb2ludCAnYXBpLycgaGFyZGNvZGVkLCB0byBwdXQgaW4gY29uZmlnRnVsbCAhIHNob3VsZCBub3Qga25vdyB0aGF0IGhlcmUuXHJcbiAgICAgICAgICAgICAgICBjb25maWdGdWxsLnVybCA9IHRoaXMuYXBpQ29uZmlnLmNvcmVBcGlVcmwgKyAnYXBpLycgKyB1cmw7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYXBpQ29uZmlnLmp3dFRva2VuICYmIHRoaXMuYXBpQ29uZmlnLmN1cnJlbnRVc2VyUm9sZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhcmQgY29kZWQgaGVhZGVycywgbm90IGdvb2QsIHRvIGluamVjdFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwuaGVhZGVyc1snT0EtVXNlclJvbGUnXSA9IHRoaXMuYXBpQ29uZmlnLmN1cnJlbnRVc2VyUm9sZTtcclxuICAgICAgICAgICAgICAgICAgICBjb25maWdGdWxsLmhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9ICdCZWFyZXIgJyArIHRoaXMuYXBpQ29uZmlnLmp3dFRva2VuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIWNvbmZpZy5kaXNhYmxlWG1sSHR0cFJlcXVlc3RIZWFkZXIpIC8vIGlmIG5vdCBzZXQsIGV2YWx1YXRlcyB0byBmYWxzZVxyXG4gICAgICAgICAgICAgICAgY29uZmlnRnVsbC5oZWFkZXJzWydYLVJlcXVlc3RlZC1XaXRoJ10gPSAnWE1MSHR0cFJlcXVlc3QnO1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogT0Ugc3BlY2lmaWMgY29kZSwgdG8gcmVtb3ZlXHJcbiAgICAgICAgICAgIGlmICgoPGFueT50aGlzLiR3aW5kb3cpLnByZXZlbnRCbG9ja1VJICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPIE1HQSA6IHR5cGUgY2FzdGluZywgaXMgaXQgb2theSBvciBub3QgPyBiZXR0ZXIgYXBwcm9hY2ggP1xyXG4gICAgICAgICAgICAgICAgKDxhbnk+dGhpcy4kd2luZG93KS5wcmV2ZW50QmxvY2tVSSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gY29uZmlnRnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFN1Y2Nlc3MgaGFuZGxlclxyXG4gICAgICAgICAqIFRPRE8gTUdBIDogd2hhdCBpcyB1cmwgdXNlZCBmb3IgPz8/XHJcbiAgICAgICAgICogQHBhcmFtIHVybCBcclxuICAgICAgICAgKiBAcmV0dXJucyB7fSBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIHN1Y2Nlc3MgPSA8VD4odXJsOiBzdHJpbmcpOiAocHJvbWlzZUNhbGxiYWNrOiBuZy5JSHR0cFByb21pc2VDYWxsYmFja0FyZzxUPikgPT4gVCB8IG5nLklQcm9taXNlPGFueT4gPT4ge1xyXG5cclxuICAgICAgICAgICAgLy8gSlMgdHJpY2sgOiBjYXB0dXJlIHVybCB2YXJpYWJsZSBpbnNpZGUgY2xvc3VyZSBzY29wZSB0byBzdG9yZSBpdCBmb3IgY2FsbGJhY2sgd2hpY2ggY2Fubm90IGJlIGNhbGxlZCB3aXRoIDIgYXJndW1lbnRzXHJcbiAgICAgICAgICAgIHJldHVybiAocHJvbWlzZUNhbGxiYWNrOiBuZy5JSHR0cFByb21pc2VDYWxsYmFja0FyZzxUPik6IFQgfCBuZy5JUHJvbWlzZTxhbnk+ID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXByb21pc2VDYWxsYmFjayB8fCAhcHJvbWlzZUNhbGxiYWNrLmRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiB0aGluayBhYm91dCB0aGlzIC4uLiBNYXkgbm90IGJlIGFjY3VyYXRlID8gb3IgbWF5IG5vdCBiZSBhbiBlcnJvciBpZiByZXR1cm4gdHlwZSBpcyBudWxsIGluIGNhc2Ugbm8gZGF0YSBmb3VuZFxyXG4gICAgICAgICAgICAgICAgICAgIC8vcmVzcG9uc2Uuc3RhdHVzID0gNTAzO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihwcm9taXNlQ2FsbGJhY2spO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudG9hc3Rlci53YXJuaW5nKCdVbmV4cGVjdGVkIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlcicsICdDYWxsIHN1Y2Nlc3NmdWxsLCBidXQgbm8gZGF0YSBmb3VuZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBIDogZmluZCBvdXQgaG93IHRvIGhhbmRsZSB0aGF0IGFzIHRvIGV4cGVjdGQgcmV0dXJuIHR5cGUgP1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRxLnJlamVjdChwcm9taXNlQ2FsbGJhY2spOyAvLyBSZWplY3QgcHJvbWlzZSBpZiBub3Qgd2VsbC1mb3JtZWQgZGF0YVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5kZWJ1Zyhwcm9taXNlQ2FsbGJhY2spO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiBwcm9taXNlQ2FsbGJhY2suZGF0YTsgLy8gcmV0dXJuIG9ubHkgdGhlIGRhdGEgZXhwZWN0ZWQgZm9yIGNhbGxlclxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRXJyb3IgaGFuZGxlclxyXG4gICAgICAgICAqIEBwYXJhbSByZXNwb25zZSBcclxuICAgICAgICAgKiBAcmV0dXJucyB7fSBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGVycm9yID0gKHJlc3BvbnNlOiBuZy5JSHR0cFByb21pc2VDYWxsYmFja0FyZzxhbnk+KTogbmcuSVByb21pc2U8bmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8YW55Pj4gPT4geyAvLyBkbyBzb21ldGhpbmcgb24gZXJyb3JcclxuXHJcbiAgICAgICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLmRhdGEpIHtcclxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEgPSAnU2VydmVyIG5vdCByZXNwb25kaW5nJztcclxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLnN0YXR1cyA9IDUwMztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBTdHJpbmcocmVzcG9uc2UuZGF0YSkgKyAnXFxuIFN0YXR1czogJyArIHJlc3BvbnNlLnN0YXR1cy50b1N0cmluZygpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy50b2FzdGVyLmVycm9yKCdTZXJ2ZXIgcmVzcG9uc2UgZXJyb3InLCBtZXNzYWdlKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihyZXNwb25zZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBXZSBkb24ndCByZWNvdmVyIGZyb20gZXJyb3IsIHNvIHdlIHByb3BhZ2F0ZSBpdCA6IGJlbG93IGhhbmRsZXJzIGhhdmUgdGhlIGNob2ljZSBvZiByZWFkaW5nIHRoZSBlcnJvciB3aXRoIGFuIGVycm9yIGhhbmRsZXIgb3Igbm90LiBTZWUgJHEgcHJvbWlzZXMgYmVoYXZpb3IgaGVyZSA6IGh0dHBzOi8vZ2l0aHViLmNvbS9rcmlza293YWwvcVxyXG4gICAgICAgICAgICAvLyBUaGlzIGJlaGF2aW9yIGlzIGRlc2lyZWQgc28gdGhhdCB3ZSBzaG93IGVycm9yIGluc2lkZSBzcGVjaWZpYyBzZXJ2ZXIgY29tbXVuaWNhdGlvbiBtb2RhbHMgYXQgc3BlY2lmaWMgcGxhY2VzIGluIHRoZSBhcHAsIG90aGVyd2lzZSBzaG93IGEgZ2xvYmFsIGFsZXJ0IG1lc3NhZ2UsIG9yIGV2ZW4gZG8gbm90IHNob3cgYW55dGhpbmcgaWYgbm90IG5lY2Vzc2FyeSAoZG8gbm90IGFkIGFuIGVycm9yIGhhbmRsZXIgaW4gYmVsb3cgaGFuZGxlcnMgb2YgdGhpcyBwcm9taXNlKS5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHEucmVqZWN0KHJlc3BvbnNlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEZ1bmN0aW9uIGNhbGxlZCBhdCB0aGUgZW5kIG9mIGFuIGFqYXggY2FsbCwgcmVnYXJkbGVzcyBvZiBpdCdzIHN1Y2Nlc3Mgb3IgZmFpbHVyZS5cclxuICAgICAgICAgKiBAcGFyYW0gcmVzcG9uc2VcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGZpbmFsbHkgPSAoKTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IE9FLXNwZWNpZmljIGNvZGVcclxuICAgICAgICAgICAgaWYgKCg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgIT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8gTUdBIDogdHlwZSBjYXN0aW5nLCBpcyBpdCBva2F5IG9yIG5vdCA/IGJldHRlciBhcHByb2FjaCA/XHJcbiAgICAgICAgICAgICAgICAoPGFueT50aGlzLiR3aW5kb3cpLnByZXZlbnRCbG9ja1VJID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL1RPRE8gTUdBIDogbWV0aG9kIHRvIGRvY3VtZW50IGFuZCBpbXByb3ZlIHJvYnVzdG5lc3MgKyB1c2UgaW4gT0Ugb3V0c2lkZSBvZiBhbmd1bGFyIC8vIG11dHVhbGl6ZVxyXG4gICAgICAgIC8vIFRyaWVzIHRvIHBhcnNlIHRoZSBpbnB1dCB1cmwgOlxyXG4gICAgICAgIC8vIElmIGl0IHNlZW1zIHRvIGJlIGEgZnVsbCBVUkwsIHRoZW4gcmV0dXJuIGFzIGlzIChjb25zaWRlcnMgaXQgZXh0ZXJuYWwgVXJsKVxyXG4gICAgICAgIC8vIE90aGVyd2lzZSwgdHJpZXMgdG8gZmluZCB0aGUgYmFzZSBVUkwgb2YgdGhlIGN1cnJlbnQgQmx1ZVNreSBhcHAgd2l0aCBvciB3aXRob3V0IHRoZSBpbmNsdWRlZCBDb250cm9sbGVyIGFuZCByZXR1cm5zIHRoZSBmdWxsIFVybFxyXG4gICAgICAgIHByaXZhdGUgdHJ5R2V0RnVsbFVybCh1cmxJbnB1dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICAgICAgLy8gVXJsIHN0YXJ0cyB3aXRoIGh0dHA6Ly8gb3IgaHR0cHM6Ly8gPT4gbGVhdmUgYXMgdGhpc1xyXG4gICAgICAgICAgICBpZiAodXJsSW5wdXQuc2xpY2UoMCwgJ2h0dHA6Ly8nLmxlbmd0aCkgPT09ICdodHRwOi8vJyB8fFxyXG4gICAgICAgICAgICAgICAgdXJsSW5wdXQuc2xpY2UoMCwgJ2h0dHBzOi8vJy5sZW5ndGgpID09PSAnaHR0cHM6Ly8nKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdXJsSW5wdXQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEJvb2xlYW4gdXNlZCB0byB0cnkgdG8gZGV0ZXJtaW5lIGNvcnJlY3QgZnVsbCB1cmwgKGFkZCAvIG9yIG5vdCBiZWZvcmUgdGhlIHVybCBmcmFnbWVudCBkZXBlbmRpbmcgb24gaWYgZm91bmQgb3Igbm90KVxyXG4gICAgICAgICAgICB2YXIgdXJsRnJhZ21lbnRTdGFydHNXaXRoU2xhc2ggPSB1cmxJbnB1dC5zbGljZSgwLCAnLycubGVuZ3RoKSA9PT0gJy8nO1xyXG5cclxuICAgICAgICAgICAgLy8gUmVnZXggdHJ5aW5nIHRvIGRldGVybWluZSBpZiB0aGUgaW5wdXQgZnJhZ21lbnQgY29udGFpbnMgYSAvIGJldHdlZW4gdHdvIGNoYXJhY3RlciBzdWl0ZXMgPT4gY29udHJvbGxlciBnaXZlbiBhcyBpbnB1dCwgb3RoZXJ3aXNlLCBhY3Rpb24gb24gc2FtZSBjb250cm9sbGVyIGV4cGVjdGVkXHJcbiAgICAgICAgICAgIHZhciBjb250cm9sbGVySXNQcmVzZW50UmVnZXggPSAvXFx3K1xcL1xcdysvO1xyXG5cclxuICAgICAgICAgICAgdmFyIGFjdGlvbklzT25TYW1lQ29udHJvbGxlciA9ICFjb250cm9sbGVySXNQcmVzZW50UmVnZXgudGVzdCh1cmxJbnB1dCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgYmFzZVVybCA9IHRoaXMuZ2V0VXJsUGF0aChhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXIpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGJhc2VVcmwgKyAodXJsRnJhZ21lbnRTdGFydHNXaXRoU2xhc2ggPyB1cmxJbnB1dCA6ICgnLycgKyB1cmxJbnB1dCkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gVE9ETyBNR0EgOiB1c2luZyBtZXRob2QgZnJvbSBMYXlvdXQuanMgOiB0byBkb2N1bWVudCB0byBub3QgaGFuZGxlIGR1cGxpY2F0ZSBjb2RlICEhXHJcbiAgICAgICAgLy9UT0RPIE1HQSA6IG1ha2UgaXQgY2FwYWJsZSBvZiBoYW5kbGluZyBmdWxsIFVSTHMgb3V0c2lkZSBvZiBPRSA6IGRvIG5vdCB1c2UgPz8gaG93IHRvID9cclxuICAgICAgICBwcml2YXRlIGdldFVybFBhdGgoYWN0aW9uSXNPblNhbWVDb250cm9sbGVyKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgYmFzZVVybFJlZ2V4ID0gLyhcXC9cXHcrXFwvXFwoU1xcKFxcdytcXClcXCkpXFwvXFx3Ky87XHJcbiAgICAgICAgICAgIHZhciB1cmwgPSB0aGlzLiR3aW5kb3cubG9jYXRpb24ucGF0aG5hbWU7XHJcbiAgICAgICAgICAgIHZhciBiYXNlVXJsTWF0Y2hlcyA9IGJhc2VVcmxSZWdleC5leGVjKHVybCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoYmFzZVVybE1hdGNoZXMubGVuZ3RoICYmIGJhc2VVcmxNYXRjaGVzLmxlbmd0aCA9PT0gMikge1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBiYXNlVXJsV2l0aENvbnRyb2xsZXJOYW1lID0gYmFzZVVybE1hdGNoZXNbMF07XHJcbiAgICAgICAgICAgICAgICB2YXIgYmFzZVVybCA9IGJhc2VVcmxNYXRjaGVzWzFdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmFzZVVybFdpdGhDb250cm9sbGVyTmFtZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJhc2VVcmw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiAnJztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vVE9ETyBNR0E6IE9NLXNwZWNpZmljIEFTUCBNVkMgY29kZSwgbm90IHVzZWQgQVRNLCB0byByZW1vdmVcclxuICAgICAgICBwcml2YXRlIGdldEN1cnJlbnRTZXNzaW9uSUQoKSB7XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogbWFnaWMgcmVnZXhwIHRvIGZldGNoIFNlc3Npb25JRCBpbiBVUkwsIHRvIHN0b3JlIGVsc2V3aGVyZSAhXHJcbiAgICAgICAgICAgIHZhciBzZXNzaW9uUmVnZXggPSAvaHR0cHM6XFwvXFwvW1xcdy5dK1xcL1tcXHcuXStcXC8oXFwoU1xcKFxcdytcXClcXCkpXFwvLiovO1xyXG4gICAgICAgICAgICAvL3ZhciBzZXNzaW9uUmVnZXggPSAvaHR0cHM6XFwvXFwvW1xcdy5dK1xcL09yZGVyRW50cnlcXC8oXFwoU1xcKFxcdytcXClcXCkpXFwvLiovO1xyXG5cclxuICAgICAgICAgICAgLy8gVE9ETyBNR0EgOiB1cGRhdGUgcmVnZXhwIHRvIHRoZSBvbmUgYmVsb3dcclxuICAgICAgICAgICAgLy92YXIgYmFzZVVybFJlZ2V4ID0gLyhodHRwczpcXC9cXC9bXFx3Li1dK1xcL1tcXHcuLV0rXFwvXFwoU1xcKFxcdytcXClcXClcXC8pXFx3Ky87XHJcblxyXG5cclxuICAgICAgICAgICAgdmFyIHBhdGggPSB0aGlzLiRsb2NhdGlvbi5hYnNVcmwoKTtcclxuXHJcbiAgICAgICAgICAgIHZhciByZWdleHBBcnJheSA9IHNlc3Npb25SZWdleC5leGVjKHBhdGgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFyZWdleHBBcnJheSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKFwiVW5hYmxlIHRvIHJlY29nbml6ZWQgc2VhcmNoZWQgcGF0dGVybiBpbiBjdXJyZW50IHVybCBsb2NhdGlvbiB0byByZXRyaWV2ZSBzZXNzaW9uSUQuXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJlZ2V4cEFycmF5Lmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKFwiVW5hYmxlIHRvIGZpbmQgc2Vzc2lvbklEIGluIHNlYXJjaGVkIHBhdHRlcm4gaW4gY3VycmVudCB1cmwuXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJlZ2V4cEFycmF5Lmxlbmd0aCA+IDIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihcIlRvbyBtYW55IG1hdGNoZXMgZm91bmQgZm9yIHRoZSBzZXNzaW9uSUQgc2VhcmNoIGluIHRoZSBjdXJyZW50IHVybC5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHJlZ2V4cEFycmF5WzFdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ25nLmh0dHBXcmFwcGVyJywgWyd0b2FzdGVyJywgJ25nRmlsZVVwbG9hZCddKVxyXG4gICAgICAgIC8vIGRvbmUgaW4gY29uZmlndXJlSHR0cENhbGwgbWV0aG9kLlxyXG4gICAgICAgIC8vLmNvbmZpZyhbJyRodHRwUHJvdmlkZXInLCAoJGh0dHBQcm92aWRlcjogbmcuSUh0dHBQcm92aWRlcikgPT4ge1xyXG4gICAgICAgIC8vICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtUmVxdWVzdGVkLVdpdGgnXSA9ICdYTUxIdHRwUmVxdWVzdCc7XHJcbiAgICAgICAgLy99XSlcclxuICAgICAgICAuc2VydmljZSgnaHR0cFdyYXBwZXJTZXJ2aWNlJywgSHR0cFdyYXBwZXJTZXJ2aWNlKTtcclxufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
