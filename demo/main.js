import Flowx from "../lib/index.js"

document.addEventListener("DOMContentLoaded", function () {
  window.flowx = new Flowx({
    handleClass: ".flowx-drag", // 拖动元素
    canvasElement: document.querySelector("#canvas"), // 主画布
    nodeSize: [320, 80],
    onRender: (data, containerEl) => {
      return new Promise((res, rej) => {
        new Vue({
          el: containerEl,
          template:
            "<div style='width: 320px; height: 80px; border: 1px solid #eee'>Vue {{ a }}</div>",
          data,
          mounted() {
            res()
          },
        })
      })
    },
  })

  document.querySelector(".get-state").addEventListener("click", () => {
    console.log(flowx.getState())
  })

  document.querySelector(".set-state").addEventListener("click", () => {
    flowx.setState([
      {
        id: 0,
        parent: -1,
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
    ])
  })
})