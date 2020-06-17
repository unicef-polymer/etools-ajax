import {fireEvent} from './fire-custom-event.js';

const globalMessage = 'An error occurred. Please try again later.';
const httpStatus413Msg = 'The uploaded file is too large!';

export function tryGetResponseError(response) {
  if (response.status === 413) {
    return httpStatus413Msg;
  }
  if (response.status >= 401) {
    return globalMessage;
  }
  return response.response || globalMessage;
}

export function getErrorsArray(errors) {
  // @ts-ignore
  const errorsArray = [];
  if (!errors) {
    // @ts-ignore
    return errorsArray;
  }

  if (typeof errors === 'string') {
    errorsArray.push(errors);
    return errorsArray;
  }
  if (typeof errors === 'object' && errors.error && typeof errors.error === 'string') {
    errorsArray.push(errors.error);
    return errorsArray;
  }

  if (typeof errors === 'object' && errors.errors && Array.isArray(errors.errors)) {
    errors.errors.forEach(function (err) {
      if (typeof err === 'object') {
        const errKeys = Object.keys(err);
        if (errKeys.length > 0) {
          errKeys.forEach(function (k) {
            errorsArray.push(err[k]); // will work only for strings
          });
        }
      } else {
        errorsArray.push(err);
      }
    });
    return errorsArray;
  }

  if (typeof errors === 'object' && errors.non_field_errors && Array.isArray(errors.non_field_errors)) {
    [].push.apply(errorsArray, errors.non_field_errors);
    return errorsArray;
  }

  if (Array.isArray(errors) && errors.length > 0 && _isArrayOfStrings(errors)) {
    Array.prototype.push.apply(errorsArray, errors);
    return errorsArray;
  }

  if (typeof errors === 'object' && Object.keys(errors).length > 0) {
    let errField;
    for (errField in errors) { // eslint-disable-line

      if (typeof errors[errField] === 'string') {
        errorsArray.push('Field ' + errField + ' - ' + errors[errField]);
        continue;
      }
      if (Array.isArray(errors[errField]) && errors[errField].length > 0) {
        let parentErr = 'Field ' + errField + ': ';
        let nestedErrs = getErrorsArray(errors[errField]);
        if (nestedErrs.length === 1) {
          parentErr += nestedErrs[0];
          errorsArray.push(parentErr);
        } else {
          errorsArray.push(parentErr);
          // * The marking is used for display in etools-error-messages-box
          // * and adds a welcomed identations when displayed as a toast message
          nestedErrs = _markNestedErrors(nestedErrs);
          Array.prototype.push.apply(errorsArray, nestedErrs);
        }
        continue;
      }
      if (typeof errors[errField] === 'object' && Object.keys(errors[errField]).length > 0) {
        let errF;
        for (errF in errors[errField]) {
          if (errors[errField][errF]) {
            errorsArray.push('Field ' + errField + '(' + errF + ') - ' + errors[errField][errF]);
          }
        }
      }
    }
  }

  return errorsArray;
}

function _markNestedErrors(errs) {
  // @ts-ignore
  return errs.map((er) => ' ' + er);
}

function _isArrayOfStrings(arr) {
  let allStrings = true;
  let i;
  for (i = 0; i < arr.length; i++) {
    if (typeof arr[i] !== 'string') {
      allStrings = false;
      break;
    }
  }
  return allStrings;
}

export function formatServerErrorAsText(error) {
  const errorResponse = tryGetResponseError(error);
  const errorsArray = getErrorsArray(errorResponse);
  if (errorsArray && errorsArray.length) {
    return errorsArray.join('\n');
  }
  return error;
}

export function parseRequestErrorsAndShowAsToastMsgs(error, source, redirectOn404 = false) {
  if (redirectOn404 && error.status === 404) {
    fireEvent(source, '404');
    return;
  }

  const errorsString = formatServerErrorAsText(error);

  showErrorAsToastMsg(errorsString, source);
}

export function showErrorAsToastMsg(errorsString, source) {
  if (errorsString) {
    fireEvent(source, 'toast', {text: errorsString, showCloseBtn: true});
  }
}
