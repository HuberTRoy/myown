import {observable, observe } from './observable'

let p = observable({num: 0})
let j = observe(() => {console.log("i am computed:", p.num)})
let e = observe(() => {console.log("i am computed2:", p.num)})

p.num++