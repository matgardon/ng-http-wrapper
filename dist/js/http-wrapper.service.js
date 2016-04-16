///<reference path="../typings/tsd.d.ts" />
var bluesky;
(function (bluesky) {
    var core;
    (function (core) {
        var services;
        (function (services) {
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
                    this.configureHttpCall = function (method, url, coreApiEndpoint, data, inputConfig) {
                        if (coreApiEndpoint === void 0) { coreApiEndpoint = false; }
                        if (!url) {
                            _this.$log.error("URL parameter is necessary for httpWrapper calls. Aborting.");
                            return null;
                        }
                        if (coreApiEndpoint && !_this.coreApiConfig) {
                            _this.$log.error('InternalError: coreApi call intended without necessary capi credentials. Aborting.');
                            return null;
                        }
                        var requestConfig = {
                            //TODO MGA : core api endpoint 'api/' hardcoded, to put in config ! should not now that here.
                            url: coreApiEndpoint ? _this.coreApiConfig.coreApiUrl + 'api/' + url : _this.tryGetFullUrl(url),
                            method: method || 'GET',
                            params: inputConfig != null ? inputConfig.params : null,
                            data: data || null,
                            headers: {}
                        };
                        if (coreApiEndpoint) {
                            if (_this.coreApiConfig.jwtToken && _this.coreApiConfig.currentUserRole) {
                                requestConfig.headers['OA-UserRole'] = _this.coreApiConfig.currentUserRole;
                                requestConfig.headers['Authorization'] = 'Bearer ' + _this.coreApiConfig.jwtToken;
                            }
                            else {
                            }
                        }
                        else {
                        }
                        // TODO MGA : type casting, is it okay or not ? better approach ?
                        _this.$window.preventBlockUI = true;
                        //TODO MGA : currently done in module configuration on module init, using httpProvider.defaults/ To discuss where to set this up
                        //TODO MGA : set this always or only for WebAPI calls ?
                        //requestConfig.headers['X-Requested-With'] = 'XMLHttpRequest';
                        return requestConfig;
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
                        // TODO MGA : type casting, is it okay or not ? better approach ?
                        _this.$window.preventBlockUI = false;
                    };
                    //TODO MGA : how to prevent rest of calls to happen if this is not finished ?
                    // init core api config data on ctor
                    this.mainPromise = this.$http.get(this.tryGetFullUrl('CoreApiAuth/GetCoreApiConfig')).then(function (result) {
                        _this.coreApiConfig = result.data;
                    });
                }
                //#endregion
                //#region public methods
                HttpWrapperService.prototype.get = function (url, coreApiEndpoint) {
                    var _this = this;
                    //TODO MGA : improve mainPromise behavior !
                    if (this.mainPromise) {
                        return this.mainPromise.then(function () { return _this.$http(_this.configureHttpCall('GET', url, coreApiEndpoint)).then(_this.success(url), _this.error).finally(_this.finally); });
                    }
                    else {
                        return this.$http(this.configureHttpCall('GET', url, coreApiEndpoint)).then(this.success(url), this.error).finally(this.finally);
                    }
                };
                HttpWrapperService.prototype.post = function (url, data, coreApiEndpoint) {
                    var _this = this;
                    if (this.mainPromise) {
                        return this.mainPromise.then(function () { return _this.$http(_this.configureHttpCall('POST', url, data, coreApiEndpoint)).then(_this.success(url), _this.error).finally(_this.finally); });
                    }
                    else {
                        return this.$http(this.configureHttpCall('POST', url, data, coreApiEndpoint)).then(this.success(url), this.error).finally(this.finally);
                    }
                };
                /**
                 * TODO MGA : mutualize behavior with configureHttpCall for config !
                 * @param url
                 * @param file
                 * @param uploadProgress
                 * @returns {}
                 */
                HttpWrapperService.prototype.upload = function (url, file, uploadProgress, coreApiEndpoint, encodeBase64) {
                    var _this = this;
                    if (!url) {
                        throw new Error('url param is mandatory for httpWrapperService call');
                    }
                    if (!file) {
                        throw new Error('file param is mandatory for upload method');
                    }
                    var url = this.coreApiConfig.coreApiUrl + 'api/file-attachment/put';
                    return this.Upload.base64DataUrl(file).then(function (fileBase64Url) {
                        return _this.$http.post(url, { ElementId: 'bof', Origin: 'QuoteFileAttachment', base64StringFile: fileBase64Url }).then(function (promise) {
                            console.log('success upload');
                            return promise.data;
                        });
                    });
                    //var uploadConfig = {
                    //    url: this.tryGetFullUrl(url),
                    //    data: {
                    //        file: file, // single file or a list of files. list is only for html5
                    //        //fileName: 'doc.jpg' or ['1.jpg', '2.jpg', ...] // to modify the name of the file(s)
                    //        fileFormDataName: 'file' // file formData name ('Content-Disposition'), server side request form name
                    //    },
                    //    method: 'POST' //TODO MGA: should not be necessary, default on FileUploadConfigFile signature, to propose as pull-request
                    //};
                    //if (this.mainPromise) {
                    //    return this.mainPromise.then(() => this.Upload.upload<T>(uploadConfig).then<T>(this.success<T>(url), this.error, uploadProgress).finally(this.finally));
                    //} else {
                    //    return this.Upload.upload<T>(uploadConfig).then<T>(this.success<T>(url), this.error, uploadProgress).finally(this.finally);
                    //}
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
                HttpWrapperService.prototype.getCurrentSessionID = function () {
                    //TODO MGA : magic regexp to fetch SessionID in URL, to store elsewhere !
                    var sessionRegex = /https:\/\/[\w.]+\/OrderEntry\/(\(S\(\w+\)\))\/.*/;
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
                return HttpWrapperService;
            }());
            services.HttpWrapperService = HttpWrapperService;
            //TODO MGA : default HTTP provider configuration to improve & mutuaize with DA
            angular.module('bluesky.core.services.httpWrapper', ['toaster', 'ngFileUpload'])
                .config(['$httpProvider', function ($httpProvider) {
                    $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
                }])
                .service('httpWrapperService', HttpWrapperService);
        })(services = core.services || (core.services = {}));
    })(core = bluesky.core || (bluesky.core = {}));
})(bluesky || (bluesky = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHAtd3JhcHBlci5zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDJDQUEyQztBQUMzQyxJQUFPLE9BQU8sQ0E4VGI7QUE5VEQsV0FBTyxPQUFPO0lBQUMsSUFBQSxJQUFJLENBOFRsQjtJQTlUYyxXQUFBLElBQUk7UUFBQyxJQUFBLFFBQVEsQ0E4VDNCO1FBOVRtQixXQUFBLFFBQVEsRUFBQyxDQUFDO1lBeUIxQjtnQkFPSSxZQUFZO2dCQUVaLGNBQWM7Z0JBRWQsZUFBZTtnQkFDZiw0QkFDWSxLQUFzQixFQUN0QixPQUEwQixFQUMxQixJQUFvQixFQUNwQixFQUFnQixFQUNoQixTQUE4QixFQUM5QixNQUEyQyxFQUMzQyxPQUFrQztvQkFuQmxELGlCQTJSQztvQkE5UWUsVUFBSyxHQUFMLEtBQUssQ0FBaUI7b0JBQ3RCLFlBQU8sR0FBUCxPQUFPLENBQW1CO29CQUMxQixTQUFJLEdBQUosSUFBSSxDQUFnQjtvQkFDcEIsT0FBRSxHQUFGLEVBQUUsQ0FBYztvQkFDaEIsY0FBUyxHQUFULFNBQVMsQ0FBcUI7b0JBQzlCLFdBQU0sR0FBTixNQUFNLENBQXFDO29CQUMzQyxZQUFPLEdBQVAsT0FBTyxDQUEyQjtvQkFpRzlDLFlBQVk7b0JBRVoseUJBQXlCO29CQUV6Qjs7Ozs7Ozs7c0JBUUU7b0JBQ00sc0JBQWlCLEdBQUcsVUFBQyxNQUFjLEVBQUUsR0FBVyxFQUFFLGVBQWdDLEVBQUUsSUFBVSxFQUFFLFdBQXVDO3dCQUFyRiwrQkFBZ0MsR0FBaEMsdUJBQWdDO3dCQUV0RixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7NEJBQ1AsS0FBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsNkRBQTZELENBQUMsQ0FBQzs0QkFDL0UsTUFBTSxDQUFDLElBQUksQ0FBQzt3QkFDaEIsQ0FBQzt3QkFFRCxFQUFFLENBQUMsQ0FBQyxlQUFlLElBQUksQ0FBQyxLQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQzs0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LENBQUMsQ0FBQyxDQUFDO3dCQUVoQyxFQUFFLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7NEJBQzNCLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQzt3QkFDckMsQ0FBQzt3QkFBQyxJQUFJLENBQUMsQ0FBQzs0QkFDSixNQUFNLENBQUMsT0FBTyxDQUFDO3dCQUNuQixDQUFDO29CQUNMLENBQUM7b0JBRUQsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDZCxDQUFDO2dCQUdMLHlCQUFDO1lBQUQsQ0EzUkEsQUEyUkMsSUFBQTtZQTNSWSwyQkFBa0IscUJBMlI5QixDQUFBO1lBRUQsOEVBQThFO1lBQzlFLE9BQU8sQ0FBQyxNQUFNLENBQUMsbUNBQW1DLEVBQUUsQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7aUJBRzNFLE1BQU0sQ0FBQyxDQUFDLGVBQWUsRUFBRSxVQUFDLGFBQStCO29CQUN0RCxhQUFhLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsR0FBRyxnQkFBZ0IsQ0FBQztnQkFDakYsQ0FBQyxDQUFDLENBQUM7aUJBQ0YsT0FBTyxDQUFDLG9CQUFvQixFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDM0QsQ0FBQyxFQTlUbUIsUUFBUSxHQUFSLGFBQVEsS0FBUixhQUFRLFFBOFQzQjtJQUFELENBQUMsRUE5VGMsSUFBSSxHQUFKLFlBQUksS0FBSixZQUFJLFFBOFRsQjtBQUFELENBQUMsRUE5VE0sT0FBTyxLQUFQLE9BQU8sUUE4VGIiLCJmaWxlIjoiaHR0cC13cmFwcGVyLnNlcnZpY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy88cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBpbmdzL3RzZC5kLnRzXCIgLz5cclxubW9kdWxlIGJsdWVza3kuY29yZS5zZXJ2aWNlcyB7XHJcblxyXG4gICAgaW1wb3J0IENvcmVBcGlDb25maWcgPSBibHVlc2t5LmNvcmUubW9kZWxzLkNvcmVBcGlDb25maWc7XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJSHR0cFdyYXBwZXJTZXJ2aWNlIHtcclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQSA6IHRvIGluamVjdCBhcyBnZW5lcmljIGxpc3Qgb2YgY3VzdG9tIGhlYWRlcnMgdG8gcGFzcyB0byBzZXJ2aWNlID9cclxuICAgICAgICBjb3JlQXBpQ29uZmlnOiBDb3JlQXBpQ29uZmlnO1xyXG5cclxuICAgICAgICBnZXQ8VD4odXJsOiBzdHJpbmcsIGNvcmVBcGlFbmRwb2ludD86IGJvb2xlYW4pOiBuZy5JUHJvbWlzZTxUPjtcclxuXHJcbiAgICAgICAgcG9zdDxUPih1cmw6IHN0cmluZywgZGF0YTogYW55LCBjb3JlQXBpRW5kcG9pbnQ/OiBib29sZWFuKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFRPRE8gTUdBIGltcHJvdmUgdHlwaW5nIHdpdGggYW5ndWxhci11cGxvYWQgdHNkIGV0Y1xyXG4gICAgICAgICAqIEBwYXJhbSB1cmwgXHJcbiAgICAgICAgICogQHBhcmFtIGZpbGUgXHJcbiAgICAgICAgICogQHBhcmFtIHVwbG9hZFByb2dyZXNzIFxyXG4gICAgICAgICAqIEByZXR1cm5zIHt9IFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHVwbG9hZDxUPih1cmw6IHN0cmluZywgZmlsZTogYW55LCB1cGxvYWRQcm9ncmVzczogKCkgPT4gYW55LCBjb3JlQXBpRW5kcG9pbnQ/OiBib29sZWFuLCBlbmNvZGVCYXNlNjQ/OiBib29sZWFuKTogbmcuSVByb21pc2U8VD47XHJcblxyXG4gICAgICAgIHRyeUdldEZ1bGxVcmwodXJsSW5wdXQ6IHN0cmluZyk6IHN0cmluZztcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgSHR0cFdyYXBwZXJTZXJ2aWNlIGltcGxlbWVudHMgSUh0dHBXcmFwcGVyU2VydmljZSB7XHJcblxyXG4gICAgICAgIC8vI3JlZ2lvbiBwcm9wZXJ0aWVzXHJcblxyXG4gICAgICAgIHByaXZhdGUgbWFpblByb21pc2U6IG5nLklQcm9taXNlPGFueT47XHJcbiAgICAgICAgcHVibGljIGNvcmVBcGlDb25maWc6IENvcmVBcGlDb25maWc7XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICAvLyNyZWdpb24gY3RvclxyXG5cclxuICAgICAgICAvKiBAbmdJbmplY3QgKi9cclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgcHJpdmF0ZSAkaHR0cDogbmcuSUh0dHBTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICR3aW5kb3c6IG5nLklXaW5kb3dTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRsb2c6IG5nLklMb2dTZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlICRxOiBuZy5JUVNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgJGxvY2F0aW9uOiBuZy5JTG9jYXRpb25TZXJ2aWNlLFxyXG4gICAgICAgICAgICBwcml2YXRlIFVwbG9hZDogbmcuYW5ndWxhckZpbGVVcGxvYWQuSVVwbG9hZFNlcnZpY2UsXHJcbiAgICAgICAgICAgIHByaXZhdGUgdG9hc3Rlcjogbmd0b2FzdGVyLklUb2FzdGVyU2VydmljZVxyXG4gICAgICAgICkge1xyXG5cclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGhvdyB0byBwcmV2ZW50IHJlc3Qgb2YgY2FsbHMgdG8gaGFwcGVuIGlmIHRoaXMgaXMgbm90IGZpbmlzaGVkID9cclxuICAgICAgICAgICAgLy8gaW5pdCBjb3JlIGFwaSBjb25maWcgZGF0YSBvbiBjdG9yXHJcbiAgICAgICAgICAgIHRoaXMubWFpblByb21pc2UgPSB0aGlzLiRodHRwLmdldDxDb3JlQXBpQ29uZmlnPih0aGlzLnRyeUdldEZ1bGxVcmwoJ0NvcmVBcGlBdXRoL0dldENvcmVBcGlDb25maWcnKSkudGhlbigocmVzdWx0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvcmVBcGlDb25maWcgPSByZXN1bHQuZGF0YTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIHB1YmxpYyBtZXRob2RzXHJcblxyXG4gICAgICAgIGdldDxUPih1cmw6IHN0cmluZywgY29yZUFwaUVuZHBvaW50PzogYm9vbGVhbik6IG5nLklQcm9taXNlPFQ+IHtcclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGltcHJvdmUgbWFpblByb21pc2UgYmVoYXZpb3IgIVxyXG4gICAgICAgICAgICBpZiAodGhpcy5tYWluUHJvbWlzZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMubWFpblByb21pc2UudGhlbigoKSA9PiB0aGlzLiRodHRwPFQ+KHRoaXMuY29uZmlndXJlSHR0cENhbGwoJ0dFVCcsIHVybCwgY29yZUFwaUVuZHBvaW50KSkudGhlbjxUPih0aGlzLnN1Y2Nlc3M8VD4odXJsKSwgdGhpcy5lcnJvcikuZmluYWxseSh0aGlzLmZpbmFsbHkpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRodHRwPFQ+KHRoaXMuY29uZmlndXJlSHR0cENhbGwoJ0dFVCcsIHVybCwgY29yZUFwaUVuZHBvaW50KSkudGhlbjxUPih0aGlzLnN1Y2Nlc3M8VD4odXJsKSwgdGhpcy5lcnJvcikuZmluYWxseSh0aGlzLmZpbmFsbHkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwb3N0PFQ+KHVybDogc3RyaW5nLCBkYXRhOiBhbnksIGNvcmVBcGlFbmRwb2ludD86IGJvb2xlYW4pOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm1haW5Qcm9taXNlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5tYWluUHJvbWlzZS50aGVuKCgpID0+IHRoaXMuJGh0dHA8VD4odGhpcy5jb25maWd1cmVIdHRwQ2FsbCgnUE9TVCcsIHVybCwgZGF0YSwgY29yZUFwaUVuZHBvaW50KSkudGhlbjxUPih0aGlzLnN1Y2Nlc3M8VD4odXJsKSwgdGhpcy5lcnJvcikuZmluYWxseSh0aGlzLmZpbmFsbHkpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLiRodHRwPFQ+KHRoaXMuY29uZmlndXJlSHR0cENhbGwoJ1BPU1QnLCB1cmwsIGRhdGEsIGNvcmVBcGlFbmRwb2ludCkpLnRoZW48VD4odGhpcy5zdWNjZXNzPFQ+KHVybCksIHRoaXMuZXJyb3IpLmZpbmFsbHkodGhpcy5maW5hbGx5KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogVE9ETyBNR0EgOiBtdXR1YWxpemUgYmVoYXZpb3Igd2l0aCBjb25maWd1cmVIdHRwQ2FsbCBmb3IgY29uZmlnICFcclxuICAgICAgICAgKiBAcGFyYW0gdXJsIFxyXG4gICAgICAgICAqIEBwYXJhbSBmaWxlIFxyXG4gICAgICAgICAqIEBwYXJhbSB1cGxvYWRQcm9ncmVzcyBcclxuICAgICAgICAgKiBAcmV0dXJucyB7fSBcclxuICAgICAgICAgKi9cclxuICAgICAgICB1cGxvYWQ8VD4odXJsOiBzdHJpbmcsIGZpbGU6IEZpbGUsIHVwbG9hZFByb2dyZXNzOiAoKSA9PiBhbnksIGNvcmVBcGlFbmRwb2ludD86IGJvb2xlYW4sIGVuY29kZUJhc2U2ND86IGJvb2xlYW4pOiBuZy5JUHJvbWlzZTxUPiB7XHJcbiAgICAgICAgICAgIGlmICghdXJsKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3VybCBwYXJhbSBpcyBtYW5kYXRvcnkgZm9yIGh0dHBXcmFwcGVyU2VydmljZSBjYWxsJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCFmaWxlKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ZpbGUgcGFyYW0gaXMgbWFuZGF0b3J5IGZvciB1cGxvYWQgbWV0aG9kJyk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICB2YXIgdXJsID0gdGhpcy5jb3JlQXBpQ29uZmlnLmNvcmVBcGlVcmwgKyAnYXBpL2ZpbGUtYXR0YWNobWVudC9wdXQnO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuVXBsb2FkLmJhc2U2NERhdGFVcmwoZmlsZSkudGhlbigoZmlsZUJhc2U2NFVybCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuJGh0dHAucG9zdDxUPih1cmwsIHsgRWxlbWVudElkOiAnYm9mJywgT3JpZ2luOiAnUXVvdGVGaWxlQXR0YWNobWVudCcsIGJhc2U2NFN0cmluZ0ZpbGU6IGZpbGVCYXNlNjRVcmwgfSkudGhlbjxUPigocHJvbWlzZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzdWNjZXNzIHVwbG9hZCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9taXNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvL3ZhciB1cGxvYWRDb25maWcgPSB7XHJcbiAgICAgICAgICAgIC8vICAgIHVybDogdGhpcy50cnlHZXRGdWxsVXJsKHVybCksXHJcbiAgICAgICAgICAgIC8vICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgLy8gICAgICAgIGZpbGU6IGZpbGUsIC8vIHNpbmdsZSBmaWxlIG9yIGEgbGlzdCBvZiBmaWxlcy4gbGlzdCBpcyBvbmx5IGZvciBodG1sNVxyXG4gICAgICAgICAgICAvLyAgICAgICAgLy9maWxlTmFtZTogJ2RvYy5qcGcnIG9yIFsnMS5qcGcnLCAnMi5qcGcnLCAuLi5dIC8vIHRvIG1vZGlmeSB0aGUgbmFtZSBvZiB0aGUgZmlsZShzKVxyXG4gICAgICAgICAgICAvLyAgICAgICAgZmlsZUZvcm1EYXRhTmFtZTogJ2ZpbGUnIC8vIGZpbGUgZm9ybURhdGEgbmFtZSAoJ0NvbnRlbnQtRGlzcG9zaXRpb24nKSwgc2VydmVyIHNpZGUgcmVxdWVzdCBmb3JtIG5hbWVcclxuICAgICAgICAgICAgLy8gICAgfSxcclxuICAgICAgICAgICAgLy8gICAgbWV0aG9kOiAnUE9TVCcgLy9UT0RPIE1HQTogc2hvdWxkIG5vdCBiZSBuZWNlc3NhcnksIGRlZmF1bHQgb24gRmlsZVVwbG9hZENvbmZpZ0ZpbGUgc2lnbmF0dXJlLCB0byBwcm9wb3NlIGFzIHB1bGwtcmVxdWVzdFxyXG4gICAgICAgICAgICAvL307XHJcblxyXG4gICAgICAgICAgICAvL2lmICh0aGlzLm1haW5Qcm9taXNlKSB7XHJcbiAgICAgICAgICAgIC8vICAgIHJldHVybiB0aGlzLm1haW5Qcm9taXNlLnRoZW4oKCkgPT4gdGhpcy5VcGxvYWQudXBsb2FkPFQ+KHVwbG9hZENvbmZpZykudGhlbjxUPih0aGlzLnN1Y2Nlc3M8VD4odXJsKSwgdGhpcy5lcnJvciwgdXBsb2FkUHJvZ3Jlc3MpLmZpbmFsbHkodGhpcy5maW5hbGx5KSk7XHJcbiAgICAgICAgICAgIC8vfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gICAgcmV0dXJuIHRoaXMuVXBsb2FkLnVwbG9hZDxUPih1cGxvYWRDb25maWcpLnRoZW48VD4odGhpcy5zdWNjZXNzPFQ+KHVybCksIHRoaXMuZXJyb3IsIHVwbG9hZFByb2dyZXNzKS5maW5hbGx5KHRoaXMuZmluYWxseSk7XHJcbiAgICAgICAgICAgIC8vfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9UT0RPIE1HQSA6IG1ldGhvZCB0byBkb2N1bWVudCBhbmQgaW1wcm92ZSByb2J1c3RuZXNzICsgdXNlIGluIE9FIG91dHNpZGUgb2YgYW5ndWxhciAvLyBtdXR1YWxpemVcclxuICAgICAgICAvLyBUcmllcyB0byBwYXJzZSB0aGUgaW5wdXQgdXJsIDpcclxuICAgICAgICAvLyBJZiBpdCBzZWVtcyB0byBiZSBhIGZ1bGwgVVJMLCB0aGVuIHJldHVybiBhcyBpcyAoY29uc2lkZXJzIGl0IGV4dGVybmFsIFVybClcclxuICAgICAgICAvLyBPdGhlcndpc2UsIHRyaWVzIHRvIGZpbmQgdGhlIGJhc2UgVVJMIG9mIHRoZSBjdXJyZW50IEJsdWVTa3kgYXBwIHdpdGggb3Igd2l0aG91dCB0aGUgaW5jbHVkZWQgQ29udHJvbGxlciBhbmQgcmV0dXJucyB0aGUgZnVsbCBVcmxcclxuICAgICAgICB0cnlHZXRGdWxsVXJsKHVybElucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICAvLyBVcmwgc3RhcnRzIHdpdGggaHR0cDovLyBvciBodHRwczovLyA9PiBsZWF2ZSBhcyB0aGlzXHJcbiAgICAgICAgICAgIGlmICh1cmxJbnB1dC5zbGljZSgwLCAnaHR0cDovLycubGVuZ3RoKSA9PT0gJ2h0dHA6Ly8nIHx8XHJcbiAgICAgICAgICAgICAgICB1cmxJbnB1dC5zbGljZSgwLCAnaHR0cHM6Ly8nLmxlbmd0aCkgPT09ICdodHRwczovLycpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB1cmxJbnB1dDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gQm9vbGVhbiB1c2VkIHRvIHRyeSB0byBkZXRlcm1pbmUgY29ycmVjdCBmdWxsIHVybCAoYWRkIC8gb3Igbm90IGJlZm9yZSB0aGUgdXJsIGZyYWdtZW50IGRlcGVuZGluZyBvbiBpZiBmb3VuZCBvciBub3QpXHJcbiAgICAgICAgICAgIHZhciB1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaCA9IHVybElucHV0LnNsaWNlKDAsICcvJy5sZW5ndGgpID09PSAnLyc7XHJcblxyXG4gICAgICAgICAgICAvLyBSZWdleCB0cnlpbmcgdG8gZGV0ZXJtaW5lIGlmIHRoZSBpbnB1dCBmcmFnbWVudCBjb250YWlucyBhIC8gYmV0d2VlbiB0d28gY2hhcmFjdGVyIHN1aXRlcyA9PiBjb250cm9sbGVyIGdpdmVuIGFzIGlucHV0LCBvdGhlcndpc2UsIGFjdGlvbiBvbiBzYW1lIGNvbnRyb2xsZXIgZXhwZWN0ZWRcclxuICAgICAgICAgICAgdmFyIGNvbnRyb2xsZXJJc1ByZXNlbnRSZWdleCA9IC9cXHcrXFwvXFx3Ky87XHJcblxyXG4gICAgICAgICAgICB2YXIgYWN0aW9uSXNPblNhbWVDb250cm9sbGVyID0gIWNvbnRyb2xsZXJJc1ByZXNlbnRSZWdleC50ZXN0KHVybElucHV0KTtcclxuXHJcbiAgICAgICAgICAgIHZhciBiYXNlVXJsID0gdGhpcy5nZXRVcmxQYXRoKGFjdGlvbklzT25TYW1lQ29udHJvbGxlcik7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gYmFzZVVybCArICh1cmxGcmFnbWVudFN0YXJ0c1dpdGhTbGFzaCA/IHVybElucHV0IDogKCcvJyArIHVybElucHV0KSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgLy8jcmVnaW9uIHByaXZhdGUgbWV0aG9kc1xyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAqIFByZXBhcmVzIGEge0BsaW5rIG5nIyRodHRwI2NvbmZpZyBjb25maWd9IG9iamVjdCBmb3IgJGh0dHAgY2FsbC5cclxuICAgICAgICAqIFRoZSBvcGVyYXRpb25zIGluY2x1ZGUgc2V0dGluZyBkZWZhdWx0IHZhbHVlcyB3aGVuIG5vdCBwcm92aWRlZCwgYW5kIHNldHRpbmcgaHR0cCBoZWFkZXJzIGlmIG5lZWRlZCBmb3IgOlxyXG4gICAgICAgICogIC0gQWpheCBjYWxsc1xyXG4gICAgICAgICogIC0gQXV0aG9yaXphdGlvbiB0b2tlblxyXG4gICAgICAgICogIC0gQ3VycmVudCBVc2VyUm9sZS4gICBcclxuICAgICAgICAqIEBwYXJhbSBvcHRpb25zXHJcbiAgICAgICAgKiBAcmV0dXJucyB7bmcuJGh0dHAuY29uZmlnfSB0aGUgY29uZmlndXJhdGlvbiBvYmplY3QgcmVhZHkgdG8gYmUgaW5qZWN0ZWQgaW50byBhICRodHRwIGNhbGwuIFxyXG4gICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBjb25maWd1cmVIdHRwQ2FsbCA9IChtZXRob2Q6IHN0cmluZywgdXJsOiBzdHJpbmcsIGNvcmVBcGlFbmRwb2ludDogYm9vbGVhbiA9IGZhbHNlLCBkYXRhPzogYW55LCBpbnB1dENvbmZpZz86IG5nLklSZXF1ZXN0U2hvcnRjdXRDb25maWcpOiBuZy5JUmVxdWVzdENvbmZpZyA9PiB7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXVybCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKFwiVVJMIHBhcmFtZXRlciBpcyBuZWNlc3NhcnkgZm9yIGh0dHBXcmFwcGVyIGNhbGxzLiBBYm9ydGluZy5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGNvcmVBcGlFbmRwb2ludCAmJiAhdGhpcy5jb3JlQXBpQ29uZmlnKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IoJ0ludGVybmFsRXJyb3I6IGNvcmVBcGkgY2FsbCBpbnRlbmRlZCB3aXRob3V0IG5lY2Vzc2FyeSBjYXBpIGNyZWRlbnRpYWxzLiBBYm9ydGluZy4nKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgcmVxdWVzdENvbmZpZyA9IHtcclxuICAgICAgICAgICAgICAgIC8vVE9ETyBNR0EgOiBjb3JlIGFwaSBlbmRwb2ludCAnYXBpLycgaGFyZGNvZGVkLCB0byBwdXQgaW4gY29uZmlnICEgc2hvdWxkIG5vdCBub3cgdGhhdCBoZXJlLlxyXG4gICAgICAgICAgICAgICAgdXJsOiBjb3JlQXBpRW5kcG9pbnQgPyB0aGlzLmNvcmVBcGlDb25maWcuY29yZUFwaVVybCArICdhcGkvJyArIHVybCA6IHRoaXMudHJ5R2V0RnVsbFVybCh1cmwpLFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kOiBtZXRob2QgfHwgJ0dFVCcsIC8vIFN1cHBvcnRlZCBtZXRob2RzIGFyZSB0aGUgc2FtZSBhcyAkaHR0cCArIFRPRE8gTUdBIHN1cHBvcnQga2V5d29yZCAndXBsb2FkJyBmcm9tIE9FICYgbWVyZ2UgY29kZVxyXG4gICAgICAgICAgICAgICAgcGFyYW1zOiBpbnB1dENvbmZpZyAhPSBudWxsID8gaW5wdXRDb25maWcucGFyYW1zIDogbnVsbCwgLy9UT0RPIE1HQSA6IG51bGwgb3IgdW5kZWZpbmVkID9cclxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGEgfHwgbnVsbCxcclxuICAgICAgICAgICAgICAgIGhlYWRlcnM6IHt9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBpZiAoY29yZUFwaUVuZHBvaW50KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb3JlQXBpQ29uZmlnLmp3dFRva2VuICYmIHRoaXMuY29yZUFwaUNvbmZpZy5jdXJyZW50VXNlclJvbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXF1ZXN0Q29uZmlnLmhlYWRlcnNbJ09BLVVzZXJSb2xlJ10gPSB0aGlzLmNvcmVBcGlDb25maWcuY3VycmVudFVzZXJSb2xlO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3RDb25maWcuaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gJ0JlYXJlciAnICsgdGhpcy5jb3JlQXBpQ29uZmlnLmp3dFRva2VuO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE8gTUdBICEhISEhISEhISEhISEhISEhISEhISEhISEhISEhXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvL1RPRE8gTUdBIDogd2FpdCBmb3IgZGF0YSB0byBiZSBwb3B1bGF0ZWQgaWYgb25nb2luZyBjYWxsLCBvdGhlcndpc2UgY2FsbCBDdHJsID9cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gVE9ETyBNR0EgOiB0eXBlIGNhc3RpbmcsIGlzIGl0IG9rYXkgb3Igbm90ID8gYmV0dGVyIGFwcHJvYWNoID9cclxuICAgICAgICAgICAgKDxhbnk+dGhpcy4kd2luZG93KS5wcmV2ZW50QmxvY2tVSSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogY3VycmVudGx5IGRvbmUgaW4gbW9kdWxlIGNvbmZpZ3VyYXRpb24gb24gbW9kdWxlIGluaXQsIHVzaW5nIGh0dHBQcm92aWRlci5kZWZhdWx0cy8gVG8gZGlzY3VzcyB3aGVyZSB0byBzZXQgdGhpcyB1cFxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogc2V0IHRoaXMgYWx3YXlzIG9yIG9ubHkgZm9yIFdlYkFQSSBjYWxscyA/XHJcbiAgICAgICAgICAgIC8vcmVxdWVzdENvbmZpZy5oZWFkZXJzWydYLVJlcXVlc3RlZC1XaXRoJ10gPSAnWE1MSHR0cFJlcXVlc3QnO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RDb25maWc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBTdWNjZXNzIGhhbmRsZXJcclxuICAgICAgICAgKiBUT0RPIE1HQSA6IHdoYXQgaXMgdXJsIHVzZWQgZm9yID8/P1xyXG4gICAgICAgICAqIEBwYXJhbSB1cmwgXHJcbiAgICAgICAgICogQHJldHVybnMge30gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBzdWNjZXNzID0gPFQ+KHVybDogc3RyaW5nKTogKHByb21pc2VDYWxsYmFjazogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8VD4pID0+IFQgfCBuZy5JUHJvbWlzZTxhbnk+ID0+IHtcclxuXHJcbiAgICAgICAgICAgIC8vIEpTIHRyaWNrIDogY2FwdHVyZSB1cmwgdmFyaWFibGUgaW5zaWRlIGNsb3N1cmUgc2NvcGUgdG8gc3RvcmUgaXQgZm9yIGNhbGxiYWNrIHdoaWNoIGNhbm5vdCBiZSBjYWxsZWQgd2l0aCAyIGFyZ3VtZW50c1xyXG4gICAgICAgICAgICByZXR1cm4gKHByb21pc2VDYWxsYmFjazogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8VD4pOiBUIHwgbmcuSVByb21pc2U8YW55PiA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFwcm9taXNlQ2FsbGJhY2sgfHwgIXByb21pc2VDYWxsYmFjay5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQTogdGhpbmsgYWJvdXQgdGhpcyAuLi4gTWF5IG5vdCBiZSBhY2N1cmF0ZSA/IG9yIG1heSBub3QgYmUgYW4gZXJyb3IgaWYgcmV0dXJuIHR5cGUgaXMgbnVsbCBpbiBjYXNlIG5vIGRhdGEgZm91bmRcclxuICAgICAgICAgICAgICAgICAgICAvL3Jlc3BvbnNlLnN0YXR1cyA9IDUwMztcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IocHJvbWlzZUNhbGxiYWNrKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnRvYXN0ZXIud2FybmluZygnVW5leHBlY3RlZCByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXInLCAnQ2FsbCBzdWNjZXNzZnVsbCwgYnV0IG5vIGRhdGEgZm91bmQnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPIE1HQSA6IGZpbmQgb3V0IGhvdyB0byBoYW5kbGUgdGhhdCBhcyB0byBleHBlY3RkIHJldHVybiB0eXBlID9cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy4kcS5yZWplY3QocHJvbWlzZUNhbGxiYWNrKTsgLy8gUmVqZWN0IHByb21pc2UgaWYgbm90IHdlbGwtZm9ybWVkIGRhdGFcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLiRsb2cuZGVidWcocHJvbWlzZUNhbGxiYWNrKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvbWlzZUNhbGxiYWNrLmRhdGE7IC8vIHJldHVybiBvbmx5IHRoZSBkYXRhIGV4cGVjdGVkIGZvciBjYWxsZXJcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEVycm9yIGhhbmRsZXJcclxuICAgICAgICAgKiBAcGFyYW0gcmVzcG9uc2UgXHJcbiAgICAgICAgICogQHJldHVybnMge30gXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBlcnJvciA9IChyZXNwb25zZTogbmcuSUh0dHBQcm9taXNlQ2FsbGJhY2tBcmc8YW55Pik6IG5nLklQcm9taXNlPG5nLklIdHRwUHJvbWlzZUNhbGxiYWNrQXJnPGFueT4+ID0+IHsgLy8gZG8gc29tZXRoaW5nIG9uIGVycm9yXHJcblxyXG4gICAgICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhID0gJ1NlcnZlciBub3QgcmVzcG9uZGluZyc7XHJcbiAgICAgICAgICAgICAgICByZXNwb25zZS5zdGF0dXMgPSA1MDM7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gU3RyaW5nKHJlc3BvbnNlLmRhdGEpICsgJ1xcbiBTdGF0dXM6ICcgKyByZXNwb25zZS5zdGF0dXMudG9TdHJpbmcoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudG9hc3Rlci5lcnJvcignU2VydmVyIHJlc3BvbnNlIGVycm9yJywgbWVzc2FnZSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLiRsb2cuZXJyb3IocmVzcG9uc2UpO1xyXG5cclxuICAgICAgICAgICAgLy8gV2UgZG9uJ3QgcmVjb3ZlciBmcm9tIGVycm9yLCBzbyB3ZSBwcm9wYWdhdGUgaXQgOiBiZWxvdyBoYW5kbGVycyBoYXZlIHRoZSBjaG9pY2Ugb2YgcmVhZGluZyB0aGUgZXJyb3Igd2l0aCBhbiBlcnJvciBoYW5kbGVyIG9yIG5vdC4gU2VlICRxIHByb21pc2VzIGJlaGF2aW9yIGhlcmUgOiBodHRwczovL2dpdGh1Yi5jb20va3Jpc2tvd2FsL3FcclxuICAgICAgICAgICAgLy8gVGhpcyBiZWhhdmlvciBpcyBkZXNpcmVkIHNvIHRoYXQgd2Ugc2hvdyBlcnJvciBpbnNpZGUgc3BlY2lmaWMgc2VydmVyIGNvbW11bmljYXRpb24gbW9kYWxzIGF0IHNwZWNpZmljIHBsYWNlcyBpbiB0aGUgYXBwLCBvdGhlcndpc2Ugc2hvdyBhIGdsb2JhbCBhbGVydCBtZXNzYWdlLCBvciBldmVuIGRvIG5vdCBzaG93IGFueXRoaW5nIGlmIG5vdCBuZWNlc3NhcnkgKGRvIG5vdCBhZCBhbiBlcnJvciBoYW5kbGVyIGluIGJlbG93IGhhbmRsZXJzIG9mIHRoaXMgcHJvbWlzZSkuXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLiRxLnJlamVjdChyZXNwb25zZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBGdW5jdGlvbiBjYWxsZWQgYXQgdGhlIGVuZCBvZiBhbiBhamF4IGNhbGwsIHJlZ2FyZGxlc3Mgb2YgaXQncyBzdWNjZXNzIG9yIGZhaWx1cmUuXHJcbiAgICAgICAgICogQHBhcmFtIHJlc3BvbnNlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHJpdmF0ZSBmaW5hbGx5ID0gKCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICAvLyBUT0RPIE1HQSA6IHR5cGUgY2FzdGluZywgaXMgaXQgb2theSBvciBub3QgPyBiZXR0ZXIgYXBwcm9hY2ggP1xyXG4gICAgICAgICAgICAoPGFueT50aGlzLiR3aW5kb3cpLnByZXZlbnRCbG9ja1VJID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGdldEN1cnJlbnRTZXNzaW9uSUQoKSB7XHJcblxyXG4gICAgICAgICAgICAvL1RPRE8gTUdBIDogbWFnaWMgcmVnZXhwIHRvIGZldGNoIFNlc3Npb25JRCBpbiBVUkwsIHRvIHN0b3JlIGVsc2V3aGVyZSAhXHJcbiAgICAgICAgICAgIHZhciBzZXNzaW9uUmVnZXggPSAvaHR0cHM6XFwvXFwvW1xcdy5dK1xcL09yZGVyRW50cnlcXC8oXFwoU1xcKFxcdytcXClcXCkpXFwvLiovO1xyXG5cclxuICAgICAgICAgICAgLy8gVE9ETyBNR0EgOiB1cGRhdGUgcmVnZXhwIHRvIHRoZSBvbmUgYmVsb3dcclxuICAgICAgICAgICAgLy92YXIgYmFzZVVybFJlZ2V4ID0gLyhodHRwczpcXC9cXC9bXFx3Li1dK1xcL1tcXHcuLV0rXFwvXFwoU1xcKFxcdytcXClcXClcXC8pXFx3Ky87XHJcblxyXG5cclxuICAgICAgICAgICAgdmFyIHBhdGggPSB0aGlzLiRsb2NhdGlvbi5hYnNVcmwoKTtcclxuXHJcbiAgICAgICAgICAgIHZhciByZWdleHBBcnJheSA9IHNlc3Npb25SZWdleC5leGVjKHBhdGgpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFyZWdleHBBcnJheSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKFwiVW5hYmxlIHRvIHJlY29nbml6ZWQgc2VhcmNoZWQgcGF0dGVybiBpbiBjdXJyZW50IHVybCBsb2NhdGlvbiB0byByZXRyaWV2ZSBzZXNzaW9uSUQuXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJlZ2V4cEFycmF5Lmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kbG9nLmVycm9yKFwiVW5hYmxlIHRvIGZpbmQgc2Vzc2lvbklEIGluIHNlYXJjaGVkIHBhdHRlcm4gaW4gY3VycmVudCB1cmwuXCIpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJlZ2V4cEFycmF5Lmxlbmd0aCA+IDIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJGxvZy5lcnJvcihcIlRvbyBtYW55IG1hdGNoZXMgZm91bmQgZm9yIHRoZSBzZXNzaW9uSUQgc2VhcmNoIGluIHRoZSBjdXJyZW50IHVybC5cIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJcIjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHJlZ2V4cEFycmF5WzFdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gVE9ETyBNR0EgOiB1c2luZyBtZXRob2QgZnJvbSBMYXlvdXQuanMgOiB0byBkb2N1bWVudCB0byBub3QgaGFuZGxlIGR1cGxpY2F0ZSBjb2RlICEhXHJcbiAgICAgICAgLy9UT0RPIE1HQSA6IG1ha2UgaXQgY2FwYWJsZSBvZiBoYW5kbGluZyBmdWxsIFVSTHMgb3V0c2lkZSBvZiBPRSA6IGRvIG5vdCB1c2UgPz8gaG93IHRvID9cclxuICAgICAgICBwcml2YXRlIGdldFVybFBhdGgoYWN0aW9uSXNPblNhbWVDb250cm9sbGVyKSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgYmFzZVVybFJlZ2V4ID0gLyhcXC9cXHcrXFwvXFwoU1xcKFxcdytcXClcXCkpXFwvXFx3Ky87XHJcbiAgICAgICAgICAgIHZhciB1cmwgPSB0aGlzLiR3aW5kb3cubG9jYXRpb24ucGF0aG5hbWU7XHJcbiAgICAgICAgICAgIHZhciBiYXNlVXJsTWF0Y2hlcyA9IGJhc2VVcmxSZWdleC5leGVjKHVybCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoYmFzZVVybE1hdGNoZXMubGVuZ3RoICYmIGJhc2VVcmxNYXRjaGVzLmxlbmd0aCA9PT0gMikge1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBiYXNlVXJsV2l0aENvbnRyb2xsZXJOYW1lID0gYmFzZVVybE1hdGNoZXNbMF07XHJcbiAgICAgICAgICAgICAgICB2YXIgYmFzZVVybCA9IGJhc2VVcmxNYXRjaGVzWzFdO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhY3Rpb25Jc09uU2FtZUNvbnRyb2xsZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYmFzZVVybFdpdGhDb250cm9sbGVyTmFtZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJhc2VVcmw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiAnJztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgfVxyXG5cclxuICAgIC8vVE9ETyBNR0EgOiBkZWZhdWx0IEhUVFAgcHJvdmlkZXIgY29uZmlndXJhdGlvbiB0byBpbXByb3ZlICYgbXV0dWFpemUgd2l0aCBEQVxyXG4gICAgYW5ndWxhci5tb2R1bGUoJ2JsdWVza3kuY29yZS5zZXJ2aWNlcy5odHRwV3JhcHBlcicsIFsndG9hc3RlcicsICduZ0ZpbGVVcGxvYWQnXSlcclxuICAgICAgICAvLyBUT0RPIE1HQSA6IE1heSBuZWVkIHRvIGJlIHJlZmFjdG9yZWQgdG8gdXNlIGNvbW1vbiBsb2dpYyB3aXRoIGRhc2hib2FyZCBzZXJ2aWNlIDogc2VlIGhvdyB0byBtdXR1YWxpemUgYXMgbXVjaCBjb2RlIGFzIHBvc3NpYmxlIGJldHdlZW4gdGhlIHR3b1xyXG4gICAgICAgIC8vIFRPRE8gTUdBIDogdGhpcyBtYXkgbm90IG5lZWQgdG8gYmUgYSBkZWRpY2F0ZWQgc2VydmljZSwgaXQgY2FuIGFsc28gYmUgaW5jb3Jwb3JhdGVkIGludG8gdGhlIGh0dHBJbnRlcmNlcHRvci4gRGVjaWRlIGJlc3QgYXBwcm9hY2ggZGVwZW5kaW5nIG9uIHBsYW5uZWQgdXNlLlxyXG4gICAgICAgIC5jb25maWcoWyckaHR0cFByb3ZpZGVyJywgKCRodHRwUHJvdmlkZXI6IG5nLklIdHRwUHJvdmlkZXIpID0+IHtcclxuICAgICAgICAgICAgJGh0dHBQcm92aWRlci5kZWZhdWx0cy5oZWFkZXJzLmNvbW1vblsnWC1SZXF1ZXN0ZWQtV2l0aCddID0gJ1hNTEh0dHBSZXF1ZXN0JztcclxuICAgICAgICB9XSlcclxuICAgICAgICAuc2VydmljZSgnaHR0cFdyYXBwZXJTZXJ2aWNlJywgSHR0cFdyYXBwZXJTZXJ2aWNlKTtcclxufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
