namespace bluesky.core.models {
    export class FileContent {
        constructor(
            public name: string,
            public size: number,
            public type: string,
            public content: ArrayBuffer
        ) { }
    }
}