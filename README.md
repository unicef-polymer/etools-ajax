# \<etools-ajax\>

Polymer element for handling ajax requests.

### Element properties

* auth - Object, default: null - useful to set request authorization data; 
each property of this object will become a header with it's corresponding value

* body - Object, default: null - used for unsafe request payload data (POST, PUT, DELETE)

* cachingStorage - String, default: 'localstorage' - set caching storage type; only localstorage available in this moment 
 
* csrfCheck - String, default: 'enabled' - if set to 'disabled' will remove x-csrftoken header from request 

* endpoint - Object, default: null

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
CachingKey property is optional and it's recommended if you use lokiJS as local database for caching.
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

#### Ajax response handling:

- success: check if the request data should be cached, add data to caching storage, fire a success response with
returned data to be used in parent element (where you can have a new on-response action (page specific) that manages received data)

- error: fire an error event to be handled in parent element (a new on-error handling, page specific)

```html
<etools-ajax url="http://silex-test-app.local/countries-data" 
  on-response="handleResponse"
  on-error="handleError"></etools-ajax>
```
```javascript
function handleResponse(response) {
  // your custom response handling in case of success
}
function handleError(response) {
  // your custom response handling in case of error
}
```

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

```
$ polymer test
```
