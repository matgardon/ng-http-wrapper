///<reference path="../typings/tsd.d.ts" />
module bluesky.core.services {

    import CoreApiConfig = bluesky.core.models.CoreApiConfig;

    export interface IHttpWrapperService {

        //TODO MGA : to inject as generic list of custom headers to pass to service ?
        coreApiConfig: CoreApiConfig;

        get<T>(url: string, coreApiEndpoint?: boolean): ng.IPromise<T>;

        post<T>(url: string, data: any, coreApiEndpoint?: boolean): ng.IPromise<T>;

        /**
         * TODO MGA improve typing with angular-upload tsd etc
         * @param url 
         * @param file 
         * @param uploadProgress 
         * @returns {} 
         */
        upload<T>(url: string, file: any, uploadProgress: () => any, coreApiEndpoint?: boolean, encodeBase64?: boolean): ng.IPromise<T>;

        tryGetFullUrl(urlInput: string): string;
    }

    export class HttpWrapperService implements IHttpWrapperService {

        //#region properties

        private mainPromise: ng.IPromise<any>;
        public coreApiConfig: CoreApiConfig;

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

            //TODO MGA : how to prevent rest of calls to happen if this is not finished ?
            // init core api config data on ctor
            this.mainPromise = this.$http.get<CoreApiConfig>(this.tryGetFullUrl('CoreApiAuth/GetCoreApiConfig')).then((result) => {
                this.coreApiConfig = result.data;
            });
        }

        //#endregion

        //#region public methods

        get<T>(url: string, coreApiEndpoint?: boolean): ng.IPromise<T> {
            //TODO MGA : improve mainPromise behavior !
            if (this.mainPromise) {
                return this.mainPromise.then(() => this.$http<T>(this.configureHttpCall('GET', url, coreApiEndpoint)).then<T>(this.success<T>(url), this.error).finally(this.finally));
            } else {
                return this.$http<T>(this.configureHttpCall('GET', url, coreApiEndpoint)).then<T>(this.success<T>(url), this.error).finally(this.finally);
            }
        }

        post<T>(url: string, data: any, coreApiEndpoint?: boolean): ng.IPromise<T> {
            if (this.mainPromise) {
                return this.mainPromise.then(() => this.$http<T>(this.configureHttpCall('POST', url, data, coreApiEndpoint)).then<T>(this.success<T>(url), this.error).finally(this.finally));
            } else {
                return this.$http<T>(this.configureHttpCall('POST', url, data, coreApiEndpoint)).then<T>(this.success<T>(url), this.error).finally(this.finally);
            }
        }

        /**
         * TODO MGA : mutualize behavior with configureHttpCall for config !
         * @param url 
         * @param file 
         * @param uploadProgress 
         * @returns {} 
         */
        upload<T>(url: string, file: File, uploadProgress: () => any, coreApiEndpoint?: boolean, encodeBase64?: boolean): ng.IPromise<T> {
            if (!url) {
                throw new Error('url param is mandatory for httpWrapperService call');
            }
            if (!file) {
                throw new Error('file param is mandatory for upload method');
            }


            var url = this.coreApiConfig.coreApiUrl + 'api/file-attachment/put';

            return this.Upload.base64DataUrl(file).then((fileBase64Url) => {
                return this.$http.post<T>(url, { ElementId: 'bof', Origin: 'QuoteFileAttachment', base64StringFile: fileBase64Url }).then<T>((promise) => {
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
        }

        //TODO MGA : method to document and improve robustness + use in OE outside of angular // mutualize
        // Tries to parse the input url :
        // If it seems to be a full URL, then return as is (considers it external Url)
        // Otherwise, tries to find the base URL of the current BlueSky app with or without the included Controller and returns the full Url
        tryGetFullUrl(urlInput: string): string {
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
        }

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
        private configureHttpCall = (method: string, url: string, coreApiEndpoint: boolean = false, data?: any, inputConfig?: ng.IRequestShortcutConfig): ng.IRequestConfig => {

            if (!url) {
                this.$log.error("URL parameter is necessary for httpWrapper calls. Aborting.");
                return null;
            }

            if (coreApiEndpoint && !this.coreApiConfig) {
                this.$log.error('InternalError: coreApi call intended without necessary capi credentials. Aborting.');
                return null;
            }

            var requestConfig = {
                //TODO MGA : core api endpoint 'api/' hardcoded, to put in config ! should not now that here.
                url: coreApiEndpoint ? this.coreApiConfig.coreApiUrl + 'api/' + url : this.tryGetFullUrl(url),
                method: method || 'GET', // Supported methods are the same as $http + TODO MGA support keyword 'upload' from OE & merge code
                params: inputConfig != null ? inputConfig.params : null, //TODO MGA : null or undefined ?
                data: data || null,
                headers: {}
            };

            if (coreApiEndpoint) {
                if (this.coreApiConfig.jwtToken && this.coreApiConfig.currentUserRole) {
                    requestConfig.headers['OA-UserRole'] = this.coreApiConfig.currentUserRole;
                    requestConfig.headers['Authorization'] = 'Bearer ' + this.coreApiConfig.jwtToken;
                } else {
                    //TODO MGA !!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                }
            } else {
                //TODO MGA : wait for data to be populated if ongoing call, otherwise call Ctrl ?
            }

            // TODO MGA : type casting, is it okay or not ? better approach ?
            (<any>this.$window).preventBlockUI = true;

            //TODO MGA : currently done in module configuration on module init, using httpProvider.defaults/ To discuss where to set this up
            //TODO MGA : set this always or only for WebAPI calls ?
            //requestConfig.headers['X-Requested-With'] = 'XMLHttpRequest';

            return requestConfig;
        }

        /**
         * Success handler
         * TODO MGA : what is url used for ???
         * @param url 
         * @returns {} 
         */
        private success = <T>(url: string): (promiseCallback: ng.IHttpPromiseCallbackArg<T>) => T | ng.IPromise<any> => {

            // JS trick : capture url variable inside closure scope to store it for callback which cannot be called with 2 arguments
            return (promiseCallback: ng.IHttpPromiseCallbackArg<T>): T | ng.IPromise<any> => {

                if (!promiseCallback || !promiseCallback.data) {
                    //TODO MGA: think about this ... May not be accurate ? or may not be an error if return type is null in case no data found
                    //response.status = 503;
                    this.$log.error(promiseCallback);
                    this.toaster.warning('Unexpected response from the server', 'Call successfull, but no data found');

                    //TODO MGA : find out how to handle that as to expectd return type ?
                    return this.$q.reject(promiseCallback); // Reject promise if not well-formed data
                }

                this.$log.debug(promiseCallback);

                return promiseCallback.data; // return only the data expected for caller
            };
        }

        /**
         * Error handler
         * @param response 
         * @returns {} 
         */
        private error = (response: ng.IHttpPromiseCallbackArg<any>): ng.IPromise<ng.IHttpPromiseCallbackArg<any>> => { // do something on error

            if (!response || !response.data) {
                response.data = 'Server not responding';
                response.status = 503;
            }

            var message = String(response.data) + '\n Status: ' + response.status.toString();

            this.toaster.error('Server response error', message);

            this.$log.error(response);

            // We don't recover from error, so we propagate it : below handlers have the choice of reading the error with an error handler or not. See $q promises behavior here : https://github.com/kriskowal/q
            // This behavior is desired so that we show error inside specific server communication modals at specific places in the app, otherwise show a global alert message, or even do not show anything if not necessary (do not ad an error handler in below handlers of this promise).
            return this.$q.reject(response);
        }

        /**
         * Function called at the end of an ajax call, regardless of it's success or failure.
         * @param response
         */
        private finally = (): void => {
            // TODO MGA : type casting, is it okay or not ? better approach ?
            (<any>this.$window).preventBlockUI = false;
        }

        private getCurrentSessionID() {

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
        }

        // TODO MGA : using method from Layout.js : to document to not handle duplicate code !!
        //TODO MGA : make it capable of handling full URLs outside of OE : do not use ?? how to ?
        private getUrlPath(actionIsOnSameController) {

            var baseUrlRegex = /(\/\w+\/\(S\(\w+\)\))\/\w+/;
            var url = this.$window.location.pathname;
            var baseUrlMatches = baseUrlRegex.exec(url);

            if (baseUrlMatches.length && baseUrlMatches.length === 2) {

                var baseUrlWithControllerName = baseUrlMatches[0];
                var baseUrl = baseUrlMatches[1];

                if (actionIsOnSameController) {
                    return baseUrlWithControllerName;
                } else {
                    return baseUrl;
                }
            }

            return '';
        }

        //#endregion
    }

    //TODO MGA : default HTTP provider configuration to improve & mutuaize with DA
    angular.module('ng.httpWrapper', ['toaster', 'ngFileUpload'])
        // TODO MGA : May need to be refactored to use common logic with dashboard service : see how to mutualize as much code as possible between the two
        // TODO MGA : this may not need to be a dedicated service, it can also be incorporated into the httpInterceptor. Decide best approach depending on planned use.
        .config(['$httpProvider', ($httpProvider: ng.IHttpProvider) => {
            $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
        }])
        .service('httpWrapperService', HttpWrapperService);
}