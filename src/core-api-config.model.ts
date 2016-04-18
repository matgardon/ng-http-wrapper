///<reference path="../typings/tsd.d.ts" />
module bluesky.core.models {
    /**
     * TODO MGA : export an interface too ?
     */
    export class CoreApiConfig {
        constructor(
            public coreApiUrl: string,
            //TODO MGA : to inject as generic list of custom headers to pass to $http service ?
            public jwtToken: string,
            public currentUserRole: string
        ) { }
    }
}