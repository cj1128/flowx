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
      handleClass: cfg.handleClass || ".flowx-drag",
      nodeWidth: cfg.nodeWidth || 320,
      nodeHeight: cfg.nodeHeight || 80,
      marginX: cfg.marginX || 50,
      marginY: cfg.marginY || 20,
    }

    this.onRender = config.onRender
    this.canvasElement = config.canvasElement
    this.config = config
    this.blocks = []

    // 设置 init style
    this.canvasElement.style.position = "relative"
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

    // 画布拖动起点坐标，相对于视口
    this.canvasDragStart = null

    // start coordinate of current dragging element
    // relative to the viewport
    this.dragX = 0
    this.dragY = 0

    this.absx = this.canvasElement.getBoundingClientRect().left
    this.absy = this.canvasElement.getBoundingClientRect().top

    document.addEventListener("mousedown", this.onMouseDown.bind(this))
    document.addEventListener("mousemove", this.onMouseMove.bind(this))
    document.addEventListener("mouseup", this.onMouseUp.bind(this))

    this.canvasElement.addEventListener(
      "mousedown",
      this.onCanvasMouseDown.bind(this)
    )
    this.canvasElement.addEventListener(
      "mousemove",
      this.onCanvasMouseMove.bind(this)
    )
    this.canvasElement.addEventListener(
      "mouseup",
      this.onCanvasMouseUp.bind(this)
    )
  }

  onCanvasMouseDown(evt) {
    if (evt.target.closest(`.flowx-block`)) return
    this.canvasDragStart = { x: evt.clientX, y: evt.clientY }
  }

  onCanvasMouseMove(evt) {
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

  onCanvasMouseUp() {
    this.canvasDragStart = null
  }

  // begin drag
  onMouseDown(evt) {
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
    newNode.classList.add("flowx-dragging")
    document.body.appendChild(newNode)

    this.dragEl = newNode
    this.dragData = this.getFlowxData(original)
    this.dragX = dragX
    this.dragY = dragY
  }

  async onMouseUp() {
    if (!this.dragEl) return

    const dragElX = this.dragEl.getBoundingClientRect().x
    const dragElY = this.dragEl.getBoundingClientRect().y

    let needRender = false
    const block = {
      id: this.blocks.length,
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
      block.el = await this.renderBlock(block.data)
      this.layout()
    }

    this.dragEl.parentNode.removeChild(this.dragEl)
    this.dragEl = null
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

    const firstBlock = this.blocks.find((b) => b.id === 0)
    const firstNodeLeft = firstBlock.left
    const firstNodeTop = firstBlock.top

    this.d3Tree.each((n) => {
      n.data.top = n.x + firstNodeTop
      n.data.left = n.y + firstNodeLeft
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

  onMouseMove(event) {
    if (!this.dragEl) return

    this.dragEl.style.left = event.clientX - this.dragX + "px"
    this.dragEl.style.top = event.clientY - this.dragY + "px"

    this.blocks.forEach((b) => (b.el.style.border = ""))
    const target = this.blocks.find((b) => this.checkAttach(b.el, this.dragEl))
    if (target) {
      target.el.style.border = "2px solid #217ce8"
    }
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

  getState() {
    return this.blocks
  }

  async setState(blocks) {
    this.blocks.forEach((b) => {
      b.el.parentNode.removeChild(b.el)
    })

    this.blocks = blocks
    await Promise.all(
      blocks.map(async (block) => {
        block.el = await this.renderBlock(block.data)
        return block
      })
    )
    this.layout()
  }

  async renderBlock(data) {
    const $container = document.createElement("div")
    $container.classList.add(`flowx-block`)

    const $app = document.createElement("div")
    this.canvasElement.appendChild($container)
    $container.appendChild($app)

    await this.onRender(data, $app)
    return $container
  }
}
