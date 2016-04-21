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
            angular.module('ng.httpWrapper', ['toaster', 'ngFileUpload'])
                .service('httpWrapperService', HttpWrapperService);
        })(services = core.services || (core.services = {}));
    })(core = bluesky.core || (bluesky.core = {}));
})(bluesky || (bluesky = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHAtd3JhcHBlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJDQUEyQztBQUMzQyxJQUFPLE9BQU8sQ0E0V2I7QUE1V0QsV0FBTyxPQUFPO0lBQUMsSUFBQSxJQUFJLENBNFdsQjtJQTVXYyxXQUFBLElBQUk7UUFBQyxJQUFBLFFBQVEsQ0E0VzNCO1FBNVdtQixXQUFBLFFBQVEsRUFBQyxDQUFDO1lBZTFCLElBQUssVUFBcUM7WUFBMUMsV0FBSyxVQUFVO2dCQUFHLHlDQUFHLENBQUE7Z0JBQUUsMkNBQUksQ0FBQTtnQkFBRSx5Q0FBRyxDQUFBO2dCQUFFLCtDQUFNLENBQUE7WUFBQyxDQUFDLEVBQXJDLFVBQVUsS0FBVixVQUFVLFFBQTJCO1lBQUEsQ0FBQztZQTJCM0M7O2VBRUc7WUFDSDtnQkFPSSxZQUFZO2dCQUVaLGNBQWM7Z0JBRWQsZUFBZTtnQkFDZiw0QkFDWSxLQUFzQixFQUN0QixPQUEwQixFQUMxQixJQUFvQixFQUNwQixFQUFnQixFQUNoQixTQUE4QixFQUM5QixNQUEyQyxFQUMzQyxPQUFrQztvQkFuQmxELGlCQXVUQztvQkExU2UsVUFBSyxHQUFMLEtBQUssQ0FBaUI7b0JBQ3RCLFlBQU8sR0FBUCxPQUFPLENBQW1CO29CQUMxQixTQUFJLEdBQUosSUFBSSxDQUFnQjtvQkFDcEIsT0FBRSxHQUFGLEVBQUUsQ0FBYztvQkFDaEIsY0FBUyxHQUFULFNBQVMsQ0FBcUI7b0JBQzlCLFdBQU0sR0FBTixNQUFNLENBQXFDO29CQUMzQyxZQUFPLEdBQVAsT0FBTyxDQUEyQjtvQkFxSDlDOzs7Ozs7OztzQkFRRTtvQkFDTSxzQkFBaUIsR0FBRyxVQUFDLE1BQWtCLEVBQUUsR0FBVyxFQUFFLE1BQTJCO3dCQUVyRixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLE1BQU0sS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDOzRCQUNsRCxLQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyx3RUFBd0UsQ0FBQyxDQUFDOzRCQUMxRixNQUFNLENBQUMsSUFBSSxDQUFDO3dCQUNoQixDQUFDO3dCQUVELGtDQUFrQzt3QkFDbEMsTUFBTSxHQUFHLE1BQU0sSUFBSSxFQUFFLENBQUM7d0JBRXRCLHVGQUF1Rjt3QkFDdkYsaUZBQWlGO3dCQUNqRixJQUFJLFVBQVUsR0FBc0IsTUFBTSxDQUFDO3dCQUUzQyx3REFBd0Q7d0JBQ3hELFVBQVUsQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO3dCQUV2QyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQyxLQUFJLENBQUMsU0FBUzs0QkFDdEMsQ0FBQyxLQUFJLENBQUMsU0FBUyxDQUFDLFFBQVE7NEJBQ3hCLENBQUMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ25DLEtBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLHFGQUFxRixDQUFDLENBQUM7NEJBQ3ZHLE1BQU0sQ0FBQyxJQUFJLENBQUM7d0JBQ2hCLENBQUM7d0JBRUQsVUFBVSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQzt3QkFFMUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQzs0QkFDdEIsVUFBVSxDQUFDLEdBQUcsR0FBRyxLQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUM7d0JBQ25ELENBQUM7d0JBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ0osa0dBQWtHOzRCQUNsRyxVQUFVLENBQUMsR0FBRyxHQUFHLEtBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxHQUFHLE1BQU0sR0FBRyxHQUFHLENBQUM7NEJBRTFELEVBQUUsQ0FBQyxDQUFDLEtBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxJQUFJLEtBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztnQ0FDNUQsbURBQW1EO2dDQUNuRCxVQUFVLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEtBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDO2dDQUNuRSxVQUFVLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxHQUFHLFNBQVMsR0FBRyxLQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQzs0QkFDOUUsQ0FBQzt3QkFDTCxDQUFDO3dCQUVELEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLDJCQUEyQixDQUFDOzRCQUNwQyxVQUFVLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsZ0JBQWdCLENBQUM7d0JBRTlELHVDQUF1Qzt3QkFDdkMsRUFBRSxDQUFDLENBQU8sS0FBSSxDQUFDLE9BQVEsQ0FBQyxjQUFjLEtBQUssU0FBUyxDQUFDOzRCQUNqRCxpRUFBaUU7NEJBQzNELEtBQUksQ0FBQyxPQUFRLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQzt3QkFFOUMsTUFBTSxDQUFDLFVBQVUsQ0FBQztvQkFDdEIsQ0FBQyxDQUFBO29CQUVEOzs7Ozt1QkFLRztvQkFDSyxZQUFPLEdBQUcsVUFBSSxHQUFXO3dCQUU3Qix3SEFBd0g7d0JBQ3hILE1BQU0sQ0FBQyxVQUFDLGVBQThDOzRCQUVsRCxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dDQUM1QywwSEFBMEg7Z0NBQzFILHdCQUF3QjtnQ0FDeEIsS0FBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7Z0NBQ2pDLEtBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLHFDQUFxQyxFQUFFLHFDQUFxQyxDQUFDLENBQUM7Z0NBRW5HLG9FQUFvRTtnQ0FDcEUsTUFBTSxDQUFDLEtBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMseUNBQXlDOzRCQUNyRixDQUFDOzRCQUVELEtBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDOzRCQUVqQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLDJDQUEyQzt3QkFDNUUsQ0FBQyxDQUFDO29CQUNOLENBQUMsQ0FBQTtvQkFFRDs7Ozt1QkFJRztvQkFDSyxVQUFLLEdBQUcsVUFBQyxRQUF5Qzt3QkFFdEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzs0QkFDOUIsUUFBUSxDQUFDLElBQUksR0FBRyx1QkFBdUIsQ0FBQzs0QkFDeEMsUUFBUSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7d0JBQzFCLENBQUM7d0JBRUQsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxhQUFhLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQzt3QkFFakYsS0FBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLENBQUM7d0JBRXJELEtBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUUxQixxTUFBcU07d0JBQ3JNLGlSQUFpUjt3QkFDalIsTUFBTSxDQUFDLEtBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNwQyxDQUFDLENBQUE7b0JBRUQ7Ozt1QkFHRztvQkFDSyxZQUFPLEdBQUc7d0JBQ2QsNEJBQTRCO3dCQUM1QixFQUFFLENBQUMsQ0FBTyxLQUFJLENBQUMsT0FBUSxDQUFDLGNBQWMsS0FBSyxTQUFTLENBQUM7NEJBQ2pELGlFQUFpRTs0QkFDM0QsS0FBSSxDQUFDLE9BQVEsQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO29CQUNuRCxDQUFDLENBQUE7b0JBek9HLG9DQUFvQztvQkFDcEMsMkRBQTJEO29CQUMzRCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFZLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO3lCQUNqRyxPQUFPLENBQUMsVUFBQyxhQUFhO3dCQUNuQixLQUFJLENBQUMsU0FBUyxHQUFHLGFBQWEsQ0FBQztvQkFDbkMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQUMsS0FBSzt3QkFDWCxLQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyw0RUFBNEUsQ0FBQyxDQUFDO3dCQUM5RixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDNUIsQ0FBQyxDQUFDLENBQUM7Z0JBQ1gsQ0FBQztnQkFFRCxZQUFZO2dCQUVaLHdCQUF3QjtnQkFFeEIsZ0NBQUcsR0FBSCxVQUFPLEdBQVcsRUFBRSxNQUEyQjtvQkFDM0MsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUksVUFBVSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3JELENBQUM7Z0JBRUQsbUNBQU0sR0FBTixVQUFVLEdBQVcsRUFBRSxNQUEyQjtvQkFDOUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUksVUFBVSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3hELENBQUM7Z0JBRUQsaUNBQUksR0FBSixVQUFRLEdBQVcsRUFBRSxJQUFTLEVBQUUsTUFBMkI7b0JBQ3ZELE1BQU0sR0FBRyxNQUFNLElBQUksRUFBRSxDQUFDO29CQUN0QixNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUFBLENBQUM7b0JBQ25DLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN0RCxDQUFDO2dCQUVELGdDQUFHLEdBQUgsVUFBTyxHQUFXLEVBQUUsSUFBUyxFQUFFLE1BQTJCO29CQUN0RCxNQUFNLEdBQUcsTUFBTSxJQUFJLEVBQUUsQ0FBQztvQkFDdEIsTUFBTSxDQUFDLElBQUksR0FBRyxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDbEMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUksVUFBVSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3JELENBQUM7Z0JBRUQsbUNBQU0sR0FBTixVQUFVLEdBQVcsRUFBRSxJQUFVLEVBQUUsTUFBMkI7b0JBQTlELGlCQThCQztvQkE1QkcsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7d0JBQ25FLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ2hCLENBQUM7b0JBRUQsTUFBTSxHQUFHLE1BQU0sSUFBSSxFQUFFLENBQUM7b0JBQ3RCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyx1REFBdUQ7b0JBQzFGLE1BQU0sQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7b0JBRWhDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7d0JBQzVCLDhJQUE4STt3QkFDOUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLGFBQWE7NEJBQ3RELHNGQUFzRjs0QkFDdEYsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDOzRCQUMxQyw0Q0FBNEM7NEJBQzVDLE1BQU0sQ0FBQyxLQUFJLENBQUMsSUFBSSxDQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO3dCQUN0RCxDQUFDLENBQUMsQ0FBQztvQkFDUCxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNKLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLENBQUMsNEVBQTRFO3dCQUVuSCxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7NEJBQ3pCLCtCQUErQjs0QkFDL0IscUVBQXFFOzRCQUNyRSxNQUFNLENBQUMsS0FBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQWdELEtBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztpQ0FDM0csSUFBSSxDQUFJLEtBQUksQ0FBQyxPQUFPLENBQUksR0FBRyxDQUFDLEVBQUUsS0FBSSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMseUNBQXlDO2lDQUMxRyxPQUFPLENBQUMsS0FBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUM3QyxDQUFDLENBQUMsQ0FBQztvQkFDUCxDQUFDO2dCQUNMLENBQUM7Z0JBRUQsMEdBQTBHO2dCQUMxRzs7Ozs7bUJBS0c7Z0JBQ0ksZ0RBQW1CLEdBQTFCLFVBQTJCLFFBQWdCO29CQUV2QywyREFBMkQ7b0JBQzNELEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsS0FBSyxTQUFTO3dCQUNqRCxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQzt3QkFDdEQsTUFBTSxDQUFDLFFBQVEsQ0FBQztvQkFDcEIsQ0FBQztvQkFFRCxnREFBZ0Q7b0JBRWhELHdIQUF3SDtvQkFDeEgsSUFBSSwwQkFBMEIsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDO29CQUV2RSx3S0FBd0s7b0JBQ3hLLElBQUksd0JBQXdCLEdBQUcsVUFBVSxDQUFDO29CQUUxQyxJQUFJLHdCQUF3QixHQUFHLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUV4RSxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLHdCQUF3QixDQUFDLENBQUM7b0JBRXhELE1BQU0sQ0FBQyxPQUFPLEdBQUcsQ0FBQywwQkFBMEIsR0FBRyxRQUFRLEdBQUcsQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDaEYsQ0FBQztnQkFFRCxZQUFZO2dCQUVaLHlCQUF5QjtnQkFFekI7Ozs7bUJBSUc7Z0JBQ0ssaUNBQUksR0FBWixVQUFnQixNQUFrQixFQUFFLEdBQVcsRUFBRSxNQUEyQjtvQkFBNUUsaUJBT0M7b0JBTkcscUdBQXFHO29CQUNyRyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7d0JBQ3pCLE1BQU0sQ0FBQyxLQUFJLENBQUMsS0FBSyxDQUFJLEtBQUksQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDOzZCQUNyRCxJQUFJLENBQUksS0FBSSxDQUFDLE9BQU8sQ0FBSSxHQUFHLENBQUMsRUFBRSxLQUFJLENBQUMsS0FBSyxDQUFDOzZCQUN6QyxPQUFPLENBQUMsS0FBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUN0QyxDQUFDLENBQUMsQ0FBQztnQkFDUCxDQUFDO2dCQTBIRCx1RkFBdUY7Z0JBQ3ZGLHlGQUF5RjtnQkFDakYsdUNBQVUsR0FBbEIsVUFBbUIsd0JBQXdCO29CQUV2QyxJQUFJLFlBQVksR0FBRyw0QkFBNEIsQ0FBQztvQkFDaEQsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO29CQUN6QyxJQUFJLGNBQWMsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUU1QyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxJQUFJLGNBQWMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFFdkQsSUFBSSx5QkFBeUIsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2xELElBQUksT0FBTyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFFaEMsRUFBRSxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDOzRCQUMzQixNQUFNLENBQUMseUJBQXlCLENBQUM7d0JBQ3JDLENBQUM7d0JBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ0osTUFBTSxDQUFDLE9BQU8sQ0FBQzt3QkFDbkIsQ0FBQztvQkFDTCxDQUFDO29CQUVELE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ2QsQ0FBQztnQkFFRCw2REFBNkQ7Z0JBQ3JELGdEQUFtQixHQUEzQjtvQkFFSSx5RUFBeUU7b0JBQ3pFLElBQUksWUFBWSxHQUFHLDhDQUE4QyxDQUFDO29CQUNsRSx3RUFBd0U7b0JBRXhFLDRDQUE0QztvQkFDNUMsdUVBQXVFO29CQUd2RSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUVuQyxJQUFJLFdBQVcsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUUxQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7d0JBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsc0ZBQXNGLENBQUMsQ0FBQzt3QkFDeEcsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDZCxDQUFDO29CQUNELEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsOERBQThELENBQUMsQ0FBQzt3QkFDaEYsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDZCxDQUFDO29CQUNELEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMscUVBQXFFLENBQUMsQ0FBQzt3QkFDdkYsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDZCxDQUFDO29CQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLENBQUM7Z0JBR0wseUJBQUM7WUFBRCxDQXZUQSxBQXVUQyxJQUFBO1lBdlRZLDJCQUFrQixxQkF1VDlCLENBQUE7WUFFRCxPQUFPLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO2lCQUt4RCxPQUFPLENBQUMsb0JBQW9CLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUMzRCxDQUFDLEVBNVdtQixRQUFRLEdBQVIsYUFBUSxLQUFSLGFBQVEsUUE0VzNCO0lBQUQsQ0FBQyxFQTVXYyxJQUFJLEdBQUosWUFBSSxLQUFKLFlBQUksUUE0V2xCO0FBQUQsQ0FBQyxFQTVXTSxPQUFPLEtBQVAsT0FBTyxRQTRXYiIsImZpbGUiOiJodHRwLXdyYXBwZXIuc2VydmljZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vLzxyZWZlcmVuY2UgcGF0aD1cIi4uL3R5cGluZ3MvdHNkLmQudHNcIiAvPlxyXG5tb2R1bGUgYmx1ZXNreS5jb3JlLnNlcnZpY2VzIHtcclxuXHJcbiAgICBpbXBvcnQgQXBpQ29uZmlnID0gYmx1ZXNreS5jb3JlLm1vZGVscy5BcGlDb25maWc7XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJSHR0cFdyYXBwZXJDb25maWcgZXh0ZW5kcyBuZy5JUmVxdWVzdFNob3J0Y3V0Q29uZmlnIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBtYWluIEFQSSBlbmRwb2ludCB0byB1c2UgYXMgZGVmYXVsdCBvbmUgaWYgdXJsIGlzIG5vdCBmdWxsLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGFwaUVuZHBvaW50PzogYm9vbGVhbjtcclxuICAgICAgICBmaWxlPzogRmlsZSxcclxuICAgICAgICB1cGxvYWRJbkJhc2U2NEpzb24/OiBib29sZWFuO1xyXG4gICAgICAgIHVwbG9hZFByb2dyZXNzPzogKCkgPT4gYW55O1xyXG4gICAgICAgIGRpc2FibGVYbWxIdHRwUmVxdWVzdEhlYWRlcj86IGJvb2xlYW47XHJcbiAgICB9XHJcblxyXG4gICAgZW51bSBIdHRwTWV0aG9kIHsgR0VULCBQT1NULCBQVVQsIERFTEVURSB9O1xyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUh0dHBXcmFwcGVyU2VydmljZSB7XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEFsbCBzcnYtc2lkZSBjb25maWd1cmF0aW9uIG9mIG1haW4gQVBJIHByb3ZpZGVkIGJ5IHRoZSBkb21haW4gZnJvbSB3aGljaCB0aGlzIHNjcmlwdCB3YXMgbG9hZGVkLCBAIHRoZSB1cmwgJ0NvcmVBcGlBdXRoL0dldENvcmVBcGlDb25maWcnLlxyXG4gICAgICAgICAqIFRPRE8gTUdBIGZpeCBoYXJkIGNvZGVkIHBhdGguXHJcbiAgICAgICAgICogVGhpcyBjb25maWd1cmF0aW9uIGRhdGEgaXMgbG9hZGVkIHVwb24gaW5pdGlhbGl6YXRpb24gb2YgdGhpcyBzZXJ2aWNlICh0byBiZSB1c2VkIGFzIGEgc2luZ2xldG9uIGluIHRoZSBhcHApLiBBbGwgb3RoZXIgd2ViIGNhbGxzIGFyZSBibG9ja2VkIGFzIGxvbmcgYXMgdGhpcyBvbmUgaXMgbm90IGZpbmlzaGVkLlxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGFwaUNvbmZpZzogQXBpQ29uZmlnO1xyXG5cclxuICAgICAgICAvL1RPRE8gTUdBOiBmb3IgZm9sbG93aW5nIG1ldGhvZHMsIHJldHVybiBJUHJvbWlzZSBhbmQgYXNzdW1lIGFic3RyYWN0aW9uIG9yIGxldCBiZWxvdyBzZXJ2aWNlcyBoYW5kbGUgSUh0dHBQcm9taXNlcyA/XHJcblxyXG4gICAgICAgIGdldDxUPih1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIGRlbGV0ZTxUPih1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIHBvc3Q8VD4odXJsOiBzdHJpbmcsIGRhdGE6IGFueSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIHB1dDxUPih1cmw6IHN0cmluZywgZGF0YTogYW55LCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQSBpbXByb3ZlIHR5cGluZyB3aXRoIGFuZ3VsYXItdXBsb2FkIHRzZCBldGNcclxuICAgICAgICB1cGxvYWQ8VD4odXJsOiBzdHJpbmcsIGZpbGU6IEZpbGUsIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+O1xyXG4gICAgICAgIFxyXG4gICAgICAgIGJ1aWxkVXJsRnJvbUNvbnRleHQodXJsSW5wdXQ6IHN0cmluZyk6IHN0cmluZztcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFRPRE8gTUdBIDogdGhpcyBtYXkgbm90IG5lZWQgdG8gYmUgYSBkZWRpY2F0ZWQgc2VydmljZSwgaXQgY2FuIGFsc28gYmUgaW5jb3Jwb3JhdGVkIGludG8gdGhlIGh0dHBJbnRlcmNlcHRvci4gRGVjaWRlIGJlc3QgYXBwcm9hY2ggZGVwZW5kaW5nIG9uIHBsYW5uZWQgdXNlLlxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgSHR0cFdyYXBwZXJTZXJ2aWNlIGltcGxlbWVudHMgSUh0dHBXcmFwcGVyU2VydmljZSB7XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwcm9wZXJ0aWVzXHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5pdFByb21pc2U6IG5nLklQcm9taXNlPGFueT47XHJcbiAgICAgICAgcHVibGljIGFwaUNvbmZpZzogQXBpQ29uZmlnO1xyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIGN0b3JcclxuXHJcbiAgICAgICAgLyogQG5nSW5qZWN0ICovXHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGh0dHA6IG5nLklIdHRwU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkd2luZG93OiBuZy5JV2luZG93U2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkbG9nOiBuZy5JTG9nU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSAkcTogbmcuSVFTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRsb2NhdGlvbjogbmcuSUxvY2F0aW9uU2VydmljZSxcclxuICAgICAgICAgICAgcHJpdmF0ZSBVcGxvYWQ6IG5nLmFuZ3VsYXJGaWxlVXBsb2FkLklVcGxvYWRTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlIHRvYXN0ZXI6IG5ndG9hc3Rlci5JVG9hc3RlclNlcnZpY2VcclxuICAgICAgICApIHtcclxuICAgICAgICAgICAgLy8gaW5pdCBjb3JlIGFwaSBjb25maWcgZGF0YSBvbiBjdG9yXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBoYXJkIGNvZGVkIHBhdGggZm9yIENvcmVyQXBpQXV0aEN0cmwgdG8gaW5qZWN0XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdFByb21pc2UgPSB0aGlzLiRodHRwLmdldDxBcGlDb25maWc+KHRoaXMuYnVpbGRVcmxGcm9tQ29udGV4dCgnQ29yZUFwaUF1dGgvR2V0Q29yZUFwaUNvbmZpZycpKVxyXG4gICAgICAgICAgICAgICAgLnN1Y2Nlc3MoKGNvcmVBcGlDb25maWcpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwaUNvbmZpZyA9IGNvcmVBcGlDb25maWc7XHJcbiAgICAgICAgICAgICAgICB9KS5lcnJvcigoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ1VuYWJsZSB0byByZXRyaWV2ZSBBUEkgY29uZmlnLiBBYm9ydGluZyBodHRwV3JhcHBlclNlcnZpY2UgaW5pdGlhbGl6YXRpb24uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICAvLyNyZWdpb24gcHVibGljIG1ldGhvZHNcclxuXHJcbiAgICAgICAgZ2V0PFQ+KHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5HRVQsIHVybCwgY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlbGV0ZTxUPih1cmw6IHN0cmluZywgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuREVMRVRFLCB1cmwsIGNvbmZpZyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwb3N0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xyXG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGRhdGEgfHwgY29uZmlnLmRhdGE7O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hamF4PFQ+KEh0dHBNZXRob2QuUE9TVCwgdXJsLCBjb25maWcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHV0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvbmZpZz86IElIdHRwV3JhcHBlckNvbmZpZyk6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgY29uZmlnID0gY29uZmlnIHx8IHt9O1xyXG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGRhdGEgfHwgY29uZmlnLmRhdGE7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmFqYXg8VD4oSHR0cE1ldGhvZC5QVVQsIHVybCwgY29uZmlnKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwbG9hZDxUPih1cmw6IHN0cmluZywgZmlsZTogRmlsZSwgY29uZmlnPzogSUh0dHBXcmFwcGVyQ29uZmlnKTogbmcuSVByb21pc2U8VD4ge1xyXG5cclxuICAgICAgICAgICAgaWYgKCFmaWxlICYmICghY29uZmlnIHx8ICFjb25maWcuZmlsZSkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcignQ2Fubm90IHN0YXJ0IHVwbG9hZCB3aXRoIG51bGwge2ZpbGV9IHBhcmFtZXRlci4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XHJcbiAgICAgICAgICAgIGNvbmZpZy5maWxlID0gZmlsZSB8fCBjb25maWcuZmlsZTsgLy9UT0RPIE1HQSA6IGRvIG5vdCBleHBvc2UgZmlsZSBpbiBJSHR0cFdyYXBwZXJDb25maWcgP1xyXG4gICAgICAgICAgICBjb25maWcuZGF0YSA9IGNvbmZpZy5kYXRhIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbmZpZy51cGxvYWRJbkJhc2U2NEpzb24pIHtcclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0E6IG1ha2Ugc3VyZSB0aGlzIGRlbGF5cyBuZXh0IGNhbGwgYW5kIHVwbG9hZCBpcyBub3QgZG9uZSBiZWZvcmUgYmFzZTY0IGVuY29kaW5nIGlzIGZpbmlzaGVkLCBldmVuIGlmIHByb21pc2UgaXMgYWxyZWFkeSByZXNvbHZlZCA/Pz9cclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLlVwbG9hZC5iYXNlNjREYXRhVXJsKGZpbGUpLnRoZW4oKGZpbGVCYXNlNjRVcmwpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYXJkLWNvZGVkIGtleSB0byBmZXRjaCBiYXNlNjQgZW5jb2RpbmcsIHRvIHBhcmFtZXRyaXplIHdpdGggc2VydmVyLXNpZGUgIVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZy5kYXRhLmZpbGVCYXNlNjRVcmwgPSBmaWxlQmFzZTY0VXJsO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vbm9ybWFsIHBvc3QgaW4gY2FzZSBvZiBiYXNlNjQtZW5jb2RlZCBkYXRhXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYWpheDxUPihIdHRwTWV0aG9kLlBPU1QsIHVybCwgY29uZmlnKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY29uZmlnLmRhdGEuZmlsZUZvcm1EYXRhTmFtZSA9ICdmaWxlJzsgLy8gZmlsZSBmb3JtRGF0YSBuYW1lICgnQ29udGVudC1EaXNwb3NpdGlvbicpLCBzZXJ2ZXIgc2lkZSByZXF1ZXN0IGZvcm0gbmFtZVxyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmluaXRQcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBub3Qgc2FmZSBoYXJkIGNhc3RcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBIDogYmVoYXZpb3IgZHVwbGljYXRpb24gd2l0aCB0aGlzLmFqYXgsIG5vdCBEUlksIHRvIGltcHJvdmVcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5VcGxvYWQudXBsb2FkPFQ+KDxuZy5hbmd1bGFyRmlsZVVwbG9hZC5JRmlsZVVwbG9hZENvbmZpZ0ZpbGU+dGhpcy5jb25maWd1cmVIdHRwQ2FsbChIdHRwTWV0aG9kLlBPU1QsIHVybCwgY29uZmlnKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbjxUPih0aGlzLnN1Y2Nlc3M8VD4odXJsKSwgdGhpcy5lcnJvciwgY29uZmlnLnVwbG9hZFByb2dyZXNzKSAvL1RPRE8gTUdBIDogdXBsb2FkUHJvZ3Jlc3MgY2FsbGJhY2sgb2sgP1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5maW5hbGx5KHRoaXMuZmluYWxseSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQSA6IG1ldGhvZCB0b28gc3BlY2lmaWMgdG8gT00gYXBwcyBjb250ZXh0LCBtYXkgbm90IHdvcmsgb3V0c2lkZSBvZiBpdCwgdG8gYWRhcHQgZm9yIHB1YmxpYyB1c2UgP1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFRyaWVzIHRvIHBhcnNlIHRoZSBpbnB1dCB1cmwgOlxyXG4gICAgICAgICAqIElmIGl0IHNlZW1zIHRvIGJlIGEgZnVsbCBVUkwsIHRoZW4gcmV0dXJuIGFzIGlzIChjb25zaWRlcnMgaXQgZXh0ZXJuYWwgVXJsKSBcclxuICAgICAgICAgKiBPdGhlcndpc2UsIHRyaWVzIHRvIGZpbmQgdGhlIGJhc2UgVVJMIG9mIHRoZSBjdXJyZW50IEJsdWVTa3kgYXBwIHdpdGggb3Igd2l0aG91dCB0aGUgaW5jbHVkZWQgQ29udHJvbGxlciBhbmQgcmV0dXJucyB0aGUgZnVsbCBVcmwgXHJcbiAgICAgICAgICogQHBhcmFtIHVybElucHV0IDogVE9ETyBNR0E6IGRvY3VtZW50IGRpZmZlcmVudCBraW5kIG9mIHVybHMgdGhhdCB0aGlzIG1ldGhvZCBjYW4gdGFrZSBhcyBpbnB1dCAoZnVsbCwgcGFydGlhbCBldGMpXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGJ1aWxkVXJsRnJvbUNvbnRleHQodXJsSW5wdXQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblxyXG4gICAgICAgICAgICAvLyAxIC0gVXJsIHN0YXJ0cyB3aXRoIGh0dHA6Ly8gb3IgaHR0cHM6Ly8gPT4gcmV0dXJuIGFzIGlzLlxyXG4gICAgICAgICAgICBpZiAodXJsSW5wdXQuc2xpY2UoMCwgJ2h0dHA6Ly8nLmxlbmd0aCkgPT09ICdodHRwOi8vJyB8fFxyXG4gICAgICAgICAgICAgICAgdXJsSW5wdXQuc2xpY2UoMCwgJ2h0dHBzOi8vJy5sZW5ndGgpID09PSAnaHR0cHM6Ly8nKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdXJsSW5wdXQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIDIgLSBPdGhlcndpc2UsIHRyeSB0byBmaW5kIGNvcnJlY3QgY29udHJvbGxlclxyXG5cclxuICAgICAgICAgICAgLy8gQm9vbGVhbiB1c2VkIHRvIHRyeSB0byBkZXRlcm1pbmUgY29ycmVjdCBmdWxsIHVybCAoYWRkIC8gb3Igbm90IGJlZm9yZSB0aGUgdXJsIGZyYWdtZW50IGRlcGVuZGluZyBvbiBpZiBmb3VuZCBvciBub3QpXHJcbiAgICAgICAgICAgIHZhciB1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaCA9IHVybElucHV0LnNsaWNlKDAsICcvJy5sZW5ndGgpID09PSAnLyc7XHJcblxyXG4gICAgICAgICAgICAvLyBSZWdleCB0cnlpbmcgdG8gZGV0ZXJtaW5lIGlmIHRoZSBpbnB1dCBmcmFnbWVudCBjb250YWlucyBhIC8gYmV0d2VlbiB0d28gY2hhcmFjdGVyIHN1aXRlcyA9PiBjb250cm9sbGVyIGdpdmVuIGFzIGlucHV0LCBvdGhlcndpc2UsIGFjdGlvbiBvbiBzYW1lIGNvbnRyb2xsZXIgZXhwZWN0ZWRcclxuICAgICAgICAgICAgdmFyIGNvbnRyb2xsZXJJc1ByZXNlbnRSZWdleCA9IC9cXHcrXFwvXFx3Ky87XHJcblxyXG4gICAgICAgICAgICB2YXIgYWN0aW9uSXNPblNhbWVDb250cm9sbGVyID0gIWNvbnRyb2xsZXJJc1ByZXNlbnRSZWdleC50ZXN0KHVybElucHV0KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXNlVXJsID0gdGhpcy5nZXRVcmxQYXRoKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcik7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gYmFzZVVybCArICh1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaCA/IHVybElucHV0IDogKCcvJyArIHVybElucHV0KSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIHByaXZhdGUgbWV0aG9kc1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBVdGlsaXR5IG1ldGhvZC5cclxuICAgICAgICAgKiBNYWluIGNhbGxlciB0aGF0IGFsbCB3cmFwcGVyIGNhbGxzIChnZXQsIGRlbGV0ZSwgcG9zdCwgcHV0KSBtdXN0IHVzZSB0byBzaGFyZSBjb21tb24gYmVoYXZpb3IuXHJcbiAgICAgICAgICogQHBhcmFtIGNvbmZpZ1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHByaXZhdGUgYWpheDxUPihtZXRob2Q6IEh0dHBNZXRob2QsIHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpIHtcclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IG1ha2Ugc3VyZSBpbml0UHJvbWlzZSByZXNvbHZlIGF1dG9tYXRpY2FsbHkgd2l0aG91dCBvdmVyaGVhZCBvbmNlIGZpcnN0IGNhbGwgc3VjZXNzZnVsbC5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5pdFByb21pc2UudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kaHR0cDxUPih0aGlzLmNvbmZpZ3VyZUh0dHBDYWxsKG1ldGhvZCwgdXJsLCBjb25maWcpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAudGhlbjxUPih0aGlzLnN1Y2Nlc3M8VD4odXJsKSwgdGhpcy5lcnJvcilcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLmZpbmFsbHkodGhpcy5maW5hbGx5KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAqIFByZXBhcmVzIGEge0BsaW5rIG5nIyRodHRwI2NvbmZpZyBjb25maWd9IG9iamVjdCBmb3IgJGh0dHAgY2FsbC5cclxuICAgICAgICAqIFRoZSBvcGVyYXRpb25zIGluY2x1ZGUgc2V0dGluZyBkZWZhdWx0IHZhbHVlcyB3aGVuIG5vdCBwcm92aWRlZCwgYW5kIHNldHRpbmcgaHR0cCBoZWFkZXJzIGlmIG5lZWRlZCBmb3IgOlxyXG4gICAgICAgICogIC0gQWpheCBjYWxsc1xyXG4gICAgICAgICogIC0gQXV0aG9yaXphdGlvbiB0b2tlblxyXG4gICAgICAgICogIC0gQ3VycmVudCBVc2VyUm9sZS4gICBcclxuICAgICAgICAqIEBwYXJhbSBvcHRpb25zXHJcbiAgICAgICAgKiBAcmV0dXJucyB7bmcuJGh0dHAuY29uZmlnfSB0aGUgY29uZmlndXJhdGlvbiBvYmplY3QgcmVhZHkgdG8gYmUgaW5qZWN0ZWQgaW50byBhICRodHRwIGNhbGwuIFxyXG4gICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBjb25maWd1cmVIdHRwQ2FsbCA9IChtZXRob2Q6IEh0dHBNZXRob2QsIHVybDogc3RyaW5nLCBjb25maWc/OiBJSHR0cFdyYXBwZXJDb25maWcpOiBuZy5JUmVxdWVzdENvbmZpZyA9PiB7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXVybCB8fCBtZXRob2QgPT09IG51bGwgfHwgbWV0aG9kID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihcIlVSTCAmIE1FVEhPRCBwYXJhbWV0ZXJzIGFyZSBuZWNlc3NhcnkgZm9yIGh0dHBXcmFwcGVyIGNhbGxzLiBBYm9ydGluZy5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy9Jbml0IGNvbmZpZyBldmVuIGlmIG5vdCBwcm92aWRlZFxyXG4gICAgICAgICAgICBjb25maWcgPSBjb25maWcgfHwge307XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBOiBoYXJkIGNhc3QgaXMgbm90IHNhZmUsIHdlIG1heSBmb3JnZXQgdG8gc2V0IHVybCAmIG1ldGhvZCBwYXJhbWV0ZXJzLiBUT0ZJWC5cclxuICAgICAgICAgICAgLy8gYXV0b21hdGljYWxseSBnZXQgYWxsIG5vbi1maWx0ZXJlZCBwYXJhbWV0ZXJzICYga2VlcCB0aGVtIGZvciB0aGlzIG5ldyBvYmplY3QuXHJcbiAgICAgICAgICAgIHZhciBjb25maWdGdWxsID0gPG5nLklSZXF1ZXN0Q29uZmlnPmNvbmZpZztcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IHN1cHBvcnQgbWFwcGluZyBiZXR3ZWVuIHVwbG9hZCAmIHBvc3QgaGVyZSA/XHJcbiAgICAgICAgICAgIGNvbmZpZ0Z1bGwubWV0aG9kID0gSHR0cE1ldGhvZFttZXRob2RdO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbmZpZy5hcGlFbmRwb2ludCAmJiAoIXRoaXMuYXBpQ29uZmlnIHx8XHJcbiAgICAgICAgICAgICAgICAhdGhpcy5hcGlDb25maWcuand0VG9rZW4gfHxcclxuICAgICAgICAgICAgICAgICF0aGlzLmFwaUNvbmZpZy5jdXJyZW50VXNlclJvbGUpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ1tJbnRlcm5hbEVycm9yXSBjb3JlQXBpIGNhbGwgaW50ZW5kZWQgd2l0aG91dCBuZWNlc3NhcnkgY2FwaSBjcmVkZW50aWFscy4gQWJvcnRpbmcuJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uZmlnRnVsbC5oZWFkZXJzID0gY29uZmlnLmhlYWRlcnMgfHwge307XHJcblxyXG4gICAgICAgICAgICBpZiAoIWNvbmZpZy5hcGlFbmRwb2ludCkgeyAvLyBpZiBub3Qgc2V0LCBldmFsdWF0ZXMgdG8gZmFsc2VcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwudXJsID0gdGhpcy5idWlsZFVybEZyb21Db250ZXh0KHVybCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBIDogY29yZSBhcGkgZW5kcG9pbnQgJ2FwaS8nIGhhcmRjb2RlZCwgdG8gcHV0IGluIGNvbmZpZ0Z1bGwgISBzaG91bGQgbm90IGtub3cgdGhhdCBoZXJlLlxyXG4gICAgICAgICAgICAgICAgY29uZmlnRnVsbC51cmwgPSB0aGlzLmFwaUNvbmZpZy5jb3JlQXBpVXJsICsgJ2FwaS8nICsgdXJsO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmFwaUNvbmZpZy5qd3RUb2tlbiAmJiB0aGlzLmFwaUNvbmZpZy5jdXJyZW50VXNlclJvbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBOiBoYXJkIGNvZGVkIGhlYWRlcnMsIG5vdCBnb29kLCB0byBpbmplY3RcclxuICAgICAgICAgICAgICAgICAgICBjb25maWdGdWxsLmhlYWRlcnNbJ09BLVVzZXJSb2xlJ10gPSB0aGlzLmFwaUNvbmZpZy5jdXJyZW50VXNlclJvbGU7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnRnVsbC5oZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSAnQmVhcmVyICcgKyB0aGlzLmFwaUNvbmZpZy5qd3RUb2tlbjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFjb25maWcuZGlzYWJsZVhtbEh0dHBSZXF1ZXN0SGVhZGVyKSAvLyBpZiBub3Qgc2V0LCBldmFsdWF0ZXMgdG8gZmFsc2VcclxuICAgICAgICAgICAgICAgIGNvbmZpZ0Z1bGwuaGVhZGVyc1snWC1SZXF1ZXN0ZWQtV2l0aCddID0gJ1hNTEh0dHBSZXF1ZXN0JztcclxuXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0E6IE9FIHNwZWNpZmljIGNvZGUsIHRvIHJlbW92ZVxyXG4gICAgICAgICAgICBpZiAoKDxhbnk+dGhpcy4kd2luZG93KS5wcmV2ZW50QmxvY2tVSSAhPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyBNR0EgOiB0eXBlIGNhc3RpbmcsIGlzIGl0IG9rYXkgb3Igbm90ID8gYmV0dGVyIGFwcHJvYWNoID9cclxuICAgICAgICAgICAgICAgICg8YW55PnRoaXMuJHdpbmRvdykucHJldmVudEJsb2NrVUkgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGNvbmZpZ0Z1bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTdWNjZXNzIGhhbmRsZXJcclxuICAgICAgICAgKiBUT0RPIE1HQSA6IHdoYXQgaXMgdXJsIHVzZWQgZm9yID8/P1xyXG4gICAgICAgICAqIEBwYXJhbSB1cmwgXHJcbiAgICAgICAgICogQHJldHVybnMge30gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBzdWNjZXNzID0gPFQ+KHVybDogc3RyaW5nKTogKHByb21pc2VDYWxsYmFjazogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8VD4pID0+IFQgfCBuZy5JUHJvbWlzZTxhbnk+ID0+IHtcclxuXHJcbiAgICAgICAgICAgIC8vIEpTIHRyaWNrIDogY2FwdHVyZSB1cmwgdmFyaWFibGUgaW5zaWRlIGNsb3N1cmUgc2NvcGUgdG8gc3RvcmUgaXQgZm9yIGNhbGxiYWNrIHdoaWNoIGNhbm5vdCBiZSBjYWxsZWQgd2l0aCAyIGFyZ3VtZW50c1xyXG4gICAgICAgICAgICByZXR1cm4gKHByb21pc2VDYWxsYmFjazogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8VD4pOiBUIHwgbmcuSVByb21pc2U8YW55PiA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFwcm9taXNlQ2FsbGJhY2sgfHwgIXByb21pc2VDYWxsYmFjay5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogdGhpbmsgYWJvdXQgdGhpcyAuLi4gTWF5IG5vdCBiZSBhY2N1cmF0ZSA/IG9yIG1heSBub3QgYmUgYW4gZXJyb3IgaWYgcmV0dXJuIHR5cGUgaXMgbnVsbCBpbiBjYXNlIG5vIGRhdGEgZm91bmRcclxuICAgICAgICAgICAgICAgICAgICAvL3Jlc3BvbnNlLnN0YXR1cyA9IDUwMztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IocHJvbWlzZUNhbGxiYWNrKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvYXN0ZXIud2FybmluZygnVW5leHBlY3RlZCByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXInLCAnQ2FsbCBzdWNjZXNzZnVsbCwgYnV0IG5vIGRhdGEgZm91bmQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGZpbmQgb3V0IGhvdyB0byBoYW5kbGUgdGhhdCBhcyB0byBleHBlY3RkIHJldHVybiB0eXBlID9cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kcS5yZWplY3QocHJvbWlzZUNhbGxiYWNrKTsgLy8gUmVqZWN0IHByb21pc2UgaWYgbm90IHdlbGwtZm9ybWVkIGRhdGFcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZGVidWcocHJvbWlzZUNhbGxiYWNrKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvbWlzZUNhbGxiYWNrLmRhdGE7IC8vIHJldHVybiBvbmx5IHRoZSBkYXRhIGV4cGVjdGVkIGZvciBjYWxsZXJcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEVycm9yIGhhbmRsZXJcclxuICAgICAgICAgKiBAcGFyYW0gcmVzcG9uc2UgXHJcbiAgICAgICAgICogQHJldHVybnMge30gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBlcnJvciA9IChyZXNwb25zZTogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8YW55Pik6IG5nLklQcm9taXNlPG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPGFueT4+ID0+IHsgLy8gZG8gc29tZXRoaW5nIG9uIGVycm9yXHJcblxyXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhID0gJ1NlcnZlciBub3QgcmVzcG9uZGluZyc7XHJcbiAgICAgICAgICAgICAgICByZXNwb25zZS5zdGF0dXMgPSA1MDM7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gU3RyaW5nKHJlc3BvbnNlLmRhdGEpICsgJ1xcbiBTdGF0dXM6ICcgKyByZXNwb25zZS5zdGF0dXMudG9TdHJpbmcoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudG9hc3Rlci5lcnJvcignU2VydmVyIHJlc3BvbnNlIGVycm9yJywgbWVzc2FnZSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IocmVzcG9uc2UpO1xyXG5cclxuICAgICAgICAgICAgLy8gV2UgZG9uJ3QgcmVjb3ZlciBmcm9tIGVycm9yLCBzbyB3ZSBwcm9wYWdhdGUgaXQgOiBiZWxvdyBoYW5kbGVycyBoYXZlIHRoZSBjaG9pY2Ugb2YgcmVhZGluZyB0aGUgZXJyb3Igd2l0aCBhbiBlcnJvciBoYW5kbGVyIG9yIG5vdC4gU2VlICRxIHByb21pc2VzIGJlaGF2aW9yIGhlcmUgOiBodHRwczovL2dpdGh1Yi5jb20va3Jpc2tvd2FsL3FcclxuICAgICAgICAgICAgLy8gVGhpcyBiZWhhdmlvciBpcyBkZXNpcmVkIHNvIHRoYXQgd2Ugc2hvdyBlcnJvciBpbnNpZGUgc3BlY2lmaWMgc2VydmVyIGNvbW11bmljYXRpb24gbW9kYWxzIGF0IHNwZWNpZmljIHBsYWNlcyBpbiB0aGUgYXBwLCBvdGhlcndpc2Ugc2hvdyBhIGdsb2JhbCBhbGVydCBtZXNzYWdlLCBvciBldmVuIGRvIG5vdCBzaG93IGFueXRoaW5nIGlmIG5vdCBuZWNlc3NhcnkgKGRvIG5vdCBhZCBhbiBlcnJvciBoYW5kbGVyIGluIGJlbG93IGhhbmRsZXJzIG9mIHRoaXMgcHJvbWlzZSkuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiRxLnJlamVjdChyZXNwb25zZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBGdW5jdGlvbiBjYWxsZWQgYXQgdGhlIGVuZCBvZiBhbiBhamF4IGNhbGwsIHJlZ2FyZGxlc3Mgb2YgaXQncyBzdWNjZXNzIG9yIGZhaWx1cmUuXHJcbiAgICAgICAgICogQHBhcmFtIHJlc3BvbnNlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBmaW5hbGx5ID0gKCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICAvL1RPRE8gTUdBOiBPRS1zcGVjaWZpYyBjb2RlXHJcbiAgICAgICAgICAgIGlmICgoPGFueT50aGlzLiR3aW5kb3cpLnByZXZlbnRCbG9ja1VJICE9PSB1bmRlZmluZWQpXHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPIE1HQSA6IHR5cGUgY2FzdGluZywgaXMgaXQgb2theSBvciBub3QgPyBiZXR0ZXIgYXBwcm9hY2ggP1xyXG4gICAgICAgICAgICAgICAgKDxhbnk+dGhpcy4kd2luZG93KS5wcmV2ZW50QmxvY2tVSSA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gVE9ETyBNR0EgOiB1c2luZyBtZXRob2QgZnJvbSBMYXlvdXQuanMgOiB0byBkb2N1bWVudCB0byBub3QgaGFuZGxlIGR1cGxpY2F0ZSBjb2RlICEhXHJcbiAgICAgICAgLy9UT0RPIE1HQSA6IG1ha2UgaXQgY2FwYWJsZSBvZiBoYW5kbGluZyBmdWxsIFVSTHMgb3V0c2lkZSBvZiBPRSA6IGRvIG5vdCB1c2UgPz8gaG93IHRvID9cclxuICAgICAgICBwcml2YXRlIGdldFVybFBhdGgoYWN0aW9uSXNPblNhbWVDb250cm9sbGVyKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgYmFzZVVybFJlZ2V4ID0gLyhcXC9cXHcrXFwvXFwoU1xcKFxcdytcXClcXCkpXFwvXFx3Ky87XHJcbiAgICAgICAgICAgIHZhciB1cmwgPSB0aGlzLiR3aW5kb3cubG9jYXRpb24ucGF0aG5hbWU7XHJcbiAgICAgICAgICAgIHZhciBiYXNlVXJsTWF0Y2hlcyA9IGJhc2VVcmxSZWdleC5leGVjKHVybCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoYmFzZVVybE1hdGNoZXMubGVuZ3RoICYmIGJhc2VVcmxNYXRjaGVzLmxlbmd0aCA9PT0gMikge1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBiYXNlVXJsV2l0aENvbnRyb2xsZXJOYW1lID0gYmFzZVVybE1hdGNoZXNbMF07XHJcbiAgICAgICAgICAgICAgICB2YXIgYmFzZVVybCA9IGJhc2VVcmxNYXRjaGVzWzFdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmFzZVVybFdpdGhDb250cm9sbGVyTmFtZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJhc2VVcmw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiAnJztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vVE9ETyBNR0E6IE9NLXNwZWNpZmljIEFTUCBNVkMgY29kZSwgbm90IHVzZWQgQVRNLCB0byByZW1vdmVcclxuICAgICAgICBwcml2YXRlIGdldEN1cnJlbnRTZXNzaW9uSUQoKSB7XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogbWFnaWMgcmVnZXhwIHRvIGZldGNoIFNlc3Npb25JRCBpbiBVUkwsIHRvIHN0b3JlIGVsc2V3aGVyZSAhXHJcbiAgICAgICAgICAgIHZhciBzZXNzaW9uUmVnZXggPSAvaHR0cHM6XFwvXFwvW1xcdy5dK1xcL1tcXHcuXStcXC8oXFwoU1xcKFxcdytcXClcXCkpXFwvLiovO1xyXG4gICAgICAgICAgICAvL3ZhciBzZXNzaW9uUmVnZXggPSAvaHR0cHM6XFwvXFwvW1xcdy5dK1xcL09yZGVyRW50cnlcXC8oXFwoU1xcKFxcdytcXClcXCkpXFwvLiovO1xyXG5cclxuICAgICAgICAgICAgLy8gVE9ETyBNR0EgOiB1cGRhdGUgcmVnZXhwIHRvIHRoZSBvbmUgYmVsb3dcclxuICAgICAgICAgICAgLy92YXIgYmFzZVVybFJlZ2V4ID0gLyhodHRwczpcXC9cXC9bXFx3Li1dK1xcL1tcXHcuLV0rXFwvXFwoU1xcKFxcdytcXClcXClcXC8pXFx3Ky87XHJcblxyXG5cclxuICAgICAgICAgICAgdmFyIHBhdGggPSB0aGlzLiRsb2NhdGlvbi5hYnNVcmwoKTtcclxuXHJcbiAgICAgICAgICAgIHZhciByZWdleHBBcnJheSA9IHNlc3Npb25SZWdleC5leGVjKHBhdGgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFyZWdleHBBcnJheSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKFwiVW5hYmxlIHRvIHJlY29nbml6ZWQgc2VhcmNoZWQgcGF0dGVybiBpbiBjdXJyZW50IHVybCBsb2NhdGlvbiB0byByZXRyaWV2ZSBzZXNzaW9uSUQuXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJlZ2V4cEFycmF5Lmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKFwiVW5hYmxlIHRvIGZpbmQgc2Vzc2lvbklEIGluIHNlYXJjaGVkIHBhdHRlcm4gaW4gY3VycmVudCB1cmwuXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJlZ2V4cEFycmF5Lmxlbmd0aCA+IDIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihcIlRvbyBtYW55IG1hdGNoZXMgZm91bmQgZm9yIHRoZSBzZXNzaW9uSUQgc2VhcmNoIGluIHRoZSBjdXJyZW50IHVybC5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHJlZ2V4cEFycmF5WzFdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcbiAgICB9XHJcblxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ25nLmh0dHBXcmFwcGVyJywgWyd0b2FzdGVyJywgJ25nRmlsZVVwbG9hZCddKVxyXG4gICAgICAgIC8vIGRvbmUgaW4gY29uZmlndXJlSHR0cENhbGwgbWV0aG9kLlxyXG4gICAgICAgIC8vLmNvbmZpZyhbJyRodHRwUHJvdmlkZXInLCAoJGh0dHBQcm92aWRlcjogbmcuSUh0dHBQcm92aWRlcikgPT4ge1xyXG4gICAgICAgIC8vICAgICRodHRwUHJvdmlkZXIuZGVmYXVsdHMuaGVhZGVycy5jb21tb25bJ1gtUmVxdWVzdGVkLVdpdGgnXSA9ICdYTUxIdHRwUmVxdWVzdCc7XHJcbiAgICAgICAgLy99XSlcclxuICAgICAgICAuc2VydmljZSgnaHR0cFdyYXBwZXJTZXJ2aWNlJywgSHR0cFdyYXBwZXJTZXJ2aWNlKTtcclxufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
