import Flowx from "./lib/flowx.js"

const $ = document.querySelector.bind(document)

new Vue({
  el: "#app",

  data() {
    return {
      drawer: false,
    }
  },

  mounted() {
    const self = this

    window.flowx = new Flowx({
      canvasElement: $("#canvas"), // 主画布
      onRender: (data, containerEl) => {
        return new Promise((res, rej) => {
          new Vue({
            el: containerEl,
            template: `
              <div
                style="height: 100%; width: 100%;"
                @dblclick="openDrawer"
              >
                <div>
                  <label for="cars">rule</label>
                  <select v-model="rule">
                    <option value="1">rule1</option>
                    <option value="2">rule2</option>
                    <option value="3">rule3</option>
                    <option value="4">rule4</option>
                  </select>
                </div>

                <div>
                  <label>
                    triggered
                    <input type="radio" :value="true" v-model="triggered">
                  </label>
                  <label>
                    not triggered
                    <input type="radio" :value="false" v-model="triggered">
                  </label>
                </div>
              </div>
            `,
            data() {
              return {
                rule: data.id || "1",
                triggered: true,
                drawer: true,
              }
            },
            methods: {
              onClick() {
                this.id++
              },

              openDrawer() {
                self.openDrawer()
              },
            },
            mounted() {
              res()
            },
          })
        })
      },
    })
  },

  methods: {
    clear() {
      flowx.clear()
    },

    openDrawer() {
      this.drawer = true
    },
  },
})
