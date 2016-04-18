/// <reference path="../typings/tsd.d.ts" />
declare module bluesky.core.services {
    import CoreApiConfig = bluesky.core.models.CoreApiConfig;
    interface IHttpWrapperConfig extends ng.IRequestConfig {
        coreApiEndpoint?: boolean;
        file?: File;
        uploadInBase64Json?: boolean;
        uploadProgress?: () => any;
        disableXmlHttpRequestHeader?: boolean;
    }
    interface IHttpWrapperService {
        coreApiConfig: CoreApiConfig;
        get<T>(url: string, config?: IHttpWrapperConfig): ng.IPromise<T>;
        delete<T>(url: string, config?: IHttpWrapperConfig): ng.IPromise<T>;
        post<T>(url: string, data: any, config?: IHttpWrapperConfig): ng.IPromise<T>;
        put<T>(url: string, data: any, config?: IHttpWrapperConfig): ng.IPromise<T>;
        upload<T>(url: string, file: File, config?: IHttpWrapperConfig): ng.IPromise<T>;
    }
    /**
     * TODO MGA : this may not need to be a dedicated service, it can also be incorporated into the httpInterceptor. Decide best approach depending on planned use.
     */
    class HttpWrapperService implements IHttpWrapperService {
        private $http;
        private $window;
        private $log;
        private $q;
        private $location;
        private Upload;
        private toaster;
        private initPromise;
        coreApiConfig: CoreApiConfig;
        constructor($http: ng.IHttpService, $window: ng.IWindowService, $log: ng.ILogService, $q: ng.IQService, $location: ng.ILocationService, Upload: ng.angularFileUpload.IUploadService, toaster: ngtoaster.IToasterService);
        ajax<T>(config: IHttpWrapperConfig): ng.IPromise<T>;
        get<T>(url: string, config?: IHttpWrapperConfig): ng.IPromise<T>;
        delete<T>(url: string, config?: IHttpWrapperConfig): ng.IPromise<T>;
        post<T>(url: string, data: any, config?: IHttpWrapperConfig): ng.IPromise<T>;
        put<T>(url: string, data: any, config?: IHttpWrapperConfig): ng.IPromise<T>;
        upload<T>(url: string, file: File, config?: IHttpWrapperConfig): ng.IPromise<T>;
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
        private tryGetFullUrl(urlInput);
        private getUrlPath(actionIsOnSameController);
        private getCurrentSessionID();
    }
}
