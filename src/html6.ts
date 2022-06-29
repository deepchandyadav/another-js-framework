const lib = (() => {

  const renderSpaForeach = (node: HTMLElement, data: any) => {
    node.data = data;
    node.setAttribute("data-updated", "true");
  }

  const renderSpaPrint = (node: HTMLElement, data: any) => {
    node.data = data;
    node.setAttribute("data-updated", "true");
  }

  const renderNode = (node: any, data: any) => {
    if (node.nodeName === "SPA-PRINT") {
      renderSpaPrint(node, data);
    }
    if (node.nodeName === "SPA-FOREACH") {
      const foreachData = data[node.getAttribute("array")];
      renderSpaForeach(node, foreachData);
    }
    if (node.children && node.children.length > 0) {
      Array.from(node.children).forEach(child => {
        renderNode(child, data);
      })
    }
    return node;
  }

  const getDataByPath = (obj: any, path: string) => {
    const keyList = path.split(".");
    for (let index = 0; index < keyList.length; index++) {
      let key = keyList[index];
      if (obj[key]) {
        obj = obj[key];
      } else {
        return undefined;
      }
    }
    return obj;
  }
  return { getDataByPath, renderNode };
})();

class SpaPrint extends HTMLElement {
  public _data = null;
  public _key = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set data(d: any) {
    this._data = d;
  }

  get data() {
    return this._data;
  }

  static get observedAttributes() {
    return ['data-updated'];
  }

  rerender() {
    const key = this.innerHTML.trim();
    const data = this.data;
    if (!key || !data) return;
    let text = data[key];
    if (!text && key.includes('.')) {
      text = lib.getDataByPath(data, key);
    }
    if (typeof data[key] === 'object') {
      text = JSON.stringify(data[key], null, 2);
    }
    const textNode = document.createTextNode(text);
    this.shadowRoot?.appendChild(textNode);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "data-updated") {
      this.rerender();
    }
  }

}

class SpaForeach extends HTMLElement {
  private _data = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  set data(d: any) {
    this._data = d;
  }

  get data() {
    return this._data;
  }

  static get observedAttributes() {
    return ['data-updated'];
  }

  rerender() {
    const loopElement = this.querySelector("div");
    const itemAs = this.getAttribute('as') ?? "";
    const newNodes = Array.from(this.data).map(itemData => {
      const repeatElm = loopElement?.cloneNode(true);
      return lib.renderNode(repeatElm, { [itemAs]: itemData }, this.style);
    });
    this.shadowRoot?.append(...newNodes);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "data-updated") {
      this.rerender();
    }
  }

}

class Component extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  async executeScript(script: string) {
    const initApi = new Function(script + `
    return { init, exportVars };
  `)();
    const data = await Promise.resolve()
      .then(initApi.init)
      .then(initApi.exportVars);
    return data;
  }

  connectedCallback() {
    const template = this.shadowRoot?.querySelector("template");
    const script = this.shadowRoot?.querySelector("script")?.innerHTML;
    const style = this.shadowRoot?.querySelector("style");
    const nodes: any = template?.content.children;
    const rootDiv = document.createElement("div");
    rootDiv.append(...nodes);
    this.executeScript(script).then(data => {
      lib.renderNode(rootDiv, data, style);
      this.shadowRoot?.append(rootDiv);
    });
  }

}

customElements.define("spa-container", Component);
customElements.define("spa-print", SpaPrint);
customElements.define("spa-foreach", SpaForeach);

export default (() => {
  let routes: any[] = [];
  let root: HTMLElement;
  const api = {
    init: (rootElement: HTMLElement, pageRoutes: any[]) => { },
    onNavigation: () => { },
    onNavigationEnd: () => { }
  };

  function pageString(href?: string) {
    href = href ? href : location.href;
    const url = new URL(href);
    return url.pathname.trim().substring(1);
  }

  const renderPage = (pageContent: string) => {
    const spaContainer = document.createElement("spa-container");
    if (spaContainer.shadowRoot) {
      spaContainer.shadowRoot.innerHTML = pageContent;
    }
    root.querySelector("spa-container")?.remove();
    root.appendChild(spaContainer);
  }


  function getRoute(page: string) {
    return routes.find(route => route.id == page);
  }

  function gotoPage(href: string) {
    const page = pageString(href);
    if (!page) return;
    api.onNavigation();
    const route = getRoute(page);
    loadPage(route.template).then(html => {
      renderPage(html);
      api.onNavigationEnd();
    }).then(() => {
      history.pushState({ url: href }, "", new URL(href).pathname);
    });
  }

  function setUpLink() {
    document.body.addEventListener("click", (ev: any) => {
      if (!ev.target.hasAttribute("spa-link")) {
        return;
      }
      ev.preventDefault();
      if (ev?.target?.href && location.href !== ev?.target?.href) {
        gotoPage(ev?.target?.href);
      }

    })
  }

  const loadPage = async (templateUrl: string) => {
    const response = await fetch(templateUrl);
    const html = await response.text();
    return html;
  }

  const init = (rootElement: HTMLElement, pageRoutes: any[]) => {
    root = rootElement;
    routes = [...pageRoutes];
    setUpLink();
    window.addEventListener("popstate", (ev: PopStateEvent) => {
      gotoPage(ev.state.url);
    });
    gotoPage(location.href);
  }

  api.init = init;
  return api;
})();
