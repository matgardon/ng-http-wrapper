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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwaS1jb25maWcubW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsSUFBTyxPQUFPLENBWWI7QUFaRCxXQUFPLE9BQU87SUFBQyxJQUFBLElBQUksQ0FZbEI7SUFaYyxXQUFBLElBQUk7UUFBQyxJQUFBLE1BQU0sQ0FZekI7UUFabUIsV0FBQSxNQUFNLEVBQUMsQ0FBQztZQUN4Qjs7ZUFFRztZQUNIO2dCQUNJLG1CQUNXLFVBQWtCO29CQUN6QixtRkFBbUY7b0JBQzVFLFFBQWdCLEVBQ2hCLGVBQXVCO29CQUh2QixlQUFVLEdBQVYsVUFBVSxDQUFRO29CQUVsQixhQUFRLEdBQVIsUUFBUSxDQUFRO29CQUNoQixvQkFBZSxHQUFmLGVBQWUsQ0FBUTtnQkFDOUIsQ0FBQztnQkFDVCxnQkFBQztZQUFELENBUEEsQUFPQyxJQUFBO1lBUFksZ0JBQVMsWUFPckIsQ0FBQTtRQUNMLENBQUMsRUFabUIsTUFBTSxHQUFOLFdBQU0sS0FBTixXQUFNLFFBWXpCO0lBQUQsQ0FBQyxFQVpjLElBQUksR0FBSixZQUFJLEtBQUosWUFBSSxRQVlsQjtBQUFELENBQUMsRUFaTSxPQUFPLEtBQVAsT0FBTyxRQVliIiwiZmlsZSI6ImFwaS1jb25maWcubW9kZWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUgYmx1ZXNreS5jb3JlLm1vZGVscyB7XHJcbiAgICAvKipcclxuICAgICAqIFRPRE8gTUdBIDogZXhwb3J0IGFuIGludGVyZmFjZSB0b28gP1xyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgQXBpQ29uZmlnIHtcclxuICAgICAgICBjb25zdHJ1Y3RvcihcclxuICAgICAgICAgICAgcHVibGljIGNvcmVBcGlVcmw6IHN0cmluZyxcclxuICAgICAgICAgICAgLy9UT0RPIE1HQSA6IHRvIGluamVjdCBhcyBnZW5lcmljIGxpc3Qgb2YgY3VzdG9tIGhlYWRlcnMgdG8gcGFzcyB0byAkaHR0cCBzZXJ2aWNlID9cclxuICAgICAgICAgICAgcHVibGljIGp3dFRva2VuOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIHB1YmxpYyBjdXJyZW50VXNlclJvbGU6IHN0cmluZ1xyXG4gICAgICAgICkgeyB9XHJcbiAgICB9XHJcbn0iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
