import Flowx from "../lib/flowx.js"

const $ = document.querySelector.bind(document)

const nodeWidth = 320
const nodeHeight = 80
const marginX = 50
const marginY = 20

let _zoom = 1

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
      nodeWidth,
      nodeHeight,
      marginX,
      marginY,
      onRender: ({ data, id, isRoot }, containerEl) => {
        return new Promise((res, rej) => {
          data.__vm = new Vue({
            el: containerEl,
            template: `
              <div
                style="height: 100%; width: 100%;"
                :style="{zoom}"
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
                zoom: 1,
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
      onRemoveNode(data) {
        data.__vm.$destroy()
      },
      onResizeNode(data) {
        data.__vm.zoom = _zoom
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

const scale = (x) => {
  flowx.resize({
    nodeHeight: nodeHeight * x,
    nodeWidth: nodeWidth * x,
    marginX: marginX * x,
    marginY: marginY * x,
  })
}

$("#zoom-in").addEventListener("click", () => {
  _zoom += 0.1
  scale(_zoom)
})
$("#zoom-out").addEventListener("click", () => {
  if (_zoom <= 0.1) return
  _zoom -= 0.1
  scale(_zoom)
})
$("#reset-zoom").addEventListener("click", () => {
  _zoom = 1
  scale(_zoom)
})
