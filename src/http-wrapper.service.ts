﻿namespace bluesky.core.services {

    import ApiConfig = bluesky.core.models.ApiConfig;
    import FileContent = bluesky.core.models.FileContent;

    export interface IHttpWrapperConfig extends ng.IRequestShortcutConfig {
        /**
         * main API endpoint to use as default one if url is not full.
         */
        apiEndpoint?: boolean;
        file?: File,
        uploadInBase64Json?: boolean;
        uploadProgress?: () => any;
        disableXmlHttpRequestHeader?: boolean;
    }

    enum HttpMethod { GET, POST, PUT, DELETE };

    export interface IHttpWrapperService {

        /**
         * All srv-side configuration of main API provided by the domain from which this script was loaded, @ the url 'CoreApiAuth/GetCoreApiConfig'.
         * TODO MGA fix hard coded path.
         * This configuration data is loaded upon initialization of this service (to be used as a singleton in the app). All other web calls are blocked as long as this one is not finished.
         */
        apiConfig: ApiConfig;

        //TODO MGA: for following methods, return IPromise and assume abstraction or let below services handle IHttpPromises ?

        get<T>(url: string, config?: IHttpWrapperConfig): ng.IPromise<T>;

        delete<T>(url: string, config?: IHttpWrapperConfig): ng.IPromise<T>;

        post<T>(url: string, data: any, config?: IHttpWrapperConfig): ng.IPromise<T>;

        put<T>(url: string, data: any, config?: IHttpWrapperConfig): ng.IPromise<T>;

        //TODO MGA improve typing with angular-upload tsd etc
        upload<T>(url: string, file: File, config?: IHttpWrapperConfig): ng.IPromise<T>;

        getFile(url: string, config?: IHttpWrapperConfig): ng.IPromise<FileContent>;

        buildUrlFromContext(urlInput: string): string;
    }

    /**
     * TODO MGA : this may not need to be a dedicated service, it can also be incorporated into the httpInterceptor. Decide best approach depending on planned use.
     */
    export class HttpWrapperService implements IHttpWrapperService {

        //#region properties

        private initPromise: ng.IPromise<any>;
        public apiConfig: ApiConfig;

        //#endregion

        //#region ctor

        /* @ngInject */
        constructor(
            private $http: ng.IHttpService,
            private $window: ng.IWindowService,
            private $log: ng.ILogService,
            private $q: ng.IQService,
            private $location: ng.ILocationService,
            private Upload: ng.angularFileUpload.IUploadService,
            private toaster: ngtoaster.IToasterService
        ) {
            // init core api config data on ctor
            //TODO MGA : hard coded path for CorerApiAuthCtrl to inject
            this.initPromise = this.$http.get<ApiConfig>(this.buildUrlFromContext('CoreApiAuth/GetCoreApiConfig'))
                .success((coreApiConfig) => {
                    this.apiConfig = coreApiConfig;
                }).error((error) => {
                    this.$log.error('Unable to retrieve API config. Aborting httpWrapperService initialization.');
                    return $q.reject(error);
                });
        }

        //#endregion

        //#region public methods

        get<T>(url: string, config?: IHttpWrapperConfig): ng.IPromise<T> {
            return this.ajax<T>(HttpMethod.GET, url, config);
        }

        delete<T>(url: string, config?: IHttpWrapperConfig): ng.IPromise<T> {
            return this.ajax<T>(HttpMethod.DELETE, url, config);
        }

        post<T>(url: string, data: any, config?: IHttpWrapperConfig): ng.IPromise<T> {
            config = config || {};
            config.data = data || config.data;;
            return this.ajax<T>(HttpMethod.POST, url, config);
        }

        put<T>(url: string, data: any, config?: IHttpWrapperConfig): ng.IPromise<T> {
            config = config || {};
            config.data = data || config.data;
            return this.ajax<T>(HttpMethod.PUT, url, config);
        }

        upload<T>(url: string, file: File, config?: IHttpWrapperConfig): ng.IPromise<T> {

            if (!file && (!config || !config.file)) {
                this.$log.error('Cannot start upload with null {file} parameter.');
                return null;
            }

            config = config || {};
            config.file = file || config.file; //TODO MGA : do not expose file in IHttpWrapperConfig ?
            config.data = config.data || {};

            if (config.uploadInBase64Json) {
                //TODO MGA: make sure this delays next call and upload is not done before base64 encoding is finished, even if promise is already resolved ???
                return this.Upload.base64DataUrl(file).then((fileBase64Url) => {
                    //TODO MGA: hard-coded key to fetch base64 encoding, to parametrize with server-side !
                    config.data.fileBase64Url = fileBase64Url;
                    //normal post in case of base64-encoded data
                    return this.ajax<T>(HttpMethod.POST, url, config);
                });
            } else {
                config.data.fileFormDataName = 'file'; // file formData name ('Content-Disposition'), server side request form name

                //TODO MGA : do not block if not call to internal API (initCall)
                return this.initPromise.then(() => {
                    //TODO MGA : not safe hard cast
                    //TODO MGA : behavior duplication with this.ajax, not DRY, to improve
                    return this.Upload.upload<T>(<ng.angularFileUpload.IFileUploadConfigFile>this.configureHttpCall(HttpMethod.POST, url, config))
                        .then<T>(this.onSuccess, this.onError, config.uploadProgress) //TODO MGA : uploadProgress callback ok ?
                        .finally(this.finally);
                });
            }
        }

        /**
         * This method is used to download a file in the form of a byte-stream from an endpoint and wrap it into a FileContent object with name, type & size properties read from the HTTP response headers of the serveur.
         * It is the responsability of the consumer to do something with the wrapped byteArray (for example download the file, or show it inside the webPage etc).
         * @param url
         * @param expectedName
         * @param expectedSize
         * @param expectedType
         * @param config
         */
        getFile(url: string, config?: IHttpWrapperConfig): ng.IPromise<FileContent> {
            return this.initPromise.then(() => {

                var angularHttpConfig = this.configureHttpCall(HttpMethod.GET, url, config);

                // specifically expect raw response type, otherwise byte stream responses are corrupted.
                angularHttpConfig.responseType = 'arraybuffer';

                //Expected ArrayBuffer response = byte array
                return this.$http<ArrayBuffer>(angularHttpConfig)
                    .then<FileContent>((httpResponse) => {

                        //benefit from successCallback validation before continuing
                        var arrayBuffer = this.onSuccess<ArrayBuffer>(httpResponse);

                        //TODO MGA: promise rejection vs. return null ?
                        if (!arrayBuffer) return null; //stop processing if unable to retrieve byte array

                        //read file info from response-headers
                        var fileContent: FileContent = {
                            name: this.getFileNameFromHeaderContentDisposition(httpResponse.headers('content-disposition')) || null,
                            size: Number(httpResponse.headers('content-length')) || 0,
                            type: httpResponse.headers('content-type') || 'application/octet-stream',
                            content: arrayBuffer
                        };

                        return fileContent;

                    }, this.onError)
                    .finally(this.finally);
            });
        }

        //TODO MGA : method too specific to OM apps context, may not work outside of it, to adapt for public use ?
        /**
         * Tries to parse the input url :
         * If it seems to be a full URL, then return as is (considers it external Url) 
         * Otherwise, tries to find the base URL of the current BlueSky app with or without the included Controller and returns the full Url 
         * @param urlInput : TODO MGA: document different kind of urls that this method can take as input (full, partial etc)
         */
        public buildUrlFromContext(urlInput: string): string {

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
        }

        //#endregion

        //#region private methods

        /**
         * Utility method.
         * Main caller that all wrapper calls (get, delete, post, put) must use to share common behavior.
         * @param config
         */
        private ajax<T>(method: HttpMethod, url: string, config?: IHttpWrapperConfig): ng.IPromise<T> {
            //TODO MGA : make sure initPromise resolve automatically without overhead once first call sucessfull.
            //TODO MGA : do not block if not call to internal API (initCall)
            return this.initPromise.then(() => {
                var angularHttpConfig = this.configureHttpCall(method, url, config);
                return this.$http<T>(angularHttpConfig)
                    .then<T>(this.onSuccess, this.onError)
                    .finally(this.finally);
            });
        }

        /**
        * Prepares a {@link ng#$http#config config} object for $http call.
        * The operations include setting default values when not provided, and setting http headers if needed for :
        *  - Ajax calls
        *  - Authorization token
        *  - Current UserRole.   
        * @param options
        * @returns {ng.$http.config} the configuration object ready to be injected into a $http call. 
        */
        private configureHttpCall = (method: HttpMethod, url: string, config?: IHttpWrapperConfig): ng.IRequestConfig => {

            if (!url || method === null || method === undefined) {
                this.$log.error('URL & METHOD parameters are necessary for httpWrapper calls. Aborting.');
                return null;
            }

            //Init config even if not provided
            config = config || {};

            //TODO MGA: hard cast is not safe, we may forget to set url & method parameters. TOFIX.
            // automatically get all non-filtered parameters & keep them for this new object.
            var configFull = <ng.IRequestConfig>config;

            //TODO MGA: support mapping between upload & post here ?
            configFull.method = HttpMethod[method];

            if (config.apiEndpoint && (!this.apiConfig ||
                !this.apiConfig.jwtToken ||
                !this.apiConfig.currentUserRole)) {
                this.$log.error(`[InternalError] [${configFull.method} / ${url}] - coreApi call intended without necessary capi credentials. Aborting.`);
                return null;
            }

            configFull.headers = config.headers || {};

            if (!config.apiEndpoint) { // if not set, evaluates to false
                configFull.url = this.buildUrlFromContext(url);
            } else {
                //TODO MGA : core api endpoint 'api/' hardcoded, to put in configFull ! should not know that here.
                configFull.url = this.apiConfig.coreApiUrl + 'api/' + url;

                if (this.apiConfig.jwtToken && this.apiConfig.currentUserRole) {
                    //TODO MGA: hard coded headers, not good, to inject
                    configFull.headers['OA-UserRole'] = this.apiConfig.currentUserRole;
                    configFull.headers['Authorization'] = 'Bearer ' + this.apiConfig.jwtToken;
                }
            }

            if (!config.disableXmlHttpRequestHeader) // if not set, evaluates to false
                configFull.headers['X-Requested-With'] = 'XMLHttpRequest';

            //TODO MGA: OE specific code, to remove
            if ((<any>this.$window).block_UI !== undefined)
                // TODO MGA : type casting, is it okay or not ? better approach ?
                (<any>this.$window).preventBlockUI = true;

            return configFull;
        }


        /**
         * Success handler.
         * Captures the input parameters at the moment of its declaration & return the real handler to be called upon promise completion.
         * Input parameters:
         *  - callingConfig: configuration used to make the ajax call, in case the returned promise is null/empty and doesn't contain necessary data for debugging.
         *  - getCompleteResponseObject: flag indication if we must return the full response object along with headers and status or only the inner data. By default & if not specified, only returns inner data.
         */
        private onSuccess = <T>(httpPromise: ng.IHttpPromiseCallbackArg<T>): T => {

            if (!httpPromise) {
                this.$log.error(`[HTTP no-response] Unexpected $http error, no response promise returned.`);
                this.toaster.error('Unexpected behavior', 'Please contact your local support team.');
                return null;
                //TODO MGA: handle multi-type return in case of rejection or do something else ? this method is currently used synchronously without promise waiting.
                //return this.$q.reject(httpPromise); // Reject promise
            }

            //TODO MGA: handle when API is fixed. See http://stackoverflow.com/questions/11746894/what-is-the-proper-rest-response-code-for-a-valid-request-but-an-empty-data
            //if ((promiseCallback.data === null || promiseCallback.data === undefined) && promiseCallback.status !== 204) {
            //    this.$log.error('Unexpected response from the server, expected response data but none found.');
            //    this.toaster.warning('Unexpected response', 'Please contact your local support team.');
            //    return this.$q.reject(promiseCallback); // Reject promise if not well-formed data
            //}
            //TODO MGA: same behavior also on a GET request ? if request is GET and response is 200 with no data, return error ? (pass in parameter request context to log this error).

            //TODO MGA: get full url of request
            this.$log.debug(`[HTTP ${httpPromise.config.method}] [${httpPromise.config.url}]`, httpPromise);

            // return only the data expected for caller
            return httpPromise.data;
        }

        /**
         * Error handler
         * @param httpPromise 
         * @returns {} 
         */
        private onError = (httpPromise: ng.IHttpPromiseCallbackArg<any>): ng.IPromise<ng.IHttpPromiseCallbackArg<any>> => { // do something on error

            // We suppose in case of no response that the srv didn't send any response.
            // TODO MGA: may also be a fault in internal $http / ajax client side lib, to distinguish.
            if (!httpPromise || !httpPromise.data) {
                httpPromise.data = 'Server not responding';
                httpPromise.status = 503;
            }

            var contentType = httpPromise.headers('Content-Type');

            if (contentType && (contentType.indexOf('application/json') > -1 || contentType.indexOf('text/plain') > -1)) {

                var message: string = ""; //default message

                //TODO MGA: handle error handling more generically based on input error message contract instead of expecting specific error strcture.

                //if (response.data.ModelState) {
                //    //TODO MGA : handle this when well formatted server-side
                //} else
                if (httpPromise.data.Message && angular.isString(httpPromise.data.Message)) {
                    message = httpPromise.data.Message;
                } else if (angular.isString(httpPromise.data)) {
                    message = httpPromise.data;
                }

                //TODO MGA: handle more response codes gracefully.
                if (httpPromise.status === 404) {
                    this.toaster.warning('Not Found', message);
                } else {
                    this.toaster.error('Server response error', message + '\n Status: ' + httpPromise.status);
                }
            } else {
                this.toaster.error('Internal server error', 'Status: ' + httpPromise.status);
            }

            //TODO MGA: get full url of request
            this.$log.error(`[HTTP ${httpPromise.config.method}] [${httpPromise.config.url}]`, httpPromise);

            // We don't recover from error, so we propagate it : below handlers have the choice of reading the error with an error handler or not. See $q promises behavior here : https://github.com/kriskowal/q
            // This behavior is desired so that we show error inside specific server communication modals at specific places in the app, otherwise show a global alert message, or even do not show anything if not necessary (do not ad an error handler in below handlers of this promise).
            return this.$q.reject(httpPromise);
        }

        /**
         * Function called at the end of an ajax call, regardless of it's success or failure.
         * @param response
         */
        private finally = (): void => {
            //TODO MGA: OE-specific code
            if ((<any>this.$window).block_UI !== undefined)
                // TODO MGA : type casting, is it okay or not ? better approach ?
                (<any>this.$window).preventBlockUI = false;
        }

        // TODO MGA : using method from Layout.js : to document to not handle duplicate code !!
        //TODO MGA: unrobust, needs solid refacto to make it more generic when on origin domain !
        private getUrlPath(actionIsOnSameController: boolean): string {

            var baseUrlOmAppsRegex = /(\/\w+\/\(S\(\w+\)\))\/\w*/;
            var baseUrlAspAppsRegex = /(\/\w+)\/\w*/;

            var url = this.$window.location.pathname;
            var baseUrlOmAppsMatches = baseUrlOmAppsRegex.exec(url);
            var baseUrlAspAppsMatches = baseUrlAspAppsRegex.exec(url);

            var baseUrlWithControllerName: string = null;
            var baseUrl: string = null;

            // 2 matches = regex matches + the capturing group
            if (baseUrlOmAppsMatches && baseUrlOmAppsMatches.length && baseUrlOmAppsMatches.length === 2) {

                baseUrlWithControllerName = baseUrlOmAppsMatches[0];
                baseUrl = baseUrlOmAppsMatches[1];
            } else if (baseUrlAspAppsMatches && baseUrlAspAppsMatches.length && baseUrlAspAppsMatches.length === 2) {
                baseUrlWithControllerName = baseUrlAspAppsMatches[0];
                baseUrl = baseUrlAspAppsMatches[1];
            }

            if (actionIsOnSameController && baseUrlWithControllerName) {
                return baseUrlWithControllerName;
            } else if (baseUrl) {
                return baseUrl;
            }

            return '';
        }

        //TODO MGA: OM-specific ASP MVC code, not used ATM, to remove
        private getCurrentSessionID(): string {

            //TODO MGA : magic regexp to fetch SessionID in URL, to store elsewhere !
            var sessionRegex = /https:\/\/[\w.]+\/[\w.]+\/(\(S\(\w+\)\))\/.*/;
            //var sessionRegex = /https:\/\/[\w.]+\/OrderEntry\/(\(S\(\w+\)\))\/.*/;

            // TODO MGA : update regexp to the one below
            //var baseUrlRegex = /(https:\/\/[\w.-]+\/[\w.-]+\/\(S\(\w+\)\)\/)\w+/;


            var path = this.$location.absUrl();

            var regexpArray = sessionRegex.exec(path);

            if (!regexpArray) {
                this.$log.error('Unable to recognized searched pattern in current url location to retrieve sessionID.');
                return '';
            }
            if (regexpArray.length === 1) {
                this.$log.error('Unable to find sessionID in searched pattern in current url.');
                return '';
            }
            if (regexpArray.length > 2) {
                this.$log.error('Too many matches found for the sessionID search in the current url.');
                return '';
            }

            return regexpArray[1];
        }

        /**
         * Trim the content-disposition header to return only the filename.
         * @param contentDispositionHeader
         */
        private getFileNameFromHeaderContentDisposition(contentDispositionHeader: string): string {
            if (!contentDispositionHeader) return null;

            var result = contentDispositionHeader.split(';')[1].trim().split('=')[1];

            return result.replace(/"/g, '');
        }

        //#endregion
    }

    angular.module('ng.httpWrapper', ['toaster', 'ngAnimate', 'ngFileUpload'])
        // done in configureHttpCall method.
        //.config(['$httpProvider', ($httpProvider: ng.IHttpProvider) => {
        //    $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        //}])
        .service('httpWrapperService', HttpWrapperService);
}