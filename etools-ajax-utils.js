/* eslint-disable linebreak-style */
import './scripts/es6-obj-assign-polyfil.js';
import {logError} from '@unicef-polymer/etools-behaviors/etools-logging';

export function getCsrfHeader(csrfCheck, method) {
  if (!!method && csrfSafeMethod(method)) {
    return {};
  }
  let csrfHeaders = {};
  if (csrfCheck !== 'disabled') {
    let csrfToken = _getCSRFCookie();

    if (csrfToken) {
      csrfHeaders['x-csrftoken'] = csrfToken;
    }
  }
  return csrfHeaders;
}

export function csrfSafeMethod(method) {
  // these HTTP methods do not require CSRF protection
  return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}

function _getCSRFCookie() {
  // check for a csrftoken cookie and return its value
  let csrfCookieName = 'csrftoken';
  let csrfToken = null;
  if (document.cookie && document.cookie !== '') {
    let cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, csrfCookieName.length + 1) === (csrfCookieName + '=')) {
        csrfToken = decodeURIComponent(cookie.substring(csrfCookieName.length + 1));
        break;
      }
    }
  }
  return csrfToken;
}

export function tryJsonParse(response) {
  try {
    return JSON.parse(response);
  } catch (e) {
    return response;
  }
}

export function getClientConfiguredHeaders(additionalHeaders) {
  let header;
  let clientHeaders = {};
  if (additionalHeaders && additionalHeaders instanceof Object) {
    /* eslint-disable guard-for-in */
    for (header in additionalHeaders) {
      clientHeaders[header] = additionalHeaders[header].toString();
    }
    /* eslint-enable guard-for-in */
  }
  return clientHeaders;
}


export async function getRequestHeaders(reqConfig) {
  let headers = {};
  headers['content-type'] = determineContentType(reqConfig.body);
  let authHeader = await getAuthorizationHeader(reqConfig.endpoint);
  headers = Object.assign({},
    headers,
    getClientConfiguredHeaders(reqConfig.headers),
    authHeader,
    getCsrfHeader(reqConfig.csrfCheck, reqConfig.method));

  return headers;
}

async function getAuthorizationHeader(endpoint) {
  if (endpoint.token_key) {
    let token = localStorage.getItem(endpoint.token_key);
    if (window.AppMsalInstance) {
      if (!window.AppMsalInstance.tokenIsValid(token)) {
        try {
          token = await window.AppMsalInstance.acquireTokenSilent(endpoint.scopes);
        } catch (err) {
          window.location.reload(true);
        }
      }
    }
    return {
      'Authorization': 'JWT ' + token
    };
  }

  return {};
}

/**
* Content-Type set here can be overridden later
* by headers sent from the client
*/
export function determineContentType(body) {
  let contentType = 'application/json';

  if (typeof body === 'string') {
    contentType = 'application/x-www-form-urlencoded';
  }

  return contentType;
}


export function isNonEmptyObject(obj) {
  return obj && typeof obj === 'object' && Object.keys(obj).length > 0;
}

/**
 *
 * @param {
 * {
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
export async function getIronRequestConfigOptions(etoolAjaxReqConfig) {
  etoolAjaxReqConfig.method = etoolAjaxReqConfig.method || 'GET';
  let headers = await getRequestHeaders(etoolAjaxReqConfig);
  return {
    url: etoolAjaxReqConfig.endpoint.url,
    method: etoolAjaxReqConfig.method,
    headers,
    body: etoolAjaxReqConfig.body || {},
    async: !etoolAjaxReqConfig.sync,
    handleAs: etoolAjaxReqConfig.handleAs || 'json',
    jsonPrefix: etoolAjaxReqConfig.jsonPrefix || '',
    withCredentials: !!etoolAjaxReqConfig.withCredentials,
    timeout: etoolAjaxReqConfig.timeout || 0,
    rejectWithRequest: true
  };
}

