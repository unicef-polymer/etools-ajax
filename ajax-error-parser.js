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
 * @param keyTranslate - optional function to translate error keys
 * @returns {string[]}
 */
export function getErrorsArray(errors, keyTranslate = defaultKeyTranslate) {
  if (!errors) {
    return [];
  }

  if (typeof errors === 'string') {
    return [errors];
  }

  if (Array.isArray(errors)) {
    return errors.map((error) => (typeof error === 'string' ? error : getErrorsArray(error, keyTranslate))).flat();
  }

  const isObject = typeof errors === 'object';
  if (isObject && errors.error && typeof errors.error === 'string') {
    return [errors.error];
  }

  if (isObject && errors.errors && Array.isArray(errors.errors)) {
    return errors.errors
      .map(function (err) {
        if (typeof err === 'object') {
          return Object.values(err); // will work only for strings
        } else {
          return err;
        }
      })
      .flat();
  }

  if (isObject && errors.non_field_errors && Array.isArray(errors.non_field_errors)) {
    return errors.non_field_errors;
  }

  if (isObject && errors.code) {
    return parseTypedError(errors, keyTranslate);
  } else if (isObject) {
    return Object.entries(errors)
      .map(([field, value]) => {
        const translatedField = keyTranslate(field);
        if (typeof value === 'string') {
          return `Field ${translatedField} - ${value}`;
        }
        if (Array.isArray(value)) {
          const baseText = `Field ${translatedField}: `;
          const textErrors = getErrorsArray(value, keyTranslate);
          // * The marking is used for display in etools-error-messages-box
          // * and adds a welcomed identations when displayed as a toast message
          return textErrors.length === 1 ? `${baseText}${textErrors}` : [baseText, ..._markNestedErrors(textErrors)];
        }
        if (typeof value === 'object') {
          return Object.entries(value).map(
            ([nestedField, nestedValue]) =>
              `Field ${translatedField} (${keyTranslate(nestedField)}) - ${getErrorsArray(nestedValue, keyTranslate)}`
          );
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

export function formatServerErrorAsText(error, keyTranslate) {
  const errorResponse = tryGetResponseError(error);
  const errorsArray = getErrorsArray(errorResponse, keyTranslate);
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

function parseTypedError(errorObject, keyTranslate) {
  switch (errorObject.code) {
    case 'required_in_status':
      const fields = errorObject.extra.fields.map((field) => keyTranslate(field)).join(', ');
      return `${keyTranslate('required_in_status')}: ${fields}`;
    default:
      return errorObject.description || '';
  }
}

export function defaultKeyTranslate(key = '') {
  return key
    .split('_')
    .map((fieldPart) => `${fieldPart[0].toUpperCase()}${fieldPart.slice(1)}`)
    .join(' ');
}
