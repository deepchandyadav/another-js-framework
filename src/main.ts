import './style.css'

const loadPage = async (page: string) => {
  const response = await fetch(`http://localhost:3000/${page}.html`);
  const html = await response.text();
  return html;
}

function makeScopeAttr(length: number) {
  var result = '';
  var characters = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const renderPage = (() => {
  const viewContainer = document.querySelector('#view-container');
  return (pageContent: string) => {
    const templateDocument = new DOMParser().parseFromString(pageContent, 'text/html');
    const template = templateDocument.querySelector("template")?.innerHTML;
    const script = templateDocument.querySelector("script")?.innerHTML;
    const style = templateDocument.querySelector("style");
    let styleScope = "";
    if (style?.hasAttribute("scoped")) {
      styleScope = makeScopeAttr(10);
      const styles = style?.innerText.split("}")
        .map(st => st.replaceAll("\n", "").trim())
        .filter(v => v)
        .map(st => `${st} }`);
      console.log(styles)
      const newStyles = styles.map(st => `[${styleScope}] ${st}`).join(" \n");
      console.log(newStyles)
      style.innerHTML = newStyles;
    }
    const initApi = new Function(script + `
      return { init, scope };
    `)();

    Promise.resolve()
      .then(initApi.init)
      .then(initApi.scope)
      .then((data) => {
        const scopeKeys = Object.keys(data);
        const renderer = new Function(script + `
          return function ({${scopeKeys.join(',')}}){
            return \` ${template} \`;
          };    
        `)();

        if (viewContainer) {
          viewContainer.innerHTML = `<div ${styleScope}>${renderer(data)}</div>`;
          viewContainer.querySelector("style")?.remove();
          style ? viewContainer.appendChild(style) : null;
        }
      });

  }
})();

function pageString(href?: string) {
  href = href ? href : location.href;
  const url = new URL(href);
  return url.pathname.trim().substring(1);

}

function showLoader(bool: boolean) {
  const elm = document.querySelector("#loading") as HTMLElement;
  if (elm && bool) {
    elm.style.display = 'block';
  }

  if (elm && !bool) {
    elm.style.display = 'none';
  }
}

function onNav(href: string) {
  showLoader(true);
  const page = pageString(href);
  loadPage(page).then(html => {
    renderPage(html);
    showLoader(false);
  });
}
document.querySelector("nav")?.addEventListener("click", ev => {
  ev.preventDefault();
  if (ev?.target?.href && location.href !== ev?.target?.href) {
    onNav(ev?.target?.href);
    history.pushState({ url: ev?.target?.href }, "", new URL(ev?.target?.href).pathname);
  }
})


window.addEventListener("popstate", (ev: PopStateEvent) => {
  onNav(ev.state.url);
})

window.addEventListener("DOMContentLoaded", (ev) => {
  const page = pageString();
  if (page) {
    onNav(location.href);
  }
});
