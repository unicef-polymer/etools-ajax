import Dexie from 'dexie';
var etoolsAjaxDefaultDexieDbPrefix = 'plyElment_';

// custom dexie db that will be used by etoolsAjax
var etoolsCustomDexieDb = new Dexie('etoolsCustomDexieDb');
etoolsCustomDexieDb.version(1).stores({
  collectionsList: "&name,expire",
  countries: 'id, name'
});
