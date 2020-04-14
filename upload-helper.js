let activeXhrRequests = {};

export async function upload(config, rawFile, filename) {
    let headers = await _getHeaders(config.jwtLocalStorageKey);
    let options = {
        method: 'POST',
        url: _getEndpoint(config.endpointInfo, config.uploadEndpoint),
        body: _prepareBody(rawFile, filename, config.endpointInfo),
        headers
    };
    return sendRequest(options, filename)
        .then((response) => {
            delete activeXhrRequests[filename];
            if (typeof response === 'string') {
                response = JSON.parse(response);
            }
            return response;
        }).catch((error) => {
            delete activeXhrRequests[filename];
            throw error;
        });
}

async function _getHeaders(jwtLocalStorageKey) {
    let csrfToken = _getCSRFToken();
    let jwtToken = _getJwtToken(jwtLocalStorageKey);
    let headers = {};
    if (csrfToken) {
        headers['x-csrftoken'] = csrfToken;
    }
    if (jwtToken) {
        if (window.AppMsalInstance) {
            if (!window.AppMsalInstance.tokenIsValid(jwtToken)) {
                try {
                    jwtToken = await window.AppMsalInstance.acquireTokenSilent();
                } catch (err) {
                    window.location.reload(true);
                }
            }
        }
        headers['authorization'] = 'JWT ' + jwtToken;
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
    let fd = new FormData();

    let rawFileProperty = _getRawFilePropertyName(endpointInfo);
    fd.append(rawFileProperty, rawFile, filename);

    if (endpointInfo && endpointInfo.extraInfo) {
        _addAnyExtraInfoToBody(fd, endpointInfo.extraInfo);
    }
    return fd;
}

function sendRequest(options, requestKey) {
    let request = document.createElement('iron-request');
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
    for (let prop in extraInfo) {
        if (extraInfo.hasOwnProperty(prop)) {
            formData.append(prop, extraInfo[prop]);
        }
    }
}

function _getCSRFToken() {
    // check for a csrftoken cookie and return its value
    let csrfCookieName = 'csrftoken';
    let csrfToken = null;
    if (document.cookie && document.cookie !== '') {
        let cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            if (cookie.substring(0, csrfCookieName.length + 1) === (csrfCookieName + '=')) {
                csrfToken = decodeURIComponent(cookie.substring(csrfCookieName.length + 1));
                break;
            }
        }
    }
    return csrfToken;
}

function _getJwtToken(jwtLocalStorageKey) {
    return localStorage.getItem(jwtLocalStorageKey);
}
