import {_getCSRFCookie, tryJsonParse} from './etools-ajax-utils';

const activeXhrRequests = {};

export function getActiveXhrRequests() {
  return activeXhrRequests;
}

export async function upload(config, rawFile, filename, onProgressCallback) {
  const headers = await _getHeaders(config.jwtLocalStorageKey);
  const options = {
    method: 'POST',
    url: _getEndpoint(config.endpointInfo, config.uploadEndpoint),
    body: _prepareBody(rawFile, filename, config.endpointInfo),
    rejectWithRequest: true,
    headers
  };
  return sendRequest(options, filename, onProgressCallback)
    .then((response) => {
      delete activeXhrRequests[filename];
      if (typeof response === 'string') {
        response = JSON.parse(response);
      }
      return response;
    })
    .catch((error) => {
      delete activeXhrRequests[filename];
      throw error;
    });
}

async function _getHeaders(jwtLocalStorageKey) {
  const csrfToken = _getCSRFCookie();
  let jwtToken = _getJwtToken(jwtLocalStorageKey);
  const headers = {};
  if (csrfToken) {
    headers['x-csrftoken'] = csrfToken;
  }
  if (jwtLocalStorageKey) {
    if (window.AppMsalInstance) {
      try {
        jwtToken = await window.AppMsalInstance.acquireTokenSilent();
      } catch (err) {
        window.location.reload(true);
      }
    }
    if (jwtToken) {
      headers['authorization'] = 'JWT ' + jwtToken;
    }
  }
  return headers;
}

function _getEndpoint(endpointInfo, uploadEndpoint) {
  if (endpointInfo && endpointInfo.endpoint) {
    return endpointInfo.endpoint;
  }
  return uploadEndpoint;
}

function _prepareBody(rawFile, filename, endpointInfo) {
  const fd = new FormData();

  const rawFileProperty = _getRawFilePropertyName(endpointInfo);
  fd.append(rawFileProperty, rawFile, filename);

  if (endpointInfo && endpointInfo.extraInfo) {
    _addAnyExtraInfoToBody(fd, endpointInfo.extraInfo);
  }
  return fd;
}

function sendRequest(options, requestKey, onProgressCallback) {
  const request = document.createElement('iron-request');
  if (typeof onProgressCallback === 'function') {
    request.xhr.upload.onprogress = onProgressCallback;
  }
  activeXhrRequests[requestKey] = request;
  request.send(options);
  return request.completes
    .then((request) => {
      return request.response;
    })
    .catch((err) => {
      const error = err.error;
      const request = err.request;
      const message = Object.values(tryJsonParse(request.xhr.response)).join(',');

      // check request aborted, no error handling in this case
      if (!request.aborted) {
        throw new EtoolsUploadRequestError(request, {message: message});
      } else {
        throw error;
      }
    });
}

export function EtoolsUploadRequestError(request, error) {
  this.request = request;
  this.error = error;
}

function _getRawFilePropertyName(endpointInfo) {
  if (endpointInfo && endpointInfo.rawFilePropertyName) {
    return endpointInfo.rawFilePropertyName;
  }
  return 'file';
}

function _addAnyExtraInfoToBody(formData, extraInfo) {
  for (const prop in extraInfo) {
    if (Object.prototype.hasOwnProperty.call(extraInfo, prop)) {
      formData.append(prop, extraInfo[prop]);
    }
  }
}

function _getJwtToken(jwtLocalStorageKey) {
  return localStorage.getItem(jwtLocalStorageKey);
}

export function abortActiveRequests(activeReqKeys) {
  if (!activeXhrRequests) {
    return;
  }
  const keys = activeReqKeys || Object.keys(activeXhrRequests);
  if (keys.length) {
    keys.forEach((key) => {
      try {
        activeXhrRequests[key].abort();
        delete activeXhrRequests[key];
      } catch (error) {
        //
      }
    });
  }
}
