Function.prototype.hybind = function (thisArg, ...args1) {
  //1、获取需要被执行的函数发
  var fn = this

  //2、把thisArg转成对象类型（防止它传入非对象类型）
  //   同时保证传入null、undefind时把它绑定到window上
  thisArg = thisArg === null || thisArg === undefined ? Object(thisArg) : window

  //3、返回函数运行结果
  return function proxyFn(...args2) {
    thisArg.fn = fn
    var finalArgs = [...args1, ...args2]
    var result = thisArg.fn(...finalArgs)
    delete thisArg.fn
    return result
  }
}
