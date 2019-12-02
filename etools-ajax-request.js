/* eslint-disable linebreak-style */
import {requestIsCacheable, getFromCache, cacheEndpointResponse} from '@unicef-polymer/etools-dexie-caching';
import {doHttpRequest, getIronRequestConfigOptions} from './etools-iron-request';

/**
 * Check endpoint info to see if data is cacheable,
 * if so try to return from cache, if nothing there, fire new request
 * and cache response if applicable
 * returns Promise
 * @param {
 *  endpoint: {
 *          url: string,
 *          exp?: number,
 *          cacheTableName?: string,
 *          cachingKey?: string
 *  },
 *  body: any,
 *  method: string,
 *  headers: any,
 *  csrfCheck: string // 'disabled',
 *  timeout: number,
 *  sync: boolean,
 *  handleAs: string,
 *  jsonPrefix: string,
 *  rejectWithRequest: boolean,
 *  withCredentials: boolean,
 * } reqConfig
 * @param {string} requestKey
 * @param {boolean} checkProgress
 */
export function sendRequest(reqConfig, requestKey, checkProgress) {
  let ironRequestConfigOptions = getIronRequestConfigOptions(reqConfig);

  if (requestIsCacheable(reqConfig.method, reqConfig.endpoint)) {
    return getFromCache(reqConfig.endpoint)
      .catch(() => {
        return doHttpRequest(ironRequestConfigOptions, requestKey, checkProgress)
          .then(response => cacheEndpointResponse(response, reqConfig.endpoint));
      });
  }

  return doHttpRequest(ironRequestConfigOptions, requestKey, checkProgress);
}
