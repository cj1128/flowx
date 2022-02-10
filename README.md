# Flowx

- `node.data` should be serializable, it will be deep-copied when you copy the node
  - will remove all properties start with `_`

## Change Log

0.6.2

- 添加 `sortKey` 用于同层级调整节点顺序
- 修改 `borderColor` 配置为 `outlineColor`，拖动时高亮由 border 改为 outline 实现

## Install

`npm install @cjting/flowx`

## API

- `new Flowx(options)`
- `async flowx.import()`
- `flowx.export()`
- `flowx.destory()`
