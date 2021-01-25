export interface EtoolsRequestConfig {
  endpoint: EtoolsRequestEndpoint,
  body?: any,
  method?: string,
  headers?: any,
  csrfCheck?: string // 'disabled',
  /**
   * Set the timeout flag on the request
   */
  timeout?: number,
  /**
   * Toggle whether XHR is synchronous or asynchronous.
   * Don't change this to true unless You Know What You Are Doing
   */
  sync?: boolean,
  /**
   * Specifies what data to store in the response property,
   * and to deliver as event.detail.response in response events.
   * One of:
   * text: uses XHR.responseText.
   * xml: uses XHR.responseXML.
   * json: uses XHR.responseText parsed as JSON.
   * arraybuffer: uses XHR.response.
   * blob: uses XHR.response.
   * document: uses XHR.response.
   */
  handleAs?: string,
  /**
   * Prefix to be stripped from a JSON response before parsing it.
   * In order to prevent an attack using CSRF with Array responses
   * (http://haacked.com/archive/2008/11/20/anatomy-of-a-subtle-json-vulnerability.aspx/)
   * many backends will mitigate this by prefixing all JSON response bodies with a string
   * that would be nonsensical to a JavaScript parser.
   */
  jsonPrefix?: string,
  /**
   * Changes the completes promise chain from generateRequest to reject with an object
   * containing the original request, as well an error message.
   * If false (default), the promise rejects with an error message only.
   */
  rejectWithRequest?: boolean,
  withCredentials?: boolean,
  params?: object
}


export type EtoolsRequestEndpoint = {
  url: string,
  exp?: number,
  cacheTableName?: string,
  cachingKey?: string,
  token_key?: string
}

declare function sendRequest(etoolsReqConfig: EtoolsRequestConfig, requestKey?: string): Promise<any>;
