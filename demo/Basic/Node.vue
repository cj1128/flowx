<template lang="pug">
.node(
  style='height: 100%; width: 100%'
  @dblclick='() => $emit("open-drawer")'
)
  .py-2
    el-select(
      v-model='rule'
      placeholder='请选择'
      @mousedown.native.stop
    )
      el-option(
        v-for='item in 10'
        :key='item'
        :label='item'
        :value='item'
      )

  el-radio(
    v-model='triggered'
    label='triggerd'
  )
  el-radio(
    v-model='triggered'
    label='not triggerd'
  )

  .flex
    el-button(
      v-if='!isRoot'
      @click='onDelete'
      style='margin-right: 8px'
    ) delete one
    el-button(@click='onDeleteSub') delete sub
</template>

<script>
export default {
  props: {
    data: Object,
    id: String,
    isRoot: Boolean,
    res: Function,
    rej: Function,
  },

  data() {
    return {
      rule: this.data.id,
      triggered: '',
    }
  },

  mounted() {
    this.res()
  },

  methods: {
    onDelete() {
      _flowx.removeNode(this.id)
    },

    onDeleteSub() {
      _flowx.removeSubTree(this.id)
    },
  },
}
</script>

<style lang="stylus" scoped>
.node
  background-color: #fff
  box-shadow: 0px 4px 30px rgb(22 33 74 / 5%)
</style>
