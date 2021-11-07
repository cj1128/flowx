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
      nodeWidth: 380,
      nodeHeight: 140,
      borderColor: "red",
      shouldUpdate(newTree, oldTree) {
        // restriction 1. rule10 can not be the root
        if (newTree.data.id === "10") {
          Vue.prototype.$message("rule10 can not be root")
          return false
        }

        // restriction 2. rule9 can not follow rule6
        {
          function check(node) {
            if (node.data.id === "6") {
              if (node.children.some((b) => b.data.id === "9")) {
                return true
              }
            }

            return node.children.some((n) => check(n))
          }

          if (check(newTree)) {
            Vue.prototype.$message("rule9 can not follow rule6")
            return false
          }
        }

        return true
      },
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

                  <el-select v-model="rule" placeholder="请选择" @mousedown.native.stop>
                    <el-option
                      v-for="item in 10"
                      :key="item"
                      :label="item"
                      :value="item">
                    </el-option>
                  </el-select>
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

                <div style="display: flex; padding: 10px 0;">
                  <button @click="onDelete" v-if="!isRoot" style="margin-right: 8px;">delete one</button>
                  <button @click="onDeleteSub">delete sub</button>
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
