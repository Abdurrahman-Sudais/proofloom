import React from 'react';
import {hydrateRoot,createRoot} from 'react-dom/client';
import App from './App.jsx';
import './style.css';
import './app/app.css';
const element=document.getElementById('root');
const node=<App path={globalThis.__proofloomPreview?'/':location.pathname}/>;
const root=element.children.length?hydrateRoot(element,node):createRoot(element);
if(!element.children.length)root.render(node);
if(globalThis.__proofloomPreview){
 document.addEventListener('click',event=>{
  const link=event.target.closest('a');if(!link||link.download||!link.getAttribute('href')?.startsWith('/'))return;
  event.preventDefault();const [path,hash]=link.getAttribute('href').split('#');
  root.render(<App path={path||'/'}/>);
  setTimeout(()=>{if(hash)document.getElementById(hash)?.scrollIntoView();else window.scrollTo(0,0);},30);
 });
}
