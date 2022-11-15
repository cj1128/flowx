import Vue from "vue"
import App from "./App.vue"
import ElementUI from "element-ui"
import Router from "vue-router"
import "element-ui/lib/theme-chalk/index.css"
import "virtual:windi.css"
import "./styles.css"

Vue.use(Router)
Vue.use(ElementUI)

const router = new Router({
  mode: "history",
  routes: [
    {
      path: "/",
      component: () => import("./Basic/Basic.vue"),
    },
    {
      path: "/condition-tree",
      component: () => import("./ConditionTree/ConditionTree.vue"),
    },
  ],
})

window._vm = new Vue({
  el: "#app",
  router,
  render: (h) => h(App),
})
