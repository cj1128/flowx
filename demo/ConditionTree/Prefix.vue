<template lang="pug">
.prefix.cursor-pointer(
  v-if='parent?.data.type === "condition"'
  @click='isYes = !isYes'
) {{ isYes ? "Y" : "N" }}
</template>

<script>
import { on } from './bus'

const findParent = (tree, id, parent) => {
  if (tree.id === id) {
    return parent
  }

  for (const c of tree.children) {
    const parent = findParent(c, id, tree)
    if (parent) return parent
  }
}

export default {
  props: {
    id: String,
    isRoot: Boolean,
    data: Object,
    res: Function,
  },

  data() {
    return {
      parent: null,
      isYes: true,
    }
  },

  mounted() {
    on('flowx-update', () => {
      this.parent = findParent(_flowx.export().tree, this.id)
    })

    this.res()
  },
}
</script>

<style lang="stylus" scoped></style>
