import { PolymerElement } from '@polymer/polymer';

export {EtoolsRequestError};

declare function EtoolsRequestError(): void;

interface Constructor<T> {
  new(...args: any[]): T;
}


/**
 * A behavior that will allow you to make a request in any Polymer element you need.
 */
declare function EtoolsAjaxRequestMixin<T extends Constructor<PolymerElement>>(base: T): {
  new (...args: any[]): {
    readonly lastAjaxRequest: object|null|undefined;
    readonly activeAjaxRequests: any[]|null|undefined;
    readonly reqProgress: object|null|undefined;
    checkReqProgress: object|null|undefined;

    /**
   * Check for cached data if needed, if no cached data then fire new request
   * returns Promise
   */
   sendRequest(reqConfig: any, activeReqKey: any): any;
   getActiveRequestByKey(key: any): any;
   abortRequestByKey(key: any): void;
   abortActiveRequest(activeReqMapObj: any): void;

  }
} & T & Constructor<PolymerElement>;

export default EtoolsAjaxRequestMixin;
