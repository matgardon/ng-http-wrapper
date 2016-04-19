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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHAtd3JhcHBlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJDQUEyQztBQUMzQyxJQUFPLE9BQU8sQ0FrV2I7QUFsV0QsV0FBTyxPQUFPO0lBQUMsSUFBQSxJQUFJLENBa1dsQjtJQWxXYyxXQUFBLElBQUk7UUFBQyxJQUFBLFFBQVEsQ0FrVzNCO1FBbFdtQixXQUFBLFFBQVEsRUFBQyxDQUFDO1lBZTFCLElBQUssVUFBcUM7WUFBMUMsV0FBSyxVQUFVO2dCQUFHLHlDQUFHLENBQUE7Z0JBQUUsMkNBQUksQ0FBQTtnQkFBRSx5Q0FBRyxDQUFBO2dCQUFFLCtDQUFNLENBQUE7WUFBQyxDQUFDLEVBQXJDLFVBQVUsS0FBVixVQUFVLFFBQTJCO1lBQUEsQ0FBQztZQXlCM0M7O2VBRUc7WUFDSDtnQkFPSSxZQUFZO2dCQUVaLGNBQWM7Z0JBRWQsZUFBZTtnQkFDZiw0QkFDWSxLQUFzQixFQUN0QixPQUEwQixFQUMxQixJQUFvQixFQUNwQixFQUFnQixFQUNoQixTQUE4QixFQUM5QixNQUEyQyxFQUMzQyxPQUFrQztvQkFuQmxELGlCQStTQztvQkFsU2UsVUFBSyxHQUFMLEtBQUssQ0FBaUI7b0JBQ3RCLFlBQU8sR0FBUCxPQUFPLENBQW1CO29CQUMxQixTQUFJLEdBQUosSUFBSSxDQUFnQjtvQkFDcEIsT0FBRSxHQUFGLEVBQUUsQ0FBYztvQkFDaEIsY0FBUyxHQUFULFNBQVMsQ0FBcUI7b0JBQzlCLFdBQU0sR0FBTixNQUFNLENBQXFDO29CQUMzQyxZQUFPLEdBQVAsT0FBTyxDQUEyQjtvQkF1RjlDOzs7Ozs7OztzQkFRRTtvQkFDTSxzQkFBaUIsR0FBRyxVQUFDLE1BQWtCLEVBQUUsR0FBVyxFQUFFLE1BQTBCO3dCQUVwRixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLE1BQU0sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDOzRCQUNsRCxLQUFJLENBQUMsSUFBSSxDQUFDLEtBQUss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QixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxxRUFBcUUsQ0FBQyxDQUFDO3dCQUN2RixNQUFNLENBQUMsRUFBRSxDQUFDO29CQUNkLENBQUM7b0JBRUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUIsQ0FBQztnQkFHTCx5QkFBQztZQUFELENBL1NBLEFBK1NDLElBQUE7WUEvU1ksMkJBQWtCLHFCQStTOUIsQ0FBQTtZQUVELE9BQU8sQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7aUJBS3hELE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQzNELENBQUMsRUFsV21CLFFBQVEsR0FBUixhQUFRLEtBQVIsYUFBUSxRQWtXM0I7SUFBRCxDQUFDLEVBbFdjLElBQUksR0FBSixZQUFJLEtBQUosWUFBSSxRQWtXbEI7QUFBRCxDQUFDLEVBbFdNLE9BQU8sS0FBUCxPQUFPLFFBa1diIiwiZmlsZSI6Imh0dHAtd3JhcHBlci5zZXJ2aWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwaW5ncy90c2QuZC50c1wiIC8+XHJcbm1vZHVsZSBibHVlc2t5LmNvcmUuc2VydmljZXMge1xyXG5cclxuICAgIGltcG9ydCBBcGlDb25maWcgPSBibHVlc2t5LmNvcmUubW9kZWxzLkFwaUNvbmZpZztcclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElIdHRwV3JhcHBlckNvbmZpZyBleHRlbmRzIG5nLklSZXF1ZXN0U2hvcnRjdXRDb25maWcge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIG1haW4gQVBJIGVuZHBvaW50IHRvIHVzZSBhcyBkZWZhdWx0IG9uZSBpZiB1cmwgaXMgbm90IGZ1bGwuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgYXBpRW5kcG9pbnQ/OiBib29sZWFuO1xyXG4gICAgICAgIGZpbGU/OiBGaWxlLFxyXG4gICAgICAgIHVwbG9hZEluQmFzZTY0SnNvbj86IGJvb2xlYW47XHJcbiAgICAgICAgdXBsb2FkUHJvZ3Jlc3M/OiAoKSA9PiBhbnk7XHJcbiAgICAgICAgZGlzYWJsZVhtbEh0dHBSZXF1ZXN0SGVhZGVyPzogYm9vbGVhbjtcclxuICAgIH1cclxuXHJcbiAgICBlbnVtIEh0dHBNZXRob2QgeyBHRVQsIFBPU1QsIFBVVCwgREVMRVRFIH07XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJSHR0cFdyYXBwZXJTZXJ2aWNlIHtcclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQWxsIHNydi1zaWRlIGNvbmZpZ3VyYXRpb24gb2YgbWFpbiBBUEkgcHJvdmlkZWQgYnkgdGhlIGRvbWFpbiBmcm9tIHdoaWNoIHRoaXMgc2NyaXB0IHdhcyBsb2FkZWQsIEAgdGhlIHVybCAnQ29yZUFwaUF1dGgvR2V0Q29yZUFwaUNvbmZpZycuXHJcbiAgICAgICAgICogVE9ETyBNR0EgZml4IGhhcmQgY29kZWQgcGF0aC5cclxuICAgICAgICAgKiBUaGlzIGNvbmZpZ3VyYXRpb24gZGF0YSBpcyBsb2FkZWQgdXBvbiBpbml0aWFsaXphdGlvbiBvZiB0aGlzIHNlcnZpY2UgKHRvIGJlIHVzZWQgYXMgYSBzaW5nbGV0b24gaW4gdGhlIGFwcCkuIEFsbCBvdGhlciB3ZWIgY2FsbHMgYXJlIGJsb2NrZWQgYXMgbG9uZyBhcyB0aGlzIG9uZSBpcyBub3QgZmluaXNoZWQuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgYXBpQ29uZmlnOiBBcGlDb25maWc7XHJcblxyXG4gICAgICAgIC8vVE9ETyBNR0E6IGZvciBmb2xsb3dpbmcgbWV0aG9kcywgcmV0dXJuIElQcm9taXNlIGFuZCBhc3N1bWUgYWJzdHJhY3Rpb24gb3IgbGV0IGJlbG93IHNlcnZpY2VzIGhhbmRsZSBJSHR0cFByb21pc2VzID9cclxuXHJcbiAgICAgICAgZ2V0PFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgZGVsZXRlPFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgcG9zdDxUPih1cmw6IHN0cmluZywgZGF0YTogYW55LCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgcHV0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG5cclxuICAgICAgICAvL1RPRE8gTUdBIGltcHJvdmUgdHlwaW5nIHdpdGggYW5ndWxhci11cGxvYWQgdHNkIGV0Y1xyXG4gICAgICAgIHVwbG9hZDxUPih1cmw6IHN0cmluZywgZmlsZTogRmlsZSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBUT0RPIE1HQSA6IHRoaXMgbWF5IG5vdCBuZWVkIHRvIGJlIGEgZGVkaWNhdGVkIHNlcnZpY2UsIGl0IGNhbiBhbHNvIGJlIGluY29ycG9yYXRlZCBpbnRvIHRoZSBodHRwSW50ZXJjZXB0b3IuIERlY2lkZSBiZXN0IGFwcHJvYWNoIGRlcGVuZGluZyBvbiBwbGFubmVkIHVzZS5cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEh0dHBXcmFwcGVyU2VydmljZSBpbXBsZW1lbnRzIElIdHRwV3JhcHBlclNlcnZpY2Uge1xyXG5cclxuICAgICAgICAvLyNyZWdpb24gcHJvcGVydGllc1xyXG5cclxuICAgICAgICBwcml2YXRlIGluaXRQcm9taXNlOiBuZy5JUHJvbWlzZTxhbnk+O1xyXG4gICAgICAgIHB1YmxpYyBhcGlDb25maWc6IEFwaUNvbmZpZztcclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBjdG9yXHJcblxyXG4gICAgICAgIC8qIEBuZ0luamVjdCAqL1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICBwcml2YXRlICRodHRwOiBuZy5JSHR0cFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGxvZzogbmcuSUxvZ1NlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkbG9jYXRpb246IG5nLklMb2NhdGlvblNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgVXBsb2FkOiBuZy5hbmd1bGFyRmlsZVVwbG9hZC5JVXBsb2FkU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSB0b2FzdGVyOiBuZ3RvYXN0ZXIuSVRvYXN0ZXJTZXJ2aWNlXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIC8vIGluaXQgY29yZSBhcGkgY29uZmlnIGRhdGEgb24gY3RvclxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogaGFyZCBjb2RlZCBwYXRoIGZvciBDb3JlckFwaUF1dGhDdHJsIHRvIGluamVjdFxyXG4gICAgICAgICAgICB0aGlzLmluaXRQcm9taXNlID0gdGhpcy4kaHR0cC5nZXQ8QXBpQ29uZmlnPih0aGlzLnRyeUdldEZ1bGxVcmwoJ0NvcmVBcGlBdXRoL0dldENvcmVBcGlDb25maWcnKSlcclxuICAgICAgICAgICAgICAgIC5zdWNjZXNzKChjb3JlQXBpQ29uZmlnKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcGlDb25maWcgPSBjb3JlQXBpQ29uZmlnO1xyXG4gICAgICAgICAgICAgICAgfSkuZXJyb3IoKGVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKCdVbmFibGUgdG8gcmV0cmlldmUgQVBJIGNvbmZpZy4gQWJvcnRpbmcgaHR0cFdyYXBwZXJTZXJ2aWNlIGluaXRpYWxpemF0aW9uLicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIHB1YmxpYyBtZXRob2RzXHJcblxyXG4gICAgICAgIGdldDxUPih1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuR0VULCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkZWxldGU8VD4odXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLkdFVCwgdXJsLCBjb25maWcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcG9zdDxUPih1cmw6IHN0cmluZywgZGF0YTogYW55LCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcclxuICAgICAgICAgICAgY29uZmlnLmRhdGEgPSBkYXRhIHx8IGNvbmZpZy5kYXRhOztcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLlBPU1QsIHVybCwgY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1dDxUPih1cmw6IHN0cmluZywgZGF0YTogYW55LCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7fTtcclxuICAgICAgICAgICAgY29uZmlnLmRhdGEgPSBkYXRhIHx8IGNvbmZpZy5kYXRhO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuUFVULCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGxvYWQ8VD4odXJsOiBzdHJpbmcsIGZpbGU6IEZpbGUsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuXHJcbiAgICAgICAgICAgIGlmICghZmlsZSAmJiAoIWNvbmZpZyB8fCAhY29uZmlnLmZpbGUpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ0Nhbm5vdCBzdGFydCB1cGxvYWQgd2l0aCBudWxsIHtmaWxlfSBwYXJhbWV0ZXIuJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xyXG4gICAgICAgICAgICBjb25maWcuZmlsZSA9IGZpbGUgfHwgY29uZmlnLmZpbGU7IC8vVE9ETyBNR0EgOiBkbyBub3QgZXhwb3NlIGZpbGUgaW4gSUh0dHBXcmFwcGVyQ29uZmlnID9cclxuICAgICAgICAgICAgY29uZmlnLmRhdGEgPSBjb25maWcuZGF0YSB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjb25maWcudXBsb2FkSW5CYXNlNjRKc29uKSB7XHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBtYWtlIHN1cmUgdGhpcyBkZWxheXMgbmV4dCBjYWxsIGFuZCB1cGxvYWQgaXMgbm90IGRvbmUgYmVmb3JlIGJhc2U2NCBlbmNvZGluZyBpcyBmaW5pc2hlZCwgZXZlbiBpZiBwcm9taXNlIGlzIGFscmVhZHkgcmVzb2x2ZWQgPz8/XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5VcGxvYWQuYmFzZTY0RGF0YVVybChmaWxlKS50aGVuKChmaWxlQmFzZTY0VXJsKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogaGFyZC1jb2RlZCBrZXkgdG8gZmV0Y2ggYmFzZTY0IGVuY29kaW5nLCB0byBwYXJhbWV0cml6ZSB3aXRoIHNlcnZlci1zaWRlICFcclxuICAgICAgICAgICAgICAgICAgICBjb25maWcuZGF0YS5maWxlQmFzZTY0VXJsID0gZmlsZUJhc2U2NFVybDtcclxuICAgICAgICAgICAgICAgICAgICAvL25vcm1hbCBwb3N0IGluIGNhc2Ugb2YgYmFzZTY0LWVuY29kZWQgZGF0YVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5QT1NULCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbmZpZy5kYXRhLmZpbGVGb3JtRGF0YU5hbWUgPSAnZmlsZSc7IC8vIGZpbGUgZm9ybURhdGEgbmFtZSAoJ0NvbnRlbnQtRGlzcG9zaXRpb24nKSwgc2VydmVyIHNpZGUgcmVxdWVzdCBmb3JtIG5hbWVcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pbml0UHJvbWlzZS50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBIDogbm90IHNhZmUgaGFyZCBjYXN0XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGJlaGF2aW9yIGR1cGxpY2F0aW9uIHdpdGggdGhpcy5hamF4LCBub3QgRFJZLCB0byBpbXByb3ZlXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuVXBsb2FkLnVwbG9hZDxUPig8bmcuYW5ndWxhckZpbGVVcGxvYWQuSUZpbGVVcGxvYWRDb25maWdGaWxlPnRoaXMuY29uZmlndXJlSHR0cENhbGwoSHR0cE1ldGhvZC5QT1NULCB1cmwsIGNvbmZpZykpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnRoZW48VD4odGhpcy5zdWNjZXNzPFQ+KHVybCksIHRoaXMuZXJyb3IsIGNvbmZpZy51cGxvYWRQcm9ncmVzcykgLy9UT0RPIE1HQSA6IHVwbG9hZFByb2dyZXNzIGNhbGxiYWNrIG9rID9cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAuZmluYWxseSh0aGlzLmZpbmFsbHkpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICAvLyNyZWdpb24gcHJpdmF0ZSBtZXRob2RzXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFV0aWxpdHkgbWV0aG9kLlxyXG4gICAgICAgICAqIE1haW4gY2FsbGVyIHRoYXQgYWxsIHdyYXBwZXIgY2FsbHMgKGdldCwgZGVsZXRlLCBwb3N0LCBwdXQpIG11c3QgdXNlIHRvIHNoYXJlIGNvbW1vbiBiZWhhdmlvci5cclxuICAgICAgICAgKiBAcGFyYW0gY29uZmlnXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBhamF4PFQ+KG1ldGhvZDogSHR0cE1ldGhvZCwgdXJsOiBzdHJpbmcsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZykge1xyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogbWFrZSBzdXJlIGluaXRQcm9taXNlIHJlc29sdmUgYXV0b21hdGljYWxseSB3aXRob3V0IG92ZXJoZWFkIG9uY2UgZmlyc3QgY2FsbCBzdWNlc3NmdWxsLlxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbml0UHJvbWlzZS50aGVuKCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRodHRwPFQ+KHRoaXMuY29uZmlndXJlSHR0cENhbGwobWV0aG9kLCB1cmwsIGNvbmZpZykpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC50aGVuPFQ+KHRoaXMuc3VjY2VzczxUPih1cmwpLCB0aGlzLmVycm9yKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAuZmluYWxseSh0aGlzLmZpbmFsbHkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICogUHJlcGFyZXMgYSB7QGxpbmsgbmcjJGh0dHAjY29uZmlnIGNvbmZpZ30gb2JqZWN0IGZvciAkaHR0cCBjYWxsLlxyXG4gICAgICAgICogVGhlIG9wZXJhdGlvbnMgaW5jbHVkZSBzZXR0aW5nIGRlZmF1bHQgdmFsdWVzIHdoZW4gbm90IHByb3ZpZGVkLCBhbmQgc2V0dGluZyBodHRwIGhlYWRlcnMgaWYgbmVlZGVkIGZvciA6XHJcbiAgICAgICAgKiAgLSBBamF4IGNhbGxzXHJcbiAgICAgICAgKiAgLSBBdXRob3JpemF0aW9uIHRva2VuXHJcbiAgICAgICAgKiAgLSBDdXJyZW50IFVzZXJSb2xlLiAgIFxyXG4gICAgICAgICogQHBhcmFtIG9wdGlvbnNcclxuICAgICAgICAqIEByZXR1cm5zIHtuZy4kaHR0cC5jb25maWd9IHRoZSBjb25maWd1cmF0aW9uIG9iamVjdCByZWFkeSB0byBiZSBpbmplY3RlZCBpbnRvIGEgJGh0dHAgY2FsbC4gXHJcbiAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGNvbmZpZ3VyZUh0dHBDYWxsID0gKG1ldGhvZDogSHR0cE1ldGhvZCwgdXJsOiBzdHJpbmcsIGNvbmZpZzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVJlcXVlc3RDb25maWcgPT4ge1xyXG5cclxuICAgICAgICAgICAgaWYgKCF1cmwgfHwgbWV0aG9kID09PSBudWxsIHx8IG1ldGhvZCA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJVUkwgJiBNRVRIT0QgcGFyYW1ldGVycyBhcmUgbmVjZXNzYXJ5IGZvciBodHRwV3JhcHBlciBjYWxscy4gQWJvcnRpbmcuXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IGhhcmQgY2FzdCBpcyBub3Qgc2FmZSwgd2UgbWF5IGZvcmdldCB0byBzZXQgdXJsICYgbWV0aG9kIHBhcmFtZXRlcnMuIFRPRklYLlxyXG4gICAgICAgICAgICAvLyBhdXRvbWF0aWNhbGx5IGdldCBhbGwgbm9uLWZpbHRlcmVkIHBhcmFtZXRlcnMgJiBrZWVwIHRoZW0gZm9yIHRoaXMgbmV3IG9iamVjdC5cclxuICAgICAgICAgICAgdmFyIGNvbmZpZ0Z1bGwgPSA8bmcuSVJlcXVlc3RDb25maWc+Y29uZmlnO1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogc3VwcG9ydCBtYXBwaW5nIGJldHdlZW4gdXBsb2FkICYgcG9zdCBoZXJlID9cclxuICAgICAgICAgICAgY29uZmlnRnVsbC5tZXRob2QgPSBIdHRwTWV0aG9kW21ldGhvZF07XHJcbiAgICAgICAgICAgIGNvbmZpZ0Z1bGwudXJsID0gdXJsO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbmZpZy5hcGlFbmRwb2ludCAmJiAoIXRoaXMuYXBpQ29uZmlnIHx8XHJcbiAgICAgICAgICAgICAgICAhdGhpcy5hcGlDb25maWcuand0VG9rZW4gfHxcclxuICAgICAgICAgICAgICAgICF0aGlzLmFwaUNvbmZpZy5jdXJyZW50VXNlclJvbGUpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ1tJbnRlcm5hbEVycm9yXSBjb3JlQXBpIGNhbGwgaW50ZW5kZWQgd2l0aG91dCBuZWNlc3NhcnkgY2FwaSBjcmVkZW50aWFscy4gQWJvcnRpbmcuJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uZmlnRnVsbC5oZWFkZXJzID0gY29uZmlnLmhlYWRlcnMgfHwge307XHJcblxyXG4gICAgICAgICAgICBpZiAoIWNvbmZpZy5hcGlFbmRwb2ludCkgeyAvLyBpZiBub3Qgc2V0LCBldmFsdWF0ZXMgdG8gZmFsc2VcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwudXJsID0gdGhpcy50cnlHZXRGdWxsVXJsKHVybCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBIDogY29yZSBhcGkgZW5kcG9pbnQgJ2FwaS8nIGhhcmRjb2RlZCwgdG8gcHV0IGluIGNvbmZpZ0Z1bGwgISBzaG91bGQgbm90IGtub3cgdGhhdCBoZXJlLlxyXG4gICAgICAgICAgICAgICAgY29uZmlnRnVsbC51cmwgPSB0aGlzLmFwaUNvbmZpZy5jb3JlQXBpVXJsICsgJ2FwaS8nICsgdXJsO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFwaUNvbmZpZy5qd3RUb2tlbiAmJiB0aGlzLmFwaUNvbmZpZy5jdXJyZW50VXNlclJvbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYXJkIGNvZGVkIGhlYWRlcnMsIG5vdCBnb29kLCB0byBpbmplY3RcclxuICAgICAgICAgICAgICAgICAgICBjb25maWdGdWxsLmhlYWRlcnNbJ09BLVVzZXJSb2xlJ10gPSB0aGlzLmFwaUNvbmZpZy5jdXJyZW50VXNlclJvbGU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnRnVsbC5oZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSAnQmVhcmVyICcgKyB0aGlzLmFwaUNvbmZpZy5qd3RUb2tlbjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFjb25maWcuZGlzYWJsZVhtbEh0dHBSZXF1ZXN0SGVhZGVyKSAvLyBpZiBub3Qgc2V0LCBldmFsdWF0ZXMgdG8gZmFsc2VcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwuaGVhZGVyc1snWC1SZXF1ZXN0ZWQtV2l0aCddID0gJ1hNTEh0dHBSZXF1ZXN0JztcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IE9FIHNwZWNpZmljIGNvZGUsIHRvIHJlbW92ZVxyXG4gICAgICAgICAgICBpZiAoKDxhbnk+dGhpcy4kd2luZG93KS5wcmV2ZW50QmxvY2tVSSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyBNR0EgOiB0eXBlIGNhc3RpbmcsIGlzIGl0IG9rYXkgb3Igbm90ID8gYmV0dGVyIGFwcHJvYWNoID9cclxuICAgICAgICAgICAgICAgICg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZ0Z1bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTdWNjZXNzIGhhbmRsZXJcclxuICAgICAgICAgKiBUT0RPIE1HQSA6IHdoYXQgaXMgdXJsIHVzZWQgZm9yID8/P1xyXG4gICAgICAgICAqIEBwYXJhbSB1cmwgXHJcbiAgICAgICAgICogQHJldHVybnMge30gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBzdWNjZXNzID0gPFQ+KHVybDogc3RyaW5nKTogKHByb21pc2VDYWxsYmFjazogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8VD4pID0+IFQgfCBuZy5JUHJvbWlzZTxhbnk+ID0+IHtcclxuXHJcbiAgICAgICAgICAgIC8vIEpTIHRyaWNrIDogY2FwdHVyZSB1cmwgdmFyaWFibGUgaW5zaWRlIGNsb3N1cmUgc2NvcGUgdG8gc3RvcmUgaXQgZm9yIGNhbGxiYWNrIHdoaWNoIGNhbm5vdCBiZSBjYWxsZWQgd2l0aCAyIGFyZ3VtZW50c1xyXG4gICAgICAgICAgICByZXR1cm4gKHByb21pc2VDYWxsYmFjazogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8VD4pOiBUIHwgbmcuSVByb21pc2U8YW55PiA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFwcm9taXNlQ2FsbGJhY2sgfHwgIXByb21pc2VDYWxsYmFjay5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogdGhpbmsgYWJvdXQgdGhpcyAuLi4gTWF5IG5vdCBiZSBhY2N1cmF0ZSA/IG9yIG1heSBub3QgYmUgYW4gZXJyb3IgaWYgcmV0dXJuIHR5cGUgaXMgbnVsbCBpbiBjYXNlIG5vIGRhdGEgZm91bmRcclxuICAgICAgICAgICAgICAgICAgICAvL3Jlc3BvbnNlLnN0YXR1cyA9IDUwMztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IocHJvbWlzZUNhbGxiYWNrKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvYXN0ZXIud2FybmluZygnVW5leHBlY3RlZCByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXInLCAnQ2FsbCBzdWNjZXNzZnVsbCwgYnV0IG5vIGRhdGEgZm91bmQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGZpbmQgb3V0IGhvdyB0byBoYW5kbGUgdGhhdCBhcyB0byBleHBlY3RkIHJldHVybiB0eXBlID9cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kcS5yZWplY3QocHJvbWlzZUNhbGxiYWNrKTsgLy8gUmVqZWN0IHByb21pc2UgaWYgbm90IHdlbGwtZm9ybWVkIGRhdGFcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZGVidWcocHJvbWlzZUNhbGxiYWNrKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvbWlzZUNhbGxiYWNrLmRhdGE7IC8vIHJldHVybiBvbmx5IHRoZSBkYXRhIGV4cGVjdGVkIGZvciBjYWxsZXJcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEVycm9yIGhhbmRsZXJcclxuICAgICAgICAgKiBAcGFyYW0gcmVzcG9uc2UgXHJcbiAgICAgICAgICogQHJldHVybnMge30gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBlcnJvciA9IChyZXNwb25zZTogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8YW55Pik6IG5nLklQcm9taXNlPG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPGFueT4+ID0+IHsgLy8gZG8gc29tZXRoaW5nIG9uIGVycm9yXHJcblxyXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhID0gJ1NlcnZlciBub3QgcmVzcG9uZGluZyc7XHJcbiAgICAgICAgICAgICAgICByZXNwb25zZS5zdGF0dXMgPSA1MDM7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gU3RyaW5nKHJlc3BvbnNlLmRhdGEpICsgJ1xcbiBTdGF0dXM6ICcgKyByZXNwb25zZS5zdGF0dXMudG9TdHJpbmcoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudG9hc3Rlci5lcnJvcignU2VydmVyIHJlc3BvbnNlIGVycm9yJywgbWVzc2FnZSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IocmVzcG9uc2UpO1xyXG5cclxuICAgICAgICAgICAgLy8gV2UgZG9uJ3QgcmVjb3ZlciBmcm9tIGVycm9yLCBzbyB3ZSBwcm9wYWdhdGUgaXQgOiBiZWxvdyBoYW5kbGVycyBoYXZlIHRoZSBjaG9pY2Ugb2YgcmVhZGluZyB0aGUgZXJyb3Igd2l0aCBhbiBlcnJvciBoYW5kbGVyIG9yIG5vdC4gU2VlICRxIHByb21pc2VzIGJlaGF2aW9yIGhlcmUgOiBodHRwczovL2dpdGh1Yi5jb20va3Jpc2tvd2FsL3FcclxuICAgICAgICAgICAgLy8gVGhpcyBiZWhhdmlvciBpcyBkZXNpcmVkIHNvIHRoYXQgd2Ugc2hvdyBlcnJvciBpbnNpZGUgc3BlY2lmaWMgc2VydmVyIGNvbW11bmljYXRpb24gbW9kYWxzIGF0IHNwZWNpZmljIHBsYWNlcyBpbiB0aGUgYXBwLCBvdGhlcndpc2Ugc2hvdyBhIGdsb2JhbCBhbGVydCBtZXNzYWdlLCBvciBldmVuIGRvIG5vdCBzaG93IGFueXRoaW5nIGlmIG5vdCBuZWNlc3NhcnkgKGRvIG5vdCBhZCBhbiBlcnJvciBoYW5kbGVyIGluIGJlbG93IGhhbmRsZXJzIG9mIHRoaXMgcHJvbWlzZSkuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiRxLnJlamVjdChyZXNwb25zZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBGdW5jdGlvbiBjYWxsZWQgYXQgdGhlIGVuZCBvZiBhbiBhamF4IGNhbGwsIHJlZ2FyZGxlc3Mgb2YgaXQncyBzdWNjZXNzIG9yIGZhaWx1cmUuXHJcbiAgICAgICAgICogQHBhcmFtIHJlc3BvbnNlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBmaW5hbGx5ID0gKCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICAvL1RPRE8gTUdBOiBPRS1zcGVjaWZpYyBjb2RlXHJcbiAgICAgICAgICAgIGlmICgoPGFueT50aGlzLiR3aW5kb3cpLnByZXZlbnRCbG9ja1VJICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPIE1HQSA6IHR5cGUgY2FzdGluZywgaXMgaXQgb2theSBvciBub3QgPyBiZXR0ZXIgYXBwcm9hY2ggP1xyXG4gICAgICAgICAgICAgICAgKDxhbnk+dGhpcy4kd2luZG93KS5wcmV2ZW50QmxvY2tVSSA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQSA6IG1ldGhvZCB0byBkb2N1bWVudCBhbmQgaW1wcm92ZSByb2J1c3RuZXNzICsgdXNlIGluIE9FIG91dHNpZGUgb2YgYW5ndWxhciAvLyBtdXR1YWxpemVcclxuICAgICAgICAvLyBUcmllcyB0byBwYXJzZSB0aGUgaW5wdXQgdXJsIDpcclxuICAgICAgICAvLyBJZiBpdCBzZWVtcyB0byBiZSBhIGZ1bGwgVVJMLCB0aGVuIHJldHVybiBhcyBpcyAoY29uc2lkZXJzIGl0IGV4dGVybmFsIFVybClcclxuICAgICAgICAvLyBPdGhlcndpc2UsIHRyaWVzIHRvIGZpbmQgdGhlIGJhc2UgVVJMIG9mIHRoZSBjdXJyZW50IEJsdWVTa3kgYXBwIHdpdGggb3Igd2l0aG91dCB0aGUgaW5jbHVkZWQgQ29udHJvbGxlciBhbmQgcmV0dXJucyB0aGUgZnVsbCBVcmxcclxuICAgICAgICBwcml2YXRlIHRyeUdldEZ1bGxVcmwodXJsSW5wdXQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAgICAgICAgIC8vIFVybCBzdGFydHMgd2l0aCBodHRwOi8vIG9yIGh0dHBzOi8vID0+IGxlYXZlIGFzIHRoaXNcclxuICAgICAgICAgICAgaWYgKHVybElucHV0LnNsaWNlKDAsICdodHRwOi8vJy5sZW5ndGgpID09PSAnaHR0cDovLycgfHxcclxuICAgICAgICAgICAgICAgIHVybElucHV0LnNsaWNlKDAsICdodHRwczovLycubGVuZ3RoKSA9PT0gJ2h0dHBzOi8vJykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVybElucHV0O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBCb29sZWFuIHVzZWQgdG8gdHJ5IHRvIGRldGVybWluZSBjb3JyZWN0IGZ1bGwgdXJsIChhZGQgLyBvciBub3QgYmVmb3JlIHRoZSB1cmwgZnJhZ21lbnQgZGVwZW5kaW5nIG9uIGlmIGZvdW5kIG9yIG5vdClcclxuICAgICAgICAgICAgdmFyIHVybEZyYWdtZW50U3RhcnRzV2l0aFNsYXNoID0gdXJsSW5wdXQuc2xpY2UoMCwgJy8nLmxlbmd0aCkgPT09ICcvJztcclxuXHJcbiAgICAgICAgICAgIC8vIFJlZ2V4IHRyeWluZyB0byBkZXRlcm1pbmUgaWYgdGhlIGlucHV0IGZyYWdtZW50IGNvbnRhaW5zIGEgLyBiZXR3ZWVuIHR3byBjaGFyYWN0ZXIgc3VpdGVzID0+IGNvbnRyb2xsZXIgZ2l2ZW4gYXMgaW5wdXQsIG90aGVyd2lzZSwgYWN0aW9uIG9uIHNhbWUgY29udHJvbGxlciBleHBlY3RlZFxyXG4gICAgICAgICAgICB2YXIgY29udHJvbGxlcklzUHJlc2VudFJlZ2V4ID0gL1xcdytcXC9cXHcrLztcclxuXHJcbiAgICAgICAgICAgIHZhciBhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXIgPSAhY29udHJvbGxlcklzUHJlc2VudFJlZ2V4LnRlc3QodXJsSW5wdXQpO1xyXG5cclxuICAgICAgICAgICAgdmFyIGJhc2VVcmwgPSB0aGlzLmdldFVybFBhdGgoYWN0aW9uSXNPblNhbWVDb250cm9sbGVyKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBiYXNlVXJsICsgKHVybEZyYWdtZW50U3RhcnRzV2l0aFNsYXNoID8gdXJsSW5wdXQgOiAoJy8nICsgdXJsSW5wdXQpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFRPRE8gTUdBIDogdXNpbmcgbWV0aG9kIGZyb20gTGF5b3V0LmpzIDogdG8gZG9jdW1lbnQgdG8gbm90IGhhbmRsZSBkdXBsaWNhdGUgY29kZSAhIVxyXG4gICAgICAgIC8vVE9ETyBNR0EgOiBtYWtlIGl0IGNhcGFibGUgb2YgaGFuZGxpbmcgZnVsbCBVUkxzIG91dHNpZGUgb2YgT0UgOiBkbyBub3QgdXNlID8/IGhvdyB0byA/XHJcbiAgICAgICAgcHJpdmF0ZSBnZXRVcmxQYXRoKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcikge1xyXG5cclxuICAgICAgICAgICAgdmFyIGJhc2VVcmxSZWdleCA9IC8oXFwvXFx3K1xcL1xcKFNcXChcXHcrXFwpXFwpKVxcL1xcdysvO1xyXG4gICAgICAgICAgICB2YXIgdXJsID0gdGhpcy4kd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lO1xyXG4gICAgICAgICAgICB2YXIgYmFzZVVybE1hdGNoZXMgPSBiYXNlVXJsUmVnZXguZXhlYyh1cmwpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGJhc2VVcmxNYXRjaGVzLmxlbmd0aCAmJiBiYXNlVXJsTWF0Y2hlcy5sZW5ndGggPT09IDIpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgYmFzZVVybFdpdGhDb250cm9sbGVyTmFtZSA9IGJhc2VVcmxNYXRjaGVzWzBdO1xyXG4gICAgICAgICAgICAgICAgdmFyIGJhc2VVcmwgPSBiYXNlVXJsTWF0Y2hlc1sxXTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoYWN0aW9uSXNPblNhbWVDb250cm9sbGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJhc2VVcmxXaXRoQ29udHJvbGxlck5hbWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBiYXNlVXJsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gJyc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL1RPRE8gTUdBOiBPTS1zcGVjaWZpYyBBU1AgTVZDIGNvZGUsIG5vdCB1c2VkIEFUTSwgdG8gcmVtb3ZlXHJcbiAgICAgICAgcHJpdmF0ZSBnZXRDdXJyZW50U2Vzc2lvbklEKCkge1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IG1hZ2ljIHJlZ2V4cCB0byBmZXRjaCBTZXNzaW9uSUQgaW4gVVJMLCB0byBzdG9yZSBlbHNld2hlcmUgIVxyXG4gICAgICAgICAgICB2YXIgc2Vzc2lvblJlZ2V4ID0gL2h0dHBzOlxcL1xcL1tcXHcuXStcXC9bXFx3Ll0rXFwvKFxcKFNcXChcXHcrXFwpXFwpKVxcLy4qLztcclxuICAgICAgICAgICAgLy92YXIgc2Vzc2lvblJlZ2V4ID0gL2h0dHBzOlxcL1xcL1tcXHcuXStcXC9PcmRlckVudHJ5XFwvKFxcKFNcXChcXHcrXFwpXFwpKVxcLy4qLztcclxuXHJcbiAgICAgICAgICAgIC8vIFRPRE8gTUdBIDogdXBkYXRlIHJlZ2V4cCB0byB0aGUgb25lIGJlbG93XHJcbiAgICAgICAgICAgIC8vdmFyIGJhc2VVcmxSZWdleCA9IC8oaHR0cHM6XFwvXFwvW1xcdy4tXStcXC9bXFx3Li1dK1xcL1xcKFNcXChcXHcrXFwpXFwpXFwvKVxcdysvO1xyXG5cclxuXHJcbiAgICAgICAgICAgIHZhciBwYXRoID0gdGhpcy4kbG9jYXRpb24uYWJzVXJsKCk7XHJcblxyXG4gICAgICAgICAgICB2YXIgcmVnZXhwQXJyYXkgPSBzZXNzaW9uUmVnZXguZXhlYyhwYXRoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghcmVnZXhwQXJyYXkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihcIlVuYWJsZSB0byByZWNvZ25pemVkIHNlYXJjaGVkIHBhdHRlcm4gaW4gY3VycmVudCB1cmwgbG9jYXRpb24gdG8gcmV0cmlldmUgc2Vzc2lvbklELlwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyZWdleHBBcnJheS5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihcIlVuYWJsZSB0byBmaW5kIHNlc3Npb25JRCBpbiBzZWFyY2hlZCBwYXR0ZXJuIGluIGN1cnJlbnQgdXJsLlwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyZWdleHBBcnJheS5sZW5ndGggPiAyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJUb28gbWFueSBtYXRjaGVzIGZvdW5kIGZvciB0aGUgc2Vzc2lvbklEIHNlYXJjaCBpbiB0aGUgY3VycmVudCB1cmwuXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiByZWdleHBBcnJheVsxXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgfVxyXG5cclxuICAgIGFuZ3VsYXIubW9kdWxlKCduZy5odHRwV3JhcHBlcicsIFsndG9hc3RlcicsICduZ0ZpbGVVcGxvYWQnXSlcclxuICAgICAgICAvLyBkb25lIGluIGNvbmZpZ3VyZUh0dHBDYWxsIG1ldGhvZC5cclxuICAgICAgICAvLy5jb25maWcoWyckaHR0cFByb3ZpZGVyJywgKCRodHRwUHJvdmlkZXI6IG5nLklIdHRwUHJvdmlkZXIpID0+IHtcclxuICAgICAgICAvLyAgICAkaHR0cFByb3ZpZGVyLmRlZmF1bHRzLmhlYWRlcnMuY29tbW9uWydYLVJlcXVlc3RlZC1XaXRoJ10gPSAnWE1MSHR0cFJlcXVlc3QnO1xyXG4gICAgICAgIC8vfV0pXHJcbiAgICAgICAgLnNlcnZpY2UoJ2h0dHBXcmFwcGVyU2VydmljZScsIEh0dHBXcmFwcGVyU2VydmljZSk7XHJcbn0iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
