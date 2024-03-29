/* eslint-disable linebreak-style */
import './scripts/es6-obj-assign-polyfil.js';
import '@polymer/polymer/polymer-legacy.js';
import '@polymer/iron-ajax/iron-request.js';
import {logWarn} from '@unicef-polymer/etools-behaviors/etools-logging';
import EtoolsAjaxDataMixin from './etools-ajax-data-mixin.js';
import {dedupingMixin} from '@polymer/polymer/lib/utils/mixin.js';
import {
  requestIsCacheable,
  getFromCache,
  cacheEndpointResponse
} from '@unicef-polymer/etools-dexie-caching/etools-dexie-caching';
import {getCsrfHeader, getClientConfiguredHeaders, determineContentType, getRequestUrl} from './etools-ajax-utils';

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
  (baseClass) =>
    class extends EtoolsAjaxDataMixin(baseClass) {
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
          }
        };
      }

      /**
       * Check for cached data if needed, if no cached data then fire new request
       * returns Promise
       */
      sendRequest(reqConfig, activeReqKey) {
        const reqConfigOptions = this.getIronRequestConfigOptions(reqConfig);

        if (requestIsCacheable(reqConfig.method, reqConfig.endpoint)) {
          return getFromCache(reqConfig.endpoint).catch(() => {
            return this._doRequest(reqConfigOptions, activeReqKey).then((response) =>
              cacheEndpointResponse(response, reqConfig.endpoint)
            );
          });
        }
        // make request
        return this._doRequest(reqConfigOptions, activeReqKey);
      }

      /**
       * Fire new request
       */
      _doRequest(reqConfigOptions, activeReqKey) {
        const request = /** @type {!IronRequestElement} */ (document.createElement('iron-request'));

        request.send(reqConfigOptions);
        this._setLastAjaxRequest(request);
        this._addToActiveAjaxRequests(activeReqKey, request);

        return request.completes
          .then((request) => {
            let responseData = request.response;

            if (reqConfigOptions.handleAs === 'json' && typeof responseData === 'string') {
              responseData = _prepareResponse(responseData);
            }

            this._removeActiveRequestFromList(activeReqKey);

            return responseData;
          })
          .catch((err) => {
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
          const req = this.getActiveRequestByKey(key);
          if (req) {
            const requestIndex = this.activeAjaxRequests.indexOf(req);
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
          const activeReq = this.getActiveRequestByKey(key);
          if (activeReq) {
            this.abortActiveRequest(activeReq);
          } else {
            logWarn('No active request found by this key: ' + key + '.', 'EtoolsAjaxRequestMixin:abortRequest');
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
          url: getRequestUrl(reqConfig),
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

        headers = Object.assign(
          {},
          headers,
          getClientConfiguredHeaders(reqConfig.headers),
          getCsrfHeader(reqConfig.csrfCheck, reqConfig.method)
        );

        if (reqConfig.multiPart) {
          // content type will be automatically set in this case
          delete headers['content-type'];
        }

        return headers;
      }
    }
);

export default EtoolsAjaxRequestMixin;
