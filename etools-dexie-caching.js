/* eslint-disable linebreak-style */
import Dexie from 'dexie';
import {logWarn} from '@unicef-polymer/etools-behaviors/etools-logging';


let etoolsAjaxCacheDefaultTableName = 'ajaxDefaultDataTable';
let etoolsAjaxCacheListsExpireMapTable = 'listsExpireMapTable';

/**
 * Get caching info for the current request
 */
function getCachingInfo(endpoint) {
  return {
    url: endpoint.url,
    exp: parseInt(endpoint.exp, 10), // ensure this value is integer
    cacheKey: _getEndpointCacheKey(endpoint),
    cacheTableName: endpoint.cacheTableName || etoolsAjaxCacheDefaultTableName
  };

}

/**
 *
 * @param {string} method
 * @param {
 *  url: string,
 *  exp?: number,
 *  cacheTableName?: string,
 *  cachingKey?: string
 * } endpoint
 */
export function requestIsCacheable(method, endpoint) {
  if (window.EtoolsRequestCacheDisabled) {
    return false;
  }
  return (method || 'GET') === 'GET' && _expireTimeWasProvided(endpoint)
    && dexieDbIsConfigured(endpoint);
}

function _expireTimeWasProvided(endpoint) {
  return endpoint && endpoint.hasOwnProperty('exp') && endpoint.exp > 0;
}

function _getEndpointCacheKey(endpoint) {
  let cacheKey = endpoint.url;
  if (_isNonEmptyString(endpoint.cachingKey)) {
    cacheKey = endpoint.cachingKey;
  }
  // if (this._isNonEmptyObject(this.params)) {
  //   cacheKey += '_' + JSON.stringify(params);
  // }
  return cacheKey;
}

function _isNonEmptyString(str) {
  return typeof str === 'string' && str !== '';
}

function _isNonEmptyObject(obj) {
  return obj && typeof obj === 'object' && Object.keys(obj).length > 0;
}


/**
 * window.EtoolsRequestCacheDb should be instance of Dexie
 * cacheTableName and listsExpireMapTable tables should be defined
 */
function dexieDbIsConfigured(endpoint) {
  let cacheTableName = endpoint.cacheTableName || etoolsAjaxCacheDefaultTableName;
  return window.EtoolsRequestCacheDb instanceof Dexie && // eslint-disable-line
    window.EtoolsRequestCacheDb[etoolsAjaxCacheListsExpireMapTable] &&
    window.EtoolsRequestCacheDb[cacheTableName];
}

function _shouldCacheToDefaultTable(cacheTableName) {
  return cacheTableName === etoolsAjaxCacheDefaultTableName;
}

/**
 * Cache data into dexie db default table (etoolsAjaxCacheDefaultTableName)
 */
function _cacheEndpointDataUsingDefaultTable(dataToCache) {
  return window.EtoolsRequestCacheDb[etoolsAjaxCacheDefaultTableName].put(dataToCache)
    .then((result) => {
      // data added in dexie db in default table, return existing data
      return dataToCache.data;
    }).catch((error) => {
      // something happened and inserting data in dexie table failed;
      // just log the error and return the existing data(received from server)
      logWarn('Failed to add data in etools-ajax dexie db. Data not cached.', 'etools-ajax', error);
      return dataToCache.data;
    });
}

/**
 * Cache date into specified dexie db table (reqConfig.endpoint.cacheTableName)
 */
function _cacheEndpointDataUsingSpecifiedTable(responseData, cachingInfo) {
  let listsExpireMapTable = window.EtoolsRequestCacheDb[etoolsAjaxCacheListsExpireMapTable];
  let specifiedTable = window.EtoolsRequestCacheDb[cachingInfo.cacheTableName];
  return window.EtoolsRequestCacheDb.transaction('rw', listsExpireMapTable, specifiedTable, () => {
    if (responseData instanceof Array === false) {
      throw new Error('Response data should be array or objects to be ' +
        'able to cache it into specified table.');
    }
    // make all add actions using transaction
    // specifiedTable name and expire time for it must be added into listsExpireMapTable
    let listExpireDetails = {
      name: cachingInfo.cacheTableName,
      expire: cachingInfo.exp + Date.now()
    };
    // add list expire mapping details
    listsExpireMapTable.put(listExpireDetails);
    // save bulk data
    specifiedTable.clear().then(() => {
      specifiedTable.bulkAdd(responseData);
    });
  }).then((result) => {
    // request response saved into specified table
    // transaction succeeded
    return responseData;
  }).catch((error) => {
    // transaction failed
    // just log the error and return the existing data(received from server)
    logWarn('Failed to add data in etools-ajax dexie specified table: ' +
      cachingInfo.cacheTableName + '. Data not cached.', 'etools-ajax', error);
    return responseData;
  });
}

/**
 *
 * @param {any} responseData Data received fromm http request
 * @param {
 *  url: string,
 *  exp?: number,
 *  cacheTableName?: string,
 *  cachingKey?: string
 * } endpoint
 */
export function cacheEndpointResponse(responseData, endpoint) {
  let cachingInfo = getCachingInfo(endpoint);
  if (_shouldCacheToDefaultTable(cachingInfo.cacheTableName)) {
    let dataToCache = {
      cacheKey: cachingInfo.cacheKey,
      data: responseData,
      expire: cachingInfo.exp + Date.now()
    };
    // single object added into default dexie db table
    return _cacheEndpointDataUsingDefaultTable(dataToCache);
  } else {
    // array of objects bulk added into a specified table
    return _cacheEndpointDataUsingSpecifiedTable(responseData, cachingInfo);
  }
}

function _isExpiredCachedData(dataExp) {
  // check if we have cached data
  let now = Date.now();
  if (dataExp && (dataExp - now) > 0) {
    // data did not expired
    return false;
  }
  // data expired
  return true;
}

function _getDataFromDefaultCacheTable(cacheKey) {
  return window.EtoolsRequestCacheDb[etoolsAjaxCacheDefaultTableName]
    .where('cacheKey').equals(cacheKey).toArray()
    .then((result) => {
      if (result.length > 0) {
        // check expired data
        if (!_isExpiredCachedData(result[0].expire)) {
          return result[0].data;
        }
      }
      // no data
      return Promise.reject(null);
    }).catch((error) => {
      logWarn('Failed to get data from etools-ajax dexie db default caching table.',
        'etools-ajax', error);
      return Promise.reject(null);
    });
}

function _getDataFromSpecifiedCacheTable(cacheTableName) {
  let listsExpireMapTable = window.EtoolsRequestCacheDb[etoolsAjaxCacheListsExpireMapTable];
  let specifiedTable = window.EtoolsRequestCacheDb[cacheTableName];

  return listsExpireMapTable.where('name').equals(cacheTableName).toArray()
    .then((result) => {
      if (result.length > 0) {
        if (!_isExpiredCachedData(result[0].expire)) {
          // return table content as array
          return specifiedTable.toArray();
        }
      }
      // collection data expire details missing
      return Promise.reject(null);
    }).catch((error) => {
      // table not found in list expire map, data read error, other errors
      logWarn('Failed to get data from etools-ajax dexie db specified table: ' +
        cacheTableName + '.', 'etools-ajax', error);
      return Promise.reject(null);
    });
}

export function getFromCache(endpoint) {
  let cachingInfo = getCachingInfo(endpoint);
  if (_shouldCacheToDefaultTable(cachingInfo.cacheTableName)) {
    return _getDataFromDefaultCacheTable(cachingInfo.cacheKey);
  } else {
    return _getDataFromSpecifiedCacheTable(cachingInfo.cacheTableName);
  }
}
