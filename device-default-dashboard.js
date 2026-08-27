const LitElement = Object.getPrototypeOf(customElements.get("home-assistant-main"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

class DeviceDefaultPanel extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      narrow: { type: Boolean },
      route: { type: Object },
      panel: { type: Object },
    };
  }

  firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this._getDashboards();
  }

  async _getDashboards() {
    this._dashboards = await this.hass.callWS({
        type: "lovelace/dashboards/list"
    });
    this.requestUpdate();
  }

  async _dashboardChanged(ev) {
    const urlPath = ev.detail.value;
    if (!urlPath) return;

    console.info("selected", urlPath);
    window.localStorage.setItem("defaultPanel", JSON.stringify(urlPath));

    await this.hass.connection.sendMessagePromise({
        type: "frontend/set_user_data",
        key: "core",
        value: {
            ...this.hass.userData,
            default_panel: undefined,
        }
    });

    await this.hass.connection.sendMessagePromise({
        type: "frontend/set_system_data",
        key: "core",
        value: {
            ...this.hass.systemData,
            default_panel: undefined,
        }
    });

    this.requestUpdate();
  }

  render() {
    var val = "";
    try {
      val = JSON.parse(window.localStorage.getItem("defaultPanel")) || "";
    } catch {}

    const options = this._dashboards
      ? this._dashboards.map((dashboard) => ({
          value: dashboard.url_path,
          label: dashboard.title,
        }))
      : undefined;

    return html`
      <div>
        Select dashboard:
        <div>${this._dashboards
          ? html`
              <ha-select
                .label=${"Dashboard"}
                .value=${val}
                .options=${options}
                @selected=${this._dashboardChanged}
                naturalMenuWidth
              ></ha-select>
            `
          : html`<div class="loading">
              <ha-spinner size="small"></ha-spinner>
            </div>`}<div>
        <pre><button onclick="history.back()">Back</button></pre>
      </div>
    `;
  }

  static get styles() {
    return css`
      :host {
        padding: 16px;
        display: block;
      }
    `;
  }
}
customElements.define("device-default-dashboard", DeviceDefaultPanel);
