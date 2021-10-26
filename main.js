import Flowx from "./lib/flowx.js"

const $ = document.querySelector.bind(document)

window.flowx = new Flowx({
  canvasElement: $("#canvas"), // 主画布
  onRender: (data, containerEl) => {
    return new Promise((res, rej) => {
      new Vue({
        el: containerEl,
        template: `
          <div>
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
          }
        },
        methods: {
          onClick() {
            this.id++
          },
        },
        mounted() {
          res()
        },
      })
    })
  },
})

$(".clear").addEventListener("click", async () => {
  await flowx.setState([])
})

document.querySelector(".get-state").addEventListener("click", () => {
  console.log(flowx.getState())
})

document.querySelector(".set-state").addEventListener("click", () => {
  flowx.setState([
    {
      id: 0,
      parent: "",
      left: 200,
      top: 300,
      data: {
        a: "0",
      },
    },
    {
      id: 1,
      parent: 0,
      data: {
        a: "1",
      },
    },
    {
      id: 2,
      parent: 0,
      data: {
        a: "2",
      },
    },
    {
      id: 3,
      parent: 0,
      data: {
        a: "3",
      },
    },
    {
      id: 4,
      parent: 2,
      data: {
        a: "4",
      },
    },
  ])
})
