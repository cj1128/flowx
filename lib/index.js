export default class Flowx {
  constructor({ handleClass, canvasElement, nodeSize, onRender }) {
    this.onRender = onRender
    this.canvasElement = canvasElement
    this.handleClass = handleClass || ".flowx-drag"
    this.nodeSize = nodeSize || [320, 80]

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
      parent: -1,
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
      block.el = await this.renderBlock(block.id, block.data)
      this.layout()
    }

    this.dragEl.parentNode.removeChild(this.dragEl)
    this.dragEl = null
  }

  layout() {
    if (this.svg) {
      d3.select("svg").remove()
      this.svg = null
    }

    this.svg = d3
      .select(this.canvasElement)
      .append("svg")
      .attr("width", this.canvasElement.offsetWidth)
      .attr("height", this.canvasElement.offsetHeight)
      .append("g")
      .attr(
        "transform",
        `translate(${this.canvasElement.offsetWidth / 5}, ${
          this.canvasElement.offsetHeight / 3
        })`,
      )

    this.tree = d3.layout
      .tree()
      .nodeSize([this.nodeSize[1] + 100, this.nodeSize[0] + 100])
      .separation(() => 0.5)

    const blocks = this.blocks
    const tree = this.genTree(blocks, blocks[0])
    const nodes = this.tree.nodes(tree)
    const links = this.tree.links(nodes)

    this.svg
      .selectAll("path.link")
      .data(links)
      .enter()
      .append("path")
      .attr("class", "flowx-link")
      .attr("d", elbow)

    /**
     * Custom path function that creates straight connecting lines.
     */
    function elbow(d) {
      return (
        "M" +
        d.source.y +
        "," +
        d.source.x +
        "H" +
        (d.source.y + (d.target.y - d.source.y) / 2) +
        "V" +
        d.target.x +
        "H" +
        d.target.y
      )
    }

    const node = this.svg
      .selectAll("g.flowx-g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", (n) => "flowx-g flowx-g-" + n.id)
      .attr("transform", (d) => "translate(" + d.y + "," + d.x + ")")

    node.append("rect").attr({
      x: -(this.nodeSize[0] / 2),
      y: -(this.nodeSize[1] / 2),
      width: this.nodeSize[0],
      height: this.nodeSize[1],
    })

    blocks.forEach((b) => {
      const targetEl = document.querySelector(".flowx-g-" + b.id)
      const { x, y } = targetEl.getBoundingClientRect()
      b.left = x - this.absx
      b.top = y - this.absy

      b.el.style.left = b.left + "px"
      b.el.style.top = b.top + "px"
    })
  }

  genTree(blocks, root) {
    const r = { ...root }
    r.children = blocks
      .filter((b) => b.parent === root.id)
      .map((b) => this.genTree(blocks, b))
    return r
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
    const prefix = "flowx"

    Object.keys(el.dataset).forEach((key) => {
      if (key.startsWith(prefix)) {
        data[key.slice(prefix.length).toLowerCase()] = el.dataset[key]
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
        block.el = await this.renderBlock(block.id, block.data)
        return block
      }),
    )
    this.layout()
  }

  async renderBlock(id, data) {
    const $container = document.createElement("div")
    $container.classList.add("flowx-block")
    $container.classList.add("flowx-block-" + id)

    const $app = document.createElement("div")
    this.canvasElement.appendChild($container)
    $container.appendChild($app)

    await this.onRender(data, $app)
    return $container
  }
}
