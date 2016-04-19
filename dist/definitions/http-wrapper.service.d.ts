/// <reference path="_app_references.d.ts" />
declare module bluesky.core.services {
    import ApiConfig = bluesky.core.models.ApiConfig;
    interface IHttpWrapperConfig extends ng.IRequestShortcutConfig {
        /**
         * main API endpoint to use as default one if url is not full.
         */
        apiEndpoint?: boolean;
        file?: File;
        uploadInBase64Json?: boolean;
        uploadProgress?: () => any;
        disableXmlHttpRequestHeader?: boolean;
    }
    interface IHttpWrapperService {
        /**
         * All srv-side configuration of main API provided by the domain from which this script was loaded, @ the url 'CoreApiAuth/GetCoreApiConfig'.
         * TODO MGA fix hard coded path.
         * This configuration data is loaded upon initialization of this service (to be used as a singleton in the app). All other web calls are blocked as long as this one is not finished.
         */
        apiConfig: ApiConfig;
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
        apiConfig: ApiConfig;
        constructor($http: ng.IHttpService, $window: ng.IWindowService, $log: ng.ILogService, $q: ng.IQService, $location: ng.ILocationService, Upload: ng.angularFileUpload.IUploadService, toaster: ngtoaster.IToasterService);
        get<T>(url: string, config?: IHttpWrapperConfig): ng.IPromise<T>;
        delete<T>(url: string, config?: IHttpWrapperConfig): ng.IPromise<T>;
        post<T>(url: string, data: any, config?: IHttpWrapperConfig): ng.IPromise<T>;
        put<T>(url: string, data: any, config?: IHttpWrapperConfig): ng.IPromise<T>;
        upload<T>(url: string, file: File, config?: IHttpWrapperConfig): ng.IPromise<T>;
        /**
         * Utility method.
         * Main caller that all wrapper calls (get, delete, post, put) must use to share common behavior.
         * @param config
         */
        private ajax<T>(method, url, config?);
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
