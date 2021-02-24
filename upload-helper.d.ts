export declare function getActiveXhrRequests(): any;
export declare async function upload(config: UploadConfig, rawFile: File | Blob, filename: string, onProgressCallback?: Function): Promise<any>;
export declare function abortActiveRequests(activeReqKeys: string[]);

