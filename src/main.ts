import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

import './style.css'
import App from './App.vue'
import router from './router'
// import { initializeApiBaseUrl } from './services/http'
import { pinia } from './stores'

// await initializeApiBaseUrl()

const app = createApp(App)

app.use(pinia)
app.use(Antd)
app.use(router)
app.mount('#app')
