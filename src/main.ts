import './style.css'

const loadPage = async (page: string) => {
  const response = await fetch(`http://localhost:3000/${page}.html`);
  const html = await response.text();
  return html;
}

const renderPage = (() => {
  const app = document.querySelector('#app');
  return (pageContent: string) => {
    const templateDocument = new DOMParser().parseFromString(pageContent, 'text/html');
    const template = templateDocument.querySelector("template")?.innerHTML;
    const script = templateDocument.querySelector("script")?.innerHTML;
    const style = templateDocument.querySelector("style")?.cloneNode(true);
    const dynFunc = new Function(script + `
      function render(scope){
        return \` ${template} \`;
      }
      return { scope: scope, render: render };
    `);
    const result = dynFunc();
    if (app) {
      app.innerHTML = result.render(result.scope());
      app.querySelector("style")?.remove();
      style ? app.appendChild(style) : null;
    }
  }
})();

function pageString(href?: string) {
  href = href ? href : location.href;
  const url = new URL(href);
  return url.pathname.trim().substring(1);

}

function showLoader(bool) {
  const elm = document.querySelector("#loading");
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
