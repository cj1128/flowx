# Flowx

## Todo

- 参数收进 opt 中 [Done]
- replace nodeSize with nodeWidth, nodeHeight [Done]
- containerEl 的宽高要保持固定 [Done]
- checkAttach(elA, elB) [Done]
- 用 vite 去跑 demo [Done]
- 用 esbuild 打包 [Done]
- 调研一下 svg 是否可以固定大小
- 垂直方向滚动条问题

- 子树的拖拽

## Design

- 用户拖动 handle，cloneNode 一下
- onRender Flowx 会创建容器元素，让用户自己去渲染
- 收集所有 `data-flowx-xxx` 的属性合并成 data 对象

```typescript
const flowx = new Flowx({
  handleClass: "", // 拖动元素
  canvasElement: "", // 主画布
  nodeSize: [width, height], // 节点宽高

  classPrefix: "", // "flowx" as default
  datasetPrefix: "", // "flowx" as default

  onRender: async (data = {}, containerEl) => {},
})

type HandleData = object

interface Node {
  id: number
  parent: number
  data: Object
  left: number // only in first node
  top: number // only in first node
}

type FlowxState = Node[]

// flowx.getState() => FlowxState
// flowx.setState(FlowxState)
```
