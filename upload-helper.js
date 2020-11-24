import {_getCSRFCookie} from './etools-ajax-utils';

const activeXhrRequests = {};

export function getActiveXhrRequests() {
  return activeXhrRequests;
}

export async function upload(config, rawFile, filename) {
  const headers = await _getHeaders(config.jwtLocalStorageKey);
  const options = {
    method: 'POST',
    url: _getEndpoint(config.endpointInfo, config.uploadEndpoint),
    body: _prepareBody(rawFile, filename, config.endpointInfo),
    rejectWithRequest: config.endpointInfo && config.endpointInfo.rejectWithRequest,
    headers
  };
  return sendRequest(options, filename)
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

function sendRequest(options, requestKey) {
  const request = document.createElement('iron-request');
  activeXhrRequests[requestKey] = request;
  request.send(options);
  return request.completes.then((request) => {
    return request.response;
  });
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
