import { stratify, tree } from "d3-hierarchy"
import { select } from "d3-selection"
import "./flowx.css"

const $ = document.querySelector.bind(document)

const styleEl = document.createElement("style")
styleEl.dataset.flowx = true
$("head").appendChild(styleEl)

const addStyle = (style) => {
  styleEl.sheet.insertRule(style)
}

export default class Flowx {
  constructor(cfg = {}) {
    const config = {
      canvasElement: cfg.canvasElement,
      onRender: cfg.onRender,
      onUpdate: cfg.onUpdate || (() => {}),
      handleClass: cfg.handleClass || ".flowx-drag",
      nodeWidth: cfg.nodeWidth || 320,
      nodeHeight: cfg.nodeHeight || 80,
      marginX: cfg.marginX || 50,
      marginY: cfg.marginY || 20,
    }

    this.onRender = config.onRender
    this.onUpdate = config.onUpdate
    this.canvasElement = config.canvasElement
    this.config = config
    this.blocks = []

    // 设置 init style
    this.canvasElement.style.position = "relative"
    this.canvasElement.style.cursor = "grab"
    addStyle(`
    .flowx-block {
      width: ${config.nodeWidth}px;
      height: ${config.nodeHeight}px;
    }
    `)

    // 用于绘制 path
    this.svg = select(this.canvasElement)
      .append("svg")
      .attr("style", "position: absolute; left: 0; top: 0;")
      .attr("width", this.canvasElement.offsetWidth)
      .attr("height", this.canvasElement.offsetHeight)
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

    this.absx = this.canvasElement.getBoundingClientRect().left
    this.absy = this.canvasElement.getBoundingClientRect().top

    // 移动还是复制子树
    this.isCopy = false

    this.mouseDownHandler = this.onMouseDown.bind(this)
    this.mouseMoveHandler = this.onMouseMove.bind(this)
    this.mouseUpHandler = this.onMouseUp.bind(this)
    this.keyDownHandler = this.onKeyDown.bind(this)
    this.keyUpHandler = this.onKeyUp.bind(this)

    document.addEventListener("mousedown", this.mouseDownHandler)
    document.addEventListener("mousemove", this.mouseMoveHandler)
    document.addEventListener("mouseup", this.mouseUpHandler)
    document.addEventListener("keydown", this.keyDownHandler)
    document.addEventListener("keyup", this.keyUpHandler)
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

    const targetId = target.dataset.flowxId
    const newNode = document.createElement("div")
    newNode.style.left = this.dragX + "px"
    newNode.style.top = this.dragY + "px"
    newNode.classList.add("flowx-dragging")
    newNode.style.display = "none"

    const newSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    newSvg.style.position = "absolute"
    newSvg.style.width = this.canvasElement.offsetWidth + "px"
    newSvg.style.height = this.canvasElement.offsetHeight + "px"
    newNode.appendChild(newSvg)

    this.draggingBlocks = this.getChildren(this.blocks, targetId).concat(
      this.blocks.find((b) => b.id === targetId)
    )
    this.draggingBlocks.forEach((b) => {
      newNode.appendChild(b.el.cloneNode(true))
      newSvg.append(
        this.svg.select(`[data-flowx-source="${b.id}"]`).clone().node()
      )

      // 根节点的前置连线不需要绘制
      if (targetId === b.id) return
      newSvg.append(
        this.svg.select(`[data-flowx-target="${b.id}"]`).clone().node()
      )
    })

    this.dragAnchor = newNode.querySelector(`[data-flowx-id="${targetId}"]`)
    this.dragEl = newNode
    this.canvasElement.appendChild(newNode)
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
    newNode.style.display = "none"
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
    this.dragEl.style.display = "block"

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

    const childId = this.dragAnchor.dataset.flowxId
    const child = this.blocks.find((b) => b.id === childId)
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
          const newId = String(Date.now())
          newBlocks
            .filter((item) => item.parent === b.id)
            .forEach((b) => (b.parent = newId))
          b.id = newId
        })
        newChild.parent = parent.id

        const els = await Promise.all(
          newBlocks.map((b) => this.renderBlock(b.data, b.id))
        )
        els.forEach((el, i) => {
          newBlocks[i].el = el
        })

        this.blocks.push(...newBlocks)
      } else {
        child.parent = parent.id
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
      id: String(Date.now()),
      data: this.dragData,
      parent: "",
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
        block.parent = parent.id
        parent.el.style.border = ""
      }
    }

    if (needRender) {
      this.blocks.push(block)
      block.el = await this.renderBlock(block.data, block.id)
      this.layout()
    }

    this.dragEl.parentNode.removeChild(this.dragEl)
    this.dragEl = null
  }

  onKeyDown(e) {
    // Alt
    if (e.keyCode === 18 && this.dragAnchor) {
      this.dragAnchor.classList.add("flowx-block--copy")
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
    if (this.blocks.length === 0) return

    const treeDataFn = stratify()
      .id((n) => n.id)
      .parentId((n) => n.parent)
    const treeData = treeDataFn(this.blocks)

    // nodeSize(height, width)
    this.d3Tree = tree().nodeSize([
      this.config.nodeHeight + this.config.marginY,
      this.config.nodeWidth + this.config.marginX,
    ])(treeData)

    const firstBlock = this.blocks.find((b) => b.id === "0")
    const firstNodeLeft = firstBlock.left
    const firstNodeTop = firstBlock.top

    this.d3Tree.each((n) => {
      n.data.top = n.x + firstNodeTop
      n.data.left = n.y + firstNodeLeft
      n.data.el.style.top = n.data.top + "px"
      n.data.el.style.left = n.data.left + "px"
    })
    this.drawLinks()
    this.onUpdate()
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

  getChildren(blocks, rootId) {
    const children = blocks.filter((block) => block.parent === rootId)
    return children.concat(
      children.map((b) => this.getChildren(blocks, b.id)).flat()
    )
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

  async renderBlock(data, id) {
    const $container = document.createElement("div")
    $container.classList.add(`flowx-block`)
    $container.dataset.flowxId = id
    Object.keys(data).forEach((key) => {
      $container.dataset[
        "flowx" + key.slice(0, 1).toUpperCase() + key.slice(1)
      ] = data[key]
    })

    const $app = document.createElement("div")
    this.canvasElement.appendChild($container)
    $container.appendChild($app)

    await this.onRender({ ...data, flowxId: id }, $app)
    return $container
  }

  async import(blocks) {
    this.clear()

    this.blocks = blocks
    await Promise.all(
      blocks.map(async (block) => {
        block.el = await this.renderBlock(block.data, block.id)
        return block
      })
    )
    this.layout()
  }

  export() {
    return this.blocks.map((b) => {
      b.data = this.getFlowxData(b.el)
      return b
    })
  }

  destroy() {
    document.removeEventListener("mousedown", this.mouseDownHandler)
    document.removeEventListener("mousemove", this.mouseMoveHandler)
    document.removeEventListener("mouseup", this.mouseUpHandler)
    document.removeEventListener("keydown", this.keyDownHandler)
    document.removeEventListener("keyup", this.keyUpHandler)
    this.canvasElement.parentNode.removeChild(this.canvasElement)
  }
}
