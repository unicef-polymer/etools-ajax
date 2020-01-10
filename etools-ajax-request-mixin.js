/* eslint-disable linebreak-style */
import './scripts/es6-obj-assign-polyfil.js';
import '@polymer/polymer/polymer-legacy.js';
import '@polymer/iron-ajax/iron-request.js';
import {logWarn} from '@unicef-polymer/etools-behaviors/etools-logging';
import EtoolsAjaxDataMixin from './etools-ajax-data-mixin.js';
import {dedupingMixin} from '@polymer/polymer/lib/utils/mixin.js';
import {
  requestIsCacheable, getFromCache,
  cacheEndpointResponse
} from '@unicef-polymer/etools-dexie-caching/etools-dexie-caching';
import {
  csrfSafeMethod, getCsrfHeader, getClientConfiguredHeaders,
  determineContentType, isNonEmptyObject
} from './etools-ajax-utils';

export function EtoolsRequestError(error, statusCode, statusText, response) {
  this.error = error;
  this.status = statusCode;
  this.statusText = statusText;
  this.response = _prepareResponse(response);
}

function _prepareResponse(response) {
  try {
    return JSON.parse(response);
  } catch (e) {
    return response;
  }
}

/* eslint-disable no-unused-vars */
/**
 * A behavior that will allow you to make a request in any Polymer element you need.
 * @polymer
 * @mixinFunction
 * @applies EtoolsAjaxDataMixin
 * @demo demo/index.html
 */
const EtoolsAjaxRequestMixin = dedupingMixin(
  baseClass => class extends EtoolsAjaxDataMixin(baseClass) {
    /* eslint-enable no-unused-vars */

    static get properties() {
      return {
        lastAjaxRequest: {
          type: Object,
          notify: true,
          readOnly: true
        },
        activeAjaxRequests: {
          type: Array,
          readOnly: true,
          value: () => {
            return [];
          }
        },
        reqProgress: {
          type: Object,
          notify: true,
          readOnly: true,
          value: () => {
            return null;
          }
        },
        checkReqProgress: {
          type: Object,
          value: () => {
            return null;
          }
        }
      };
    }

    /**
     * Check for cached data if needed, if no cached data then fire new request
     * returns Promise
     */
    sendRequest(reqConfig, activeReqKey) {
      let reqConfigOptions = this.getIronRequestConfigOptions(reqConfig);

      if (requestIsCacheable(reqConfig.method, reqConfig.endpoint)) {
        return getFromCache(reqConfig.endpoint).catch(() => {
          return this._doRequest(reqConfigOptions, reqConfig.checkProgress, activeReqKey)
            .then(response => cacheEndpointResponse(response, reqConfig.endpoint));
        });
      }
      // make request
      return this._doRequest(reqConfigOptions, reqConfig.checkProgress, activeReqKey);
    }

    /**
     * Fire new request
     */
    _doRequest(reqConfigOptions, checkProgress, activeReqKey) {
      let request = /** @type {!IronRequestElement} */ (document.createElement('iron-request'));
      this._checkRequestProgress(request, checkProgress);

      request.send(reqConfigOptions);
      this._setLastAjaxRequest(request);
      this._addToActiveAjaxRequests(activeReqKey, request);

      return request.completes.then((request) => {
        let responseData = request.response;

        if (reqConfigOptions.handleAs === 'json' && typeof responseData === 'string') {
          responseData = _prepareResponse(responseData);
        }

        this._removeActiveRequestFromList(activeReqKey);

        return responseData;
      }).catch((err) => {
        const error = err.error;
        const request = err.request;
        if (!request.aborted && request.xhr.status === 0) {
          // not an error, this is an asynchronous request that is not completed yet
          return;
        }

        this._removeActiveRequestFromList(activeReqKey);
        // request failed
        // check request aborted, no error handling in this case
        if (!request.aborted) {
          throw new EtoolsRequestError(error, request.xhr.status, request.xhr.statusText, request.xhr.response);
        } else {
          throw new EtoolsRequestError(error, 0, 'Request aborted', null);
        }
      });
    }

    _addToActiveAjaxRequests(key, request) {
      if (key) {
        this.push('activeAjaxRequests', {key: key, request: request});
      }
    }

    _removeActiveRequestFromList(key) {
      if (key) {
        let req = this.getActiveRequestByKey(key);
        if (req) {
          let requestIndex = this.activeAjaxRequests.indexOf(req);
          if (requestIndex > -1) {
            this.splice('activeAjaxRequests', requestIndex, 1);
          }
        }
      }
    }

    getActiveRequestByKey(key) {
      return this.activeAjaxRequests.find((activeReqMapObj) => {
        return activeReqMapObj.key === key;
      });
    }

    abortRequestByKey(key) {
      // abort request by key
      if (key) {
        let activeReq = this.getActiveRequestByKey(key);
        if (activeReq) {
          this.abortActiveRequest(activeReq);
        } else {
          logWarn('No active request found by this key: ' + key + '.',
            'EtoolsAjaxRequestMixin:abortRequest');
        }
      } else {
        logWarn('Aborting request by key requires a key.', 'EtoolsAjaxRequestMixin:abortRequestByKey');
      }
    }

    abortActiveRequest(activeReqMapObj) {
      if (activeReqMapObj && activeReqMapObj.request) {
        activeReqMapObj.request.abort();
      } else {
        logWarn('There is no request to abort.', 'EtoolsAjaxRequestMixin:abortActiveRequest');
      }
    }

    getIronRequestConfigOptions(reqConfig) {
      reqConfig.method = reqConfig.method || 'GET';
      return {
        url: this._getRequestUrl(reqConfig),
        method: reqConfig.method,
        headers: this._getRequestHeaders(reqConfig),
        body: this._getRequestBody(reqConfig),
        async: !reqConfig.sync,
        handleAs: this._getHandleAs(reqConfig),
        jsonPrefix: reqConfig.jsonPrefix || '',
        withCredentials: !!reqConfig.withCredentials,
        timeout: reqConfig.timeout || 0,
        rejectWithRequest: true
      };
    }

    _getHandleAs(reqConfig) {
      let handleAs = reqConfig.handleAs || 'json';
      if (reqConfig.downloadCsv) {
        handleAs = 'blob';
      }
      return handleAs;
    }

    _getRequestUrl(reqConfig) {
      let url = '';
      if (reqConfig.endpoint && reqConfig.endpoint.url) {
        url = reqConfig.endpoint.url;
        url += this._buildQueryString(url, reqConfig.params);
      }
      return url;
    }

    _buildQueryString(url, params) {
      let queryStr = '';
      if (!params || !isNonEmptyObject(params)) {
        return '';
      }
      if (url.indexOf('?') < 0) {
        queryStr = '?';
      } else {
        queryStr = '&';
      }
      /* eslint-disable guard-for-in */
      for (let key in params) {
        queryStr += key + '=' + params[key] + '&';
      }
      /* eslint-enable guard-for-in */

      // remove trailing &
      queryStr = queryStr.substring(0, queryStr.length - 1);
      return queryStr;
    }

    _getRequestBody(reqConfig) {
      let body = reqConfig.body || {};
      if (reqConfig.multiPart) {
        body = this._prepareMultiPartFormData(body, reqConfig.prepareMultipartData);
      }
      return body;
    }

    _getRequestHeaders(reqConfig) {
      let headers = {};

      headers['content-type'] = determineContentType(reqConfig.body, reqConfig.multiPart);

      if (reqConfig.downloadCsv) {
        headers['accept'] = 'text/csv';
        headers['content-type'] = 'text';
      }

      headers = Object.assign({}, headers,
        getClientConfiguredHeaders(reqConfig.headers),
        getCsrfHeader(reqConfig.csrfCheck, reqConfig.method));

      if (reqConfig.multiPart) {
        // content type will be automatically set in this case
        delete headers['content-type'];
      }

      return headers;
    }


    _checkRequestProgress(request, checkProgress) {
      if (!checkProgress || !request || !request.progress) {
        return;
      }
      this.checkReqProgress = setInterval(() => {
        if (request.progress.constructor === Object && Object.keys(request.progress).length > 0) {
          this._setReqProgress(request.progress);
          if (!request.progress.lengthComputable || request.progress.loaded === request.progress.total) {
            this._stopReqProgressCheck();
          }
        }
      });
    }

    _stopReqProgressCheck() {
      if (this.checkReqProgress) {
        clearInterval(this.checkReqProgress);
      }
    }

  });

export default EtoolsAjaxRequestMixin;
