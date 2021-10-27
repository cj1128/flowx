import Flowx from "../lib/flowx.js"

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
                <div style="padding: 10px 0;">
                  <label for="cars">rule</label>

                  <select v-model="rule" style="font-size: 25px;font-weight:bold">
                    <option 
                      v-for="i in 10"
                      :value="i"
                    >
                      rule{{i}}
                    </option>
                  </select>
                </div>

                <div @mousedown.stop>
                  <label>
                    triggered
                    <input type="radio" :value="true" v-model="triggered">
                  </label>

                  &nbsp;&nbsp;&nbsp;

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
