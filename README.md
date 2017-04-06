# \<etools-ajax\>

Polymer element for handling ajax requests.

### Element properties

* alternateDexieDb - Object, default null, it should be a valid dexie db instance

* auth - Object, default: null - useful to set request authorization data;
each property of this object will become a header with it's corresponding value

* body - Object, default: null - used for unsafe request payload data (POST, PUT, DELETE)

* cachingStorage - String, default: 'localstorage' - set caching storage type: localstorage, dexie, custom

* csrfCheck - String, default: 'enabled' - if set to 'disabled' will remove x-csrftoken header from request

* debounceTime - Number, default: 300 (milliseconds); if is set to 0, debounce is disabled

* dexieDbCollection - String, default '', a valid alternateDexieDb collection name

* renewDataOnExpiry - Boolean, default: false - If true, data is automatically renewed on expiry. Only works
if endpoint is used and the endpoint has the exp property defined

* endpoint - Object, default: null

* downloadCsv - Boolean, default: false - if true then the ajax response data will be downloaded as CSV file

* handleAs - String, default: json

* loading - Boolean, default: false - notifies if request is in progress

* logs - Boolean, default: false

* method - String, default: GET

* params - Object, default: null

* url - String, default: null

* withCredentials - Boolean, default: false - set the withCredentials flag on the request.

### Usage

You can chose to use directly the URL to make the request, no caching will be made in this case.

```html
<etools-ajax url="http://silex-test-app.local/countries-data"></etools-ajax>
```

Also you can use an endpoint object that contains url, exp (cache kept for x milliseconds) and cachingKey properties.
CachingKey property is optional and it's recommended if you use Dexie.js as local database for caching.
If is not set then the url will be the main caching key part. Final cache key is created using this private method
(url/cacheKey + JSON string of params):

```javascript
_getEndpointCacheKey: function(endpoint) {
  var cacheKey = endpoint.url;
  if (typeof endpoint.cachingKey === 'string' && endpoint.cachingKey !== '') {
    cacheKey = endpoint.cachingKey;
  }
  if (this.params !== null && typeof this.params === 'object' && Object.keys(this.params).length > 0) {
    cacheKey += '_' + JSON.stringify(this.params);
  }
  return cacheKey;
}
```

If exp property is not set then no caching will be made for this endpoint.
Only GET requests can be cached.

```javascript
var endpoint = {
  url: 'your/api/route',
  exp: 1473931993881,
  cachingKey: 'dataSetIdentifierString'
);
var testParams = {
  id: 1,
  name: 'Global'
};
```
```html
<etools-ajax endpoint="[[endpoint]]" params="[[testParams]]"></etools-ajax>
```

If any of the url, params or endpoint properties changes, the ajax requests automatically fires. In endpoint case, before triggering
the new request we search to see if we already have this data in local cache storage. If data is found and did not expired,
automatically fire/return response with found data. If data for the new endpoint is not found or is expired then make the request.

You can set `debounceTime` to ensure you won't fire multiple request when the url, endpoint, params or body are changed.
```html
<etools-ajax endpoint="[[endpoint]]" params="[[testParams]]" debounce-time="300"></etools-ajax>
```

#### Using Dexie.js instead of localstorage for caching

 For a better browser storage use property: `cachingStorage="dexie"` and etools-ajax will not cache data in localstorage,
 it will use a dexie db (based on IndexedDb) called `etoolsAjaxCacheDb` to store request data.

 Since etools-ajax can be used in multiple apps running on the same domain(like eTools apps) you might want to set a prefix
 for element's default dexie db name. In this way you will avoid conflicts with other apps that are using etools-ajax.
 For example you can have 2 identical caching keys that will override each other's data. We do not want that, so make sure
 you set somewhere in your app a global variable, named `etoolsAjaxDefaultDexieDbPrefix`, a string prefix that identifies your app.

 ```html
 <!-- request data will be stored in  etoolsAjaxCacheDb dexie database, collection ajaxCachedData with the generated cache key -->
 <etools-ajax endpoint="[[endpoint]]" caching-storage="dexie"></etools-ajax>
 ```

 If you do not want to use etools-ajax default dexie db you can provide your own database.

 Case 1:
   - property `alternateDexieDb` should be your dexie db instance
   - property `dexieDbCollection` should be the collection where the request is gonna put the return data (Important: it has to be an array of objects)
   - your dexie db schema should contain a collection called `collectionsList` with indexes: '&name,expire' (unique name field index and expire field index)

 ```html
 <!--
 // this.$.customDb = etools-dexiejs element
var db = this.$.customDb.getDb();
db.version(1).stores({
 collectionsList: "&name,expire",
 countries: 'id, name'
});
this.customDb = db;
 -->
<etools-ajax endpoint="[[endpoints.countries]]" alternate-dexie-db="{{customDb}}" dexie-db-collection="countries"></etools-ajax>
 ```

Case 2:
   - you can init `etoolsCustomDexieDb` variable with your custom dexie db somewhere in your config app and make sure is global
   - on your etools-ajax set `cachingStorage` property to `custom`
   - do not forget to provide the custom db collection where the data will be cached (`dexieDbCollection`)

```javascript
// in your app config (global)
var etoolsCustomDexieDb = new Dexie('etoolsCustomDexieDb');
etoolsCustomDexieDb.version(1).stores({
  collectionsList: "&name,expire",
  countries: 'id, name'
});
```

```html
<!-- in your polymer element -->
<etools-ajax endpoint="[[endpoints.caountries]]" caching-storage="custom" dexie-db-collection="countries"></etools-ajax>
```

For more info about Dexie.js databases check the [documentation](https://github.com/dfahlander/Dexie.js/wiki).

#### Ajax response handling:

- success: check if the request data should be cached, add data to caching storage, fire a success response with
returned data to be used in parent element (where you can have on-success action (page specific) that manages received data)

- error: fire an error event to be handled in parent element (on-fail handling, page specific)

```html
<etools-ajax url="http://silex-test-app.local/countries-data"
  on-success="handleResponse"
  on-fail="handleError"></etools-ajax>
```
```javascript
function handleResponse(response) {
  // your custom response handling in case of success
}
function handleError(response) {
  // your custom response handling in case of error
}
```

- unauthorized: event fired if the response status code is 401

- forbidden: event fired if the response status code is 403

#### Unsafe requests

Submitting data using unsafe requests with methods such as POST, PUT or DELETE will require a CSRF Token that has to be stored
in a cookie with the name: 'csrftoken'. When the request is prepared this token is added as a header (x-csrftoken).
You can disable this behaviour by setting the csrfCheck to 'disabled'.

All requests that are made with other methods than GET, HEAD, OPTIONS or TRACE are considered unsafe and are triggered by
_sendUnsafeRequest private method. Body property is used to set the request payload data and the request is automatically
triggered when url or body properties are changing.

```html
<etools-ajax method="POST" url="http://silex-test-app.local/handle-post-request" body="{{postTestData}}"></etools-ajax>
<etools-ajax method="PUT" url="http://silex-test-app.local/handle-put-request" body="{{putTestData}}"></etools-ajax>
<etools-ajax method="DELETE" url="http://silex-test-app.local/handle-delete-request" body="{{deleteTestData}}"></etools-ajax>
```

#### Multipart Form Data
If the attribute multi-part is set in the element the body is converted to a FormData object, this allow to send attachment through a POST call.

```html
<!--
body is an object that contains data blobs
body = {
    id: "13",
    firstName: "John",
    lastName: "Doe",
    someFile: function () {
      var content = '<a id="a"><b id="b">hey!</b></a>';
      return new Blob([content], { type: "text/xml"});
  }(),
  bigImage: imgBlob
}
-->
<etools-ajax url="http://silex-test-app.local/handle-post-put-delete-data" method="POST" multi-part body="{{body}}" logs="true"></etools-ajax>
```

#### Authorization

In many cases we need to set authorization data for each request. For example the requests from an application that uses OAuth.
This authorization data can be set on the request using auth property, which is an object with keys and values that will become
headers names (each key name) and headers values (key value). Ex:

```javascript
var auth = {
    authorization: 'Bearer lt8fnG9CNmLmsmRX8LTp0pVeJqkccEceXfNM8s_f624'
}
```
```html
<etools-ajax endpoint="[[endpoints.getData]]" params="[[testParams]]" auth="[[auth]]"></etools-ajax>
```

## Install
```bash
$ bower install --save etools-ajax
```

## Preview element locally
Install needed dependencies by running: `$ bower install`.
Make sure you have the [Polymer CLI](https://www.npmjs.com/package/polymer-cli) installed. Then run `$ polymer serve` to serve your element application locally.

## Running Tests

You need to have `web-component-tester` installed (if not run `npm install -g web-component-tester`)
```bash
$ wtc
```
or
```bash
$ wtc -p
```
