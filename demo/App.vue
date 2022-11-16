<template lang="pug">
el-container(style='height: 100vh')
  el-aside(
    width='200px'
    style='background-color: white'
  )
    el-menu(
      default-active='/'
      router
    )
      el-menu-item(index='/') Basic
      el-menu-item(index='/condition-tree') Condition Tree

  el-container
    router-view
</template>

<script>
export default {}
</script>

<style lang="stylus" scoped></style>
