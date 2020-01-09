/* eslint-disable linebreak-style */
import {tryJsonParse, getRequestHeaders} from './etools-ajax-utils';
import {logWarn} from '@unicef-polymer/etools-behaviors/etools-logging';
import '@polymer/iron-ajax/iron-request.js';

let activeAjaxRequests = [];
let requestsProgress = [];

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
export function doHttpRequest(ironRequestConfigOptions, requestKey, checkRequestProgress) {

  let ironRequestElement = document.createElement('iron-request'); // typeof IronRequestElement
  ironRequestElement.send(ironRequestConfigOptions);

  _checkRequestProgress(ironRequestElement, requestKey, checkRequestProgress);
  _addToActiveAjaxRequests(requestKey, ironRequestElement);

  return ironRequestElement.completes.then((request) => {
    let responseData = request.response;

    if (ironRequestConfigOptions.handleAs === 'json' && typeof responseData === 'string') {
      responseData = tryJsonParse(responseData);
    }

    _cleanUp(checkRequestProgress, requestKey);

    return responseData;
  }).catch((err) => {
    const error = err.error;
    const request = err.request;
    if (!request.aborted && request.xhr.status === 0) {
      // not an error, this is an asynchronous request that is not completed yet
      return;
    }

    _cleanUp(checkRequestProgress, requestKey);

    // check request aborted, no error handling in this case
    if (!request.aborted) {
      throw new EtoolsRequestError(error, request.xhr.status, request.xhr.statusText, request.xhr.response);
    } else {
      throw new EtoolsRequestError(error, 0, 'Request aborted', null);
    }
  });
}

function _cleanUp(checkRequestProgress, requestKey) {
  _removeActiveRequestFromList(requestKey);
  _removeProgressInfo(checkRequestProgress, requestKey);
}

export function EtoolsRequestError(error, statusCode, statusText, response) {
  this.error = error;
  this.status = statusCode;
  this.statusText = statusText;
  this.response = tryJsonParse(response);
}

/**
 *
 * @param {
 *  {
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
 * }
 * } reqConfig
 */
export function getIronRequestConfigOptions(reqConfig) {
  reqConfig.method = reqConfig.method || 'GET';

  return {
    url: reqConfig.endpoint.url,
    method: reqConfig.method,
    headers: getRequestHeaders(reqConfig),
    body: reqConfig.body || {},
    async: !reqConfig.sync,
    handleAs: reqConfig.handleAs || 'json',
    jsonPrefix: reqConfig.jsonPrefix || '',
    withCredentials: !!reqConfig.withCredentials,
    timeout: reqConfig.timeout || 0,
    rejectWithRequest: true
  };
}

function _addToActiveAjaxRequests(key, request) {
  if (key) {
    activeAjaxRequests.push({key: key, request: request});
  }
}

function _removeActiveRequestFromList(key) {
  if (key) {
    activeAjaxRequests = activeAjaxRequests.filter(a => a.key !== key);
  }
}

function getActiveRequestByKey(key) {
  return activeAjaxRequests.find(a => a.key === key);
}

export function abortRequestByKey(key) {
  // abort request by key
  if (key) {
    let activeReq = getActiveRequestByKey(key);
    if (activeReq) {
      abortRequest(activeReq);
    } else {
      logWarn('No active request found by this key: ' + key + '.',
        'EtoolsAjaxRequestMixin:abortRequest');
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


function _checkRequestProgress(request, requestKey, checkProgress) {
  if (!checkProgress || !request || !request.progress) {
    return;
  }
  let progressInfo = {key: requestKey, progress: 0, interval: null};
  requestsProgress.push(progressInfo);

  progressInfo.interval = setInterval(() => {
    if (request.progress.constructor === Object && Object.keys(request.progress).length > 0) {
      requestsProgress[requestKey] = request.progress;

      if (!request.progress.lengthComputable || request.progress.loaded === request.progress.total) {
        clearInterval(progressInfo.interval);
      }
    }
  }, 500);
}

function _removeProgressInfo(checkProgress, requestKey) {
  if (!checkProgress || !requestKey || !requestsProgress || !requestsProgress.length) {
    return;
  }
  let index = requestsProgress.findIndex(p => p.key == requestKey);
  if (index > -1) {
    requestsProgress.splice(index, 1);
  }
}

export function getRequestProgress(requestKey) {
  if (!requestKey) {
    logWarn('You must provide an activeRequestKey string name when calling sendRequest', 'EtoolsAjax');
  }
  let progressInfo = requestsProgress.find(p => p.key == requestKey);
  if (!progressInfo) {
    logWarn('No progress data available', 'EtoolsAjax');
  }
  return progressInfo.progress;
}
