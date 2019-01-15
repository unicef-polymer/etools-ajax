import {dedupingMixin} from '@polymer/polymer/lib/utils/mixin.js';

/**
 * @polymer
 * @mixinFunction
 */
let internalEtoolsAjaxDataMixin = baseClass => class extends baseClass {
  /* eslint-enable no-unused-vars */

  _prepareMultiPartFormData(inputBody, prepareMultipartData) {
    if (inputBody instanceof FormData) {
      return inputBody; // body is already a FromData object
    }
    let formBody = new FormData();
    let keys = Object.keys(inputBody);

    let self = this;
    keys.forEach((key) => {
      if (prepareMultipartData) {
        formBody = self._prepareFormData(self, formBody, inputBody[key], key);
      } else {
        formBody.append(key, inputBody[key]);
      }
    });

    return formBody;
  }

  _prepareFormData(self, body, data, key) {
    if (Array.isArray(data)) {
      if (data.length === 0) {
        // empty array
        body.append(key, []);
      } else {
        // not empty array
        data.forEach((arrData, mainIndex) => {
          let k = key + '[' + mainIndex + ']';
          if (self._isSimpleObject(arrData)) {
            // Object, not null
            Object.keys(arrData).forEach((keyArrData) => {
              body = self._prepareFormData(self, body, arrData[keyArrData], k + '[_obj][' + keyArrData + ']');
            });
          } else if (self._isFile(arrData)) {
            // File or Blobs
            body.append(k, arrData);
          } else if (Array.isArray(arrData)) {
            // Array
            body = self._prepareFormData(self, body, arrData, k);
          } else {
            // strings, null, numbers
            body.append(k, arrData);
          }
        });
      }
    } else if (self._isSimpleObject(data)) {
      // Object, not null
      Object.keys(data).forEach((keyArrData) => {
        body = self._prepareFormData(self, body, data[keyArrData], key + '[_obj][' + keyArrData + ']');
      });
    } else {
      // for Blob, File, strings, null vals
      body.append(key, data);
    }
    return body;
  }

  _isFile(data) {
    return data instanceof File || data instanceof Blob;
  }

  _isSimpleObject(data) {
    return data !== null && typeof data === 'object' && !Array.isArray(data) && !this._isFile(data);
  }

};

export default EtoolsAjaxDataMixin = dedupingMixin(internalEtoolsAjaxDataMixin);
