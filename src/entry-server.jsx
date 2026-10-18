import React from 'react';
import {renderToString} from 'react-dom/server';
import App from './App.jsx';
export const render=path=>renderToString(<App path={path}/>);
export {default as App} from './App.jsx';
