// global event bus
import Vue from 'vue'

const bus = new Vue()

export const on = (evt, cb) => {
  bus.$on(evt, cb)
}

export const emit = (evt, ...payload) => {
  bus.$emit(evt, ...payload)
}
