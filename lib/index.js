import { stratify, tree } from "d3-hierarchy"
import { select } from "d3-selection"

export default class Flowx {
  constructor(canvasElement, onRender, config = {}) {
    const defaultConfig = {
      handleClass: ".flowx-drag",
      nodeWidth: 320,
      nodeHeight: 80,
      marginX: 50,
      marginY: 20,
      datasetPrefix: "flowx",
      classPrefix: "flowx",
    }
    this.onRender = onRender
    this.canvasElement = canvasElement
    this.config = Object.assign(defaultConfig, config)
    this.blocks = []

    // 用于绘制 path
    this.svg = null

    // 当前正在拖动的元素
    this.dragEl = null
    this.dragData = null

    // start coordinate of current dragging element
    // relative to the viewport
    this.dragX = 0
    this.dragY = 0

    this.absx = canvasElement.getBoundingClientRect().left
    this.absy = canvasElement.getBoundingClientRect().top

    this.initStyle()

    document.addEventListener("mousedown", this.onMouseDown.bind(this))
    document.addEventListener("mousemove", this.onMouseMove.bind(this))
    document.addEventListener("mouseup", this.onMouseUp.bind(this))
  }

  initStyle() {
    const range = document.createRange()
    const frag = range.createContextualFragment(`
      <style>
        .${this.config.classPrefix}-dragging {
          position: absolute;
          z-index: 10;
        }

        .${this.config.classPrefix}-block {
          position: absolute;
          overflow: auto;
          width: ${this.config.nodeWidth}px;
          height: ${this.config.nodeHeight}px;
          border: 2px solid transparent;
          z-index: 9;
        }

        .${this.config.classPrefix}-link {
          fill: none;
          stroke: #ccc;
          stroke-width: 1.5px;
        }
      </style>
    `)
    document.querySelector("head").append(frag)
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
    newNode.classList.add(this.config.classPrefix + "-dragging")
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
        this.checkAttach(blc.el, this.dragEl),
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
    if (this.svg) {
      select("svg").remove()
      this.svg = null
    }

    if (this.blocks.length === 0) return

    const treeDataFn = stratify()
      .id((n) => n.id)
      .parentId((n) => n.parent)
    const treeData = treeDataFn(this.blocks)

    // nodeSize(height, width)
    const t = tree().nodeSize([
      this.config.nodeHeight + this.config.marginY,
      this.config.nodeWidth + this.config.marginX,
    ])(treeData)

    const firstBlock = this.blocks.find((b) => b.id === 0)
    const firstNodeLeft = firstBlock.top
    const firstNodeTop = firstBlock.left

    t.each((n) => {
      n.data.top = n.x + firstNodeTop
      n.data.left = n.y + firstNodeLeft
      n.data.el.style.top = n.data.top + "px"
      n.data.el.style.left = n.data.left + "px"
    })

    this.svg = select(this.canvasElement)
      .append("svg")
      .attr(
        "width",
        this.canvasElement.offsetWidth +
          this.canvasElement.scrollLeft +
          this.config.nodeWidth +
          200,
      )
      .attr(
        "height",
        this.canvasElement.offsetHeight +
          this.canvasElement.scrollTop +
          this.config.nodeHeight +
          200,
      )
      .append("g")
      .attr("transform", "translate(0," + this.canvasElement.scrollTop + ")")

    this.svg
      .selectAll("path.link")
      .data(t.links())
      .enter()
      .append("path")
      .attr("class", `${this.config.classPrefix}-link`)
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

  checkAttach(a, b) {
    const rectA = a.getBoundingClientRect()
    const rectB = b.getBoundingClientRect()

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
      if (key.startsWith(this.config.datasetPrefix)) {
        data[key.slice(this.config.datasetPrefix.length).toLowerCase()] =
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
    $container.classList.add(`${this.config.classPrefix}-block`)

    const $app = document.createElement("div")
    this.canvasElement.appendChild($container)
    $container.appendChild($app)

    await this.onRender(data, $app)
    return $container
  }
}
