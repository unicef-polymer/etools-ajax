import './scripts/es6-obj-assign-polyfil.js';
import '@polymer/polymer/polymer-legacy.js';
import '@polymer/iron-ajax/iron-request.js';
import EtoolsLogsMixin from 'etools-behaviors/etools-logs-mixin.js';
import EtoolsAjaxDataMixin from './etools-ajax-data-mixin.js';
import EtoolsAjaxCacheMixin from './etools-ajax-cache-mixin.js';
import {dedupingMixin} from '@polymer/polymer/lib/utils/mixin.js';

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
 * @applies EtoolsAjaxCacheMixin
 * @applies EtoolsAjaxDataMixin
 * @applies EtoolsLogsMixin
 * @demo demo/index.html
 */
const EtoolsAjaxRequestMixin = dedupingMixin(
    baseClass => class extends EtoolsLogsMixin(EtoolsAjaxDataMixin(EtoolsAjaxCacheMixin(baseClass))) {
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
        // prepare request config options
        let preparedConfigOptions = this._prepareConfigOptions(reqConfig);
        let reqConfigOptions = preparedConfigOptions.ironRequestOptions;
        let cachingInfo = preparedConfigOptions.cachingInfo;

        let self = this;
        if (this._isViableForCaching(cachingInfo)) {
          // we might have data cached; if cached data is available and not expired
          // return it without making the request
          return this.getEndpointDataFromCache(cachingInfo).then((response) => {
            if (!response) {
              return self._doRequest(reqConfigOptions, cachingInfo, reqConfig.checkProgress, activeReqKey);
            }
            return response;
          });
        }
        // make request
        return this._doRequest(reqConfigOptions, cachingInfo, reqConfig.checkProgress, activeReqKey);
      }

      /**
       * Fire new request
       */
      _doRequest(reqConfigOptions, cachingInfo, checkProgress, activeReqKey) {
        let request = /** @type {!IronRequestElement} */ (document.createElement('iron-request'));
        this._checkRequestProgress(request, checkProgress);
        let self = this;
        request.send(reqConfigOptions);
        this._setLastAjaxRequest(request);
        this._addToActiveAjaxRequests(activeReqKey, request);

        return request.completes.then((request) => {
          let responseData = request.response;

          if (reqConfigOptions.handleAs === 'json' && typeof responseData === 'string') {
            responseData = _prepareResponse(responseData);
          }

          if (self._isViableForCaching(cachingInfo)) {
            // add/cache response data into dexie db
            return self.cacheEndpointData(responseData, cachingInfo);
          }

          self._removeActiveRequestFromList(activeReqKey);

          return responseData;
        }).catch((err) => {
          const error = err.error;
          const request = err.request;
          if (!request.aborted && request.xhr.status === 0) {
            // not an error, this is an asynchronous request that is not completed yet
            return;
          }

          self._removeActiveRequestFromList(activeReqKey);
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
            this.logWarn('No active request found by this key: ' + key + '.',
                'EtoolsAjaxRequestMixin:abortRequest');
          }
        } else {
          this.logWarn('Aborting request by key requires a key.', 'EtoolsAjaxRequestMixin:abortRequestByKey');
        }
      }

      abortActiveRequest(activeReqMapObj) {
        if (activeReqMapObj && activeReqMapObj.request) {
          activeReqMapObj.request.abort();
        } else {
          this.logWarn('There is no request to abort.', 'EtoolsAjaxRequestMixin:abortActiveRequest');
        }
      }

      _isViableForCaching(cachingInfo) {
        if (window.EtoolsRequestCacheDisabled) {
          return false;
        }
        return cachingInfo && cachingInfo.requestIsViableForCaching &&
            this.cachingCanBeMade(cachingInfo.cacheTableName);
      }

      _prepareConfigOptions(reqConfig) {
        return {
          ironRequestOptions: {
            url: this._getRequestUrl(reqConfig),
            method: reqConfig.method || 'GET',
            headers: this._getRequestHeaders(reqConfig),
            body: this._getRequestBody(reqConfig),
            async: !reqConfig.sync,
            handleAs: this._getHandleAs(reqConfig),
            jsonPrefix: reqConfig.jsonPrefix || '',
            withCredentials: !!reqConfig.withCredentials,
            timeout: reqConfig.timeout || 0,
            rejectWithRequest: true
          },
          cachingInfo: this.getCachingInfo(reqConfig)
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
        if (!params || !this._isNonEmptyObject(params)) {
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

        headers['content-type'] = this._determineContentType(reqConfig.body, reqConfig.multiPart);

        if (reqConfig.downloadCsv) {
          headers['accept'] = 'text/csv';
          headers['content-type'] = 'text';
        }

        let clientConfiguredHeaders = this._getClientConfiguredHeaders(reqConfig.headers);
        let csrfHeaders = {};
        if (!this._csrfSafeMethod(reqConfig.method)) {
          csrfHeaders = this._getCsrfHeader(reqConfig.csrfCheck);
        }
        headers = Object.assign({}, headers, clientConfiguredHeaders, csrfHeaders);

        if (reqConfig.multiPart) {
          // content type will be automatically set in this case
          delete headers['content-type'];
        }

        return headers;
      }

      _getClientConfiguredHeaders(additionalHeaders) {
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

      _getCsrfHeader(csrfCheck) {
        let csrfHeaders = {};
        if (csrfCheck !== 'disabled') {
          let csrfToken = this._getCSRFCookie();

          if (csrfToken) {
            csrfHeaders['x-csrftoken'] = csrfToken;
          }
        }
        return csrfHeaders;
      }

      _csrfSafeMethod(method) {
        // these HTTP methods do not require CSRF protection
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
      }

      _getCSRFCookie() {
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

      /**
       * Content-Type set here can be overridden later
       * by headers sent from the client
       */
      _determineContentType(body) {
        let contentType = 'application/json';

        if (typeof body === 'string') {
          contentType = 'application/x-www-form-urlencoded';
        }

        return contentType;
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
