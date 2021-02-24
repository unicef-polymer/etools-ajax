export interface IronRequestConfig {
  url: string,
  method?: string,
  async?: boolean,
  body?: ArrayBuffer | ArrayBufferView | Blob | Document | FormData | string | object | null,
  headers?: object | null,
  handleAs?: string,
  jsonPrefix?: string,
  withCredentials?: boolean,
  timeout?: number,
  rejectWithRequest?: boolean
}

export declare function doHttpRequest(ironRequestConfigOptions: IronRequestConfig, requestKey: string): Promise<any>
export declare function abortRequestByKey(key: string): any;
