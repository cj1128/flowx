<template lang="pug">
.basic(style='flex: 1')
  #leftcard
    ul
      li 在画布区按住鼠标移动画布
      li 按住 alt 拖动节点进行复制

    #publish.clear(@click='onClear') Clear Tree
    div(style='margin-top: 10px')
      el-button#zoom-in(@click='onZoomIn') +
      el-button#zoom-out(@click='onZoomOut') -
      el-button#reset-zoom(@click='onResetZoom') reset

    p#header Rules
    #subnav
    div
      .item.flowx-drag.noselect(
        v-for='id in 10'
        :data-flowx-id='id'
      )
        img(src='assets/eye.svg')
        .item__content
          p.blocktitle Rule{{ id }}
          p.blockdesc(v-if='id === 10') this node can not be root
          p.blockdesc(v-else-if='id === 9') this node can not follow 6
          p.blockdesc(v-else) this is rule {{ id }}

  #canvas

  el-drawer(
    title='Rule Detail'
    :visible.sync='isDrawerVisible'
  )
    p Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas finibus viverra lorem nec porta. Praesent nec posuere magna. Aenean vulputate pulvinar porta. Integer consectetur sem urna, vel imperdiet magna laoreet et. Duis condimentum dictum vulputate. Mauris a pulvinar tortor, eget rhoncus eros. Morbi egestas pulvinar justo, sit amet accumsan neque venenatis nec. Cras luctus nec urna sed accumsan. Vivamus commodo nisl eget felis posuere sagittis. Cras lobortis nisl vitae felis auctor, ut ullamcorper nisi placerat. Fusce id metus ac ipsum mollis tristique id at erat. Nulla facilisi. Sed semper accumsan dui vulputate auctor.
</template>

<script>
import Vue from 'vue'
import Flowx from '../../lib/flowx.js'
import Node from './Node.vue'

export default {
  data() {
    return {
      zoom: 1,
      isDrawerVisible: false,
    }
  },

  created() {
    window._flowx = null // flowx instance
  },

  mounted() {
    this.initFlowx()
  },

  beforeDestroy() {
    _flowx.destroy()
    window._flowx = null
  },

  methods: {
    initFlowx() {
      const self = this

      window._flowx = new Flowx({
        canvasElement: document.querySelector('#canvas'), // 主画布
        nodeWidth: 380,
        nodeHeight: 140,
        borderColor: 'red',
        shouldUpdate(newTree, oldTree) {
          // restriction 1. rule10 can not be the root
          if (newTree.data.id === '10') {
            Vue.prototype.$message('rule10 can not be root')
            return false
          }

          // restriction 2. rule9 can not follow rule6
          {
            function check(node) {
              if (node.data.id === '6') {
                if (node.children.some(b => b.data.id === '9')) {
                  return true
                }
              }

              return node.children.some(n => check(n))
            }

            if (check(newTree)) {
              Vue.prototype.$message('rule9 can not follow rule6')
              return false
            }
          }

          return true
        },

        onRender: ({ data, id, isRoot }, containerEl) => {
          return new Promise((res, rej) => {
            data.__vm = new Vue({
              el: containerEl,
              render: h =>
                h(Node, {
                  props: {
                    id,
                    data,
                    isRoot,
                    res,
                    rej,
                  },

                  on: {
                    'open-drawer': () => {
                      self.isDrawerVisible = true
                    },
                  },
                }),
            })
          })
        },

        onRemove(data) {
          data.__vm.$destroy()
        },
      })
    },

    onClear() {
      _flowx.clear()
    },

    onZoomIn() {
      this.zoom += 0.1
      _flowx.zoom(this.zoom)
    },

    onZoomOut() {
      this.zoom -= 0.1
      _flowx.zoom(this.zoom)
    },

    onResetZoom() {
      this.zoom = 1
      _flowx.zoom(this.zoom)
    },
  },
}
</script>

<style lang="stylus" scoped></style>
