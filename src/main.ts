import './style.css'
import html6 from './html6';


const routes = [
  {
    template: `http://localhost:3000/home.html`,
    title: "Home page",
    id: "home"
  },
  {
    template: `http://localhost:3000/about.html`,
    title: "About page",
    id: "about"
  },

];

function showLoader(bool: boolean) {
  const elm = document.querySelector("#loading") as HTMLElement;
  if (elm && bool) {
    elm.style.display = 'block';
  }

  if (elm && !bool) {
    elm.style.display = 'none';
  }
}



window.addEventListener("DOMContentLoaded", (ev) => {
  const app = document.querySelector('#app');
  html6.onNavigation = () => {
    showLoader(true);
  }

  html6.onNavigationEnd = () => {
    showLoader(false);
  }

  html6.init(app, routes);
});







