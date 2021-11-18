import { createApp } from 'vue'
import App from './App.vue'
import store from '@/store'
import router from '@/router'


const forumApp = createApp(App)
forumApp.use(router)
forumApp.use(store)

//Globally register components that Start with the App prefix
const requireComponent = require.context("./components", true, /App[A-Z]\w+\.(vue|js)$/)
requireComponent.keys().forEach(function (fileName) {
  let baseComponentConfig = requireComponent(fileName)
  baseComponentConfig = baseComponentConfig.default || baseComponentConfig
  const baseComponentName = baseComponentConfig.name || (
    fileName
      .replace(/^.+\//, '')
      .replace(/\.\w+$/, '')
  )
  forumApp.component(baseComponentName, baseComponentConfig)
})
//End Global import

forumApp.mount('#app')
