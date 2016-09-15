# \<etools-ajax\>

Polymer element for handling ajax requests.

### Usage

You can chose to use directly the URL to make the request, no caching will be made in this case.
Also you can use an endpoint object that contains url, exp (expire date in milliseconds) and cachingKey properties.
CachingKey property is optional and it's recommended if you use lokiJS as local database for caching.
If is not set then the url will be the caching key. If exp property is not set then no caching will be made for this endpoint.

```
var endpoint = {
  url: 'your/api/route',
  exp: 1473931993881,
  cachingKey: 'dataSetIdentifierString'
);
```

If any of the url or endpoint properties changes, the ajax requests automatically fires. In endpoint case, before triggering
the new request we search to see if we already have this data in local cache storage. If data is found and did not expired
automatically fire/return response with found data. If data for the new endpoint is not found or is expired then make the request.


To be continued...
