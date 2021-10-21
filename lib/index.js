import { stratify, tree } from "d3-hierarchy"
import { select } from "d3-selection"

export default class Flowx {
  constructor({
    handleClass,
    canvasElement,
    nodeSize,
    onRender,
    datasetPrefix,
    classPrefix,
  }) {
    this.onRender = onRender
    this.canvasElement = canvasElement
    this.handleClass = handleClass || ".flowx-drag"
    this.nodeSize = nodeSize || [320, 80]
    this.classPrefix = classPrefix || "flowx"
    this.datasetPrefix = datasetPrefix || "flowx"

    this.blocks = []

    // 当前正在拖动的元素
    this.dragEl = null
    this.dragData = null

    // start coordinate of current dragging element
    // relative to the viewport
    this.dragX = 0
    this.dragY = 0

    this.absx = canvasElement.getBoundingClientRect().left
    this.absy = canvasElement.getBoundingClientRect().top

    document.addEventListener("mousedown", this.beginDrag.bind(this))
    document.addEventListener("mousemove", this.moveBlock.bind(this))
    document.addEventListener("mouseup", this.endDrag.bind(this))
  }

  beginDrag(event) {
    const original = event.target.closest(this.handleClass)
    if (original == null) return

    const mouseX = event.clientX
    const mouseY = event.clientY
    const originX = original.getBoundingClientRect().left
    const originY = original.getBoundingClientRect().top
    const dragX = mouseX - originX
    const dragY = mouseY - originY

    const newNode = original.cloneNode(true)
    newNode.classList.add("block")
    newNode.style.left = dragX + "px"
    newNode.style.top = dragY + "px"
    document.body.appendChild(newNode)

    this.dragEl = newNode
    this.dragData = this.getFlowxData(original)
    this.dragX = dragX
    this.dragY = dragY
  }

  async endDrag() {
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
      const parent = this.blocks.find((blc) => this.checkAttach(blc))

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
    if (this.svg) {
      select("svg").remove()
      this.svg = null
    }

    if (this.blocks.length === 0) return

    const treeData = stratify()
      .id((n) => n.id)
      .parentId((n) => n.parent)(this.blocks)

    const t = tree().nodeSize([this.nodeSize[1] + 20, this.nodeSize[0] + 50])(
      treeData,
    )

    let firstNodeLeft = 0
    let firstNodeTop = 0
    t.each((n) => {
      if (n.data.id === 0) {
        firstNodeTop = n.data.top
        firstNodeLeft = n.data.left
      } else {
        n.data.top = n.x + firstNodeTop
        n.data.left = n.y + firstNodeLeft
      }

      n.data.el.style.top = n.data.top + "px"
      n.data.el.style.left = n.data.left + "px"
    })

    this.svg = select(this.canvasElement)
      .append("svg")
      .attr(
        "width",
        this.canvasElement.offsetWidth +
          this.canvasElement.scrollLeft +
          this.nodeSize[0] +
          200,
      )
      .attr(
        "height",
        this.canvasElement.offsetHeight +
          this.canvasElement.scrollTop +
          this.nodeSize[1] +
          200,
      )
      .append("g")
      .attr("transform", "translate(0," + this.canvasElement.scrollTop + ")")

    this.svg
      .selectAll("path.link")
      .data(t.links())
      .enter()
      .append("path")
      .attr("class", "flowx-link")
      .attr("d", (d) => {
        return (
          "M" +
          (d.source.data.left + this.nodeSize[0]) +
          "," +
          (d.source.data.top + this.nodeSize[1] / 2) +
          "h25" +
          "v" +
          (d.target.data.top - d.source.data.top) +
          "h25"
        )
      })
  }

  moveBlock(event) {
    if (!this.dragEl) return

    this.dragEl.style.left = event.clientX - this.dragX + "px"
    this.dragEl.style.top = event.clientY - this.dragY + "px"

    this.blocks.forEach((b) => (b.el.style.border = ""))
    const target = this.blocks.find(this.checkAttach.bind(this))
    if (target) {
      target.el.style.border = "2px solid #217ce8"
    }
  }

  checkAttach(block) {
    const rectA = block.el.getBoundingClientRect()
    const rectB = this.dragEl.getBoundingClientRect()
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
      if (key.startsWith(this.datasetPrefix)) {
        data[key.slice(this.datasetPrefix.length).toLowerCase()] =
          el.dataset[key]
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
      }),
    )
    this.layout()
  }

  async renderBlock(data) {
    const $container = document.createElement("div")
    $container.classList.add("flowx-block")

    const $app = document.createElement("div")
    this.canvasElement.appendChild($container)
    $container.appendChild($app)

    await this.onRender(data, $app)
    return $container
  }
}
