export const fireEvent = (el, eventName, eventDetail) => {
    el.dispatchEvent(new CustomEvent(eventName, {
        detail: eventDetail,
        bubbles: true,
        composed: true
    }));
};
