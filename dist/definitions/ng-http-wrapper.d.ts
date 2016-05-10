declare namespace bluesky.core.models {
    /**
     * TODO MGA : export an interface too ?
     */
    class ApiConfig {
        coreApiUrl: string;
        jwtToken: string;
        currentUserRole: string;
        constructor(coreApiUrl: string, jwtToken: string, currentUserRole: string);
    }
}

declare namespace bluesky.core.models {
    class FileContent {
        name: string;
        size: number;
        type: string;
        content: ArrayBuffer;
        constructor(name: string, size: number, type: string, content: ArrayBuffer);
    }
}

declare namespace bluesky.core.services {
    import ApiConfig = bluesky.core.models.ApiConfig;
    import FileContent = bluesky.core.models.FileContent;
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
        getFile(url: string, config?: IHttpWrapperConfig): ng.IPromise<FileContent>;
        buildUrlFromContext(urlInput: string): string;
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
         * This method is used to download a file in the form of a byte-stream from an endpoint and wrap it into a FileContent object with name, type & size properties read from the HTTP response headers of the serveur.
         * It is the responsability of the consumer to do something with the wrapped byteArray (for example download the file, or show it inside the webPage etc).
         * @param url
         * @param expectedName
         * @param expectedSize
         * @param expectedType
         * @param config
         */
        getFile(url: string, config?: IHttpWrapperConfig): ng.IPromise<FileContent>;
        /**
         * Tries to parse the input url :
         * If it seems to be a full URL, then return as is (considers it external Url)
         * Otherwise, tries to find the base URL of the current BlueSky app with or without the included Controller and returns the full Url
         * @param urlInput : TODO MGA: document different kind of urls that this method can take as input (full, partial etc)
         */
        buildUrlFromContext(urlInput: string): string;
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
         * Success handler.
         * Captures the input parameters at the moment of its declaration & return the real handler to be called upon promise completion.
         * Input parameters:
         *  - callingConfig: configuration used to make the ajax call, in case the returned promise is null/empty and doesn't contain necessary data for debugging.
         *  - getCompleteResponseObject: flag indication if we must return the full response object along with headers and status or only the inner data. By default & if not specified, only returns inner data.
         */
        private onSuccess;
        /**
         * Error handler
         * @param httpPromise
         * @returns {}
         */
        private onError;
        /**
         * Function called at the end of an ajax call, regardless of it's success or failure.
         * @param response
         */
        private finally;
        private getUrlPath(actionIsOnSameController);
        private getCurrentSessionID();
        /**
         * Trim the content-disposition header to return only the filename.
         * @param contentDispositionHeader
         */
        private getFileNameFromHeaderContentDisposition(contentDispositionHeader);
    }
}
