export default (() => {
  let routes: any[] = [];
  let root: HTMLElement;
  const api = {
    init: (rootElement: HTMLElement, pageRoutes: any[]) => { },
    onNavigation: () => { },
    onNavigationEnd: () => { }
  };


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

  const renderForeach = (node: HTMLElement, data: any) => {
    const loopElement = node.querySelector("div");
    const datakey = node.getAttribute('array') ?? "";
    const itemAs = node.getAttribute('as') ?? "";
    const newNodes = Array.from(data[datakey]).map(itemData => {
      const repeatElm = loopElement?.cloneNode(true);
      return renderNode(repeatElm, { [itemAs]: itemData });
    });
    const foreachDiv = document.createElement("div");
    foreachDiv.append(...newNodes);
    foreachDiv.setAttribute("data-foreach", "");
    node.replaceWith(foreachDiv);
  }

  const renderPrint = (node: HTMLElement, data: any) => {
    const key: string = node.innerText.trim();
    let text = data[key];
    if (!text && key.includes('.')) {
      text = getDataByPath(data, key);
    }
    if (typeof data[key] === 'object') {
      text = JSON.stringify(data[key], null, 2);
    }
    const textNode = document.createTextNode(text);
    node.replaceWith(textNode);
    return textNode;
  }

  const renderNode = (node: any, data: any) => {
    if (node.nodeName === "FOREACH") {
      renderForeach(node, data);
    }
    if (node.nodeName === 'PRINT') {
      return renderPrint(node, data);
    }
    if (node.children && node.children.length > 0) {
      Array.from(node.children).forEach(child => {
        renderNode(child, data);
      })
    }
    return node;
  }

  function pageString(href?: string) {
    href = href ? href : location.href;
    const url = new URL(href);
    return url.pathname.trim().substring(1);
  }

  const renderPage = (pageContent: string) => {
    const templateDocument = new DOMParser().parseFromString(pageContent, 'text/html');
    const template = templateDocument.querySelector("template");
    const nodes = template?.content.cloneNode(true);
    const script = templateDocument.querySelector("script")?.innerHTML;
    const style = templateDocument.querySelector("style");
    const initApi = new Function(script + `
      return { init, scope };
    `)();

    Promise.resolve()
      .then(initApi.init)
      .then(initApi.scope)
      .then((data) => {
        if (root) {
          renderNode(nodes, data);
          Array.from(root.children).forEach(child => child.remove());
          root.appendChild(nodes);
          root.querySelector("style")?.remove();
          style ? root.appendChild(style) : null;
        }
      });

  }


  function getRoute(page: string) {
    return routes.find(route => route.id == page);
  }

  function gotoPage(href: string) {
    api.onNavigation();
    const page = pageString(href);
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