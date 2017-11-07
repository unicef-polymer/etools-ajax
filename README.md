# Etools Ajax Request Behavior

Polymer Behavior for handling ajax requests in any Polymer element.
For GET requests it can cache the data using Dexie db.

The `<etools-ajax>` is a complete new element based on the `EtoolsAjaxRequestBehavior`.

### Data caching requirements

If you want to be able to cache the request data you must define your app Dexie db schema and then
set it on `window.EtoolsRequestCacheDb` global variable. EtoolsAjaxRequestBehavior behavior depends on it.

```javascript
  // custom dexie db that will be used by EtoolsAjaxRequestBehavior
  var appDexieDb = new Dexie('yourAppDexieDbName');
  appDexieDb.version(1).stores({
    listsExpireMapTable: "&name, expire",
    ajaxDefaultDataTable: "&cacheKey, data, expire"
  });

  // configure app dexie db to be used for caching by EtoolsAjaxRequestBehavior.
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

### Usage

```javascript
Polymer({
    is: 'custom-element',
    behaviors: [EtoolsAjaxRequestBehavior],
    ready: function() {
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
    }
});
```

#### `sendRequest` options:
An object that must have this properties
* `method` - any HTTP method, defaults to 'GET' if is not defined
* `endpoint` - an object that must contain the `url` property. For caching this object can
have `exp`(time to cache data in milliseconds), `cachingKey`(any string) or `cacheTableName`(the Dexie table name,
where you can store a list of objects from server response);
* `params` - request params, will be used to build url query string
* `body` - request body for POST | PUT | PATCH | DELETE methods
* `csrfCheck` - if `true` then `x-csrftoken` header will be set with value of `csrftoken` cookie
* `headers` - object of additional headers that can be set on request
* `multiPart` - if `true` it will take the `body` and convert it in `FormData`
* `prepareMultipartData` - used by etools apps to convert request complex json `body` to `FromData` and prefix objects
properties with `_obj`
* `checkProgress` - experimental flag to have ajax request progress (progress available data stored in `reqProgress`
property)

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

## Install
```bash
$ bower install --save etools-ajax
```

## Preview element locally
Install needed dependencies by running: `$ bower install`.
Make sure you have the [Polymer CLI](https://www.npmjs.com/package/polymer-cli) installed. Then run `$ polymer serve` to serve your element application locally.

## Linting the code

Innstall local npm packages (run `npm install`)
Then just run the linting task

```bash
$ npm run lint
```
You should also use polylint. If you don't have Polylint installed run `npm install -g polylint`.
Then just run the linter on each file you wish to check like so

```bash
$ polylint -i filename.html
```
At the moment polylint crashes if it encounters a missing import. If that happens, temporarily comment out such imports and run the command again.

## Running Tests

You need to have `web-component-tester` installed (if not run `npm install -g web-component-tester`)
```bash
$ wct
```
or
```bash
$ wct -p
```
