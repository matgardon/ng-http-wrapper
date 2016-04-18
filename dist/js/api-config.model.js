///<reference path="_app_references.ts" />
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwaS1jb25maWcubW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMENBQTBDO0FBQzFDLElBQU8sT0FBTyxDQVliO0FBWkQsV0FBTyxPQUFPO0lBQUMsSUFBQSxJQUFJLENBWWxCO0lBWmMsV0FBQSxJQUFJO1FBQUMsSUFBQSxNQUFNLENBWXpCO1FBWm1CLFdBQUEsTUFBTSxFQUFDLENBQUM7WUFDeEI7O2VBRUc7WUFDSDtnQkFDSSxtQkFDVyxVQUFrQjtvQkFDekIsbUZBQW1GO29CQUM1RSxRQUFnQixFQUNoQixlQUF1QjtvQkFIdkIsZUFBVSxHQUFWLFVBQVUsQ0FBUTtvQkFFbEIsYUFBUSxHQUFSLFFBQVEsQ0FBUTtvQkFDaEIsb0JBQWUsR0FBZixlQUFlLENBQVE7Z0JBQzlCLENBQUM7Z0JBQ1QsZ0JBQUM7WUFBRCxDQVBBLEFBT0MsSUFBQTtZQVBZLGdCQUFTLFlBT3JCLENBQUE7UUFDTCxDQUFDLEVBWm1CLE1BQU0sR0FBTixXQUFNLEtBQU4sV0FBTSxRQVl6QjtJQUFELENBQUMsRUFaYyxJQUFJLEdBQUosWUFBSSxLQUFKLFlBQUksUUFZbEI7QUFBRCxDQUFDLEVBWk0sT0FBTyxLQUFQLE9BQU8sUUFZYiIsImZpbGUiOiJhcGktY29uZmlnLm1vZGVsLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8vPHJlZmVyZW5jZSBwYXRoPVwiX2FwcF9yZWZlcmVuY2VzLnRzXCIgLz5cclxubW9kdWxlIGJsdWVza3kuY29yZS5tb2RlbHMge1xyXG4gICAgLyoqXHJcbiAgICAgKiBUT0RPIE1HQSA6IGV4cG9ydCBhbiBpbnRlcmZhY2UgdG9vID9cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEFwaUNvbmZpZyB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoXHJcbiAgICAgICAgICAgIHB1YmxpYyBjb3JlQXBpVXJsOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIC8vVE9ETyBNR0EgOiB0byBpbmplY3QgYXMgZ2VuZXJpYyBsaXN0IG9mIGN1c3RvbSBoZWFkZXJzIHRvIHBhc3MgdG8gJGh0dHAgc2VydmljZSA/XHJcbiAgICAgICAgICAgIHB1YmxpYyBqd3RUb2tlbjogc3RyaW5nLFxyXG4gICAgICAgICAgICBwdWJsaWMgY3VycmVudFVzZXJSb2xlOiBzdHJpbmdcclxuICAgICAgICApIHsgfVxyXG4gICAgfVxyXG59Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
