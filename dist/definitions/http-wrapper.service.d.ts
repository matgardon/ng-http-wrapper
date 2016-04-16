/// <reference path="../typings/tsd.d.ts" />
declare module bluesky.core.services {
    import CoreApiConfig = bluesky.core.models.CoreApiConfig;
    interface IHttpWrapperService {
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
    class HttpWrapperService implements IHttpWrapperService {
        private $http;
        private $window;
        private $log;
        private $q;
        private $location;
        private Upload;
        private toaster;
        private mainPromise;
        coreApiConfig: CoreApiConfig;
        constructor($http: ng.IHttpService, $window: ng.IWindowService, $log: ng.ILogService, $q: ng.IQService, $location: ng.ILocationService, Upload: ng.angularFileUpload.IUploadService, toaster: ngtoaster.IToasterService);
        get<T>(url: string, coreApiEndpoint?: boolean): ng.IPromise<T>;
        post<T>(url: string, data: any, coreApiEndpoint?: boolean): ng.IPromise<T>;
        /**
         * TODO MGA : mutualize behavior with configureHttpCall for config !
         * @param url
         * @param file
         * @param uploadProgress
         * @returns {}
         */
        upload<T>(url: string, file: File, uploadProgress: () => any, coreApiEndpoint?: boolean, encodeBase64?: boolean): ng.IPromise<T>;
        tryGetFullUrl(urlInput: string): string;
        /**
        * Prepares a {@link ng#$http#config config} object for $http call.
        * The operations include setting default values when not provided, and setting http headers if needed for :
        *  - Ajax calls
        *  - Authorization token
        *  - Current UserRole.
        * @param options
        * @returns {ng.$http.config} the configuration object ready to be injected into a $http call.
        */
        private configureHttpCall;
        /**
         * Success handler
         * TODO MGA : what is url used for ???
         * @param url
         * @returns {}
         */
        private success;
        /**
         * Error handler
         * @param response
         * @returns {}
         */
        private error;
        /**
         * Function called at the end of an ajax call, regardless of it's success or failure.
         * @param response
         */
        private finally;
        private getCurrentSessionID();
        private getUrlPath(actionIsOnSameController);
    }
}
