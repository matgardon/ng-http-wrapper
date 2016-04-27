var bluesky;
(function (bluesky) {
    var core;
    (function (core) {
        var models;
        (function (models) {
            /**
             * TODO MGA : export an interface too ?
             */
            var ApiConfig = (function () {
                function ApiConfig(coreApiUrl, 
                    //TODO MGA : to inject as generic list of custom headers to pass to $http service ?
                    jwtToken, currentUserRole) {
                    this.coreApiUrl = coreApiUrl;
                    this.jwtToken = jwtToken;
                    this.currentUserRole = currentUserRole;
                }
                return ApiConfig;
            }());
            models.ApiConfig = ApiConfig;
        })(models = core.models || (core.models = {}));
    })(core = bluesky.core || (bluesky.core = {}));
})(bluesky || (bluesky = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwaS1jb25maWcubW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBVSxPQUFPLENBWWhCO0FBWkQsV0FBVSxPQUFPO0lBQUMsSUFBQSxJQUFJLENBWXJCO0lBWmlCLFdBQUEsSUFBSTtRQUFDLElBQUEsTUFBTSxDQVk1QjtRQVpzQixXQUFBLE1BQU0sRUFBQyxDQUFDO1lBQzNCOztlQUVHO1lBQ0g7Z0JBQ0ksbUJBQ1csVUFBa0I7b0JBQ3pCLG1GQUFtRjtvQkFDNUUsUUFBZ0IsRUFDaEIsZUFBdUI7b0JBSHZCLGVBQVUsR0FBVixVQUFVLENBQVE7b0JBRWxCLGFBQVEsR0FBUixRQUFRLENBQVE7b0JBQ2hCLG9CQUFlLEdBQWYsZUFBZSxDQUFRO2dCQUM5QixDQUFDO2dCQUNULGdCQUFDO1lBQUQsQ0FQQSxBQU9DLElBQUE7WUFQWSxnQkFBUyxZQU9yQixDQUFBO1FBQ0wsQ0FBQyxFQVpzQixNQUFNLEdBQU4sV0FBTSxLQUFOLFdBQU0sUUFZNUI7SUFBRCxDQUFDLEVBWmlCLElBQUksR0FBSixZQUFJLEtBQUosWUFBSSxRQVlyQjtBQUFELENBQUMsRUFaUyxPQUFPLEtBQVAsT0FBTyxRQVloQiIsImZpbGUiOiJhcGktY29uZmlnLm1vZGVsLmpzIiwic291cmNlc0NvbnRlbnQiOlsibmFtZXNwYWNlIGJsdWVza3kuY29yZS5tb2RlbHMge1xyXG4gICAgLyoqXHJcbiAgICAgKiBUT0RPIE1HQSA6IGV4cG9ydCBhbiBpbnRlcmZhY2UgdG9vID9cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEFwaUNvbmZpZyB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgIHB1YmxpYyBjb3JlQXBpVXJsOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiB0byBpbmplY3QgYXMgZ2VuZXJpYyBsaXN0IG9mIGN1c3RvbSBoZWFkZXJzIHRvIHBhc3MgdG8gJGh0dHAgc2VydmljZSA/XHJcbiAgICAgICAgICAgIHB1YmxpYyBqd3RUb2tlbjogc3RyaW5nLFxyXG4gICAgICAgICAgICBwdWJsaWMgY3VycmVudFVzZXJSb2xlOiBzdHJpbmdcclxuICAgICAgICApIHsgfVxyXG4gICAgfVxyXG59Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
