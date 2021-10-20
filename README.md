# Flowx

## TODO

- flowx 内部用到的 class 需要 prefix
- d3 tree layout

## Design

- 用户拖动 handle，cloneNode 一下
- onRender Flowx 会创建容器元素，让用户自己去渲染
- Flowx 会查看容器的大小，然后调整自己的布局
- 收集所有 `data-flowx-xxx` 的属性合并成 data 对象

```typescript
const flowx = new Flowx({
  handleClass: "", // 拖动元素
  canvasElement: "", // 主画布

  classPrefix: "", // "flowx" as default
  datasetPrefix: "", // "flowx" as default

  onRender: async (data = {}, containerEl) => {},
})

type HandleData = object

interface FlowxState {
  rootLeft: number
  rootTop: number
  tree: {
    data: HandleData
    children: {
      data: HandleData
    }[]
  }
}

// flowx.getState()  => FlowxState
// flowx.setState()
```
