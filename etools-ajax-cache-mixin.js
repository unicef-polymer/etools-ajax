/* eslint-disable linebreak-style */
import {dedupingMixin} from '@polymer/polymer/lib/utils/mixin.js';
import Dexie from 'dexie';
import {requestIsCacheable, getFromCache, cacheEndpointResponse} from '@unicef-polymer/etools-dexie-caching/etools-dexie-caching';
/* eslint-disable no-unused-vars */

/**
 * @polymer
 * @mixinFunction
 * @applies EtoolsLogsMixin
 */
const EtoolsAjaxCacheMixin = dedupingMixin(baseClass => class extends (baseClass) {
  /* eslint-enable no-unused-vars */

  static get properties() {
    return {
      etoolsAjaxCacheDefaultTableName: {
        type: String,
        value: 'ajaxDefaultDataTable'
      },
      etoolsAjaxCacheListsExpireMapTable: {
        type: String,
        value: 'listsExpireMapTable'
      }
    };
  }

  ready() {
    super.ready();
    if (typeof Dexie === 'undefined') {
      this.logError('Dexie import missing.', 'etools-ajax');
    }
  }

  requestIsCacheable(method, endpoint) {
    return requestIsCacheable(method, endpoint);
  }

  getFromCache(endpoint) {
    return getFromCache(endpoint);
  }

  cacheEndpointResponse(response, endpoint) {
    return cacheEndpointResponse(response, endpoint);
  }

});

export default EtoolsAjaxCacheMixin;
