///<reference path="../typings/tsd.d.ts" />
var bluesky;
(function (bluesky) {
    var core;
    (function (core) {
        var models;
        (function (models) {
            /**
             * TODO MGA : export an interface too ?
             */
            var CoreApiConfig = (function () {
                function CoreApiConfig(coreApiUrl, jwtToken, currentUserRole) {
                    this.coreApiUrl = coreApiUrl;
                    this.jwtToken = jwtToken;
                    this.currentUserRole = currentUserRole;
                }
                return CoreApiConfig;
            }());
            models.CoreApiConfig = CoreApiConfig;
        })(models = core.models || (core.models = {}));
    })(core = bluesky.core || (bluesky.core = {}));
})(bluesky || (bluesky = {}));

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUtYXBpLWNvbmZpZy5tb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwyQ0FBMkM7QUFDM0MsSUFBTyxPQUFPLENBV2I7QUFYRCxXQUFPLE9BQU87SUFBQyxJQUFBLElBQUksQ0FXbEI7SUFYYyxXQUFBLElBQUk7UUFBQyxJQUFBLE1BQU0sQ0FXekI7UUFYbUIsV0FBQSxNQUFNLEVBQUMsQ0FBQztZQUN4Qjs7ZUFFRztZQUNIO2dCQUNJLHVCQUNXLFVBQWtCLEVBQ2xCLFFBQWdCLEVBQ2hCLGVBQXVCO29CQUZ2QixlQUFVLEdBQVYsVUFBVSxDQUFRO29CQUNsQixhQUFRLEdBQVIsUUFBUSxDQUFRO29CQUNoQixvQkFBZSxHQUFmLGVBQWUsQ0FBUTtnQkFDOUIsQ0FBQztnQkFDVCxvQkFBQztZQUFELENBTkEsQUFNQyxJQUFBO1lBTlksb0JBQWEsZ0JBTXpCLENBQUE7UUFDTCxDQUFDLEVBWG1CLE1BQU0sR0FBTixXQUFNLEtBQU4sV0FBTSxRQVd6QjtJQUFELENBQUMsRUFYYyxJQUFJLEdBQUosWUFBSSxLQUFKLFlBQUksUUFXbEI7QUFBRCxDQUFDLEVBWE0sT0FBTyxLQUFQLE9BQU8sUUFXYiIsImZpbGUiOiJjb3JlLWFwaS1jb25maWcubW9kZWwuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLy88cmVmZXJlbmNlIHBhdGg9XCIuLi90eXBpbmdzL3RzZC5kLnRzXCIgLz5cclxubW9kdWxlIGJsdWVza3kuY29yZS5tb2RlbHMge1xyXG4gICAgLyoqXHJcbiAgICAgKiBUT0RPIE1HQSA6IGV4cG9ydCBhbiBpbnRlcmZhY2UgdG9vID9cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIENvcmVBcGlDb25maWcge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKFxyXG4gICAgICAgICAgICBwdWJsaWMgY29yZUFwaVVybDogc3RyaW5nLFxyXG4gICAgICAgICAgICBwdWJsaWMgand0VG9rZW46IHN0cmluZyxcclxuICAgICAgICAgICAgcHVibGljIGN1cnJlbnRVc2VyUm9sZTogc3RyaW5nXHJcbiAgICAgICAgKSB7IH1cclxuICAgIH1cclxufSJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
