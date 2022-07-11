Function.prototype.hycall = function (thisArg, ...args) {
  //1、获取需要被执行的函数
  var fn = this;

  //2、把thisArg转成对象类型（防止它传入非对象类型）
  //   同时保证传入null、undefind时把它绑定到window上
  thisArg =
    thisArg !== null && thisArg !== undefined ? Object(thisArg) : window;

  //3、调用需要被执行的函数
  thisArg.fn = fn;
  var result = thisArg.fn(...args);
  //这样会在传入的thisArg中添加一个属性fn
  delete thisArg.fn;

  //4、返回函数运行结果
  return result;
};
