<template lang="pug">
.node.w-full.h-full.flex.items-center.justify-center.relative(
  :class='[data.type]'
)
  span Rule
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

  mounted() {
    this.res()
  },
}
</script>

<style lang="stylus" scoped>
.common
  background-color: #fff

.condition
  background-image: url('../assets/diamond.svg')
  background-size: contain
</style>
