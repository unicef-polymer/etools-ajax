import {PolymerElement} from '@polymer/polymer/polymer-element.js';
import {Debouncer} from '@polymer/polymer/lib/utils/debounce.js';
import EtoolsAjaxRequestMixin from './etools-ajax-request-mixin.js';
import {timeOut} from '@polymer/polymer/lib/utils/async.js';
import {logError} from '@unicef-polymer/etools-behaviors/etools-logging';
import {formatServerErrorAsText} from './ajax-error-parser';
import {getRequestHeaders} from './etools-ajax-utils';

/**
 * @polymer
 * @customElement
 * @applies EtoolsAjaxRequestMixin
 */
class EtoolsAjax extends EtoolsAjaxRequestMixin(PolymerElement) {
  static get is() {
    return 'etools-ajax';
  }

  static get properties() {
    return {
      url: String,
      method: String,
      endpoint: Object,
      params: Object,
      body: Object
    };
  }

  static get observers() {
    return [
      '_optionsChanged(url)',
      '_optionsChanged(endpoint)',
      '_optionsChanged(params)',
      '_optionsChanged(method)'
    ];
  }

  send() {
    let opt = {
      endpoint: this.endpoint || {url: this.url},
      params: this.params,
      method: this.method,
      body: this.body
    };

    let headers = getRequestHeaders(opt);

    return this.sendRequest(headers)
      .then((data) => {
        this.dispatchEvent(new CustomEvent('success', {detail: data, bubbles: true, composed: true}));
        return data;
      })
      .catch((error) => {
        logError('error', error.error);
        formatServerErrorAsText(error);
      });
  }

  _optionsChanged() {
    this._debouncer = Debouncer.debounce(this._debouncer,
      timeOut.after(300),
      () => {
        if (!this.endpoint && !this.url) {
          return;
        }
        this.send();
      });
  }

}

customElements.define(EtoolsAjax.is, EtoolsAjax);
