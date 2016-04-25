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
                     * @param url : TODO MGA remove if not logged.
                     * @returns {}
                     */
                    this.success = function (url) {
                        // JS trick : capture url variable inside closure scope to store it for callback which cannot be called with 2 arguments
                        return function (promiseCallback) {
                            if (!promiseCallback) {
                                _this.$log.error('Unexpected $http error, no return promise object could be found.');
                                _this.toaster.error('Unexpected behavior', 'Please contact your local support team.');
                                return _this.$q.reject(promiseCallback); // Reject promise
                            }
                            //TODO MGA: handle when API is fixed. See http://stackoverflow.com/questions/11746894/what-is-the-proper-rest-response-code-for-a-valid-request-but-an-empty-data
                            //if ((promiseCallback.data === null || promiseCallback.data === undefined) && promiseCallback.status !== 204) {
                            //    this.$log.error('Unexpected response from the server, expected response data but none found.');
                            //    this.toaster.warning('Unexpected response', 'Please contact your local support team.');
                            //    return this.$q.reject(promiseCallback); // Reject promise if not well-formed data
                            //}
                            //TODO MGA: same behavior also on a GET request ? if request is GET and response is 200 with no data, return error ? (pass in parameter request context to log this error).
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
                        // We suppose in case of no response that the srv didn't send any response.
                        // TODO MGA: may also be a fault in internal $http / ajax client side lib, to distinguish.
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
                            //TODO MGA: handle more response codes gracefully.
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHAtd3JhcHBlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJDQUEyQztBQUMzQyxJQUFPLE9BQU8sQ0F3WWI7QUF4WUQsV0FBTyxPQUFPO0lBQUMsSUFBQSxJQUFJLENBd1lsQjtJQXhZYyxXQUFBLElBQUk7UUFBQyxJQUFBLFFBQVEsQ0F3WTNCO1FBeFltQixXQUFBLFFBQVEsRUFBQyxDQUFDO1lBZTFCLElBQUssVUFBcUM7WUFBMUMsV0FBSyxVQUFVO2dCQUFHLHlDQUFHLENBQUE7Z0JBQUUsMkNBQUksQ0FBQTtnQkFBRSx5Q0FBRyxDQUFBO2dCQUFFLCtDQUFNLENBQUE7WUFBQyxDQUFDLEVBQXJDLFVBQVUsS0FBVixVQUFVLFFBQTJCO1lBQUEsQ0FBQztZQTJCM0M7O2VBRUc7WUFDSDtnQkFPSSxZQUFZO2dCQUVaLGNBQWM7Z0JBRWQsZUFBZTtnQkFDZiw0QkFDWSxLQUFzQixFQUN0QixPQUEwQixFQUMxQixJQUFvQixFQUNwQixFQUFnQixFQUNoQixTQUE4QixFQUM5QixNQUEyQyxFQUMzQyxPQUFrQztvQkFuQmxELGlCQW1WQztvQkF0VWUsVUFBSyxHQUFMLEtBQUssQ0FBaUI7b0JBQ3RCLFlBQU8sR0FBUCxPQUFPLENBQW1CO29CQUMxQixTQUFJLEdBQUosSUFBSSxDQUFnQjtvQkFDcEIsT0FBRSxHQUFGLEVBQUUsQ0FBYztvQkFDaEIsY0FBUyxHQUFULFNBQVMsQ0FBcUI7b0JBQzlCLFdBQU0sR0FBTixNQUFNLENBQXFDO29CQUMzQyxZQUFPLEdBQVAsT0FBTyxDQUEyQjtvQkFxSDlDOzs7Ozs7OztzQkFRRTtvQkFDTSxzQkFBaUIsR0FBRyxVQUFDLE1BQWtCLEVBQUUsR0FBVyxFQUFFLE1BQTJCO3dCQUVyRixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLE1BQU0sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDOzRCQUNsRCxLQUFJLENBQUMsSUFBSSxDQUFDLEtBQUss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QUFDO2dCQUdMLHlCQUFDO1lBQUQsQ0FuVkEsQUFtVkMsSUFBQTtZQW5WWSwyQkFBa0IscUJBbVY5QixDQUFBO1lBRUQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLFNBQVMsRUFBRSxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUM7aUJBS3JFLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELENBQUMsRUF4WW1CLFFBQVEsR0FBUixhQUFRLEtBQVIsYUFBUSxRQXdZM0I7SUFBRCxDQUFDLEVBeFljLElBQUksR0FBSixZQUFJLEtBQUosWUFBSSxRQXdZbEI7QUFBRCxDQUFDLEVBeFlNLE9BQU8sS0FBUCxPQUFPLFFBd1liIiwiZmlsZSI6Imh0dHAtd3JhcHBlci5zZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwaW5ncy90c2QuZC50c1wiIC8+XHJcbm1vZHVsZSBibHVlc2t5LmNvcmUuc2VydmljZXMge1xyXG5cclxuICAgIGltcG9ydCBBcGlDb25maWcgPSBibHVlc2t5LmNvcmUubW9kZWxzLkFwaUNvbmZpZztcclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElIdHRwV3JhcHBlckNvbmZpZyBleHRlbmRzIG5nLklSZXF1ZXN0U2hvcnRjdXRDb25maWcge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIG1haW4gQVBJIGVuZHBvaW50IHRvIHVzZSBhcyBkZWZhdWx0IG9uZSBpZiB1cmwgaXMgbm90IGZ1bGwuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgYXBpRW5kcG9pbnQ/OiBib29sZWFuO1xyXG4gICAgICAgIGZpbGU/OiBGaWxlLFxyXG4gICAgICAgIHVwbG9hZEluQmFzZTY0SnNvbj86IGJvb2xlYW47XHJcbiAgICAgICAgdXBsb2FkUHJvZ3Jlc3M/OiAoKSA9PiBhbnk7XHJcbiAgICAgICAgZGlzYWJsZVhtbEh0dHBSZXF1ZXN0SGVhZGVyPzogYm9vbGVhbjtcclxuICAgIH1cclxuXHJcbiAgICBlbnVtIEh0dHBNZXRob2QgeyBHRVQsIFBPU1QsIFBVVCwgREVMRVRFIH07XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJSHR0cFdyYXBwZXJTZXJ2aWNlIHtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQWxsIHNydi1zaWRlIGNvbmZpZ3VyYXRpb24gb2YgbWFpbiBBUEkgcHJvdmlkZWQgYnkgdGhlIGRvbWFpbiBmcm9tIHdoaWNoIHRoaXMgc2NyaXB0IHdhcyBsb2FkZWQsIEAgdGhlIHVybCAnQ29yZUFwaUF1dGgvR2V0Q29yZUFwaUNvbmZpZycuXHJcbiAgICAgICAgICogVE9ETyBNR0EgZml4IGhhcmQgY29kZWQgcGF0aC5cclxuICAgICAgICAgKiBUaGlzIGNvbmZpZ3VyYXRpb24gZGF0YSBpcyBsb2FkZWQgdXBvbiBpbml0aWFsaXphdGlvbiBvZiB0aGlzIHNlcnZpY2UgKHRvIGJlIHVzZWQgYXMgYSBzaW5nbGV0b24gaW4gdGhlIGFwcCkuIEFsbCBvdGhlciB3ZWIgY2FsbHMgYXJlIGJsb2NrZWQgYXMgbG9uZyBhcyB0aGlzIG9uZSBpcyBub3QgZmluaXNoZWQuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgYXBpQ29uZmlnOiBBcGlDb25maWc7XHJcblxyXG4gICAgICAgIC8vVE9ETyBNR0E6IGZvciBmb2xsb3dpbmcgbWV0aG9kcywgcmV0dXJuIElQcm9taXNlIGFuZCBhc3N1bWUgYWJzdHJhY3Rpb24gb3IgbGV0IGJlbG93IHNlcnZpY2VzIGhhbmRsZSBJSHR0cFByb21pc2VzID9cclxuXHJcbiAgICAgICAgZ2V0PFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgZGVsZXRlPFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgcG9zdDxUPih1cmw6IHN0cmluZywgZGF0YTogYW55LCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgcHV0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICAvL1RPRE8gTUdBIGltcHJvdmUgdHlwaW5nIHdpdGggYW5ndWxhci11cGxvYWQgdHNkIGV0Y1xyXG4gICAgICAgIHVwbG9hZDxUPih1cmw6IHN0cmluZywgZmlsZTogRmlsZSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcbiAgICAgICAgXHJcbiAgICAgICAgYnVpbGRVcmxGcm9tQ29udGV4dCh1cmxJbnB1dDogc3RyaW5nKTogc3RyaW5nO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVE9ETyBNR0EgOiB0aGlzIG1heSBub3QgbmVlZCB0byBiZSBhIGRlZGljYXRlZCBzZXJ2aWNlLCBpdCBjYW4gYWxzbyBiZSBpbmNvcnBvcmF0ZWQgaW50byB0aGUgaHR0cEludGVyY2VwdG9yLiBEZWNpZGUgYmVzdCBhcHByb2FjaCBkZXBlbmRpbmcgb24gcGxhbm5lZCB1c2UuXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBjbGFzcyBIdHRwV3JhcHBlclNlcnZpY2UgaW1wbGVtZW50cyBJSHR0cFdyYXBwZXJTZXJ2aWNlIHtcclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIHByb3BlcnRpZXNcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpbml0UHJvbWlzZTogbmcuSVByb21pc2U8YW55PjtcclxuICAgICAgICBwdWJsaWMgYXBpQ29uZmlnOiBBcGlDb25maWc7XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICAvLyNyZWdpb24gY3RvclxyXG5cclxuICAgICAgICAvKiBAbmdJbmplY3QgKi9cclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgcHJpdmF0ZSAkaHR0cDogbmcuSUh0dHBTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRsb2c6IG5nLklMb2dTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGxvY2F0aW9uOiBuZy5JTG9jYXRpb25TZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlIFVwbG9hZDogbmcuYW5ndWxhckZpbGVVcGxvYWQuSVVwbG9hZFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgdG9hc3Rlcjogbmd0b2FzdGVyLklUb2FzdGVyU2VydmljZVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgICAvLyBpbml0IGNvcmUgYXBpIGNvbmZpZyBkYXRhIG9uIGN0b3JcclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGhhcmQgY29kZWQgcGF0aCBmb3IgQ29yZXJBcGlBdXRoQ3RybCB0byBpbmplY3RcclxuICAgICAgICAgICAgdGhpcy5pbml0UHJvbWlzZSA9IHRoaXMuJGh0dHAuZ2V0PEFwaUNvbmZpZz4odGhpcy5idWlsZFVybEZyb21Db250ZXh0KCdDb3JlQXBpQXV0aC9HZXRDb3JlQXBpQ29uZmlnJykpXHJcbiAgICAgICAgICAgICAgICAuc3VjY2VzcygoY29yZUFwaUNvbmZpZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBpQ29uZmlnID0gY29yZUFwaUNvbmZpZztcclxuICAgICAgICAgICAgICAgIH0pLmVycm9yKChlcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignVW5hYmxlIHRvIHJldHJpZXZlIEFQSSBjb25maWcuIEFib3J0aW5nIGh0dHBXcmFwcGVyU2VydmljZSBpbml0aWFsaXphdGlvbi4nKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwdWJsaWMgbWV0aG9kc1xyXG5cclxuICAgICAgICBnZXQ8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLkdFVCwgdXJsLCBjb25maWcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGVsZXRlPFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5ERUxFVEUsIHVybCwgY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHBvc3Q8VD4odXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XHJcbiAgICAgICAgICAgIGNvbmZpZy5kYXRhID0gZGF0YSB8fCBjb25maWcuZGF0YTs7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5QT1NULCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdXQ8VD4odXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XHJcbiAgICAgICAgICAgIGNvbmZpZy5kYXRhID0gZGF0YSB8fCBjb25maWcuZGF0YTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLlBVVCwgdXJsLCBjb25maWcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBsb2FkPFQ+KHVybDogc3RyaW5nLCBmaWxlOiBGaWxlLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWZpbGUgJiYgKCFjb25maWcgfHwgIWNvbmZpZy5maWxlKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdDYW5ub3Qgc3RhcnQgdXBsb2FkIHdpdGggbnVsbCB7ZmlsZX0gcGFyYW1ldGVyLicpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcclxuICAgICAgICAgICAgY29uZmlnLmZpbGUgPSBmaWxlIHx8IGNvbmZpZy5maWxlOyAvL1RPRE8gTUdBIDogZG8gbm90IGV4cG9zZSBmaWxlIGluIElIdHRwV3JhcHBlckNvbmZpZyA/XHJcbiAgICAgICAgICAgIGNvbmZpZy5kYXRhID0gY29uZmlnLmRhdGEgfHwge307XHJcblxyXG4gICAgICAgICAgICBpZiAoY29uZmlnLnVwbG9hZEluQmFzZTY0SnNvbikge1xyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogbWFrZSBzdXJlIHRoaXMgZGVsYXlzIG5leHQgY2FsbCBhbmQgdXBsb2FkIGlzIG5vdCBkb25lIGJlZm9yZSBiYXNlNjQgZW5jb2RpbmcgaXMgZmluaXNoZWQsIGV2ZW4gaWYgcHJvbWlzZSBpcyBhbHJlYWR5IHJlc29sdmVkID8/P1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuVXBsb2FkLmJhc2U2NERhdGFVcmwoZmlsZSkudGhlbigoZmlsZUJhc2U2NFVybCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhcmQtY29kZWQga2V5IHRvIGZldGNoIGJhc2U2NCBlbmNvZGluZywgdG8gcGFyYW1ldHJpemUgd2l0aCBzZXJ2ZXItc2lkZSAhXHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLmRhdGEuZmlsZUJhc2U2NFVybCA9IGZpbGVCYXNlNjRVcmw7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9ub3JtYWwgcG9zdCBpbiBjYXNlIG9mIGJhc2U2NC1lbmNvZGVkIGRhdGFcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuUE9TVCwgdXJsLCBjb25maWcpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25maWcuZGF0YS5maWxlRm9ybURhdGFOYW1lID0gJ2ZpbGUnOyAvLyBmaWxlIGZvcm1EYXRhIG5hbWUgKCdDb250ZW50LURpc3Bvc2l0aW9uJyksIHNlcnZlciBzaWRlIHJlcXVlc3QgZm9ybSBuYW1lXHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5pdFByb21pc2UudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQSA6IG5vdCBzYWZlIGhhcmQgY2FzdFxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBiZWhhdmlvciBkdXBsaWNhdGlvbiB3aXRoIHRoaXMuYWpheCwgbm90IERSWSwgdG8gaW1wcm92ZVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLlVwbG9hZC51cGxvYWQ8VD4oPG5nLmFuZ3VsYXJGaWxlVXBsb2FkLklGaWxlVXBsb2FkQ29uZmlnRmlsZT50aGlzLmNvbmZpZ3VyZUh0dHBDYWxsKEh0dHBNZXRob2QuUE9TVCwgdXJsLCBjb25maWcpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuPFQ+KHRoaXMuc3VjY2VzczxUPih1cmwpLCB0aGlzLmVycm9yLCBjb25maWcudXBsb2FkUHJvZ3Jlc3MpIC8vVE9ETyBNR0EgOiB1cGxvYWRQcm9ncmVzcyBjYWxsYmFjayBvayA/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmFsbHkodGhpcy5maW5hbGx5KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL1RPRE8gTUdBIDogbWV0aG9kIHRvbyBzcGVjaWZpYyB0byBPTSBhcHBzIGNvbnRleHQsIG1heSBub3Qgd29yayBvdXRzaWRlIG9mIGl0LCB0byBhZGFwdCBmb3IgcHVibGljIHVzZSA/XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVHJpZXMgdG8gcGFyc2UgdGhlIGlucHV0IHVybCA6XHJcbiAgICAgICAgICogSWYgaXQgc2VlbXMgdG8gYmUgYSBmdWxsIFVSTCwgdGhlbiByZXR1cm4gYXMgaXMgKGNvbnNpZGVycyBpdCBleHRlcm5hbCBVcmwpIFxyXG4gICAgICAgICAqIE90aGVyd2lzZSwgdHJpZXMgdG8gZmluZCB0aGUgYmFzZSBVUkwgb2YgdGhlIGN1cnJlbnQgQmx1ZVNreSBhcHAgd2l0aCBvciB3aXRob3V0IHRoZSBpbmNsdWRlZCBDb250cm9sbGVyIGFuZCByZXR1cm5zIHRoZSBmdWxsIFVybCBcclxuICAgICAgICAgKiBAcGFyYW0gdXJsSW5wdXQgOiBUT0RPIE1HQTogZG9jdW1lbnQgZGlmZmVyZW50IGtpbmQgb2YgdXJscyB0aGF0IHRoaXMgbWV0aG9kIGNhbiB0YWtlIGFzIGlucHV0IChmdWxsLCBwYXJ0aWFsIGV0YylcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgYnVpbGRVcmxGcm9tQ29udGV4dCh1cmxJbnB1dDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHJcbiAgICAgICAgICAgIC8vIDEgLSBVcmwgc3RhcnRzIHdpdGggaHR0cDovLyBvciBodHRwczovLyA9PiByZXR1cm4gYXMgaXMuXHJcbiAgICAgICAgICAgIGlmICh1cmxJbnB1dC5zbGljZSgwLCAnaHR0cDovLycubGVuZ3RoKSA9PT0gJ2h0dHA6Ly8nIHx8XHJcbiAgICAgICAgICAgICAgICB1cmxJbnB1dC5zbGljZSgwLCAnaHR0cHM6Ly8nLmxlbmd0aCkgPT09ICdodHRwczovLycpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB1cmxJbnB1dDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gMiAtIE90aGVyd2lzZSwgdHJ5IHRvIGZpbmQgY29ycmVjdCBjb250cm9sbGVyXHJcblxyXG4gICAgICAgICAgICAvLyBCb29sZWFuIHVzZWQgdG8gdHJ5IHRvIGRldGVybWluZSBjb3JyZWN0IGZ1bGwgdXJsIChhZGQgLyBvciBub3QgYmVmb3JlIHRoZSB1cmwgZnJhZ21lbnQgZGVwZW5kaW5nIG9uIGlmIGZvdW5kIG9yIG5vdClcclxuICAgICAgICAgICAgdmFyIHVybEZyYWdtZW50U3RhcnRzV2l0aFNsYXNoID0gdXJsSW5wdXQuc2xpY2UoMCwgJy8nLmxlbmd0aCkgPT09ICcvJztcclxuXHJcbiAgICAgICAgICAgIC8vIFJlZ2V4IHRyeWluZyB0byBkZXRlcm1pbmUgaWYgdGhlIGlucHV0IGZyYWdtZW50IGNvbnRhaW5zIGEgLyBiZXR3ZWVuIHR3byBjaGFyYWN0ZXIgc3VpdGVzID0+IGNvbnRyb2xsZXIgZ2l2ZW4gYXMgaW5wdXQsIG90aGVyd2lzZSwgYWN0aW9uIG9uIHNhbWUgY29udHJvbGxlciBleHBlY3RlZFxyXG4gICAgICAgICAgICB2YXIgY29udHJvbGxlcklzUHJlc2VudFJlZ2V4ID0gL1xcdytcXC9cXHcrLztcclxuXHJcbiAgICAgICAgICAgIHZhciBhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXIgPSAhY29udHJvbGxlcklzUHJlc2VudFJlZ2V4LnRlc3QodXJsSW5wdXQpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGJhc2VVcmwgPSB0aGlzLmdldFVybFBhdGgoYWN0aW9uSXNPblNhbWVDb250cm9sbGVyKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBiYXNlVXJsICsgKHVybEZyYWdtZW50U3RhcnRzV2l0aFNsYXNoID8gdXJsSW5wdXQgOiAoJy8nICsgdXJsSW5wdXQpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICAvLyNyZWdpb24gcHJpdmF0ZSBtZXRob2RzXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFV0aWxpdHkgbWV0aG9kLlxyXG4gICAgICAgICAqIE1haW4gY2FsbGVyIHRoYXQgYWxsIHdyYXBwZXIgY2FsbHMgKGdldCwgZGVsZXRlLCBwb3N0LCBwdXQpIG11c3QgdXNlIHRvIHNoYXJlIGNvbW1vbiBiZWhhdmlvci5cclxuICAgICAgICAgKiBAcGFyYW0gY29uZmlnXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBhamF4PFQ+KG1ldGhvZDogSHR0cE1ldGhvZCwgdXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZykge1xyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogbWFrZSBzdXJlIGluaXRQcm9taXNlIHJlc29sdmUgYXV0b21hdGljYWxseSB3aXRob3V0IG92ZXJoZWFkIG9uY2UgZmlyc3QgY2FsbCBzdWNlc3NmdWxsLlxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbml0UHJvbWlzZS50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRodHRwPFQ+KHRoaXMuY29uZmlndXJlSHR0cENhbGwobWV0aG9kLCB1cmwsIGNvbmZpZykpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuPFQ+KHRoaXMuc3VjY2VzczxUPih1cmwpLCB0aGlzLmVycm9yKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAuZmluYWxseSh0aGlzLmZpbmFsbHkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICogUHJlcGFyZXMgYSB7QGxpbmsgbmcjJGh0dHAjY29uZmlnIGNvbmZpZ30gb2JqZWN0IGZvciAkaHR0cCBjYWxsLlxyXG4gICAgICAgICogVGhlIG9wZXJhdGlvbnMgaW5jbHVkZSBzZXR0aW5nIGRlZmF1bHQgdmFsdWVzIHdoZW4gbm90IHByb3ZpZGVkLCBhbmQgc2V0dGluZyBodHRwIGhlYWRlcnMgaWYgbmVlZGVkIGZvciA6XHJcbiAgICAgICAgKiAgLSBBamF4IGNhbGxzXHJcbiAgICAgICAgKiAgLSBBdXRob3JpemF0aW9uIHRva2VuXHJcbiAgICAgICAgKiAgLSBDdXJyZW50IFVzZXJSb2xlLiAgIFxyXG4gICAgICAgICogQHBhcmFtIG9wdGlvbnNcclxuICAgICAgICAqIEByZXR1cm5zIHtuZy4kaHR0cC5jb25maWd9IHRoZSBjb25maWd1cmF0aW9uIG9iamVjdCByZWFkeSB0byBiZSBpbmplY3RlZCBpbnRvIGEgJGh0dHAgY2FsbC4gXHJcbiAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGNvbmZpZ3VyZUh0dHBDYWxsID0gKG1ldGhvZDogSHR0cE1ldGhvZCwgdXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklSZXF1ZXN0Q29uZmlnID0+IHtcclxuXHJcbiAgICAgICAgICAgIGlmICghdXJsIHx8IG1ldGhvZCA9PT0gbnVsbCB8fCBtZXRob2QgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKFwiVVJMICYgTUVUSE9EIHBhcmFtZXRlcnMgYXJlIG5lY2Vzc2FyeSBmb3IgaHR0cFdyYXBwZXIgY2FsbHMuIEFib3J0aW5nLlwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvL0luaXQgY29uZmlnIGV2ZW4gaWYgbm90IHByb3ZpZGVkXHJcbiAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhcmQgY2FzdCBpcyBub3Qgc2FmZSwgd2UgbWF5IGZvcmdldCB0byBzZXQgdXJsICYgbWV0aG9kIHBhcmFtZXRlcnMuIFRPRklYLlxyXG4gICAgICAgICAgICAvLyBhdXRvbWF0aWNhbGx5IGdldCBhbGwgbm9uLWZpbHRlcmVkIHBhcmFtZXRlcnMgJiBrZWVwIHRoZW0gZm9yIHRoaXMgbmV3IG9iamVjdC5cclxuICAgICAgICAgICAgdmFyIGNvbmZpZ0Z1bGwgPSA8bmcuSVJlcXVlc3RDb25maWc+Y29uZmlnO1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogc3VwcG9ydCBtYXBwaW5nIGJldHdlZW4gdXBsb2FkICYgcG9zdCBoZXJlID9cclxuICAgICAgICAgICAgY29uZmlnRnVsbC5tZXRob2QgPSBIdHRwTWV0aG9kW21ldGhvZF07XHJcblxyXG4gICAgICAgICAgICBpZiAoY29uZmlnLmFwaUVuZHBvaW50ICYmICghdGhpcy5hcGlDb25maWcgfHxcclxuICAgICAgICAgICAgICAgICF0aGlzLmFwaUNvbmZpZy5qd3RUb2tlbiB8fFxyXG4gICAgICAgICAgICAgICAgIXRoaXMuYXBpQ29uZmlnLmN1cnJlbnRVc2VyUm9sZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignW0ludGVybmFsRXJyb3JdIGNvcmVBcGkgY2FsbCBpbnRlbmRlZCB3aXRob3V0IG5lY2Vzc2FyeSBjYXBpIGNyZWRlbnRpYWxzLiBBYm9ydGluZy4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25maWdGdWxsLmhlYWRlcnMgPSBjb25maWcuaGVhZGVycyB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgIGlmICghY29uZmlnLmFwaUVuZHBvaW50KSB7IC8vIGlmIG5vdCBzZXQsIGV2YWx1YXRlcyB0byBmYWxzZVxyXG4gICAgICAgICAgICAgICAgY29uZmlnRnVsbC51cmwgPSB0aGlzLmJ1aWxkVXJsRnJvbUNvbnRleHQodXJsKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBjb3JlIGFwaSBlbmRwb2ludCAnYXBpLycgaGFyZGNvZGVkLCB0byBwdXQgaW4gY29uZmlnRnVsbCAhIHNob3VsZCBub3Qga25vdyB0aGF0IGhlcmUuXHJcbiAgICAgICAgICAgICAgICBjb25maWdGdWxsLnVybCA9IHRoaXMuYXBpQ29uZmlnLmNvcmVBcGlVcmwgKyAnYXBpLycgKyB1cmw7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYXBpQ29uZmlnLmp3dFRva2VuICYmIHRoaXMuYXBpQ29uZmlnLmN1cnJlbnRVc2VyUm9sZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhcmQgY29kZWQgaGVhZGVycywgbm90IGdvb2QsIHRvIGluamVjdFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwuaGVhZGVyc1snT0EtVXNlclJvbGUnXSA9IHRoaXMuYXBpQ29uZmlnLmN1cnJlbnRVc2VyUm9sZTtcclxuICAgICAgICAgICAgICAgICAgICBjb25maWdGdWxsLmhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9ICdCZWFyZXIgJyArIHRoaXMuYXBpQ29uZmlnLmp3dFRva2VuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIWNvbmZpZy5kaXNhYmxlWG1sSHR0cFJlcXVlc3RIZWFkZXIpIC8vIGlmIG5vdCBzZXQsIGV2YWx1YXRlcyB0byBmYWxzZVxyXG4gICAgICAgICAgICAgICAgY29uZmlnRnVsbC5oZWFkZXJzWydYLVJlcXVlc3RlZC1XaXRoJ10gPSAnWE1MSHR0cFJlcXVlc3QnO1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogT0Ugc3BlY2lmaWMgY29kZSwgdG8gcmVtb3ZlXHJcbiAgICAgICAgICAgIGlmICgoPGFueT50aGlzLiR3aW5kb3cpLnByZXZlbnRCbG9ja1VJICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPIE1HQSA6IHR5cGUgY2FzdGluZywgaXMgaXQgb2theSBvciBub3QgPyBiZXR0ZXIgYXBwcm9hY2ggP1xyXG4gICAgICAgICAgICAgICAgKDxhbnk+dGhpcy4kd2luZG93KS5wcmV2ZW50QmxvY2tVSSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gY29uZmlnRnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFN1Y2Nlc3MgaGFuZGxlclxyXG4gICAgICAgICAqIEBwYXJhbSB1cmwgOiBUT0RPIE1HQSByZW1vdmUgaWYgbm90IGxvZ2dlZC5cclxuICAgICAgICAgKiBAcmV0dXJucyB7fSBcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIHN1Y2Nlc3MgPSA8VD4odXJsOiBzdHJpbmcpOiAocHJvbWlzZUNhbGxiYWNrOiBuZy5JSHR0cFByb21pc2VDYWxsYmFja0FyZzxUPikgPT4gVCB8IG5nLklQcm9taXNlPGFueT4gPT4ge1xyXG5cclxuICAgICAgICAgICAgLy8gSlMgdHJpY2sgOiBjYXB0dXJlIHVybCB2YXJpYWJsZSBpbnNpZGUgY2xvc3VyZSBzY29wZSB0byBzdG9yZSBpdCBmb3IgY2FsbGJhY2sgd2hpY2ggY2Fubm90IGJlIGNhbGxlZCB3aXRoIDIgYXJndW1lbnRzXHJcbiAgICAgICAgICAgIHJldHVybiAocHJvbWlzZUNhbGxiYWNrOiBuZy5JSHR0cFByb21pc2VDYWxsYmFja0FyZzxUPik6IFQgfCBuZy5JUHJvbWlzZTxhbnk+ID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXByb21pc2VDYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignVW5leHBlY3RlZCAkaHR0cCBlcnJvciwgbm8gcmV0dXJuIHByb21pc2Ugb2JqZWN0IGNvdWxkIGJlIGZvdW5kLicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudG9hc3Rlci5lcnJvcignVW5leHBlY3RlZCBiZWhhdmlvcicsJ1BsZWFzZSBjb250YWN0IHlvdXIgbG9jYWwgc3VwcG9ydCB0ZWFtLicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRxLnJlamVjdChwcm9taXNlQ2FsbGJhY2spOyAvLyBSZWplY3QgcHJvbWlzZVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhbmRsZSB3aGVuIEFQSSBpcyBmaXhlZC4gU2VlIGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTE3NDY4OTQvd2hhdC1pcy10aGUtcHJvcGVyLXJlc3QtcmVzcG9uc2UtY29kZS1mb3ItYS12YWxpZC1yZXF1ZXN0LWJ1dC1hbi1lbXB0eS1kYXRhXHJcbiAgICAgICAgICAgICAgICAvL2lmICgocHJvbWlzZUNhbGxiYWNrLmRhdGEgPT09IG51bGwgfHwgcHJvbWlzZUNhbGxiYWNrLmRhdGEgPT09IHVuZGVmaW5lZCkgJiYgcHJvbWlzZUNhbGxiYWNrLnN0YXR1cyAhPT0gMjA0KSB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICB0aGlzLiRsb2cuZXJyb3IoJ1VuZXhwZWN0ZWQgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyLCBleHBlY3RlZCByZXNwb25zZSBkYXRhIGJ1dCBub25lIGZvdW5kLicpO1xyXG4gICAgICAgICAgICAgICAgLy8gICAgdGhpcy50b2FzdGVyLndhcm5pbmcoJ1VuZXhwZWN0ZWQgcmVzcG9uc2UnLCAnUGxlYXNlIGNvbnRhY3QgeW91ciBsb2NhbCBzdXBwb3J0IHRlYW0uJyk7XHJcbiAgICAgICAgICAgICAgICAvLyAgICByZXR1cm4gdGhpcy4kcS5yZWplY3QocHJvbWlzZUNhbGxiYWNrKTsgLy8gUmVqZWN0IHByb21pc2UgaWYgbm90IHdlbGwtZm9ybWVkIGRhdGFcclxuICAgICAgICAgICAgICAgIC8vfVxyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogc2FtZSBiZWhhdmlvciBhbHNvIG9uIGEgR0VUIHJlcXVlc3QgPyBpZiByZXF1ZXN0IGlzIEdFVCBhbmQgcmVzcG9uc2UgaXMgMjAwIHdpdGggbm8gZGF0YSwgcmV0dXJuIGVycm9yID8gKHBhc3MgaW4gcGFyYW1ldGVyIHJlcXVlc3QgY29udGV4dCB0byBsb2cgdGhpcyBlcnJvcikuXHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmRlYnVnKHByb21pc2VDYWxsYmFjayk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2VDYWxsYmFjay5kYXRhOyAvLyByZXR1cm4gb25seSB0aGUgZGF0YSBleHBlY3RlZCBmb3IgY2FsbGVyXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBFcnJvciBoYW5kbGVyXHJcbiAgICAgICAgICogQHBhcmFtIHJlc3BvbnNlIFxyXG4gICAgICAgICAqIEByZXR1cm5zIHt9IFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgZXJyb3IgPSAocmVzcG9uc2U6IG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPGFueT4pOiBuZy5JUHJvbWlzZTxuZy5JSHR0cFByb21pc2VDYWxsYmFja0FyZzxhbnk+PiA9PiB7IC8vIGRvIHNvbWV0aGluZyBvbiBlcnJvclxyXG5cclxuICAgICAgICAgICAgLy8gV2Ugc3VwcG9zZSBpbiBjYXNlIG9mIG5vIHJlc3BvbnNlIHRoYXQgdGhlIHNydiBkaWRuJ3Qgc2VuZCBhbnkgcmVzcG9uc2UuXHJcbiAgICAgICAgICAgIC8vIFRPRE8gTUdBOiBtYXkgYWxzbyBiZSBhIGZhdWx0IGluIGludGVybmFsICRodHRwIC8gYWpheCBjbGllbnQgc2lkZSBsaWIsIHRvIGRpc3Rpbmd1aXNoLlxyXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhID0gJ1NlcnZlciBub3QgcmVzcG9uZGluZyc7XHJcbiAgICAgICAgICAgICAgICByZXNwb25zZS5zdGF0dXMgPSA1MDM7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBjb250ZW50VHlwZSA9IHJlc3BvbnNlLmhlYWRlcnMoJ0NvbnRlbnQtVHlwZScpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbnRlbnRUeXBlICYmIGNvbnRlbnRUeXBlLmluZGV4T2YoJ2FwcGxpY2F0aW9uL2pzb24nKSA+IC0xIHx8IGNvbnRlbnRUeXBlLmluZGV4T2YoJ3RleHQvcGxhaW4nKSA+IC0xKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIG1lc3NhZ2U7XHJcblxyXG4gICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFuZGxlIGVycm9yIGhhbmRsaW5nIG1vcmUgZ2VuZXJpY2FsbHkgYmFzZWQgb24gaW5wdXQgZXJyb3IgbWVzc2FnZSBjb250cmFjdCBpbnN0ZWFkIG9mIGV4cGVjdGluZyBzcGVjaWZpYyBlcnJvciBzdHJjdHVyZS5cclxuXHJcbiAgICAgICAgICAgICAgICAvL2lmIChyZXNwb25zZS5kYXRhLk1vZGVsU3RhdGUpIHtcclxuICAgICAgICAgICAgICAgIC8vICAgIC8vVE9ETyBNR0EgOiBoYW5kbGUgdGhpcyB3aGVuIHdlbGwgZm9ybWF0dGVkIHNlcnZlci1zaWRlXHJcbiAgICAgICAgICAgICAgICAvL30gZWxzZVxyXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuTWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSByZXNwb25zZS5kYXRhLk1lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhbmRsZSBtb3JlIHJlc3BvbnNlIGNvZGVzIGdyYWNlZnVsbHkuXHJcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvYXN0ZXIud2FybmluZygnTm90IEZvdW5kJywgbWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudG9hc3Rlci5lcnJvcignU2VydmVyIHJlc3BvbnNlIGVycm9yJywgbWVzc2FnZSArICdcXG4gU3RhdHVzOiAnICsgcmVzcG9uc2Uuc3RhdHVzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudG9hc3Rlci5lcnJvcignSW50ZXJuYWwgc2VydmVyIGVycm9yJywgJ1N0YXR1czogJyArIHJlc3BvbnNlLnN0YXR1cyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihyZXNwb25zZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBXZSBkb24ndCByZWNvdmVyIGZyb20gZXJyb3IsIHNvIHdlIHByb3BhZ2F0ZSBpdCA6IGJlbG93IGhhbmRsZXJzIGhhdmUgdGhlIGNob2ljZSBvZiByZWFkaW5nIHRoZSBlcnJvciB3aXRoIGFuIGVycm9yIGhhbmRsZXIgb3Igbm90LiBTZWUgJHEgcHJvbWlzZXMgYmVoYXZpb3IgaGVyZSA6IGh0dHBzOi8vZ2l0aHViLmNvbS9rcmlza293YWwvcVxyXG4gICAgICAgICAgICAvLyBUaGlzIGJlaGF2aW9yIGlzIGRlc2lyZWQgc28gdGhhdCB3ZSBzaG93IGVycm9yIGluc2lkZSBzcGVjaWZpYyBzZXJ2ZXIgY29tbXVuaWNhdGlvbiBtb2RhbHMgYXQgc3BlY2lmaWMgcGxhY2VzIGluIHRoZSBhcHAsIG90aGVyd2lzZSBzaG93IGEgZ2xvYmFsIGFsZXJ0IG1lc3NhZ2UsIG9yIGV2ZW4gZG8gbm90IHNob3cgYW55dGhpbmcgaWYgbm90IG5lY2Vzc2FyeSAoZG8gbm90IGFkIGFuIGVycm9yIGhhbmRsZXIgaW4gYmVsb3cgaGFuZGxlcnMgb2YgdGhpcyBwcm9taXNlKS5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHEucmVqZWN0KHJlc3BvbnNlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEZ1bmN0aW9uIGNhbGxlZCBhdCB0aGUgZW5kIG9mIGFuIGFqYXggY2FsbCwgcmVnYXJkbGVzcyBvZiBpdCdzIHN1Y2Nlc3Mgb3IgZmFpbHVyZS5cclxuICAgICAgICAgKiBAcGFyYW0gcmVzcG9uc2VcclxuICAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGZpbmFsbHkgPSAoKTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IE9FLXNwZWNpZmljIGNvZGVcclxuICAgICAgICAgICAgaWYgKCg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgIT09IHVuZGVmaW5lZClcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8gTUdBIDogdHlwZSBjYXN0aW5nLCBpcyBpdCBva2F5IG9yIG5vdCA/IGJldHRlciBhcHByb2FjaCA/XHJcbiAgICAgICAgICAgICAgICAoPGFueT50aGlzLiR3aW5kb3cpLnByZXZlbnRCbG9ja1VJID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBUT0RPIE1HQSA6IHVzaW5nIG1ldGhvZCBmcm9tIExheW91dC5qcyA6IHRvIGRvY3VtZW50IHRvIG5vdCBoYW5kbGUgZHVwbGljYXRlIGNvZGUgISFcclxuICAgICAgICAvL1RPRE8gTUdBIDogbWFrZSBpdCBjYXBhYmxlIG9mIGhhbmRsaW5nIGZ1bGwgVVJMcyBvdXRzaWRlIG9mIE9FIDogZG8gbm90IHVzZSA/PyBob3cgdG8gP1xyXG4gICAgICAgIHByaXZhdGUgZ2V0VXJsUGF0aChhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXIpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXNlVXJsUmVnZXggPSAvKFxcL1xcdytcXC9cXChTXFwoXFx3K1xcKVxcKSlcXC9cXHcrLztcclxuICAgICAgICAgICAgdmFyIHVybCA9IHRoaXMuJHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZTtcclxuICAgICAgICAgICAgdmFyIGJhc2VVcmxNYXRjaGVzID0gYmFzZVVybFJlZ2V4LmV4ZWModXJsKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChiYXNlVXJsTWF0Y2hlcy5sZW5ndGggJiYgYmFzZVVybE1hdGNoZXMubGVuZ3RoID09PSAyKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGJhc2VVcmxXaXRoQ29udHJvbGxlck5hbWUgPSBiYXNlVXJsTWF0Y2hlc1swXTtcclxuICAgICAgICAgICAgICAgIHZhciBiYXNlVXJsID0gYmFzZVVybE1hdGNoZXNbMV07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBiYXNlVXJsV2l0aENvbnRyb2xsZXJOYW1lO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmFzZVVybDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuICcnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQTogT00tc3BlY2lmaWMgQVNQIE1WQyBjb2RlLCBub3QgdXNlZCBBVE0sIHRvIHJlbW92ZVxyXG4gICAgICAgIHByaXZhdGUgZ2V0Q3VycmVudFNlc3Npb25JRCgpIHtcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBtYWdpYyByZWdleHAgdG8gZmV0Y2ggU2Vzc2lvbklEIGluIFVSTCwgdG8gc3RvcmUgZWxzZXdoZXJlICFcclxuICAgICAgICAgICAgdmFyIHNlc3Npb25SZWdleCA9IC9odHRwczpcXC9cXC9bXFx3Ll0rXFwvW1xcdy5dK1xcLyhcXChTXFwoXFx3K1xcKVxcKSlcXC8uKi87XHJcbiAgICAgICAgICAgIC8vdmFyIHNlc3Npb25SZWdleCA9IC9odHRwczpcXC9cXC9bXFx3Ll0rXFwvT3JkZXJFbnRyeVxcLyhcXChTXFwoXFx3K1xcKVxcKSlcXC8uKi87XHJcblxyXG4gICAgICAgICAgICAvLyBUT0RPIE1HQSA6IHVwZGF0ZSByZWdleHAgdG8gdGhlIG9uZSBiZWxvd1xyXG4gICAgICAgICAgICAvL3ZhciBiYXNlVXJsUmVnZXggPSAvKGh0dHBzOlxcL1xcL1tcXHcuLV0rXFwvW1xcdy4tXStcXC9cXChTXFwoXFx3K1xcKVxcKVxcLylcXHcrLztcclxuXHJcblxyXG4gICAgICAgICAgICB2YXIgcGF0aCA9IHRoaXMuJGxvY2F0aW9uLmFic1VybCgpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHJlZ2V4cEFycmF5ID0gc2Vzc2lvblJlZ2V4LmV4ZWMocGF0aCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXJlZ2V4cEFycmF5KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJVbmFibGUgdG8gcmVjb2duaXplZCBzZWFyY2hlZCBwYXR0ZXJuIGluIGN1cnJlbnQgdXJsIGxvY2F0aW9uIHRvIHJldHJpZXZlIHNlc3Npb25JRC5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVnZXhwQXJyYXkubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJVbmFibGUgdG8gZmluZCBzZXNzaW9uSUQgaW4gc2VhcmNoZWQgcGF0dGVybiBpbiBjdXJyZW50IHVybC5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVnZXhwQXJyYXkubGVuZ3RoID4gMikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKFwiVG9vIG1hbnkgbWF0Y2hlcyBmb3VuZCBmb3IgdGhlIHNlc3Npb25JRCBzZWFyY2ggaW4gdGhlIGN1cnJlbnQgdXJsLlwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gcmVnZXhwQXJyYXlbMV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgnbmcuaHR0cFdyYXBwZXInLCBbJ3RvYXN0ZXInLCAnbmdBbmltYXRlJywgJ25nRmlsZVVwbG9hZCddKVxyXG4gICAgICAgIC8vIGRvbmUgaW4gY29uZmlndXJlSHR0cENhbGwgbWV0aG9kLlxyXG4gICAgICAgIC8vLmNvbmZpZyhbJyRodHRwUHJvdmlkZXInLCAoJGh0dHBQcm92aWRlcjogbmcuSUh0dHBQcm92aWRlcikgPT4ge1xyXG4gICAgICAgIC8vICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtUmVxdWVzdGVkLVdpdGgnXSA9ICdYTUxIdHRwUmVxdWVzdCc7XHJcbiAgICAgICAgLy99XSlcclxuICAgICAgICAuc2VydmljZSgnaHR0cFdyYXBwZXJTZXJ2aWNlJywgSHR0cFdyYXBwZXJTZXJ2aWNlKTtcclxufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
