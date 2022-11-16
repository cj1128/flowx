<template lang="pug">
.flex-1.flex.relative
  .w-200px.left
    .flowx-drag.common-node(data-flowx-type='common') Common Node
    .flowx-drag.condition-node(data-flowx-type='condition') Condition Node

  #condition-tree.flex-1.overflow-hidden

  el-button.right-top(@click='onReset') Reset
</template>

<script>
import Flowx from '../../lib/flowx.js'
import Vue from 'vue'
import Node from './Node.vue'
import Prefix from './Prefix.vue'
import { emit } from './bus'

const commonNodeHasMultipleBranches = tree => {
  if (tree.data.type === 'common') {
    if (tree.children.length > 1) {
      return true
    }
  }

  return tree.children.some(n => commonNodeHasMultipleBranches(n))
}

const conditionNodeHasThreeBranches = tree => {
  if (tree.data.type === 'condition') {
    if (tree.children.length > 2) {
      return true
    }
  }

  return tree.children.some(n => conditionNodeHasThreeBranches(n))
}

export default {
  created() {
    window._flowx = null // flowx instance
  },

  mounted() {
    this.initFlowx()
  },

  beforeDestroy() {
    _flowx?.destroy()
    window._flowx = null
  },

  methods: {
    initFlowx() {
      window._flowx = new Flowx({
        canvasElement: document.querySelector('#condition-tree'), // 主画布
        nodeWidth: 198,
        nodeHeight: 70,
        marginX: 200,
        marginY: 100,

        shouldUpdate: tree => {
          if (commonNodeHasMultipleBranches(tree)) {
            this.$message.error(
              'A common node can only have at most one edge leading to the next node.'
            )
            return false
          }

          if (conditionNodeHasThreeBranches(tree)) {
            this.$message.error(
              'A condition node can only have at most two edge leading to the next node.'
            )
            return false
          }

          return true
        },

        onUpdate() {
          emit('flowx-update')
        },

        onPrefixRender: (props, containerEl) => {
          return new Promise((res, rej) => {
            props.data.__prefix = new Vue({
              el: containerEl,
              render: h =>
                h(Prefix, {
                  props: {
                    ...props,
                    res,
                    rej,
                  },
                }),
            })
          })
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
                }),
            })
          })
        },

        onRemove(data) {
          data.__vm.$destroy()
          data.__prefix?.$destroy()
        },
      })
    },

    onReset() {
      _flowx.clear()
    },
  },
}
</script>

<style lang="stylus" scoped>
.left
  border: 1px solid #e8e8ef
  background-color: white

.common-node
  display: flex
  align-items: center
  justify-content: center
  cursor: grab
  background-color: white
  user-select: none
  height: 70px
  border: 1px solid #e8e8ef

.condition-node
  display: flex
  align-items: center
  justify-content: center
  cursor: grab
  background-color: transparent
  user-select: none
  height: 70px
  margin-top: 10px
  background-image: url('../assets/diamond.svg')
  background-size: contain

.right-top
  position: absolute
  right: 10px
  top: 10px
</style>
