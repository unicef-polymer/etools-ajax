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

/**
 *
 * @param errors
 * @returns {string[]}
 */
export function getErrorsArray(errors) {
  if (!errors) {
    return [];
  }

  if (typeof errors === 'string') {
    return [errors];
  }

  const isObject = typeof errors === 'object';
  if (isObject && errors.error && typeof errors.error === 'string') {
    return [errors.error];
  }

  if (isObject && errors.errors && Array.isArray(errors.errors)) {
    return errors.errors.map(function (err) {
      if (typeof err === 'object') {
        return Object.values(err); // will work only for strings
      } else {
        return err;
      }
    }).flat();
  }

  if (isObject && errors.non_field_errors && Array.isArray(errors.non_field_errors)) {
    return errors.non_field_errors;
  }

  if (Array.isArray(errors) && _isArrayOfStrings(errors)) {
    return errors;
  }

  if (isObject) {
    return Object
      .entries(errors)
      .map(([field, value]) => {
        if (typeof value === 'string') {
          return `Field ${field} - ${value}`;
        }
        if (Array.isArray(value)) {
          const baseText = `Field ${field}: `;
          const textErrors = getErrorsArray(value);
          // * The marking is used for display in etools-error-messages-box
          // * and adds a welcomed identations when displayed as a toast message
          return textErrors.length === 1 ? `${baseText}${textErrors}` : [baseText, ..._markNestedErrors(textErrors)];
        }
        if (typeof value === 'object') {
          return Object
            .entries(value)
            .map(([nestedField,  ]) =>
              `Field ${field} (${nestedField}) - ${getErrorsArray(nestedValue)}`);
        }
      })
      .flat();
  }

  return [];
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
