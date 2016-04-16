///<reference path="../typings/tsd.d.ts" />
module bluesky.core.models {
    /**
     * TODO MGA : export an interface too ?
     */
    export class CoreApiConfig {
        constructor(
            public coreApiUrl: string,
            public jwtToken: string,
            public currentUserRole: string
        ) { }
    }
}