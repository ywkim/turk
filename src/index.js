// @flow

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import enUS from 'antd/lib/locale-provider/en_US';
import { LocaleProvider } from 'antd';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import store from './state/store';

ReactDOM.render(
  <Provider store={store}>
    <LocaleProvider locale={enUS}>
      <App />
    </LocaleProvider>
  </Provider>,
  document.getElementById('root')
);
registerServiceWorker();
