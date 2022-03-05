import Vue from "vue";
import VueRouter from "vue-router";
import Vuex from "vuex";

import router from "./router";
import store from "./store/index";
import IndiaComplianceAccountApp from "./IndiaComplianceAccountApp.vue";
import authService from "./services/AuthService";

class IndiaComplianceAccountPage {
    constructor(wrapper) {
        this.containerId = "india-compliance-account-app-container";

        // Why need container? Because Vue replaces the element with the component.
        // So, if we don't have a container, the component will be rendered on the #body
        // and removes the element #page-india-compliance-account,
        // which is required by frappe route in order to work it properly.
        $(wrapper).html(`<div id="${this.containerId}"></div>`);
        this.show();
    }

    show() {
        Vue.use(VueRouter);
        Vue.use(Vuex);

        new Vue({
            el: `#${this.containerId}`,
            router,
            store,
            render: (h) => h(IndiaComplianceAccountApp),
        });
    }
}

frappe.provide("india_compliance.page");
india_compliance.page.IndiaComplianceAccountPage = IndiaComplianceAccountPage;

frappe.provide("india_compliance.gst_api");
india_compliance.gst_api.call = async function (endpoint, options) {
    try {
        const base_url = "http://apiman.localhost:8000/api/method/apiman.api.";
        const url = base_url + endpoint;

        const headers = { "Content-Type": "application/json" };
        if (options.headers) Object.assign(headers, options.headers);

        if (options.with_api_secret || options.api_secret) {
            const api_secret =
                options.api_secret || (await authService.get_api_secret());
            headers["X-API-KEY"] = api_secret;
        }

        response = await fetch(url, {
            method: options.method || "POST",
            headers,
            body: JSON.stringify(options.body || {}),
        });

        const data = await response.json();
        if (response.ok) return { success: true, ...data };

        throw new Error(extract_error_message(data));
    } catch (e) {
        return {
            success: false,
            error: e.message || "Something went wrong, Please try again later!",
        };
    }
};

function extract_error_message(responseError) {
    const { exc_type, exception, _server_messages } = responseError;
    if (!exception) {
        if (_server_messages) {
            const server_messages = JSON.parse(_server_messages);
            return server_messages
                .map((message) => JSON.parse(message).message || "")
                .join("\n");
        }
        return "Something went wrong, Please try again later!";
    }
    return exception
        .replace(new RegExp(".*" + exc_type + ":", "gi"), "")
        .trim();
}
