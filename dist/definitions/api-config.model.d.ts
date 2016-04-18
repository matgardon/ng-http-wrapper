/// <reference path="_app_references.d.ts" />
declare module bluesky.core.models {
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
