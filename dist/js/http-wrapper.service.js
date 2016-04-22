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
                        var contentType = response.headers('Content-Type');
                        if (contentType && contentType.indexOf('application/json') > -1 || contentType.indexOf('text/plain') > -1) {
                            var message;
                            //TODO MGA: handle error handling more generically based on input error message contract instead of expecting specific error strcture.
                            //if (response.data.ModelState) {
                            //    //TODO MGA : handle this when well formatted server-side
                            //} else
                            if (response.data.Message) {
                                message = response.data.Message;
                            }
                            else {
                                message = response.data;
                            }
                            if (response.status === 404) {
                                _this.toaster.warning('Not Found', message);
                            }
                            else {
                                _this.toaster.error('Server response error', message + '\n Status: ' + response.status);
                            }
                        }
                        else {
                            _this.toaster.error('Internal server error', 'Status: ' + response.status);
                        }
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHAtd3JhcHBlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJDQUEyQztBQUMzQyxJQUFPLE9BQU8sQ0FrWWI7QUFsWUQsV0FBTyxPQUFPO0lBQUMsSUFBQSxJQUFJLENBa1lsQjtJQWxZYyxXQUFBLElBQUk7UUFBQyxJQUFBLFFBQVEsQ0FrWTNCO1FBbFltQixXQUFBLFFBQVEsRUFBQyxDQUFDO1lBZTFCLElBQUssVUFBcUM7WUFBMUMsV0FBSyxVQUFVO2dCQUFHLHlDQUFHLENBQUE7Z0JBQUUsMkNBQUksQ0FBQTtnQkFBRSx5Q0FBRyxDQUFBO2dCQUFFLCtDQUFNLENBQUE7WUFBQyxDQUFDLEVBQXJDLFVBQVUsS0FBVixVQUFVLFFBQTJCO1lBQUEsQ0FBQztZQTJCM0M7O2VBRUc7WUFDSDtnQkFPSSxZQUFZO2dCQUVaLGNBQWM7Z0JBRWQsZUFBZTtnQkFDZiw0QkFDWSxLQUFzQixFQUN0QixPQUEwQixFQUMxQixJQUFvQixFQUNwQixFQUFnQixFQUNoQixTQUE4QixFQUM5QixNQUEyQyxFQUMzQyxPQUFrQztvQkFuQmxELGlCQTZVQztvQkFoVWUsVUFBSyxHQUFMLEtBQUssQ0FBaUI7b0JBQ3RCLFlBQU8sR0FBUCxPQUFPLENBQW1CO29CQUMxQixTQUFJLEdBQUosSUFBSSxDQUFnQjtvQkFDcEIsT0FBRSxHQUFGLEVBQUUsQ0FBYztvQkFDaEIsY0FBUyxHQUFULFNBQVMsQ0FBcUI7b0JBQzlCLFdBQU0sR0FBTixNQUFNLENBQXFDO29CQUMzQyxZQUFPLEdBQVAsT0FBTyxDQUEyQjtvQkFxSDlDOzs7Ozs7OztzQkFRRTtvQkFDTSxzQkFBaUIsR0FBRyxVQUFDLE1BQWtCLEVBQUUsR0FBVyxFQUFFLE1BQTJCO3dCQUVyRixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLE1BQU0sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDOzRCQUNsRCxLQUFJLENBQUMsSUFBSSxDQUFDLEtBQUss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QU8sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDO2lCQUtyRSxPQUFPLENBQUMsb0JBQW9CLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxDQUFDLEVBbFltQixRQUFRLEdBQVIsYUFBUSxLQUFSLGFBQVEsUUFrWTNCO0lBQUQsQ0FBQyxFQWxZYyxJQUFJLEdBQUosWUFBSSxLQUFKLFlBQUksUUFrWWxCO0FBQUQsQ0FBQyxFQWxZTSxPQUFPLEtBQVAsT0FBTyxRQWtZYiIsImZpbGUiOiJodHRwLXdyYXBwZXIuc2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLzxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGluZ3MvdHNkLmQudHNcIiAvPlxyXG5tb2R1bGUgYmx1ZXNreS5jb3JlLnNlcnZpY2VzIHtcclxuXHJcbiAgICBpbXBvcnQgQXBpQ29uZmlnID0gYmx1ZXNreS5jb3JlLm1vZGVscy5BcGlDb25maWc7XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJSHR0cFdyYXBwZXJDb25maWcgZXh0ZW5kcyBuZy5JUmVxdWVzdFNob3J0Y3V0Q29uZmlnIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBtYWluIEFQSSBlbmRwb2ludCB0byB1c2UgYXMgZGVmYXVsdCBvbmUgaWYgdXJsIGlzIG5vdCBmdWxsLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGFwaUVuZHBvaW50PzogYm9vbGVhbjtcclxuICAgICAgICBmaWxlPzogRmlsZSxcclxuICAgICAgICB1cGxvYWRJbkJhc2U2NEpzb24/OiBib29sZWFuO1xyXG4gICAgICAgIHVwbG9hZFByb2dyZXNzPzogKCkgPT4gYW55O1xyXG4gICAgICAgIGRpc2FibGVYbWxIdHRwUmVxdWVzdEhlYWRlcj86IGJvb2xlYW47XHJcbiAgICB9XHJcblxyXG4gICAgZW51bSBIdHRwTWV0aG9kIHsgR0VULCBQT1NULCBQVVQsIERFTEVURSB9O1xyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUh0dHBXcmFwcGVyU2VydmljZSB7XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEFsbCBzcnYtc2lkZSBjb25maWd1cmF0aW9uIG9mIG1haW4gQVBJIHByb3ZpZGVkIGJ5IHRoZSBkb21haW4gZnJvbSB3aGljaCB0aGlzIHNjcmlwdCB3YXMgbG9hZGVkLCBAIHRoZSB1cmwgJ0NvcmVBcGlBdXRoL0dldENvcmVBcGlDb25maWcnLlxyXG4gICAgICAgICAqIFRPRE8gTUdBIGZpeCBoYXJkIGNvZGVkIHBhdGguXHJcbiAgICAgICAgICogVGhpcyBjb25maWd1cmF0aW9uIGRhdGEgaXMgbG9hZGVkIHVwb24gaW5pdGlhbGl6YXRpb24gb2YgdGhpcyBzZXJ2aWNlICh0byBiZSB1c2VkIGFzIGEgc2luZ2xldG9uIGluIHRoZSBhcHApLiBBbGwgb3RoZXIgd2ViIGNhbGxzIGFyZSBibG9ja2VkIGFzIGxvbmcgYXMgdGhpcyBvbmUgaXMgbm90IGZpbmlzaGVkLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGFwaUNvbmZpZzogQXBpQ29uZmlnO1xyXG5cclxuICAgICAgICAvL1RPRE8gTUdBOiBmb3IgZm9sbG93aW5nIG1ldGhvZHMsIHJldHVybiBJUHJvbWlzZSBhbmQgYXNzdW1lIGFic3RyYWN0aW9uIG9yIGxldCBiZWxvdyBzZXJ2aWNlcyBoYW5kbGUgSUh0dHBQcm9taXNlcyA/XHJcblxyXG4gICAgICAgIGdldDxUPih1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIGRlbGV0ZTxUPih1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIHBvc3Q8VD4odXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIHB1dDxUPih1cmw6IHN0cmluZywgZGF0YTogYW55LCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQSBpbXByb3ZlIHR5cGluZyB3aXRoIGFuZ3VsYXItdXBsb2FkIHRzZCBldGNcclxuICAgICAgICB1cGxvYWQ8VD4odXJsOiBzdHJpbmcsIGZpbGU6IEZpbGUsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG4gICAgICAgIFxyXG4gICAgICAgIGJ1aWxkVXJsRnJvbUNvbnRleHQodXJsSW5wdXQ6IHN0cmluZyk6IHN0cmluZztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRPRE8gTUdBIDogdGhpcyBtYXkgbm90IG5lZWQgdG8gYmUgYSBkZWRpY2F0ZWQgc2VydmljZSwgaXQgY2FuIGFsc28gYmUgaW5jb3Jwb3JhdGVkIGludG8gdGhlIGh0dHBJbnRlcmNlcHRvci4gRGVjaWRlIGJlc3QgYXBwcm9hY2ggZGVwZW5kaW5nIG9uIHBsYW5uZWQgdXNlLlxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgSHR0cFdyYXBwZXJTZXJ2aWNlIGltcGxlbWVudHMgSUh0dHBXcmFwcGVyU2VydmljZSB7XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwcm9wZXJ0aWVzXHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5pdFByb21pc2U6IG5nLklQcm9taXNlPGFueT47XHJcbiAgICAgICAgcHVibGljIGFwaUNvbmZpZzogQXBpQ29uZmlnO1xyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIGN0b3JcclxuXHJcbiAgICAgICAgLyogQG5nSW5qZWN0ICovXHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGh0dHA6IG5nLklIdHRwU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkbG9nOiBuZy5JTG9nU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRsb2NhdGlvbjogbmcuSUxvY2F0aW9uU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSBVcGxvYWQ6IG5nLmFuZ3VsYXJGaWxlVXBsb2FkLklVcGxvYWRTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlIHRvYXN0ZXI6IG5ndG9hc3Rlci5JVG9hc3RlclNlcnZpY2VcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgLy8gaW5pdCBjb3JlIGFwaSBjb25maWcgZGF0YSBvbiBjdG9yXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBoYXJkIGNvZGVkIHBhdGggZm9yIENvcmVyQXBpQXV0aEN0cmwgdG8gaW5qZWN0XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdFByb21pc2UgPSB0aGlzLiRodHRwLmdldDxBcGlDb25maWc+KHRoaXMuYnVpbGRVcmxGcm9tQ29udGV4dCgnQ29yZUFwaUF1dGgvR2V0Q29yZUFwaUNvbmZpZycpKVxyXG4gICAgICAgICAgICAgICAgLnN1Y2Nlc3MoKGNvcmVBcGlDb25maWcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwaUNvbmZpZyA9IGNvcmVBcGlDb25maWc7XHJcbiAgICAgICAgICAgICAgICB9KS5lcnJvcigoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ1VuYWJsZSB0byByZXRyaWV2ZSBBUEkgY29uZmlnLiBBYm9ydGluZyBodHRwV3JhcHBlclNlcnZpY2UgaW5pdGlhbGl6YXRpb24uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICAvLyNyZWdpb24gcHVibGljIG1ldGhvZHNcclxuXHJcbiAgICAgICAgZ2V0PFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5HRVQsIHVybCwgY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlbGV0ZTxUPih1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuREVMRVRFLCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwb3N0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xyXG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGRhdGEgfHwgY29uZmlnLmRhdGE7O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuUE9TVCwgdXJsLCBjb25maWcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHV0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xyXG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGRhdGEgfHwgY29uZmlnLmRhdGE7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5QVVQsIHVybCwgY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwbG9hZDxUPih1cmw6IHN0cmluZywgZmlsZTogRmlsZSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG5cclxuICAgICAgICAgICAgaWYgKCFmaWxlICYmICghY29uZmlnIHx8ICFjb25maWcuZmlsZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignQ2Fubm90IHN0YXJ0IHVwbG9hZCB3aXRoIG51bGwge2ZpbGV9IHBhcmFtZXRlci4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XHJcbiAgICAgICAgICAgIGNvbmZpZy5maWxlID0gZmlsZSB8fCBjb25maWcuZmlsZTsgLy9UT0RPIE1HQSA6IGRvIG5vdCBleHBvc2UgZmlsZSBpbiBJSHR0cFdyYXBwZXJDb25maWcgP1xyXG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGNvbmZpZy5kYXRhIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbmZpZy51cGxvYWRJbkJhc2U2NEpzb24pIHtcclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IG1ha2Ugc3VyZSB0aGlzIGRlbGF5cyBuZXh0IGNhbGwgYW5kIHVwbG9hZCBpcyBub3QgZG9uZSBiZWZvcmUgYmFzZTY0IGVuY29kaW5nIGlzIGZpbmlzaGVkLCBldmVuIGlmIHByb21pc2UgaXMgYWxyZWFkeSByZXNvbHZlZCA/Pz9cclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLlVwbG9hZC5iYXNlNjREYXRhVXJsKGZpbGUpLnRoZW4oKGZpbGVCYXNlNjRVcmwpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYXJkLWNvZGVkIGtleSB0byBmZXRjaCBiYXNlNjQgZW5jb2RpbmcsIHRvIHBhcmFtZXRyaXplIHdpdGggc2VydmVyLXNpZGUgIVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5kYXRhLmZpbGVCYXNlNjRVcmwgPSBmaWxlQmFzZTY0VXJsO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vbm9ybWFsIHBvc3QgaW4gY2FzZSBvZiBiYXNlNjQtZW5jb2RlZCBkYXRhXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLlBPU1QsIHVybCwgY29uZmlnKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uZmlnLmRhdGEuZmlsZUZvcm1EYXRhTmFtZSA9ICdmaWxlJzsgLy8gZmlsZSBmb3JtRGF0YSBuYW1lICgnQ29udGVudC1EaXNwb3NpdGlvbicpLCBzZXJ2ZXIgc2lkZSByZXF1ZXN0IGZvcm0gbmFtZVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmluaXRQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBub3Qgc2FmZSBoYXJkIGNhc3RcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBIDogYmVoYXZpb3IgZHVwbGljYXRpb24gd2l0aCB0aGlzLmFqYXgsIG5vdCBEUlksIHRvIGltcHJvdmVcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5VcGxvYWQudXBsb2FkPFQ+KDxuZy5hbmd1bGFyRmlsZVVwbG9hZC5JRmlsZVVwbG9hZENvbmZpZ0ZpbGU+dGhpcy5jb25maWd1cmVIdHRwQ2FsbChIdHRwTWV0aG9kLlBPU1QsIHVybCwgY29uZmlnKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbjxUPih0aGlzLnN1Y2Nlc3M8VD4odXJsKSwgdGhpcy5lcnJvciwgY29uZmlnLnVwbG9hZFByb2dyZXNzKSAvL1RPRE8gTUdBIDogdXBsb2FkUHJvZ3Jlc3MgY2FsbGJhY2sgb2sgP1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maW5hbGx5KHRoaXMuZmluYWxseSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQSA6IG1ldGhvZCB0b28gc3BlY2lmaWMgdG8gT00gYXBwcyBjb250ZXh0LCBtYXkgbm90IHdvcmsgb3V0c2lkZSBvZiBpdCwgdG8gYWRhcHQgZm9yIHB1YmxpYyB1c2UgP1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFRyaWVzIHRvIHBhcnNlIHRoZSBpbnB1dCB1cmwgOlxyXG4gICAgICAgICAqIElmIGl0IHNlZW1zIHRvIGJlIGEgZnVsbCBVUkwsIHRoZW4gcmV0dXJuIGFzIGlzIChjb25zaWRlcnMgaXQgZXh0ZXJuYWwgVXJsKSBcclxuICAgICAgICAgKiBPdGhlcndpc2UsIHRyaWVzIHRvIGZpbmQgdGhlIGJhc2UgVVJMIG9mIHRoZSBjdXJyZW50IEJsdWVTa3kgYXBwIHdpdGggb3Igd2l0aG91dCB0aGUgaW5jbHVkZWQgQ29udHJvbGxlciBhbmQgcmV0dXJucyB0aGUgZnVsbCBVcmwgXHJcbiAgICAgICAgICogQHBhcmFtIHVybElucHV0IDogVE9ETyBNR0E6IGRvY3VtZW50IGRpZmZlcmVudCBraW5kIG9mIHVybHMgdGhhdCB0aGlzIG1ldGhvZCBjYW4gdGFrZSBhcyBpbnB1dCAoZnVsbCwgcGFydGlhbCBldGMpXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGJ1aWxkVXJsRnJvbUNvbnRleHQodXJsSW5wdXQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblxyXG4gICAgICAgICAgICAvLyAxIC0gVXJsIHN0YXJ0cyB3aXRoIGh0dHA6Ly8gb3IgaHR0cHM6Ly8gPT4gcmV0dXJuIGFzIGlzLlxyXG4gICAgICAgICAgICBpZiAodXJsSW5wdXQuc2xpY2UoMCwgJ2h0dHA6Ly8nLmxlbmd0aCkgPT09ICdodHRwOi8vJyB8fFxyXG4gICAgICAgICAgICAgICAgdXJsSW5wdXQuc2xpY2UoMCwgJ2h0dHBzOi8vJy5sZW5ndGgpID09PSAnaHR0cHM6Ly8nKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdXJsSW5wdXQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIDIgLSBPdGhlcndpc2UsIHRyeSB0byBmaW5kIGNvcnJlY3QgY29udHJvbGxlclxyXG5cclxuICAgICAgICAgICAgLy8gQm9vbGVhbiB1c2VkIHRvIHRyeSB0byBkZXRlcm1pbmUgY29ycmVjdCBmdWxsIHVybCAoYWRkIC8gb3Igbm90IGJlZm9yZSB0aGUgdXJsIGZyYWdtZW50IGRlcGVuZGluZyBvbiBpZiBmb3VuZCBvciBub3QpXHJcbiAgICAgICAgICAgIHZhciB1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaCA9IHVybElucHV0LnNsaWNlKDAsICcvJy5sZW5ndGgpID09PSAnLyc7XHJcblxyXG4gICAgICAgICAgICAvLyBSZWdleCB0cnlpbmcgdG8gZGV0ZXJtaW5lIGlmIHRoZSBpbnB1dCBmcmFnbWVudCBjb250YWlucyBhIC8gYmV0d2VlbiB0d28gY2hhcmFjdGVyIHN1aXRlcyA9PiBjb250cm9sbGVyIGdpdmVuIGFzIGlucHV0LCBvdGhlcndpc2UsIGFjdGlvbiBvbiBzYW1lIGNvbnRyb2xsZXIgZXhwZWN0ZWRcclxuICAgICAgICAgICAgdmFyIGNvbnRyb2xsZXJJc1ByZXNlbnRSZWdleCA9IC9cXHcrXFwvXFx3Ky87XHJcblxyXG4gICAgICAgICAgICB2YXIgYWN0aW9uSXNPblNhbWVDb250cm9sbGVyID0gIWNvbnRyb2xsZXJJc1ByZXNlbnRSZWdleC50ZXN0KHVybElucHV0KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXNlVXJsID0gdGhpcy5nZXRVcmxQYXRoKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcik7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gYmFzZVVybCArICh1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaCA/IHVybElucHV0IDogKCcvJyArIHVybElucHV0KSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIHByaXZhdGUgbWV0aG9kc1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBVdGlsaXR5IG1ldGhvZC5cclxuICAgICAgICAgKiBNYWluIGNhbGxlciB0aGF0IGFsbCB3cmFwcGVyIGNhbGxzIChnZXQsIGRlbGV0ZSwgcG9zdCwgcHV0KSBtdXN0IHVzZSB0byBzaGFyZSBjb21tb24gYmVoYXZpb3IuXHJcbiAgICAgICAgICogQHBhcmFtIGNvbmZpZ1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgYWpheDxUPihtZXRob2Q6IEh0dHBNZXRob2QsIHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpIHtcclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IG1ha2Ugc3VyZSBpbml0UHJvbWlzZSByZXNvbHZlIGF1dG9tYXRpY2FsbHkgd2l0aG91dCBvdmVyaGVhZCBvbmNlIGZpcnN0IGNhbGwgc3VjZXNzZnVsbC5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5pdFByb21pc2UudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kaHR0cDxUPih0aGlzLmNvbmZpZ3VyZUh0dHBDYWxsKG1ldGhvZCwgdXJsLCBjb25maWcpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbjxUPih0aGlzLnN1Y2Nlc3M8VD4odXJsKSwgdGhpcy5lcnJvcilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmFsbHkodGhpcy5maW5hbGx5KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAqIFByZXBhcmVzIGEge0BsaW5rIG5nIyRodHRwI2NvbmZpZyBjb25maWd9IG9iamVjdCBmb3IgJGh0dHAgY2FsbC5cclxuICAgICAgICAqIFRoZSBvcGVyYXRpb25zIGluY2x1ZGUgc2V0dGluZyBkZWZhdWx0IHZhbHVlcyB3aGVuIG5vdCBwcm92aWRlZCwgYW5kIHNldHRpbmcgaHR0cCBoZWFkZXJzIGlmIG5lZWRlZCBmb3IgOlxyXG4gICAgICAgICogIC0gQWpheCBjYWxsc1xyXG4gICAgICAgICogIC0gQXV0aG9yaXphdGlvbiB0b2tlblxyXG4gICAgICAgICogIC0gQ3VycmVudCBVc2VyUm9sZS4gICBcclxuICAgICAgICAqIEBwYXJhbSBvcHRpb25zXHJcbiAgICAgICAgKiBAcmV0dXJucyB7bmcuJGh0dHAuY29uZmlnfSB0aGUgY29uZmlndXJhdGlvbiBvYmplY3QgcmVhZHkgdG8gYmUgaW5qZWN0ZWQgaW50byBhICRodHRwIGNhbGwuIFxyXG4gICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBjb25maWd1cmVIdHRwQ2FsbCA9IChtZXRob2Q6IEh0dHBNZXRob2QsIHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUmVxdWVzdENvbmZpZyA9PiB7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXVybCB8fCBtZXRob2QgPT09IG51bGwgfHwgbWV0aG9kID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihcIlVSTCAmIE1FVEhPRCBwYXJhbWV0ZXJzIGFyZSBuZWNlc3NhcnkgZm9yIGh0dHBXcmFwcGVyIGNhbGxzLiBBYm9ydGluZy5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy9Jbml0IGNvbmZpZyBldmVuIGlmIG5vdCBwcm92aWRlZFxyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBOiBoYXJkIGNhc3QgaXMgbm90IHNhZmUsIHdlIG1heSBmb3JnZXQgdG8gc2V0IHVybCAmIG1ldGhvZCBwYXJhbWV0ZXJzLiBUT0ZJWC5cclxuICAgICAgICAgICAgLy8gYXV0b21hdGljYWxseSBnZXQgYWxsIG5vbi1maWx0ZXJlZCBwYXJhbWV0ZXJzICYga2VlcCB0aGVtIGZvciB0aGlzIG5ldyBvYmplY3QuXHJcbiAgICAgICAgICAgIHZhciBjb25maWdGdWxsID0gPG5nLklSZXF1ZXN0Q29uZmlnPmNvbmZpZztcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IHN1cHBvcnQgbWFwcGluZyBiZXR3ZWVuIHVwbG9hZCAmIHBvc3QgaGVyZSA/XHJcbiAgICAgICAgICAgIGNvbmZpZ0Z1bGwubWV0aG9kID0gSHR0cE1ldGhvZFttZXRob2RdO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbmZpZy5hcGlFbmRwb2ludCAmJiAoIXRoaXMuYXBpQ29uZmlnIHx8XHJcbiAgICAgICAgICAgICAgICAhdGhpcy5hcGlDb25maWcuand0VG9rZW4gfHxcclxuICAgICAgICAgICAgICAgICF0aGlzLmFwaUNvbmZpZy5jdXJyZW50VXNlclJvbGUpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ1tJbnRlcm5hbEVycm9yXSBjb3JlQXBpIGNhbGwgaW50ZW5kZWQgd2l0aG91dCBuZWNlc3NhcnkgY2FwaSBjcmVkZW50aWFscy4gQWJvcnRpbmcuJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uZmlnRnVsbC5oZWFkZXJzID0gY29uZmlnLmhlYWRlcnMgfHwge307XHJcblxyXG4gICAgICAgICAgICBpZiAoIWNvbmZpZy5hcGlFbmRwb2ludCkgeyAvLyBpZiBub3Qgc2V0LCBldmFsdWF0ZXMgdG8gZmFsc2VcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwudXJsID0gdGhpcy5idWlsZFVybEZyb21Db250ZXh0KHVybCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBIDogY29yZSBhcGkgZW5kcG9pbnQgJ2FwaS8nIGhhcmRjb2RlZCwgdG8gcHV0IGluIGNvbmZpZ0Z1bGwgISBzaG91bGQgbm90IGtub3cgdGhhdCBoZXJlLlxyXG4gICAgICAgICAgICAgICAgY29uZmlnRnVsbC51cmwgPSB0aGlzLmFwaUNvbmZpZy5jb3JlQXBpVXJsICsgJ2FwaS8nICsgdXJsO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFwaUNvbmZpZy5qd3RUb2tlbiAmJiB0aGlzLmFwaUNvbmZpZy5jdXJyZW50VXNlclJvbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYXJkIGNvZGVkIGhlYWRlcnMsIG5vdCBnb29kLCB0byBpbmplY3RcclxuICAgICAgICAgICAgICAgICAgICBjb25maWdGdWxsLmhlYWRlcnNbJ09BLVVzZXJSb2xlJ10gPSB0aGlzLmFwaUNvbmZpZy5jdXJyZW50VXNlclJvbGU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnRnVsbC5oZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSAnQmVhcmVyICcgKyB0aGlzLmFwaUNvbmZpZy5qd3RUb2tlbjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFjb25maWcuZGlzYWJsZVhtbEh0dHBSZXF1ZXN0SGVhZGVyKSAvLyBpZiBub3Qgc2V0LCBldmFsdWF0ZXMgdG8gZmFsc2VcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwuaGVhZGVyc1snWC1SZXF1ZXN0ZWQtV2l0aCddID0gJ1hNTEh0dHBSZXF1ZXN0JztcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IE9FIHNwZWNpZmljIGNvZGUsIHRvIHJlbW92ZVxyXG4gICAgICAgICAgICBpZiAoKDxhbnk+dGhpcy4kd2luZG93KS5wcmV2ZW50QmxvY2tVSSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyBNR0EgOiB0eXBlIGNhc3RpbmcsIGlzIGl0IG9rYXkgb3Igbm90ID8gYmV0dGVyIGFwcHJvYWNoID9cclxuICAgICAgICAgICAgICAgICg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZ0Z1bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTdWNjZXNzIGhhbmRsZXJcclxuICAgICAgICAgKiBUT0RPIE1HQSA6IHdoYXQgaXMgdXJsIHVzZWQgZm9yID8/P1xyXG4gICAgICAgICAqIEBwYXJhbSB1cmwgXHJcbiAgICAgICAgICogQHJldHVybnMge30gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBzdWNjZXNzID0gPFQ+KHVybDogc3RyaW5nKTogKHByb21pc2VDYWxsYmFjazogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8VD4pID0+IFQgfCBuZy5JUHJvbWlzZTxhbnk+ID0+IHtcclxuXHJcbiAgICAgICAgICAgIC8vIEpTIHRyaWNrIDogY2FwdHVyZSB1cmwgdmFyaWFibGUgaW5zaWRlIGNsb3N1cmUgc2NvcGUgdG8gc3RvcmUgaXQgZm9yIGNhbGxiYWNrIHdoaWNoIGNhbm5vdCBiZSBjYWxsZWQgd2l0aCAyIGFyZ3VtZW50c1xyXG4gICAgICAgICAgICByZXR1cm4gKHByb21pc2VDYWxsYmFjazogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8VD4pOiBUIHwgbmcuSVByb21pc2U8YW55PiA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFwcm9taXNlQ2FsbGJhY2sgfHwgIXByb21pc2VDYWxsYmFjay5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogdGhpbmsgYWJvdXQgdGhpcyAuLi4gTWF5IG5vdCBiZSBhY2N1cmF0ZSA/IG9yIG1heSBub3QgYmUgYW4gZXJyb3IgaWYgcmV0dXJuIHR5cGUgaXMgbnVsbCBpbiBjYXNlIG5vIGRhdGEgZm91bmRcclxuICAgICAgICAgICAgICAgICAgICAvL3Jlc3BvbnNlLnN0YXR1cyA9IDUwMztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IocHJvbWlzZUNhbGxiYWNrKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvYXN0ZXIud2FybmluZygnVW5leHBlY3RlZCByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXInLCAnQ2FsbCBzdWNjZXNzZnVsbCwgYnV0IG5vIGRhdGEgZm91bmQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGZpbmQgb3V0IGhvdyB0byBoYW5kbGUgdGhhdCBhcyB0byBleHBlY3RkIHJldHVybiB0eXBlID9cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kcS5yZWplY3QocHJvbWlzZUNhbGxiYWNrKTsgLy8gUmVqZWN0IHByb21pc2UgaWYgbm90IHdlbGwtZm9ybWVkIGRhdGFcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZGVidWcocHJvbWlzZUNhbGxiYWNrKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvbWlzZUNhbGxiYWNrLmRhdGE7IC8vIHJldHVybiBvbmx5IHRoZSBkYXRhIGV4cGVjdGVkIGZvciBjYWxsZXJcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEVycm9yIGhhbmRsZXJcclxuICAgICAgICAgKiBAcGFyYW0gcmVzcG9uc2UgXHJcbiAgICAgICAgICogQHJldHVybnMge30gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBlcnJvciA9IChyZXNwb25zZTogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8YW55Pik6IG5nLklQcm9taXNlPG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPGFueT4+ID0+IHsgLy8gZG8gc29tZXRoaW5nIG9uIGVycm9yXHJcblxyXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhID0gJ1NlcnZlciBub3QgcmVzcG9uZGluZyc7XHJcbiAgICAgICAgICAgICAgICByZXNwb25zZS5zdGF0dXMgPSA1MDM7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBjb250ZW50VHlwZSA9IHJlc3BvbnNlLmhlYWRlcnMoJ0NvbnRlbnQtVHlwZScpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbnRlbnRUeXBlICYmIGNvbnRlbnRUeXBlLmluZGV4T2YoJ2FwcGxpY2F0aW9uL2pzb24nKSA+IC0xIHx8IGNvbnRlbnRUeXBlLmluZGV4T2YoJ3RleHQvcGxhaW4nKSA+IC0xKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2U7XHJcblxyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFuZGxlIGVycm9yIGhhbmRsaW5nIG1vcmUgZ2VuZXJpY2FsbHkgYmFzZWQgb24gaW5wdXQgZXJyb3IgbWVzc2FnZSBjb250cmFjdCBpbnN0ZWFkIG9mIGV4cGVjdGluZyBzcGVjaWZpYyBlcnJvciBzdHJjdHVyZS5cclxuXHJcbiAgICAgICAgICAgICAgICAvL2lmIChyZXNwb25zZS5kYXRhLk1vZGVsU3RhdGUpIHtcclxuICAgICAgICAgICAgICAgIC8vICAgIC8vVE9ETyBNR0EgOiBoYW5kbGUgdGhpcyB3aGVuIHdlbGwgZm9ybWF0dGVkIHNlcnZlci1zaWRlXHJcbiAgICAgICAgICAgICAgICAvL30gZWxzZVxyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuTWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSByZXNwb25zZS5kYXRhLk1lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPT09IDQwNCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudG9hc3Rlci53YXJuaW5nKCdOb3QgRm91bmQnLCBtZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b2FzdGVyLmVycm9yKCdTZXJ2ZXIgcmVzcG9uc2UgZXJyb3InLCBtZXNzYWdlICsgJ1xcbiBTdGF0dXM6ICcgKyByZXNwb25zZS5zdGF0dXMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50b2FzdGVyLmVycm9yKCdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InLCAnU3RhdHVzOiAnICsgcmVzcG9uc2Uuc3RhdHVzKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKHJlc3BvbnNlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFdlIGRvbid0IHJlY292ZXIgZnJvbSBlcnJvciwgc28gd2UgcHJvcGFnYXRlIGl0IDogYmVsb3cgaGFuZGxlcnMgaGF2ZSB0aGUgY2hvaWNlIG9mIHJlYWRpbmcgdGhlIGVycm9yIHdpdGggYW4gZXJyb3IgaGFuZGxlciBvciBub3QuIFNlZSAkcSBwcm9taXNlcyBiZWhhdmlvciBoZXJlIDogaHR0cHM6Ly9naXRodWIuY29tL2tyaXNrb3dhbC9xXHJcbiAgICAgICAgICAgIC8vIFRoaXMgYmVoYXZpb3IgaXMgZGVzaXJlZCBzbyB0aGF0IHdlIHNob3cgZXJyb3IgaW5zaWRlIHNwZWNpZmljIHNlcnZlciBjb21tdW5pY2F0aW9uIG1vZGFscyBhdCBzcGVjaWZpYyBwbGFjZXMgaW4gdGhlIGFwcCwgb3RoZXJ3aXNlIHNob3cgYSBnbG9iYWwgYWxlcnQgbWVzc2FnZSwgb3IgZXZlbiBkbyBub3Qgc2hvdyBhbnl0aGluZyBpZiBub3QgbmVjZXNzYXJ5IChkbyBub3QgYWQgYW4gZXJyb3IgaGFuZGxlciBpbiBiZWxvdyBoYW5kbGVycyBvZiB0aGlzIHByb21pc2UpLlxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy4kcS5yZWplY3QocmVzcG9uc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRnVuY3Rpb24gY2FsbGVkIGF0IHRoZSBlbmQgb2YgYW4gYWpheCBjYWxsLCByZWdhcmRsZXNzIG9mIGl0J3Mgc3VjY2VzcyBvciBmYWlsdXJlLlxyXG4gICAgICAgICAqIEBwYXJhbSByZXNwb25zZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgZmluYWxseSA9ICgpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogT0Utc3BlY2lmaWMgY29kZVxyXG4gICAgICAgICAgICBpZiAoKDxhbnk+dGhpcy4kd2luZG93KS5wcmV2ZW50QmxvY2tVSSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyBNR0EgOiB0eXBlIGNhc3RpbmcsIGlzIGl0IG9rYXkgb3Igbm90ID8gYmV0dGVyIGFwcHJvYWNoID9cclxuICAgICAgICAgICAgICAgICg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFRPRE8gTUdBIDogdXNpbmcgbWV0aG9kIGZyb20gTGF5b3V0LmpzIDogdG8gZG9jdW1lbnQgdG8gbm90IGhhbmRsZSBkdXBsaWNhdGUgY29kZSAhIVxyXG4gICAgICAgIC8vVE9ETyBNR0EgOiBtYWtlIGl0IGNhcGFibGUgb2YgaGFuZGxpbmcgZnVsbCBVUkxzIG91dHNpZGUgb2YgT0UgOiBkbyBub3QgdXNlID8/IGhvdyB0byA/XHJcbiAgICAgICAgcHJpdmF0ZSBnZXRVcmxQYXRoKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcikge1xyXG5cclxuICAgICAgICAgICAgdmFyIGJhc2VVcmxSZWdleCA9IC8oXFwvXFx3K1xcL1xcKFNcXChcXHcrXFwpXFwpKVxcL1xcdysvO1xyXG4gICAgICAgICAgICB2YXIgdXJsID0gdGhpcy4kd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lO1xyXG4gICAgICAgICAgICB2YXIgYmFzZVVybE1hdGNoZXMgPSBiYXNlVXJsUmVnZXguZXhlYyh1cmwpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGJhc2VVcmxNYXRjaGVzLmxlbmd0aCAmJiBiYXNlVXJsTWF0Y2hlcy5sZW5ndGggPT09IDIpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgYmFzZVVybFdpdGhDb250cm9sbGVyTmFtZSA9IGJhc2VVcmxNYXRjaGVzWzBdO1xyXG4gICAgICAgICAgICAgICAgdmFyIGJhc2VVcmwgPSBiYXNlVXJsTWF0Y2hlc1sxXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYWN0aW9uSXNPblNhbWVDb250cm9sbGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJhc2VVcmxXaXRoQ29udHJvbGxlck5hbWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBiYXNlVXJsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gJyc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL1RPRE8gTUdBOiBPTS1zcGVjaWZpYyBBU1AgTVZDIGNvZGUsIG5vdCB1c2VkIEFUTSwgdG8gcmVtb3ZlXHJcbiAgICAgICAgcHJpdmF0ZSBnZXRDdXJyZW50U2Vzc2lvbklEKCkge1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IG1hZ2ljIHJlZ2V4cCB0byBmZXRjaCBTZXNzaW9uSUQgaW4gVVJMLCB0byBzdG9yZSBlbHNld2hlcmUgIVxyXG4gICAgICAgICAgICB2YXIgc2Vzc2lvblJlZ2V4ID0gL2h0dHBzOlxcL1xcL1tcXHcuXStcXC9bXFx3Ll0rXFwvKFxcKFNcXChcXHcrXFwpXFwpKVxcLy4qLztcclxuICAgICAgICAgICAgLy92YXIgc2Vzc2lvblJlZ2V4ID0gL2h0dHBzOlxcL1xcL1tcXHcuXStcXC9PcmRlckVudHJ5XFwvKFxcKFNcXChcXHcrXFwpXFwpKVxcLy4qLztcclxuXHJcbiAgICAgICAgICAgIC8vIFRPRE8gTUdBIDogdXBkYXRlIHJlZ2V4cCB0byB0aGUgb25lIGJlbG93XHJcbiAgICAgICAgICAgIC8vdmFyIGJhc2VVcmxSZWdleCA9IC8oaHR0cHM6XFwvXFwvW1xcdy4tXStcXC9bXFx3Li1dK1xcL1xcKFNcXChcXHcrXFwpXFwpXFwvKVxcdysvO1xyXG5cclxuXHJcbiAgICAgICAgICAgIHZhciBwYXRoID0gdGhpcy4kbG9jYXRpb24uYWJzVXJsKCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgcmVnZXhwQXJyYXkgPSBzZXNzaW9uUmVnZXguZXhlYyhwYXRoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghcmVnZXhwQXJyYXkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihcIlVuYWJsZSB0byByZWNvZ25pemVkIHNlYXJjaGVkIHBhdHRlcm4gaW4gY3VycmVudCB1cmwgbG9jYXRpb24gdG8gcmV0cmlldmUgc2Vzc2lvbklELlwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyZWdleHBBcnJheS5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihcIlVuYWJsZSB0byBmaW5kIHNlc3Npb25JRCBpbiBzZWFyY2hlZCBwYXR0ZXJuIGluIGN1cnJlbnQgdXJsLlwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyZWdleHBBcnJheS5sZW5ndGggPiAyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJUb28gbWFueSBtYXRjaGVzIGZvdW5kIGZvciB0aGUgc2Vzc2lvbklEIHNlYXJjaCBpbiB0aGUgY3VycmVudCB1cmwuXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiByZWdleHBBcnJheVsxXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKCduZy5odHRwV3JhcHBlcicsIFsndG9hc3RlcicsICduZ0FuaW1hdGUnLCAnbmdGaWxlVXBsb2FkJ10pXHJcbiAgICAgICAgLy8gZG9uZSBpbiBjb25maWd1cmVIdHRwQ2FsbCBtZXRob2QuXHJcbiAgICAgICAgLy8uY29uZmlnKFsnJGh0dHBQcm92aWRlcicsICgkaHR0cFByb3ZpZGVyOiBuZy5JSHR0cFByb3ZpZGVyKSA9PiB7XHJcbiAgICAgICAgLy8gICAgJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vblsnWC1SZXF1ZXN0ZWQtV2l0aCddID0gJ1hNTEh0dHBSZXF1ZXN0JztcclxuICAgICAgICAvL31dKVxyXG4gICAgICAgIC5zZXJ2aWNlKCdodHRwV3JhcHBlclNlcnZpY2UnLCBIdHRwV3JhcHBlclNlcnZpY2UpO1xyXG59Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
