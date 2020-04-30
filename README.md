# Etools Ajax Request Mixin & Module

Element for handling ajax requests.
It uses the `iron-request` polymer component to make the requests.
Exposes its functionality through a mixin and also through a module. The module functionality can be used in any framework, the mixin is Polymer dependent.
For GET requests it can cache the data using Dexie db.

The `<etools-ajax>` is a Polymer element based on the `EtoolsAjaxRequestMixin`.

### Data caching requirements

If you want to be able to cache the request data you must define your app Dexie db schema and then
set it on `window.EtoolsRequestCacheDb` global variable. EtoolsAjaxRequestMixin behavior depends on it.

```javascript
  // custom dexie db that will be used by EtoolsAjaxRequestMixin
  var appDexieDb = new Dexie('yourAppDexieDbName');
  appDexieDb.version(1).stores({
    listsExpireMapTable: "&name, expire",
    ajaxDefaultDataTable: "&cacheKey, data, expire"
  });

  // configure app dexie db to be used for caching by EtoolsAjaxRequestMixin.
  window.EtoolsRequestCacheDb = etoolsCustomDexieDb;
```
Only `GET` requests response data can be cached.
For example, if your endpoint object looks like this:
```javascript
var endpoint = {
  url: 'your/api/route',
  exp: 300000, // if exp = 0 no caching will be made
  cachingKey: 'dataSetIdentifierString'
};
```
then when the request response is received it will be cached into dexie db, default table: `ajaxDefaultDataTable`
as an object like this:
```javascript
{
  // cacheKey can have request params stringified in the end if params were provided in sendRequest options
  cacheKey: 'dataSetIdentifierString',
  // Date.now() + endpoint.exp
  expire: 1491306589975,
  // request response data
  data: response
}
```

Next time this request will be made, the data from cache will be returned if it did not expired. If cached data is
expired or not found a new request will be sent.

To cache a list of objects (returned by request) in a specified table from Dexie db that you need later to make
queries on it you have to use an endpoint like this:

```javascript
var endpoint = {
  url: 'your/api/route',
  exp: 300000, // if exp = 0 no caching will be made
  cacheTableName: 'countries'
};
```

In this case `countries` table should be defined in Dexie db schema. The request response objects will be saved in
this Dexie table. On next same request the data from this table will be returned if is not expired.
In case data from this table(`countries` in our case) is expired a new request will be fired.

`cacheTableName` should be used only if you want to use Dexie functionality for making queries,
like showing a list with pagination and filtering only on frontend side.

For more info about Dexie.js databases check the [documentation](http://dexie.org/).

### Disable caching

Just set this in your app: `window.EtoolsRequestCacheDisabled = true`

### Usage in version above 2.0.4  => Use it as a mixin instead of behavior
### Usage in version 2.0.4 and below

```javascript
  // inside an element method (make sure ajax request mixin is included)
  this.sendRequest({
    method: 'GET',
    endpoint: {
      url: '/countries-data',
    },
    params: {
      id: 10,
      country_name: 'USA'
    }
  }).then(function(resp) {
    console.log(resp);
  }).catch(function(error) {
    console.log(error);
  });

```

#### `sendRequest` params:
An object that must have this properties
* `method` - any HTTP method, defaults to 'GET' if is not defined
* `endpoint` - an object that must contain the `url` property.
For caching this object can
have `exp`(time to cache data in milliseconds), `cachingKey`(any string) ,`cacheTableName`(the Dexie table name,
where you can store a list of objects from server response) or `sharedDbCachingKey`.
 For more info on caching configuration see https://github.com/unicef-polymer/etools-dexie-caching Readme;
`token_key` property holds the local storage key of the token. If present, the 'Authorization' header will be set.
When `token_key` and `window.AppMsalInstance` are set, the token is automatically added to the request. If the token is expired, a silent token refresh will be done. If the silent token refresh errors out the page is reloaded in order to be redirected to the `Sign in` page.

  `endpoint` format:
  ```javascript
  {
    url: string,
    exp?: number,
    cacheTableName?: string,
    cachingKey?: string,
    token_key?: string
  }
  ```
* `params` - request params, will be used to build url query string . It is recomended that etools-ajax receives the final form of the url it needs to call, so avoid using this.
* `body` - request body for POST | PUT | PATCH | DELETE methods
* `csrfCheck` - if other than `disabled`, x-csrftoken header will be set with value of `csrftoken` cookie
* `headers` - object of additional headers that can be set on request
* `multiPart` - if `true` it will take the `body` and convert it in `FormData`
* `prepareMultipartData` - used by etools apps to convert request complex json `body` to `FromData` and prefix objects
properties with `_obj`
* `checkProgress` - experimental flag to have ajax request progress (progress available data stored in `reqProgress`
property)
* `timeout` - Set the timeout flag on the request
* `async` - Toggle whether XHR is synchronous or asynchronous. Don't change this to true unless You Know What You Are Doing
* `handleAs` - Specifies what data to store in the response property,
    and to deliver as event.detail.response in response events.
    One of:
    text: uses XHR.responseText.
    xml: uses XHR.responseXML.
    json: uses XHR.responseText parsed as JSON.
    arraybuffer: uses XHR.response.
    blob: uses XHR.response.
    document: uses XHR.response.
* `jsonPrefix` - Prefix to be stripped from a JSON response before parsing it.
* `rejectWithRequest` - Changes the completes promise chain from generateRequest to reject with an object containing the original request, as well an error message. If false (default), the promise rejects with an error message only.
* `withCredentials` - Whether or not to send credentials on the request. Default is false.

#### Ajax response handling:

`sendRequest` will return a `Promise`:
- if request succeeded it will contain response data
- in case of error it will contain an object like this with this properties:
`error`, `statusCode`, `statusText`, `response`

#### Abort requests

There are 2 properties used to track active and last requests:
* `activeAjaxRequests` - active ajax requests mapping, a list of objects like `{key: 'someAjaxReqkey', request: activeRequest}`
used to manage all active requests.
* `lastAjaxRequest` - last request fired.

To abort any of the active requests you can use `abortRequestByKey(key)`.
You can also use `this.lastAjaxRequest.abort()` to abort last request.

### Upload
* `upload` method exported in the upload-helper file can be used to upload files.

## Install
TODO: create npm package
```bash
$ npm i --save @unicef-polymer/etools-ajax
```

## Running Tests

TODO: improve tests & add more tests

You need to have `web-component-tester` installed (if not run `npm install -g web-component-tester`)
```bash
$ wct
```
or
```bash
$ wct -p
```
