///<reference path="../typings/tsd.d.ts" />
var bluesky;
(function (bluesky) {
    var core;
    (function (core) {
        var services;
        (function (services) {
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
                    //#endregion
                    //#region private methods
                    /**
                    * Prepares a {@link ng#$http#config config} object for $http call.
                    * The operations include setting default values when not provided, and setting http headers if needed for :
                    *  - Ajax calls
                    *  - Authorization token
                    *  - Current UserRole.
                    * @param options
                    * @returns {ng.$http.config} the configuration object ready to be injected into a $http call.
                    */
                    this.configureHttpCall = function (config) {
                        if (!config.url || !config.method) {
                            _this.$log.error("URL & METHOD parameters are necessary for httpWrapper calls. Aborting.");
                            return null;
                        }
                        if (config.coreApiEndpoint && (!_this.coreApiConfig ||
                            !_this.coreApiConfig.jwtToken ||
                            !_this.coreApiConfig.currentUserRole)) {
                            _this.$log.error('[InternalError] coreApi call intended without necessary capi credentials. Aborting.');
                            return null;
                        }
                        config.headers = config.headers || {};
                        //TODO MGA : core api endpoint 'api/' hardcoded, to put in config ! should not know that here.
                        if (!config.coreApiEndpoint) {
                            config.url = _this.tryGetFullUrl(config.url);
                        }
                        else {
                            config.url = _this.coreApiConfig.coreApiUrl + 'api/' + config.url;
                            if (_this.coreApiConfig.jwtToken && _this.coreApiConfig.currentUserRole) {
                                //TODO MGA: hard coded headers, not good, to inject
                                config.headers['OA-UserRole'] = _this.coreApiConfig.currentUserRole;
                                config.headers['Authorization'] = 'Bearer ' + _this.coreApiConfig.jwtToken;
                            }
                        }
                        if (!config.disableXmlHttpRequestHeader)
                            config.headers['X-Requested-With'] = 'XMLHttpRequest';
                        //TODO MGA: OE specific code, to remove
                        if (_this.$window.preventBlockUI !== undefined)
                            // TODO MGA : type casting, is it okay or not ? better approach ?
                            _this.$window.preventBlockUI = true;
                        return config;
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
                        _this.coreApiConfig = coreApiConfig;
                    }).error(function (error) {
                        _this.$log.error('Unable to retrieve coreAPI config. Aborting httpWrapperService initialization.');
                        return $q.reject(error);
                    });
                }
                //#endregion
                //#region public methods
                HttpWrapperService.prototype.ajax = function (config) {
                    var _this = this;
                    //TODO MGA : make sure initPromise resolve automatically without overhead once first call sucessfull.
                    return this.initPromise.then(function () {
                        return _this.$http(_this.configureHttpCall(config))
                            .then(_this.success(config.url), _this.error)
                            .finally(_this.finally);
                    });
                };
                HttpWrapperService.prototype.get = function (url, config) {
                    config = config || { method: '', url: '' };
                    config.method = 'GET';
                    config.url = url;
                    return this.ajax(config);
                };
                HttpWrapperService.prototype.delete = function (url, config) {
                    config = config || { method: '', url: '' };
                    config.method = 'DELETE';
                    config.url = url;
                    return this.ajax(config);
                };
                HttpWrapperService.prototype.post = function (url, data, config) {
                    config = config || { method: '', url: '' };
                    config.method = 'POST';
                    config.url = url;
                    config.data = data;
                    return this.ajax(config);
                };
                HttpWrapperService.prototype.put = function (url, data, config) {
                    config = config || { method: '', url: '' };
                    config.method = 'PUT';
                    config.url = url;
                    config.data = data;
                    return this.ajax(config);
                };
                HttpWrapperService.prototype.upload = function (url, file, config) {
                    //var url = this.coreApiConfig.coreApiUrl + 'api/file-attachment/put';
                    var _this = this;
                    //return this.Upload.base64DataUrl(file).then((fileBase64Url) => {
                    //    return this.$http.post<T>(url, { ElementId: 'bof', Origin: 'QuoteFileAttachment', base64StringFile: fileBase64Url }).then<T>((promise) => {
                    //        console.log('success upload');
                    //        return promise.data;
                    //    });
                    //});
                    if (!file && (!config || !config.file)) {
                        this.$log.error('Cannot start upload with null {file} parameter.');
                        return null;
                    }
                    config = config || { method: '', url: '' };
                    config.method = 'POST';
                    config.url = url;
                    config = this.configureHttpCall(config);
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
                        return _this.Upload.upload(config)
                            .then(_this.success(url), _this.error, config.uploadProgress) //TODO MGA : uploadProgress callback ok ?
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHAtd3JhcHBlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJDQUEyQztBQUMzQyxJQUFPLE9BQU8sQ0F3V2I7QUF4V0QsV0FBTyxPQUFPO0lBQUMsSUFBQSxJQUFJLENBd1dsQjtJQXhXYyxXQUFBLElBQUk7UUFBQyxJQUFBLFFBQVEsQ0F3VzNCO1FBeFdtQixXQUFBLFFBQVEsRUFBQyxDQUFDO1lBOEIxQjs7ZUFFRztZQUNIO2dCQU9JLFlBQVk7Z0JBRVosY0FBYztnQkFFZCxlQUFlO2dCQUNmLDRCQUNZLEtBQXNCLEVBQ3RCLE9BQTBCLEVBQzFCLElBQW9CLEVBQ3BCLEVBQWdCLEVBQ2hCLFNBQThCLEVBQzlCLE1BQTJDLEVBQzNDLE9BQWtDO29CQW5CbEQsaUJBK1RDO29CQWxUZSxVQUFLLEdBQUwsS0FBSyxDQUFpQjtvQkFDdEIsWUFBTyxHQUFQLE9BQU8sQ0FBbUI7b0JBQzFCLFNBQUksR0FBSixJQUFJLENBQWdCO29CQUNwQixPQUFFLEdBQUYsRUFBRSxDQUFjO29CQUNoQixjQUFTLEdBQVQsU0FBUyxDQUFxQjtvQkFDOUIsV0FBTSxHQUFOLE1BQU0sQ0FBcUM7b0JBQzNDLFlBQU8sR0FBUCxPQUFPLENBQTJCO29CQTJHOUMsWUFBWTtvQkFFWix5QkFBeUI7b0JBRXpCOzs7Ozs7OztzQkFRRTtvQkFDTSxzQkFBaUIsR0FBRyxVQUFDLE1BQTBCO3dCQUVuRCxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzs0QkFDaEMsS0FBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsd0VBQXdFLENBQUMsQ0FBQzs0QkFDMUYsTUFBTSxDQUFDLElBQUksQ0FBQzt3QkFDaEIsQ0FBQzt3QkFFRCxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsZUFBZSxJQUFJLENBQUMsQ0FBQyxLQUFJLENBQUMsYUFBYTs0QkFDOUMsQ0FBQyxLQUFJLENBQUMs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Q0FBQzt3QkFDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsOERBQThELENBQUMsQ0FBQzt3QkFDaEYsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDZCxDQUFDO29CQUNELEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMscUVBQXFFLENBQUMsQ0FBQzt3QkFDdkYsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDZCxDQUFDO29CQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLENBQUM7Z0JBR0wseUJBQUM7WUFBRCxDQS9UQSxBQStUQyxJQUFBO1lBL1RZLDJCQUFrQixxQkErVDlCLENBQUE7WUFFRCxPQUFPLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO2lCQUt4RCxPQUFPLENBQUMsb0JBQW9CLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxDQUFDLEVBeFdtQixRQUFRLEdBQVIsYUFBUSxLQUFSLGFBQVEsUUF3VzNCO0lBQUQsQ0FBQyxFQXhXYyxJQUFJLEdBQUosWUFBSSxLQUFKLFlBQUksUUF3V2xCO0FBQUQsQ0FBQyxFQXhXTSxPQUFPLEtBQVAsT0FBTyxRQXdXYiIsImZpbGUiOiJodHRwLXdyYXBwZXIuc2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLzxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGluZ3MvdHNkLmQudHNcIiAvPlxyXG5tb2R1bGUgYmx1ZXNreS5jb3JlLnNlcnZpY2VzIHtcclxuXHJcbiAgICBpbXBvcnQgQ29yZUFwaUNvbmZpZyA9IGJsdWVza3kuY29yZS5tb2RlbHMuQ29yZUFwaUNvbmZpZztcclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElIdHRwV3JhcHBlckNvbmZpZyBleHRlbmRzIG5nLklSZXF1ZXN0Q29uZmlnIHtcclxuICAgICAgICBjb3JlQXBpRW5kcG9pbnQ/OiBib29sZWFuO1xyXG4gICAgICAgIGZpbGU/OiBGaWxlLFxyXG4gICAgICAgIHVwbG9hZEluQmFzZTY0SnNvbj86IGJvb2xlYW47XHJcbiAgICAgICAgdXBsb2FkUHJvZ3Jlc3M/OiAoKSA9PiBhbnk7XHJcbiAgICAgICAgZGlzYWJsZVhtbEh0dHBSZXF1ZXN0SGVhZGVyPzogYm9vbGVhbjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElIdHRwV3JhcHBlclNlcnZpY2Uge1xyXG5cclxuICAgICAgICBjb3JlQXBpQ29uZmlnOiBDb3JlQXBpQ29uZmlnO1xyXG5cclxuICAgICAgICAvL1RPRE8gTUdBOiBmb3IgZm9sbG93aW5nIG1ldGhvZHMsIHJldHVybiBJUHJvbWlzZSBhbmQgYXNzdW1lIGFic3RyYWN0aW9uIG9yIGxldCBiZWxvdyBzZXJ2aWNlcyBoYW5kbGUgSUh0dHBQcm9taXNlcyA/XHJcblxyXG4gICAgICAgIGdldDxUPih1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIGRlbGV0ZTxUPih1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIHBvc3Q8VD4odXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIHB1dDxUPih1cmw6IHN0cmluZywgZGF0YTogYW55LCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQSBpbXByb3ZlIHR5cGluZyB3aXRoIGFuZ3VsYXItdXBsb2FkIHRzZCBldGNcclxuICAgICAgICB1cGxvYWQ8VD4odXJsOiBzdHJpbmcsIGZpbGU6IEZpbGUsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVE9ETyBNR0EgOiB0aGlzIG1heSBub3QgbmVlZCB0byBiZSBhIGRlZGljYXRlZCBzZXJ2aWNlLCBpdCBjYW4gYWxzbyBiZSBpbmNvcnBvcmF0ZWQgaW50byB0aGUgaHR0cEludGVyY2VwdG9yLiBEZWNpZGUgYmVzdCBhcHByb2FjaCBkZXBlbmRpbmcgb24gcGxhbm5lZCB1c2UuXHJcbiAgICAgKi9cclxuICAgIGV4cG9ydCBjbGFzcyBIdHRwV3JhcHBlclNlcnZpY2UgaW1wbGVtZW50cyBJSHR0cFdyYXBwZXJTZXJ2aWNlIHtcclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIHByb3BlcnRpZXNcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpbml0UHJvbWlzZTogbmcuSVByb21pc2U8YW55PjtcclxuICAgICAgICBwdWJsaWMgY29yZUFwaUNvbmZpZzogQ29yZUFwaUNvbmZpZztcclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBjdG9yXHJcblxyXG4gICAgICAgIC8qIEBuZ0luamVjdCAqL1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICBwcml2YXRlICRodHRwOiBuZy5JSHR0cFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHdpbmRvdzogbmcuSVdpbmRvd1NlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGxvZzogbmcuSUxvZ1NlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJHE6IG5nLklRU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkbG9jYXRpb246IG5nLklMb2NhdGlvblNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgVXBsb2FkOiBuZy5hbmd1bGFyRmlsZVVwbG9hZC5JVXBsb2FkU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSB0b2FzdGVyOiBuZ3RvYXN0ZXIuSVRvYXN0ZXJTZXJ2aWNlXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICAgIC8vIGluaXQgY29yZSBhcGkgY29uZmlnIGRhdGEgb24gY3RvclxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogaGFyZCBjb2RlZCBwYXRoIGZvciBDb3JlckFwaUF1dGhDdHJsIHRvIGluamVjdFxyXG4gICAgICAgICAgICB0aGlzLmluaXRQcm9taXNlID0gdGhpcy4kaHR0cC5nZXQ8Q29yZUFwaUNvbmZpZz4odGhpcy50cnlHZXRGdWxsVXJsKCdDb3JlQXBpQXV0aC9HZXRDb3JlQXBpQ29uZmlnJykpXHJcbiAgICAgICAgICAgICAgICAuc3VjY2VzcygoY29yZUFwaUNvbmZpZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29yZUFwaUNvbmZpZyA9IGNvcmVBcGlDb25maWc7XHJcbiAgICAgICAgICAgICAgICB9KS5lcnJvcigoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ1VuYWJsZSB0byByZXRyaWV2ZSBjb3JlQVBJIGNvbmZpZy4gQWJvcnRpbmcgaHR0cFdyYXBwZXJTZXJ2aWNlIGluaXRpYWxpemF0aW9uLicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIHB1YmxpYyBtZXRob2RzXHJcblxyXG4gICAgICAgIGFqYXg8VD4oY29uZmlnOiBJSHR0cFdyYXBwZXJDb25maWcpIHtcclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IG1ha2Ugc3VyZSBpbml0UHJvbWlzZSByZXNvbHZlIGF1dG9tYXRpY2FsbHkgd2l0aG91dCBvdmVyaGVhZCBvbmNlIGZpcnN0IGNhbGwgc3VjZXNzZnVsbC5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5pdFByb21pc2UudGhlbigoKSA9PlxyXG4gICAgICAgICAgICAgICAgdGhpcy4kaHR0cDxUPih0aGlzLmNvbmZpZ3VyZUh0dHBDYWxsKGNvbmZpZykpXHJcbiAgICAgICAgICAgICAgICAgICAgLnRoZW48VD4odGhpcy5zdWNjZXNzPFQ+KGNvbmZpZy51cmwpLCB0aGlzLmVycm9yKVxyXG4gICAgICAgICAgICAgICAgICAgIC5maW5hbGx5KHRoaXMuZmluYWxseSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0PFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcblxyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwgeyBtZXRob2Q6ICcnLCB1cmw6ICcnIH07XHJcbiAgICAgICAgICAgIGNvbmZpZy5tZXRob2QgPSAnR0VUJztcclxuICAgICAgICAgICAgY29uZmlnLnVybCA9IHVybDtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlbGV0ZTxUPih1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwgeyBtZXRob2Q6ICcnLCB1cmw6ICcnIH07XHJcbiAgICAgICAgICAgIGNvbmZpZy5tZXRob2QgPSAnREVMRVRFJztcclxuICAgICAgICAgICAgY29uZmlnLnVybCA9IHVybDtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHBvc3Q8VD4odXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwgeyBtZXRob2Q6ICcnLCB1cmw6ICcnIH07XHJcbiAgICAgICAgICAgIGNvbmZpZy5tZXRob2QgPSAnUE9TVCc7XHJcbiAgICAgICAgICAgIGNvbmZpZy51cmwgPSB1cmw7XHJcbiAgICAgICAgICAgIGNvbmZpZy5kYXRhID0gZGF0YTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1dDxUPih1cmw6IHN0cmluZywgZGF0YTogYW55LCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIGNvbmZpZyA9IGNvbmZpZyB8fCB7IG1ldGhvZDogJycsIHVybDogJycgfTtcclxuICAgICAgICAgICAgY29uZmlnLm1ldGhvZCA9ICdQVVQnO1xyXG4gICAgICAgICAgICBjb25maWcudXJsID0gdXJsO1xyXG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGRhdGE7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KGNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGxvYWQ8VD4odXJsOiBzdHJpbmcsIGZpbGU6IEZpbGUsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuXHJcbiAgICAgICAgICAgIC8vdmFyIHVybCA9IHRoaXMuY29yZUFwaUNvbmZpZy5jb3JlQXBpVXJsICsgJ2FwaS9maWxlLWF0dGFjaG1lbnQvcHV0JztcclxuXHJcbiAgICAgICAgICAgIC8vcmV0dXJuIHRoaXMuVXBsb2FkLmJhc2U2NERhdGFVcmwoZmlsZSkudGhlbigoZmlsZUJhc2U2NFVybCkgPT4ge1xyXG4gICAgICAgICAgICAvLyAgICByZXR1cm4gdGhpcy4kaHR0cC5wb3N0PFQ+KHVybCwgeyBFbGVtZW50SWQ6ICdib2YnLCBPcmlnaW46ICdRdW90ZUZpbGVBdHRhY2htZW50JywgYmFzZTY0U3RyaW5nRmlsZTogZmlsZUJhc2U2NFVybCB9KS50aGVuPFQ+KChwcm9taXNlKSA9PiB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICBjb25zb2xlLmxvZygnc3VjY2VzcyB1cGxvYWQnKTtcclxuICAgICAgICAgICAgLy8gICAgICAgIHJldHVybiBwcm9taXNlLmRhdGE7XHJcbiAgICAgICAgICAgIC8vICAgIH0pO1xyXG4gICAgICAgICAgICAvL30pO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFmaWxlICYmICghY29uZmlnIHx8ICFjb25maWcuZmlsZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignQ2Fubm90IHN0YXJ0IHVwbG9hZCB3aXRoIG51bGwge2ZpbGV9IHBhcmFtZXRlci4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwgeyBtZXRob2Q6ICcnLCB1cmw6ICcnIH07XHJcbiAgICAgICAgICAgIGNvbmZpZy5tZXRob2QgPSAnUE9TVCc7XHJcbiAgICAgICAgICAgIGNvbmZpZy51cmwgPSB1cmw7XHJcblxyXG4gICAgICAgICAgICBjb25maWcgPSB0aGlzLmNvbmZpZ3VyZUh0dHBDYWxsKGNvbmZpZyk7XHJcblxyXG4gICAgICAgICAgICBjb25maWcuZmlsZSA9IGZpbGUgfHwgY29uZmlnLmZpbGU7IC8vVE9ETyBNR0EgOiBkbyBub3QgZXhwb3NlIGZpbGUgaW4gSUh0dHBXcmFwcGVyQ29uZmlnID9cclxuXHJcbiAgICAgICAgICAgIGlmIChjb25maWcudXBsb2FkSW5CYXNlNjRKc29uKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmluaXRQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IG1ha2Ugc3VyZSB0aGlzIGRlbGF5cyBuZXh0IGNhbGwgYW5kIHVwbG9hZCBpcyBub3QgZG9uZSBiZWZvcmUgYmFzZTY0IGVuY29kaW5nIGlzIGZpbmlzaGVkLCBldmVuIGlmIHByb21pc2UgaXMgYWxyZWFkeSByZXNvbHZlZCA/Pz9cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5VcGxvYWQuYmFzZTY0RGF0YVVybChmaWxlKS50aGVuKChmaWxlQmFzZTY0VXJsKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IGRlY2lkZSBiZXN0IGJlaGF2aW9yID8gdXBsb2FkIHRha2VzIHVybCBwYXJhbXMgZm9yIHRhcmdldCAmIGZpbGUgYXMgcGF5bG9hZCA/XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZy5kYXRhID0gY29uZmlnLmRhdGEgfHwge307XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbmZpZy5kYXRhLmZpbGVCYXNlNjRVcmwgPSBmaWxlQmFzZTY0VXJsO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25maWcuZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBmaWxlOiBmaWxlLCAvLyBzaW5nbGUgZmlsZSBvciBhIGxpc3Qgb2YgZmlsZXMuIGxpc3QgaXMgb25seSBmb3IgaHRtbDVcclxuICAgICAgICAgICAgICAgICAgICAvL2ZpbGVOYW1lOiAnZG9jLmpwZycgb3IgWycxLmpwZycsICcyLmpwZycsIC4uLl0gLy8gdG8gbW9kaWZ5IHRoZSBuYW1lIG9mIHRoZSBmaWxlKHMpXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZUZvcm1EYXRhTmFtZTogJ2ZpbGUnIC8vIGZpbGUgZm9ybURhdGEgbmFtZSAoJ0NvbnRlbnQtRGlzcG9zaXRpb24nKSwgc2VydmVyIHNpZGUgcmVxdWVzdCBmb3JtIG5hbWVcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluaXRQcm9taXNlLnRoZW4oKCkgPT5cclxuICAgICAgICAgICAgICAgIHRoaXMuVXBsb2FkLnVwbG9hZDxUPig8bmcuYW5ndWxhckZpbGVVcGxvYWQuSUZpbGVVcGxvYWRDb25maWdGaWxlPmNvbmZpZylcclxuICAgICAgICAgICAgICAgICAgICAudGhlbjxUPih0aGlzLnN1Y2Nlc3M8VD4odXJsKSwgdGhpcy5lcnJvciwgY29uZmlnLnVwbG9hZFByb2dyZXNzKSAgLy9UT0RPIE1HQSA6IHVwbG9hZFByb2dyZXNzIGNhbGxiYWNrIG9rID9cclxuICAgICAgICAgICAgICAgICAgICAuZmluYWxseSh0aGlzLmZpbmFsbHkpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICAvLyNyZWdpb24gcHJpdmF0ZSBtZXRob2RzXHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICogUHJlcGFyZXMgYSB7QGxpbmsgbmcjJGh0dHAjY29uZmlnIGNvbmZpZ30gb2JqZWN0IGZvciAkaHR0cCBjYWxsLlxyXG4gICAgICAgICogVGhlIG9wZXJhdGlvbnMgaW5jbHVkZSBzZXR0aW5nIGRlZmF1bHQgdmFsdWVzIHdoZW4gbm90IHByb3ZpZGVkLCBhbmQgc2V0dGluZyBodHRwIGhlYWRlcnMgaWYgbmVlZGVkIGZvciA6XHJcbiAgICAgICAgKiAgLSBBamF4IGNhbGxzXHJcbiAgICAgICAgKiAgLSBBdXRob3JpemF0aW9uIHRva2VuXHJcbiAgICAgICAgKiAgLSBDdXJyZW50IFVzZXJSb2xlLiAgIFxyXG4gICAgICAgICogQHBhcmFtIG9wdGlvbnNcclxuICAgICAgICAqIEByZXR1cm5zIHtuZy4kaHR0cC5jb25maWd9IHRoZSBjb25maWd1cmF0aW9uIG9iamVjdCByZWFkeSB0byBiZSBpbmplY3RlZCBpbnRvIGEgJGh0dHAgY2FsbC4gXHJcbiAgICAgICAgKi9cclxuICAgICAgICBwcml2YXRlIGNvbmZpZ3VyZUh0dHBDYWxsID0gKGNvbmZpZzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVJlcXVlc3RDb25maWcgPT4ge1xyXG5cclxuICAgICAgICAgICAgaWYgKCFjb25maWcudXJsIHx8ICFjb25maWcubWV0aG9kKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJVUkwgJiBNRVRIT0QgcGFyYW1ldGVycyBhcmUgbmVjZXNzYXJ5IGZvciBodHRwV3JhcHBlciBjYWxscy4gQWJvcnRpbmcuXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChjb25maWcuY29yZUFwaUVuZHBvaW50ICYmICghdGhpcy5jb3JlQXBpQ29uZmlnIHx8XHJcbiAgICAgICAgICAgICAgICAhdGhpcy5jb3JlQXBpQ29uZmlnLmp3dFRva2VuIHx8XHJcbiAgICAgICAgICAgICAgICAhdGhpcy5jb3JlQXBpQ29uZmlnLmN1cnJlbnRVc2VyUm9sZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignW0ludGVybmFsRXJyb3JdIGNvcmVBcGkgY2FsbCBpbnRlbmRlZCB3aXRob3V0IG5lY2Vzc2FyeSBjYXBpIGNyZWRlbnRpYWxzLiBBYm9ydGluZy4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25maWcuaGVhZGVycyA9IGNvbmZpZy5oZWFkZXJzIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGNvcmUgYXBpIGVuZHBvaW50ICdhcGkvJyBoYXJkY29kZWQsIHRvIHB1dCBpbiBjb25maWcgISBzaG91bGQgbm90IGtub3cgdGhhdCBoZXJlLlxyXG4gICAgICAgICAgICBpZiAoIWNvbmZpZy5jb3JlQXBpRW5kcG9pbnQpIHsgLy8gaWYgbm90IHNldCwgZXZhbHVhdGVzIHRvIGZhbHNlXHJcbiAgICAgICAgICAgICAgICBjb25maWcudXJsID0gdGhpcy50cnlHZXRGdWxsVXJsKGNvbmZpZy51cmwpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uZmlnLnVybCA9IHRoaXMuY29yZUFwaUNvbmZpZy5jb3JlQXBpVXJsICsgJ2FwaS8nICsgY29uZmlnLnVybDtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb3JlQXBpQ29uZmlnLmp3dFRva2VuICYmIHRoaXMuY29yZUFwaUNvbmZpZy5jdXJyZW50VXNlclJvbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYXJkIGNvZGVkIGhlYWRlcnMsIG5vdCBnb29kLCB0byBpbmplY3RcclxuICAgICAgICAgICAgICAgICAgICBjb25maWcuaGVhZGVyc1snT0EtVXNlclJvbGUnXSA9IHRoaXMuY29yZUFwaUNvbmZpZy5jdXJyZW50VXNlclJvbGU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnLmhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9ICdCZWFyZXIgJyArIHRoaXMuY29yZUFwaUNvbmZpZy5qd3RUb2tlbjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFjb25maWcuZGlzYWJsZVhtbEh0dHBSZXF1ZXN0SGVhZGVyKSAvLyBpZiBub3Qgc2V0LCBldmFsdWF0ZXMgdG8gZmFsc2VcclxuICAgICAgICAgICAgICAgIGNvbmZpZy5oZWFkZXJzWydYLVJlcXVlc3RlZC1XaXRoJ10gPSAnWE1MSHR0cFJlcXVlc3QnO1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogT0Ugc3BlY2lmaWMgY29kZSwgdG8gcmVtb3ZlXHJcbiAgICAgICAgICAgIGlmICgoPGFueT50aGlzLiR3aW5kb3cpLnByZXZlbnRCbG9ja1VJICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPIE1HQSA6IHR5cGUgY2FzdGluZywgaXMgaXQgb2theSBvciBub3QgPyBiZXR0ZXIgYXBwcm9hY2ggP1xyXG4gICAgICAgICAgICAgICAgKDxhbnk+dGhpcy4kd2luZG93KS5wcmV2ZW50QmxvY2tVSSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gY29uZmlnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogU3VjY2VzcyBoYW5kbGVyXHJcbiAgICAgICAgICogVE9ETyBNR0EgOiB3aGF0IGlzIHVybCB1c2VkIGZvciA/Pz9cclxuICAgICAgICAgKiBAcGFyYW0gdXJsIFxyXG4gICAgICAgICAqIEByZXR1cm5zIHt9IFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgc3VjY2VzcyA9IDxUPih1cmw6IHN0cmluZyk6IChwcm9taXNlQ2FsbGJhY2s6IG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPFQ+KSA9PiBUIHwgbmcuSVByb21pc2U8YW55PiA9PiB7XHJcblxyXG4gICAgICAgICAgICAvLyBKUyB0cmljayA6IGNhcHR1cmUgdXJsIHZhcmlhYmxlIGluc2lkZSBjbG9zdXJlIHNjb3BlIHRvIHN0b3JlIGl0IGZvciBjYWxsYmFjayB3aGljaCBjYW5ub3QgYmUgY2FsbGVkIHdpdGggMiBhcmd1bWVudHNcclxuICAgICAgICAgICAgcmV0dXJuIChwcm9taXNlQ2FsbGJhY2s6IG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPFQ+KTogVCB8IG5nLklQcm9taXNlPGFueT4gPT4ge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghcHJvbWlzZUNhbGxiYWNrIHx8ICFwcm9taXNlQ2FsbGJhY2suZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IHRoaW5rIGFib3V0IHRoaXMgLi4uIE1heSBub3QgYmUgYWNjdXJhdGUgPyBvciBtYXkgbm90IGJlIGFuIGVycm9yIGlmIHJldHVybiB0eXBlIGlzIG51bGwgaW4gY2FzZSBubyBkYXRhIGZvdW5kXHJcbiAgICAgICAgICAgICAgICAgICAgLy9yZXNwb25zZS5zdGF0dXMgPSA1MDM7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKHByb21pc2VDYWxsYmFjayk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy50b2FzdGVyLndhcm5pbmcoJ1VuZXhwZWN0ZWQgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyJywgJ0NhbGwgc3VjY2Vzc2Z1bGwsIGJ1dCBubyBkYXRhIGZvdW5kJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBmaW5kIG91dCBob3cgdG8gaGFuZGxlIHRoYXQgYXMgdG8gZXhwZWN0ZCByZXR1cm4gdHlwZSA/XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJHEucmVqZWN0KHByb21pc2VDYWxsYmFjayk7IC8vIFJlamVjdCBwcm9taXNlIGlmIG5vdCB3ZWxsLWZvcm1lZCBkYXRhXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmRlYnVnKHByb21pc2VDYWxsYmFjayk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2VDYWxsYmFjay5kYXRhOyAvLyByZXR1cm4gb25seSB0aGUgZGF0YSBleHBlY3RlZCBmb3IgY2FsbGVyXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBFcnJvciBoYW5kbGVyXHJcbiAgICAgICAgICogQHBhcmFtIHJlc3BvbnNlIFxyXG4gICAgICAgICAqIEByZXR1cm5zIHt9IFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgZXJyb3IgPSAocmVzcG9uc2U6IG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPGFueT4pOiBuZy5JUHJvbWlzZTxuZy5JSHR0cFByb21pc2VDYWxsYmFja0FyZzxhbnk+PiA9PiB7IC8vIGRvIHNvbWV0aGluZyBvbiBlcnJvclxyXG5cclxuICAgICAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UuZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YSA9ICdTZXJ2ZXIgbm90IHJlc3BvbmRpbmcnO1xyXG4gICAgICAgICAgICAgICAgcmVzcG9uc2Uuc3RhdHVzID0gNTAzO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9IFN0cmluZyhyZXNwb25zZS5kYXRhKSArICdcXG4gU3RhdHVzOiAnICsgcmVzcG9uc2Uuc3RhdHVzLnRvU3RyaW5nKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRvYXN0ZXIuZXJyb3IoJ1NlcnZlciByZXNwb25zZSBlcnJvcicsIG1lc3NhZ2UpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKHJlc3BvbnNlKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFdlIGRvbid0IHJlY292ZXIgZnJvbSBlcnJvciwgc28gd2UgcHJvcGFnYXRlIGl0IDogYmVsb3cgaGFuZGxlcnMgaGF2ZSB0aGUgY2hvaWNlIG9mIHJlYWRpbmcgdGhlIGVycm9yIHdpdGggYW4gZXJyb3IgaGFuZGxlciBvciBub3QuIFNlZSAkcSBwcm9taXNlcyBiZWhhdmlvciBoZXJlIDogaHR0cHM6Ly9naXRodWIuY29tL2tyaXNrb3dhbC9xXHJcbiAgICAgICAgICAgIC8vIFRoaXMgYmVoYXZpb3IgaXMgZGVzaXJlZCBzbyB0aGF0IHdlIHNob3cgZXJyb3IgaW5zaWRlIHNwZWNpZmljIHNlcnZlciBjb21tdW5pY2F0aW9uIG1vZGFscyBhdCBzcGVjaWZpYyBwbGFjZXMgaW4gdGhlIGFwcCwgb3RoZXJ3aXNlIHNob3cgYSBnbG9iYWwgYWxlcnQgbWVzc2FnZSwgb3IgZXZlbiBkbyBub3Qgc2hvdyBhbnl0aGluZyBpZiBub3QgbmVjZXNzYXJ5IChkbyBub3QgYWQgYW4gZXJyb3IgaGFuZGxlciBpbiBiZWxvdyBoYW5kbGVycyBvZiB0aGlzIHByb21pc2UpLlxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy4kcS5yZWplY3QocmVzcG9uc2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogRnVuY3Rpb24gY2FsbGVkIGF0IHRoZSBlbmQgb2YgYW4gYWpheCBjYWxsLCByZWdhcmRsZXNzIG9mIGl0J3Mgc3VjY2VzcyBvciBmYWlsdXJlLlxyXG4gICAgICAgICAqIEBwYXJhbSByZXNwb25zZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgZmluYWxseSA9ICgpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgLy9UT0RPIE1HQTogT0Utc3BlY2lmaWMgY29kZVxyXG4gICAgICAgICAgICBpZiAoKDxhbnk+dGhpcy4kd2luZG93KS5wcmV2ZW50QmxvY2tVSSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyBNR0EgOiB0eXBlIGNhc3RpbmcsIGlzIGl0IG9rYXkgb3Igbm90ID8gYmV0dGVyIGFwcHJvYWNoID9cclxuICAgICAgICAgICAgICAgICg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgPSBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vVE9ETyBNR0EgOiBtZXRob2QgdG8gZG9jdW1lbnQgYW5kIGltcHJvdmUgcm9idXN0bmVzcyArIHVzZSBpbiBPRSBvdXRzaWRlIG9mIGFuZ3VsYXIgLy8gbXV0dWFsaXplXHJcbiAgICAgICAgLy8gVHJpZXMgdG8gcGFyc2UgdGhlIGlucHV0IHVybCA6XHJcbiAgICAgICAgLy8gSWYgaXQgc2VlbXMgdG8gYmUgYSBmdWxsIFVSTCwgdGhlbiByZXR1cm4gYXMgaXMgKGNvbnNpZGVycyBpdCBleHRlcm5hbCBVcmwpXHJcbiAgICAgICAgLy8gT3RoZXJ3aXNlLCB0cmllcyB0byBmaW5kIHRoZSBiYXNlIFVSTCBvZiB0aGUgY3VycmVudCBCbHVlU2t5IGFwcCB3aXRoIG9yIHdpdGhvdXQgdGhlIGluY2x1ZGVkIENvbnRyb2xsZXIgYW5kIHJldHVybnMgdGhlIGZ1bGwgVXJsXHJcbiAgICAgICAgcHJpdmF0ZSB0cnlHZXRGdWxsVXJsKHVybElucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICAvLyBVcmwgc3RhcnRzIHdpdGggaHR0cDovLyBvciBodHRwczovLyA9PiBsZWF2ZSBhcyB0aGlzXHJcbiAgICAgICAgICAgIGlmICh1cmxJbnB1dC5zbGljZSgwLCAnaHR0cDovLycubGVuZ3RoKSA9PT0gJ2h0dHA6Ly8nIHx8XHJcbiAgICAgICAgICAgICAgICB1cmxJbnB1dC5zbGljZSgwLCAnaHR0cHM6Ly8nLmxlbmd0aCkgPT09ICdodHRwczovLycpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB1cmxJbnB1dDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gQm9vbGVhbiB1c2VkIHRvIHRyeSB0byBkZXRlcm1pbmUgY29ycmVjdCBmdWxsIHVybCAoYWRkIC8gb3Igbm90IGJlZm9yZSB0aGUgdXJsIGZyYWdtZW50IGRlcGVuZGluZyBvbiBpZiBmb3VuZCBvciBub3QpXHJcbiAgICAgICAgICAgIHZhciB1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaCA9IHVybElucHV0LnNsaWNlKDAsICcvJy5sZW5ndGgpID09PSAnLyc7XHJcblxyXG4gICAgICAgICAgICAvLyBSZWdleCB0cnlpbmcgdG8gZGV0ZXJtaW5lIGlmIHRoZSBpbnB1dCBmcmFnbWVudCBjb250YWlucyBhIC8gYmV0d2VlbiB0d28gY2hhcmFjdGVyIHN1aXRlcyA9PiBjb250cm9sbGVyIGdpdmVuIGFzIGlucHV0LCBvdGhlcndpc2UsIGFjdGlvbiBvbiBzYW1lIGNvbnRyb2xsZXIgZXhwZWN0ZWRcclxuICAgICAgICAgICAgdmFyIGNvbnRyb2xsZXJJc1ByZXNlbnRSZWdleCA9IC9cXHcrXFwvXFx3Ky87XHJcblxyXG4gICAgICAgICAgICB2YXIgYWN0aW9uSXNPblNhbWVDb250cm9sbGVyID0gIWNvbnRyb2xsZXJJc1ByZXNlbnRSZWdleC50ZXN0KHVybElucHV0KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXNlVXJsID0gdGhpcy5nZXRVcmxQYXRoKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcik7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gYmFzZVVybCArICh1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaCA/IHVybElucHV0IDogKCcvJyArIHVybElucHV0KSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBUT0RPIE1HQSA6IHVzaW5nIG1ldGhvZCBmcm9tIExheW91dC5qcyA6IHRvIGRvY3VtZW50IHRvIG5vdCBoYW5kbGUgZHVwbGljYXRlIGNvZGUgISFcclxuICAgICAgICAvL1RPRE8gTUdBIDogbWFrZSBpdCBjYXBhYmxlIG9mIGhhbmRsaW5nIGZ1bGwgVVJMcyBvdXRzaWRlIG9mIE9FIDogZG8gbm90IHVzZSA/PyBob3cgdG8gP1xyXG4gICAgICAgIHByaXZhdGUgZ2V0VXJsUGF0aChhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXIpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXNlVXJsUmVnZXggPSAvKFxcL1xcdytcXC9cXChTXFwoXFx3K1xcKVxcKSlcXC9cXHcrLztcclxuICAgICAgICAgICAgdmFyIHVybCA9IHRoaXMuJHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZTtcclxuICAgICAgICAgICAgdmFyIGJhc2VVcmxNYXRjaGVzID0gYmFzZVVybFJlZ2V4LmV4ZWModXJsKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChiYXNlVXJsTWF0Y2hlcy5sZW5ndGggJiYgYmFzZVVybE1hdGNoZXMubGVuZ3RoID09PSAyKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGJhc2VVcmxXaXRoQ29udHJvbGxlck5hbWUgPSBiYXNlVXJsTWF0Y2hlc1swXTtcclxuICAgICAgICAgICAgICAgIHZhciBiYXNlVXJsID0gYmFzZVVybE1hdGNoZXNbMV07XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBiYXNlVXJsV2l0aENvbnRyb2xsZXJOYW1lO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmFzZVVybDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuICcnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQTogT00tc3BlY2lmaWMgQVNQIE1WQyBjb2RlLCBub3QgdXNlZCBBVE0sIHRvIHJlbW92ZVxyXG4gICAgICAgIHByaXZhdGUgZ2V0Q3VycmVudFNlc3Npb25JRCgpIHtcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBtYWdpYyByZWdleHAgdG8gZmV0Y2ggU2Vzc2lvbklEIGluIFVSTCwgdG8gc3RvcmUgZWxzZXdoZXJlICFcclxuICAgICAgICAgICAgdmFyIHNlc3Npb25SZWdleCA9IC9odHRwczpcXC9cXC9bXFx3Ll0rXFwvW1xcdy5dK1xcLyhcXChTXFwoXFx3K1xcKVxcKSlcXC8uKi87XHJcbiAgICAgICAgICAgIC8vdmFyIHNlc3Npb25SZWdleCA9IC9odHRwczpcXC9cXC9bXFx3Ll0rXFwvT3JkZXJFbnRyeVxcLyhcXChTXFwoXFx3K1xcKVxcKSlcXC8uKi87XHJcblxyXG4gICAgICAgICAgICAvLyBUT0RPIE1HQSA6IHVwZGF0ZSByZWdleHAgdG8gdGhlIG9uZSBiZWxvd1xyXG4gICAgICAgICAgICAvL3ZhciBiYXNlVXJsUmVnZXggPSAvKGh0dHBzOlxcL1xcL1tcXHcuLV0rXFwvW1xcdy4tXStcXC9cXChTXFwoXFx3K1xcKVxcKVxcLylcXHcrLztcclxuXHJcblxyXG4gICAgICAgICAgICB2YXIgcGF0aCA9IHRoaXMuJGxvY2F0aW9uLmFic1VybCgpO1xyXG5cclxuICAgICAgICAgICAgdmFyIHJlZ2V4cEFycmF5ID0gc2Vzc2lvblJlZ2V4LmV4ZWMocGF0aCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXJlZ2V4cEFycmF5KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJVbmFibGUgdG8gcmVjb2duaXplZCBzZWFyY2hlZCBwYXR0ZXJuIGluIGN1cnJlbnQgdXJsIGxvY2F0aW9uIHRvIHJldHJpZXZlIHNlc3Npb25JRC5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVnZXhwQXJyYXkubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoXCJVbmFibGUgdG8gZmluZCBzZXNzaW9uSUQgaW4gc2VhcmNoZWQgcGF0dGVybiBpbiBjdXJyZW50IHVybC5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmVnZXhwQXJyYXkubGVuZ3RoID4gMikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKFwiVG9vIG1hbnkgbWF0Y2hlcyBmb3VuZCBmb3IgdGhlIHNlc3Npb25JRCBzZWFyY2ggaW4gdGhlIGN1cnJlbnQgdXJsLlwiKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIlwiO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gcmVnZXhwQXJyYXlbMV07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuICAgIH1cclxuXHJcbiAgICBhbmd1bGFyLm1vZHVsZSgnbmcuaHR0cFdyYXBwZXInLCBbJ3RvYXN0ZXInLCAnbmdGaWxlVXBsb2FkJ10pXHJcbiAgICAgICAgLy8gZG9uZSBpbiBjb25maWd1cmVIdHRwQ2FsbCBtZXRob2QuXHJcbiAgICAgICAgLy8uY29uZmlnKFsnJGh0dHBQcm92aWRlcicsICgkaHR0cFByb3ZpZGVyOiBuZy5JSHR0cFByb3ZpZGVyKSA9PiB7XHJcbiAgICAgICAgLy8gICAgJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vblsnWC1SZXF1ZXN0ZWQtV2l0aCddID0gJ1hNTEh0dHBSZXF1ZXN0JztcclxuICAgICAgICAvL31dKVxyXG4gICAgICAgIC5zZXJ2aWNlKCdodHRwV3JhcHBlclNlcnZpY2UnLCBIdHRwV3JhcHBlclNlcnZpY2UpO1xyXG59Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
