/**
 * DO NOT EDIT
 *
 * This file was automatically generated by
 *   https://github.com/Polymer/tools/tree/master/packages/gen-typescript-declarations
 *
 * To modify these typings, edit the source file(s):
 *   etools-ajax.js
 */


// tslint:disable:variable-name Describing an API that's defined elsewhere.
// tslint:disable:no-any describes the API as best we are able today

import {PolymerElement} from '@polymer/polymer/polymer-element.js';

import {Debouncer} from '@polymer/polymer/lib/utils/debounce.js';

import {timeOut} from '@polymer/polymer/lib/utils/async.js';

declare class EtoolsAjax extends
  EtoolsAjaxRequestMixin(
  Object) {
  url: string|null|undefined;
  method: string|null|undefined;
  endpoint: object|null|undefined;
  params: object|null|undefined;
  body: object|null|undefined;
  send(): any;
  _optionsChanged(): void;
  handleError(error: any): void;
}

declare global {

  interface HTMLElementTagNameMap {
    "etools-ajax": EtoolsAjax;
  }
}
