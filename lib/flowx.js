import { stratify, tree } from "d3-hierarchy"
import { select } from "d3-selection"
import "./flowx.css"

let _id = 1
const genID = () => (_id++).toString()

const emptyFn = () => {}

export default class Flowx {
  constructor(cfg = {}) {
    this.config = {
      canvasElement: cfg.canvasElement,
      onRender: cfg.onRender,
      onUpdate: cfg.onUpdate || emptyFn,
      onRemoveNode: cfg.onRemoveNode || emptyFn,
      handleClass: cfg.handleClass || ".flowx-drag",
      nodeWidth: cfg.nodeWidth || 320,
      nodeHeight: cfg.nodeHeight || 80,
      marginX: cfg.marginX || 50,
      marginY: cfg.marginY || 20,
    }
    this.blocks = []

    // 设置 init style
    this.config.canvasElement.style.position = "relative"
    this.config.canvasElement.style.cursor = "grab"

    // 用于绘制 path
    this.svg = select(this.config.canvasElement)
      .append("svg")
      .attr("style", "position: absolute; left: 0; top: 0;")
      .attr("width", this.config.canvasElement.offsetWidth)
      .attr("height", this.config.canvasElement.offsetHeight)
      .append("g")

    // 当前正在拖动的元素
    this.dragEl = null
    this.dragData = null
    // 挡墙正在拖动的子树
    this.draggingBlocks = null
    // 拖动子树时子树的跟节点
    this.dragAnchor = null

    // 画布拖动起点坐标，相对于视口
    this.canvasDragStart = null

    // start coordinate of current dragging element
    // relative to the viewport
    this.dragX = 0
    this.dragY = 0

    this.absx = this.config.canvasElement.getBoundingClientRect().left
    this.absy = this.config.canvasElement.getBoundingClientRect().top

    // 移动还是复制子树
    this.isCopy = false

    this.onMouseDown = this.onMouseDown.bind(this)
    this.onMouseMove = this.onMouseMove.bind(this)
    this.onMouseUp = this.onMouseUp.bind(this)
    this.onKeyDown = this.onKeyDown.bind(this)
    this.onKeyUp = this.onKeyUp.bind(this)
    document.addEventListener("mousedown", this.onMouseDown)
    document.addEventListener("mousemove", this.onMouseMove)
    document.addEventListener("mouseup", this.onMouseUp)
    document.addEventListener("keydown", this.onKeyDown)
    document.addEventListener("keyup", this.onKeyUp)
  }

  //
  // public api
  //

  async import(tree) {
    this.clear()

    this.blocks = this.tree2Blocks(tree)

    await Promise.all(
      this.blocks.map(async (b) => {
        b.el = await this.renderBlock(b)
        return b
      })
    )

    const rootBlock = this.blocks.find((b) => b.parentID === "")

    // 导入时，将根节点放置在固定位置
    rootBlock.left = 100
    rootBlock.top = 0.3 * this.config.canvasElement.offsetHeight
    this.layout()
  }

  export() {
    if (this.blocks.length === 0) return null
    return this.blocks2Tree(this.blocks)
  }

  destroy() {
    this.clear()
    document.removeEventListener("mousedown", this.onMouseDown)
    document.removeEventListener("mousemove", this.onMouseMove)
    document.removeEventListener("mouseup", this.onMouseUp)
    document.removeEventListener("keydown", this.onKeyDown)
    document.removeEventListener("keyup", this.onKeyUp)
  }

  removeNode(id) {
    const block = this.blocks.find((b) => b.id === id)
    if (block == null) return

    const children = this.blocks.filter((b) => b.parentID === block.id)
    children.forEach((b) => (b.parentID = block.parentID))
    const idx = this.blocks.indexOf(block)
    this.blocks.splice(idx, 1)

    this.config.onRemoveNode(block.data)
    block.el.remove()
    this.layout()
  }

  removeSubTree(id) {
    const sub = this.getSubTree(this.blocks, id)
    if (sub.length === 0) return

    this.blocks = this.blocks.filter(
      (b) => sub.find((b2) => b2.id === b.id) == null
    )
    sub.forEach((b) => {
      b.el.remove()
      this.config.onRemoveNode(b.data)
    })
    this.layout()
  }

  //
  // private api
  //

  /*
    tree:
    {
      data: object
      id: String
      children: [{}]
    }
  */
  blocks2Tree(blocks) {
    let root
    const cached = {}

    for (const b of blocks) {
      if (cached[b.id] == null) {
        const obj = { children: [] }
        cached[b.id] = obj
      }

      if (b.parnetID !== "" && cached[b.parentID] == null) {
        const obj = { children: [] }
        cached[b.parentID] = obj
      }

      cached[b.id].data = b.data
      cached[b.id].id = b.id

      if (b.parentID !== "") {
        cached[b.parentID].children.push(cached[b.id])
      } else {
        root = cached[b.id]
      }
    }

    return root
  }

  /* block:
    {
      id: ""
      data: object
      parentID: "",
      el: null,
      left: null,
      top: null,
    }
  */
  tree2Blocks(tree) {
    const result = []
    this._tree2Blocks(tree, "", result)
    return result
  }
  _tree2Blocks(tree, parentID, blocks) {
    const block = {
      data: tree.data,
      id: tree.id,
      parentID,
      el: null,
      left: null,
      top: null,
    }
    blocks.push(block)
    tree.children.forEach((t) => this._tree2Blocks(t, block.id, blocks))
  }

  onMouseDown(evt) {
    this.beginDragNewNode(evt)
    this.beginDragOldNode(evt)
    this.beginCanvasMove(evt)
  }

  onMouseMove(event) {
    this.onCanvasMove(event)
    this.onNodeMove(event)
  }

  onMouseUp() {
    this.endDragNewNode()
    this.endDragOldNode()
    this.endCanvasMove()
  }

  beginCanvasMove(evt) {
    if (evt.target.nodeName === "svg") {
      this.canvasDragStart = { x: evt.clientX, y: evt.clientY }
    }
  }

  onCanvasMove(evt) {
    if (this.canvasDragStart == null || this.d3Tree == null) return
    this.d3Tree.each((n) => {
      n.data.top = n.data.top + evt.clientY - this.canvasDragStart.y
      n.data.left = n.data.left + evt.clientX - this.canvasDragStart.x
      n.data.el.style.top = n.data.top + "px"
      n.data.el.style.left = n.data.left + "px"
    })
    this.canvasDragStart = { x: evt.clientX, y: evt.clientY }
    this.drawLinks()
  }

  endCanvasMove() {
    this.canvasDragStart = null
  }

  beginDragOldNode(evt) {
    const target = evt.target.closest(".flowx-block")
    if (target == null) return

    this.dragX = evt.clientX
    this.dragY = evt.clientY

    const targetID = target.dataset.flowxId
    const newNode = document.createElement("div")
    newNode.style.left = this.dragX + "px"
    newNode.style.top = this.dragY + "px"
    newNode.classList.add("flowx-dragging")
    newNode.style.opacity = 0

    const newSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    newSvg.style.position = "absolute"
    newSvg.style.width = this.config.canvasElement.offsetWidth + "px"
    newSvg.style.height = this.config.canvasElement.offsetHeight + "px"
    newNode.appendChild(newSvg)

    this.draggingBlocks = this.getSubTree(this.blocks, targetID)

    this.draggingBlocks.forEach((b) => {
      newNode.appendChild(b.el.cloneNode(true))
      newSvg.append(
        this.svg.select(`[data-flowx-source="${b.id}"]`).clone().node()
      )

      // 根节点的前置连线不需要绘制
      if (targetID === b.id) return
      newSvg.append(
        this.svg.select(`[data-flowx-target="${b.id}"]`).clone().node()
      )
    })

    this.dragAnchor = newNode.querySelector(`[data-flowx-id="${targetID}"]`)
    if (this.isCopy) {
      this.dragAnchor.classList.add("flowx-block--copy")
    }
    this.dragEl = newNode
    this.config.canvasElement.appendChild(newNode)
  }

  beginDragNewNode(evt) {
    const original = evt.target.closest(this.config.handleClass)
    if (original == null) return

    const mouseX = evt.clientX
    const mouseY = evt.clientY
    const originX = original.getBoundingClientRect().left
    const originY = original.getBoundingClientRect().top
    const dragX = mouseX - originX
    const dragY = mouseY - originY

    const newNode = original.cloneNode(true)
    newNode.style.left = dragX + "px"
    newNode.style.top = dragY + "px"
    newNode.style.opacity = 0
    newNode.classList.add("flowx-dragging")
    document.body.appendChild(newNode)

    this.dragEl = newNode
    this.dragData = this.getFlowxData(original)
    this.dragX = dragX
    this.dragY = dragY
  }

  onNodeMove(event) {
    if (!this.dragEl) return

    this.dragEl.style.left = event.clientX - this.dragX + "px"
    this.dragEl.style.top = event.clientY - this.dragY + "px"
    this.dragEl.style.opacity = 1

    this.blocks.forEach((b) => (b.el.style.border = ""))
    const target = this.blocks.find((b) => {
      // 父节点不能是子树节点
      if (
        this.dragAnchor &&
        this.draggingBlocks.find((item) => b.id === item.id)
      ) {
        return false
      }

      return this.checkAttach(b.el, this.dragAnchor || this.dragEl)
    })
    if (target) {
      target.el.style.border = "2px solid #217ce8"
    }
  }

  async endDragOldNode() {
    if (!this.dragAnchor) return

    const child = this.blocks.find(
      (b) => b.id === this.dragAnchor.dataset.flowxId
    )
    const parent = this.blocks.find((b) => {
      // 父节点不能是子树节点
      if (this.draggingBlocks.find((item) => b.id === item.id)) {
        return false
      }

      return this.checkAttach(b.el, this.dragAnchor)
    })

    if (parent != null) {
      if (this.isCopy) {
        const newBlocks = this.draggingBlocks.map((b) => ({ ...b }))
        const newChild = newBlocks.find((b) => b.id === child.id)

        newBlocks.forEach((b) => {
          const newID = genID()
          newBlocks
            .filter((item) => item.parentID === b.id)
            .forEach((sub) => (sub.parentID = newID))
          b.id = newID
        })
        newChild.parentID = parent.id

        const els = await Promise.all(newBlocks.map((b) => this.renderBlock(b)))
        els.forEach((el, i) => {
          newBlocks[i].el = el
        })

        this.blocks.push(...newBlocks)
      } else {
        child.parentID = parent.id
      }

      parent.el.style.border = ""
      this.layout()
    }

    this.dragAnchor = null
    this.draggingBlocks = null
    this.dragEl.parentNode.removeChild(this.dragEl)
    this.dragEl = null
  }

  async endDragNewNode() {
    if (!this.dragEl || this.dragAnchor) return

    const dragElX = this.dragEl.getBoundingClientRect().x
    const dragElY = this.dragEl.getBoundingClientRect().y

    let needRender = false
    const block = {
      id: genID(),
      data: this.dragData,
      parentID: "",
      el: null,
      left: null,
      top: null,
    }

    if (this.blocks.length === 0) {
      block.left = dragElX - this.absx
      block.top = dragElY - this.absy
      needRender = true
    } else {
      const parent = this.blocks.find((blc) =>
        this.checkAttach(blc.el, this.dragEl)
      )

      if (parent != null) {
        needRender = true
        block.parentID = parent.id
        parent.el.style.border = ""
      }
    }

    if (needRender) {
      this.blocks.push(block)
      block.el = await this.renderBlock(block)
      this.layout()
    }

    this.dragEl.parentNode.removeChild(this.dragEl)
    this.dragEl = null
  }

  onKeyDown(e) {
    // Alt
    if (e.keyCode === 18) {
      if (this.dragAnchor) {
        this.dragAnchor.classList.add("flowx-block--copy")
      }
      this.isCopy = true
    }
  }

  onKeyUp() {
    this.isCopy = false
    if (this.dragAnchor) {
      this.dragAnchor.classList.remove("flowx-block--copy")
    }
  }

  layout() {
    if (this.blocks.length === 0) {
      this.clear()
      return
    }

    const treeDataFn = stratify()
      .id((n) => n.id)
      .parentId((n) => n.parentID)
    const treeData = treeDataFn(this.blocks)

    // nodeSize(height, width)
    this.d3Tree = tree().nodeSize([
      this.config.nodeHeight + this.config.marginY,
      this.config.nodeWidth + this.config.marginX,
    ])(treeData)

    const rootBlock = this.blocks.find((b) => b.parentID === "")
    const rootNodeLeft = rootBlock.left
    const rootNodeRight = rootBlock.top

    this.d3Tree.each((n) => {
      n.data.top = n.x + rootNodeRight
      n.data.left = n.y + rootNodeLeft
      n.data.el.style.top = n.data.top + "px"
      n.data.el.style.left = n.data.left + "px"
    })
    this.drawLinks()
  }

  drawLinks() {
    this.svg.selectAll("path").remove()

    this.svg
      .selectAll("path.link")
      .data(this.d3Tree.links())
      .enter()
      .append("path")
      .attr("class", `flowx-link`)
      .attr("data-flowx-target", (d) => d.target.data.id)
      .attr("data-flowx-source", (d) => d.source.data.id)
      .attr("d", (d) => {
        return (
          "M" +
          (d.source.data.left + this.config.nodeWidth) +
          "," +
          (d.source.data.top + this.config.nodeHeight / 2) +
          "h25" +
          "v" +
          (d.target.data.top - d.source.data.top) +
          "h25"
        )
      })
  }

  // return blocks of the subtree
  // including the root
  getSubTree(blocks, rootID) {
    const root = blocks.find((b) => b.id === rootID)
    if (root == null) return []

    const children = blocks.filter((b) => b.parentID === rootID)

    return [root, ...children.map((b) => this.getSubTree(blocks, b.id)).flat()]
  }

  checkAttach(nodeA, nodeB) {
    const rectA = nodeA.getBoundingClientRect()
    const rectB = nodeB.getBoundingClientRect()

    if (
      rectB.right < rectA.left ||
      rectB.left > rectA.right ||
      rectB.bottom < rectA.top ||
      rectB.top > rectA.bottom
    ) {
      return false
    }

    return true
  }

  getFlowxData(el) {
    const data = {}
    Object.keys(el.dataset).forEach((key) => {
      if (key.startsWith("flowx")) {
        data[key.slice("flowx".length).toLowerCase()] = el.dataset[key]
      }
    })
    return data
  }

  async clear() {
    this.blocks.forEach((b) => {
      b.el.parentNode.removeChild(b.el)
    })

    this.blocks = []
    this.svg.selectAll("path").remove()
  }

  async renderBlock(block) {
    const $container = document.createElement("div")
    $container.classList.add(`flowx-block`)
    $container.style.width = this.config.nodeWidth + "px"
    $container.style.height = this.config.nodeHeight + "px"
    $container.dataset.flowxId = block.id

    const $app = document.createElement("div")
    this.config.canvasElement.appendChild($container)
    $container.appendChild($app)

    await this.config.onRender(
      { data: block.data, id: block.id, isRoot: block.parentID === "" },
      $app
    )
    return $container
  }
}
