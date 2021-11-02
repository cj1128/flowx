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
      onRender: ({ data, id, isRoot }, containerEl) => {
        return new Promise((res, rej) => {
          data.__vm = new Vue({
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

                  <button @click="onDelete" v-if="!isRoot" style="margin-right: 8px;">delete one</button>
                  <button @click="onDeleteSub">delete sub</button>
                </div>

                <div @mousedown.stop style="cursor:auto">
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

            computed: {
              isRoot: () => isRoot,
            },

            methods: {
              onDelete() {
                flowx.removeNode(id)
              },

              onDeleteSub() {
                flowx.removeSubTree(id)
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
      onRemove(data) {
        data.__vm.$destroy()
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

let _zoom = 1

$("#zoom-in").addEventListener("click", () => {
  _zoom += 0.1
  flowx.zoom(_zoom)
})

$("#zoom-out").addEventListener("click", () => {
  _zoom -= 0.1
  flowx.zoom(_zoom)
})

$("#reset-zoom").addEventListener("click", () => {
  _zoom = 1
  flowx.zoom(_zoom)
})
