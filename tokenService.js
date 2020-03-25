import {logError} from '@unicef-polymer/etools-behaviors/etools-logging';

export function tokenIsValid(token) {
  let decodedToken = decodeBase64Token(token);
  if (!decodedToken) {
    return false;
  }
  if (!navigator.onLine && decodedToken) {
    // if user is offline, but he was logged at least once,
    // then user should be able to access offline functionality
    return true;
  }
  return Date.now() < Number(decodedToken.exp + '000');
}

function decodeBase64Token(token) {
  if (!token) {
    return null;
  }
  let base64Url = token.split('.')[1];
  let base64 = base64Url.replace('-', '+').replace('_', '/');
  return JSON.parse(window.atob(base64));
}

export function acquireTokenSilent(scopes) {
  if (!window.msal) {
    return Promise.reject(null);
  }
  return window.msal.acquireTokenSilent({scopes: scopes})
    .then((response) => {
      return response.idToken.rawIdToken;
    })
    .catch((er) => {
      logError(er, 'acquireTokeSilent');
      return null;
    });
}
