import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index.js' // We voegen /index.js toe

import './assets/main.css'

const app = createApp(App)

app.use(router)

app.mount('#app')
