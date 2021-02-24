/* eslint-disable linebreak-style */
import {tryJsonParse} from './etools-ajax-utils';
import {logWarn} from '@unicef-polymer/etools-behaviors/etools-logging';
import '@polymer/iron-ajax/iron-request.js';

let activeAjaxRequests = [];

/**
 * Fire new http request using iron-request
 * @param {
 *   url: string,
 *   method?: string,
 *   async?: boolean,
 *   body?: ArrayBuffer | ArrayBufferView | Blob | Document | FormData | string | object | null,
 *   headers?: object | null,
 *   handleAs?: string,
 *   jsonPrefix?: string,
 *   withCredentials?: boolean,
 *   timeout?: number,
 *   rejectWithRequest?: boolean
 * } ironRequestConfigOptions
 * @param {string} requestKey
 */
export function doHttpRequest(ironRequestConfigOptions, requestKey) {
  const ironRequestElement = document.createElement('iron-request'); // typeof IronRequestElement
  ironRequestElement.send(ironRequestConfigOptions);

  _addToActiveAjaxRequests(requestKey, ironRequestElement);

  return ironRequestElement.completes
    .then((request) => {
      let responseData = request.response;

      if (ironRequestConfigOptions.handleAs === 'json' && typeof responseData === 'string') {
        responseData = tryJsonParse(responseData);
      }

      _cleanUp(requestKey);

      return responseData;
    })
    .catch((err) => {
      const error = err.error;
      const request = err.request;
      if (!request.aborted && request.xhr.status === 0) {
        // not an error, this is an asynchronous request that is not completed yet
        return;
      }

      _cleanUp(requestKey);

      // check request aborted, no error handling in this case
      if (!request.aborted) {
        throw new EtoolsRequestError(error, request.xhr.status, request.xhr.statusText, request.xhr.response);
      } else {
        throw new EtoolsRequestError(error, 0, 'Request aborted', null);
      }
    });
}

function _cleanUp(requestKey) {
  _removeActiveRequestFromList(requestKey);
}

export function EtoolsRequestError(error, statusCode, statusText, response) {
  this.error = error;
  this.status = statusCode;
  this.statusText = statusText;
  this.response = tryJsonParse(response);
}

function _addToActiveAjaxRequests(key, request) {
  if (key) {
    activeAjaxRequests.push({key: key, request: request});
  }
}

function _removeActiveRequestFromList(key) {
  if (key) {
    activeAjaxRequests = activeAjaxRequests.filter((a) => a.key !== key);
  }
}

function getActiveRequestByKey(key) {
  return activeAjaxRequests.find((a) => a.key === key);
}

export function abortRequestByKey(key) {
  // abort request by key
  if (key) {
    const activeReq = getActiveRequestByKey(key);
    if (activeReq) {
      abortRequest(activeReq);
    } else {
      logWarn('No active request found by this key: ' + key + '.', 'EtoolsAjaxRequestMixin:abortRequest');
    }
  } else {
    logWarn('Aborting request by key requires a key.', 'EtoolsAjax:abortRequestByKey');
  }
}

function abortRequest(activeReqMapObj) {
  if (activeReqMapObj.request) {
    activeReqMapObj.request.abort();
  }
}
