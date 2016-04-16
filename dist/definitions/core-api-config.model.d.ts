/// <reference path="../typings/tsd.d.ts" />
declare module bluesky.core.models {
    /**
     * TODO MGA : export an interface too ?
     */
    class CoreApiConfig {
        coreApiUrl: string;
        jwtToken: string;
        currentUserRole: string;
        constructor(coreApiUrl: string, jwtToken: string, currentUserRole: string);
    }
}
