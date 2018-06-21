import EtoolsLogsMixin from './bower_components/etools-behaviors/etools-logs-mixin.js';
import { dedupingMixin } from '@polymer/polymer/lib/utils/mixin.js';
import Dexie from 'dexie';
/* eslint-disable no-unused-vars */

/**
 * @polymer
 * @mixinFunction
 * @appliesMixin EtoolsLogsMixin
 */

const EtoolsAjaxCacheMixin = dedupingMixin(baseClass => class extends EtoolsLogsMixin(baseClass) {
    /* eslint-enable no-unused-vars */

    static get properties() {
        return {
            etoolsAjaxCacheDb: {
                type: Object,
                value: function() {
                    return window.EtoolsRequestCacheDb;
                }
            },
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

    _requestIsViableForCaching(reqConfig) {
        return (reqConfig.method || 'GET') === 'GET' && this._expireTimeWasProvided(reqConfig.endpoint);
    }

    _expireTimeWasProvided(endpoint) {
        return endpoint && endpoint.hasOwnProperty('exp') && endpoint.exp > 0;
    }

    _getEndpointCacheKey(endpoint, params) {
        let cacheKey = endpoint.url;
        if (this._isNonEmptyString(endpoint.cachingKey)) {
            cacheKey = endpoint.cachingKey;
        }
        if (this._isNonEmptyObject(this.params)) {
            cacheKey += '_' + JSON.stringify(params);
        }
        return cacheKey;
    }

    _isNonEmptyString(str) {
        return typeof str === 'string' && str !== '';
    }

    _isNonEmptyObject(obj) {
        return obj && typeof obj === 'object' && Object.keys(obj).length > 0;
    }

    /**
     * Get caching info for the current request
     */
    getCachingInfo(reqConfig) {
        if (this._requestIsViableForCaching(reqConfig)) {
            return {
                requestIsViableForCaching: true,
                url: reqConfig.endpoint.url,
                exp: parseInt(reqConfig.endpoint.exp, 10), // ensure this value is integer
                cacheKey: this._getEndpointCacheKey(reqConfig.endpoint, reqConfig.params),
                cacheTableName: reqConfig.endpoint.cacheTableName || this.etoolsAjaxCacheDefaultTableName
            };
        }

        return null;
    }

    /**
     * etoolsAjaxCacheDb should be instance of Dexie
     * cacheTableName and listsExpireMapTable tables should be defined
     */
    cachingCanBeMade(cacheTableName) {
        return this.etoolsAjaxCacheDb instanceof Dexie && // eslint-disable-line
            this.etoolsAjaxCacheDb[this.etoolsAjaxCacheListsExpireMapTable] &&
            this.etoolsAjaxCacheDb[cacheTableName];
    }

    _shouldCacheToDefaultTable(cacheTableName) {
        return cacheTableName === this.etoolsAjaxCacheDefaultTableName;
    }

    /**
     * Cache data into dexie db default table (etoolsAjaxCacheDefaultTableName)
     */
    _cacheEndpointDataUsingDefaultTable(dataToCache) {
        let self = this;
        return this.etoolsAjaxCacheDb[this.etoolsAjaxCacheDefaultTableName].put(dataToCache)
            .then(function(result) {
                // data added in dexie db in default table, return existing data
                return dataToCache.data;
            }).catch(function(error) {
                // something happened and inserting data in dexie table failed;
                // just log the error and return the existing data(received from server)
                self.logWarn('Failed to add data in etools-ajax dexie db. Data not cached.', 'etools-ajax', error);
                return dataToCache.data;
            });
    }

    /**
     * Cache date into specified dexie db table (reqConfig.endpoint.cacheTableName)
     */
    _cacheEndpointDataUsingSpecifiedTable(responseData, cachingInfo) {
        let listsExpireMapTable = this.etoolsAjaxCacheDb[this.etoolsAjaxCacheListsExpireMapTable];
        let specifiedTable = this.etoolsAjaxCacheDb[cachingInfo.cacheTableName];
        let self = this;
        return this.etoolsAjaxCacheDb.transaction('rw', listsExpireMapTable, specifiedTable, function() {
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
            specifiedTable.clear().then(function() {
                specifiedTable.bulkAdd(responseData);
            });
        }).then(function(result) {
            // request response saved into specified table
            // transaction succeeded
            return responseData;
        }).catch(function(error) {
            // transaction failed
            // just log the error and return the existing data(received from server)
            self.logWarn('Failed to add data in etools-ajax dexie specified table: ' +
                cachingInfo.cacheTableName + '. Data not cached.', 'etools-ajax', error);
            return responseData;
        });
    }

    /**
     * Cache endpoint received data
     */
    cacheEndpointData(responseData, cachingInfo) {
        if (this._shouldCacheToDefaultTable(cachingInfo.cacheTableName)) {
            let dataToCache = {
                cacheKey: cachingInfo.cacheKey,
                data: responseData,
                expire: cachingInfo.exp + Date.now()
            };
            // cache data into default dexie table
            // single object added into default dexie db table
            return this._cacheEndpointDataUsingDefaultTable(dataToCache);
        } else {
            // cache data into specified dexie table, array of objects bulk added into a specified table
            return this._cacheEndpointDataUsingSpecifiedTable(responseData, cachingInfo);
        }
    }

    _isExpiredCachedData(dataExp) {
        // check if we have cached data
        let now = Date.now();
        if (dataExp && (dataExp - now) > 0) {
            // data did not expired
            return false;
        }
        // data expired
        return true;
    }

    _getDataFromDefaultCacheTable(cacheKey) {
        let self = this;
        return this.etoolsAjaxCacheDb[this.etoolsAjaxCacheDefaultTableName]
            .where('cacheKey').equals(cacheKey).toArray()
            .then(function(result) {
                if (result.length > 0) {
                    // check expired data
                    if (!self._isExpiredCachedData(result[0].expire)) {
                        return result[0].data;
                    }
                }
                // no data
                return null;
            }).catch(function(error) {
                self.logWarn('Failed to get data from etools-ajax dexie db default caching table.',
                    'etools-ajax', error);
                return null;
            });
    }

    _getDataFromSpecifiedCacheTable(cacheTableName) {
        let listsExpireMapTable = this.etoolsAjaxCacheDb[this.etoolsAjaxCacheListsExpireMapTable];
        let specifiedTable = this.etoolsAjaxCacheDb[cacheTableName];
        let self = this;
        return listsExpireMapTable.where('name').equals(cacheTableName).toArray()
            .then(function(result) {
                if (result.length > 0) {
                    if (!self._isExpiredCachedData(result[0].expire)) {
                        // return table content as array
                        return specifiedTable.toArray();
                    }
                }
                // collection data expire details missing
                return null;
            }).catch(function(error) {
                // table not found in list expire map, data read error, other errors
                self.logWarn('Failed to get data from etools-ajax dexie db specified table: ' +
                    cacheTableName + '.', 'etools-ajax', error);
                return null;
            });
    }

    getEndpointDataFromCache(cachingInfo) {
        if (this._shouldCacheToDefaultTable(cachingInfo.cacheTableName)) {
            return this._getDataFromDefaultCacheTable(cachingInfo.cacheKey);
        } else {
            return this._getDataFromSpecifiedCacheTable(cachingInfo.cacheTableName);
        }
    }


})

export default EtoolsAjaxCacheMixin;
