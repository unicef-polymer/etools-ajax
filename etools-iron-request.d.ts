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

declare function doHttpRequest(ironRequestConfigOptions: IronRequestConfig, requestKey: string,
  checkRequestProgress: boolean): Promise<any>
declare function abortRequestByKey(key);
declare function getRequestProgress(requestKey): Number;

