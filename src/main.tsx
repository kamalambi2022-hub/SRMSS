// @ts-ignore: missing declaration file for react
import {StrictMode, createElement} from 'react';
// @ts-ignore: missing declaration file for react-dom/client
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import AppRouter from './AppRouter.tsx';
import {AuthProvider} from './authentication/context/AuthContext.tsx';
// @ts-ignore: side-effect import of CSS file without declaration
import './index.css';

createRoot(document.getElementById('root')!).render(
  createElement(
    StrictMode,
    null,
    createElement(
      BrowserRouter,
      null,
      createElement(AuthProvider, null, createElement(AppRouter, null)),
    ),
  ),
);
