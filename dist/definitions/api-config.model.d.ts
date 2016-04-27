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
