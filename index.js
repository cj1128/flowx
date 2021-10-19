class Flowx {
  constructor({ handleClass, canvasElement, onRender }) {
    this.onRender = onRender
    this.canvasElement = canvasElement
    this.handleClass = handleClass || ".flowx-drag"
    this.state = {
      rootLeft: 0,
      rootTop: 0,
      blocks: [],
    }

    this.drag = null
    this.dragData = {}
    this.dragging = false
    this.dragX = 0
    this.dragY = 0

    this.absx = canvasElement.getBoundingClientRect().left
    this.absy = canvasElement.getBoundingClientRect().top
    this.PADDING = 30

    this.indicator = document.createElement("DIV")
    this.indicator.classList.add("indicator")
    this.indicator.classList.add("invisible")
    this.canvasElement.appendChild(this.indicator)

    document.addEventListener("mousedown", this.beginDrag.bind(this))
    document.addEventListener("mousemove", this.moveBlock.bind(this))
    document.addEventListener("mouseup", this.endDrag.bind(this))
  }

  async endDrag(event) {
    if (!this.dragging) return
    const mouseX = event.clientX
    const mouseY = event.clientY

    if (this.state.blocks.length === 0) {
      this.state.rootLeft = mouseX - this.absx
      this.state.rootTop = mouseY - this.absy
      const block = {
        id: 0,
        parent: -1,
        data: this.dragData,
      }
      const $first = await this.renderFirstBlock(block)
      block.x -= block.width / 2
      block.y -= block.height / 2
      $first.style.left = block.x + "px"
      $first.style.top = block.y + "px"
      this.state.rootLeft = block.x
      this.state.rootTop = block.y
      this.state.blocks.push(block)
    } else {
      this.state.blocks.forEach((item) => {
        if (this.checkAttach(item)) {
          document
            .querySelector(`.flowx-block-${item.id}`)
            .removeChild(this.indicator)
          this.indicator.classList.add("invisible")
          const block = {
            id: this.state.blocks.length,
            parent: item.id,
            data: this.dragData,
          }
          this.state.blocks.push(block)
          this.setState(this.state)
        }
      })
    }

    this.drag && this.drag.parentNode.removeChild(this.drag)
    this.dragging = false
  }

  moveBlock(event) {
    if (!this.dragging) return

    const mouseX = event.clientX
    const mouseY = event.clientY
    this.drag.style.left = mouseX - this.dragX + "px"
    this.drag.style.top = mouseY - this.dragY + "px"

    this.state.blocks.forEach((item) => {
      const block = document.querySelector(`.flowx-block-${item.id}`)
      if (this.checkAttach(item)) {
        this.indicator.classList.remove("invisible")
        block.appendChild(this.indicator)
        this.indicator.style.left = block.offsetWidth / 2 - 5 + "px"
        this.indicator.style.top = block.offsetHeight + "px"
      } else {
        try {
          block.removeChild(this.indicator)
        } catch (e) {}
      }
    })
  }

  beginDrag(event) {
    const original = event.target.closest(this.handleClass)
    if (original == null) return
    const mouseX = event.clientX
    const mouseY = event.clientY
    const newNode = original.cloneNode(true)
    newNode.classList.add("block")
    document.body.appendChild(newNode)
    this.drag = newNode
    this.dragging = true
    this.dragData = this.getFlowxData(original)
    this.dragX = mouseX - original.getBoundingClientRect().left
    this.dragY = mouseY - original.getBoundingClientRect().top
    this.drag.style.left = mouseX - this.dragX + "px"
    this.drag.style.top = mouseY - this.dragY + "px"
  }

  checkAttach(block) {
    const xpos =
      this.drag.getBoundingClientRect().left +
      window.scrollX +
      parseInt(window.getComputedStyle(this.drag).width) / 2 +
      this.canvasElement.scrollLeft -
      this.canvasElement.getBoundingClientRect().left
    const ypos =
      this.drag.getBoundingClientRect().top +
      window.scrollY +
      this.canvasElement.scrollTop -
      this.canvasElement.getBoundingClientRect().top

    if (
      xpos >= block.x - block.width / 2 &&
      xpos <= block.x + block.width / 2 + block.width &&
      ypos >= block.y - block.height / 2 &&
      ypos <= block.y + block.height + block.height / 2
    ) {
      return true
    } else {
      return false
    }
  }

  drawArrow(arrow, x, y, parent) {
    if (x < 0) {
      this.canvasElement.innerHTML +=
        `<div class="arrowblock flowx-arrow-${arrow.id}">` +
        '<svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M' +
        (parent.x - arrow.x + 5) +
        " 0L" +
        (parent.x - arrow.x + 5) +
        " " +
        this.PADDING / 2 +
        "L5 " +
        this.PADDING / 2 +
        "L5 " +
        y +
        '" stroke="#C5CCD0" stroke-width="2px"/><path d="M0 ' +
        (y - 5) +
        "H10L5 " +
        y +
        "L0 " +
        (y - 5) +
        'Z" fill="#C5CCD0"/></svg></div>'

      document.querySelector(`.flowx-arrow-${arrow.id}`).style.left =
        arrow.x -
        5 -
        (this.absx + window.scrollX) +
        arrow.width / 2 +
        this.canvasElement.scrollLeft +
        this.canvasElement.getBoundingClientRect().left +
        "px"
    } else {
      this.canvasElement.innerHTML +=
        `<div class="arrowblock flowx-arrow-${arrow.id}">` +
        '<svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 0L20 ' +
        this.PADDING / 2 +
        "L" +
        x +
        " " +
        this.PADDING / 2 +
        "L" +
        x +
        " " +
        y +
        '" stroke="#C5CCD0" stroke-width="2px"/><path d="M' +
        (x - 5) +
        " " +
        (y - 5) +
        "H" +
        (x + 5) +
        "L" +
        x +
        " " +
        y +
        "L" +
        (x - 5) +
        " " +
        (y - 5) +
        'Z" fill="#C5CCD0"/></svg></div>'

      document.querySelector(`.flowx-arrow-${arrow.id}`).style.left =
        parent.x -
        20 -
        (this.absx + window.scrollX) +
        arrow.width / 2 +
        this.canvasElement.scrollLeft +
        this.canvasElement.getBoundingClientRect().left +
        "px"
    }

    document.querySelector(`.flowx-arrow-${arrow.id}`).style.top =
      parent.y +
      parent.height +
      this.canvasElement.getBoundingClientRect().top -
      this.absy +
      "px"
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
    return {
      rootLeft: this.state.rootLeft,
      rootTop: this.state.rootTop,
      blocks: this.state.blocks.map((i) => {
        const dataEl = document.querySelector(".flowx-block-" + i.id)
          .childNodes[0]
        return {
          id: i.id,
          parent: i.parent,
          data: this.getFlowxData(dataEl),
        }
      }),
    }
  }

  async setState(flowxState) {
    Array.from(this.canvasElement.querySelectorAll(".flowx-block")).forEach(
      (el) => {
        el.parentNode.removeChild(el)
      },
    )
    Array.from(this.canvasElement.querySelectorAll(".arrowblock")).forEach(
      (el) => {
        el.parentNode.removeChild(el)
      },
    )

    this.state = flowxState
    const firstBlock = this.state.blocks.find((b) => b.parent === -1)
    await this.renderFirstBlock(firstBlock)
    await this.renderChildren(firstBlock)
    this.state.blocks.forEach((child) => {
      const parentBlock = this.state.blocks.find((b) => b.id === child.parent)
      if (parentBlock == null) return
      this.drawArrow(
        child,
        child.x - parentBlock.x + parseInt(this.PADDING / 2),
        this.PADDING * 2,
        parentBlock,
      )
    })
  }

  async renderFirstBlock(firstBlock) {
    const $block = await this.renderBlock(0, firstBlock.data)
    firstBlock.width = $block.offsetWidth
    firstBlock.height = $block.offsetHeight
    firstBlock.x = this.state.rootLeft
    firstBlock.y = this.state.rootTop
    $block.style.left = firstBlock.x + "px"
    $block.style.top = firstBlock.y + "px"
    return $block
  }

  async renderChildren(parentBlock) {
    const children = this.state.blocks.filter(
      (b) => b.parent === parentBlock.id,
    )
    if (children.length === 0) return
    const $children = await Promise.all(
      children.map((c) => this.renderBlock(c.id, c.data)),
    )
    children.forEach((c, i) => {
      c.width = $children[i].offsetWidth
      c.height = $children[i].offsetHeight
    })
    const totalWidth = children.reduce(
      (prev, cur) => prev + cur.width + this.PADDING,
      -this.PADDING,
    )
    children.forEach((c, i) => {
      if (i === 0) {
        c.x = parentBlock.x - totalWidth / 2 + parentBlock.width / 2
        c.y = parentBlock.y + parentBlock.height + this.PADDING * 2
        $children[i].style.left = c.x + "px"
        $children[i].style.top = c.y + "px"
      } else {
        const last = children[i - 1]
        c.x = last.x + last.width + this.PADDING
        c.y = last.y
        $children[i].style.left = c.x + "px"
        $children[i].style.top = c.y + "px"
      }
    })

    await Promise.all(children.map(this.renderChildren.bind(this)))
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
