export default class Promise1 {
  static PENDING = 'pending'
  static FULFILLED = 'fulfilled'
  static REJECTED = 'rejected'
  status
  value
  reason
  onFulfilledCallbacks = []
  onRejectedCallbacks = []
  constructor(executor) {
    this.status = Promise1.PENDING
    // 捕获在executor执行器中抛出的异常
    // new Promise((resolve, reject) => {
    //     throw new Error('error in executor')
    // })
    try {
      executor(this.resolve.bind(this), this.reject.bind(this))
    } catch (e) {
      this.reject(e)
    }
  }

  resolve(value) {
    if (value instanceof Promise1) {
      return value.then(this.resolve, this.reject)
    }
    // 为什么resolve 加setTimeout?
    // 2.2.4规范 onFulfilled 和 onRejected 只允许在 execution context 栈仅包含平台代码时运行.
    // 注1 这里的平台代码指的是引擎、环境以及 promise 的实施代码。实践中要确保 onFulfilled 和
    // onRejected 方法异步执行，且应该在 then 方法被调用的那一轮事件循环之后的新执行栈中执行。
    setTimeout(() => {
      if (this.status !== Promise1.PENDING) return
      this.status = Promise1.FULFILLED
      this.value = value
      this.onFulfilledCallbacks.forEach((cb) => cb(this.value))
    })
  }

  reject(reason) {
    setTimeout(() => {
      // 调用reject 回调对应onRejected函数
      if (this.status !== Promise1.PENDING) return
      // 只能由pending状态 => rejected状态 (避免调用多次resolve reject)
      this.status = Promise1.REJECTED
      this.reason = reason
      this.onRejectedCallbacks.forEach((cb) => cb(this.reason))
    })
  }

  /**
   * resolve中的值几种情况：
   * 1.普通值
   * 2.promise对象
   * 3.thenable对象/函数
   */
  /**
   * 对resolve 进行改造增强 针对resolve中不同值情况 进行处理
   * @param  {promise} promise2 promise1.then方法返回的新的promise对象
   * @param  {[type]} x         promise1中onFulfilled的返回值
   * @param  {[type]} resolve   promise2的resolve方法
   * @param  {[type]} reject    promise2的reject方法
   */
  resolvePromise(promise2, x, resolve, reject) {
    if (promise2 === x) return reject(new TypeError('循环引用'))
    let called = false // 避免多次调用
    // 如果x是一个promise对象 （该判断和下面 判断是不是thenable对象重复 所以可有可无）
    if (x instanceof Promise1) {
      // 获得它的终值 继续resolve
      if (x.status === Promise1.PENDING) {
        // 如果为等待态需等待直至 x 被执行或拒绝 并解析y值
        x.then(
          (y) => {
            this.resolvePromise(promise2, y, resolve, reject)
          },
          (reason) => {
            reject(reason)
          }
        )
      } else {
        // 如果 x 已经处于执行态/拒绝态(值已经被解析为普通值)，用相同的值执行传递下去 promise
        x.then(resolve, reject)
      }
      // 如果 x 为对象或者函数
    } else if (x != null && (typeof x === 'object' || typeof x === 'function')) {
      try {
        // 是否是thenable对象（具有then方法的对象/函数）
        let then = x.then
        if (typeof then === 'function') {
          then.call(
            x,
            (y) => {
              if (called) return
              called = true
              this.resolvePromise(promise2, y, resolve, reject)
            },
            (reason) => {
              if (called) return
              called = true
              reject(reason)
            }
          )
        } else {
          // 说明是一个普通对象/函数
          resolve(x)
        }
      } catch (e) {
        if (called) return
        called = true
        reject(e)
      }
    } else {
      resolve(x)
    }
  }

  /**
   * [注册fulfilled状态/rejected状态对应的回调函数]
   * @param  {function} onFulfilled fulfilled状态时 执行的函数
   * @param  {function} onRejected  rejected状态时 执行的函数
   * @return {function} newPromise  返回一个新的promise对象
   */
  then(onFulfilled, onRejected) {
    let newPromise
    // 处理参数默认值 保证参数后续能够继续执行
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : (value) => value
    onRejected =
      typeof onRejected === 'function'
        ? onRejected
        : (reason) => {
            throw reason
          }
    // then里面的FULFILLED/REJECTED状态时 为什么要加setTimeout ?
    // 其一 2.2.4规范 要确保 onFulfilled 和 onRejected 方法异步执行(且应该在 then
    //  方法被调用的那一轮事件循环之后的新执行栈中执行) 所以要在resolve里加上setTimeout
    // 其二 2.2.6规范 也是resolve函数里加setTimeout的原因
    //  总之都是 让then方法异步执行 也就是确保onFulfilled/onRejected异步执行
    //  如下面这种情景 多次调用p1.then
    //  p1.then((value) => { // 此时p1.status 由pending状态 => fulfilled状态
    //      console.log(value); // resolve
    //      // console.log(p1.status); // fulfilled
    //      p1.then(value => { // 再次p1.then 这时已经为fulfilled状态 走的是fulfilled状态判断里的逻辑 所以我们也要确保判断里面onFulfilled异步执行
    //          console.log(value); // 'resolve'
    //      });
    //      console.log('当前执行栈中同步代码');
    //  })
    // console.log('全局执行栈中同步代码');
    if (this.status === Promise1.FULFILLED) {
      return (newPromise = new Promise1((resolve, reject) => {
        setTimeout(() => {
          try {
            let x = onFulfilled(this.value)
            // 新的promise resolve 上一个onFulfilled的返回值
            this.resolvePromise(newPromise, x, resolve, reject)
          } catch (e) {
            // 捕获前面onFulfilled中抛出的异常 then(onFulfilled, onRejected);
            reject(e)
          }
        })
      }))
    }
    if (this.status === Promise1.REJECTED) {
      return (newPromise = new Promise1((resolve, reject) => {
        setTimeout(() => {
          try {
            let x = onRejected(that.reason)
            this.resolvePromise(newPromise, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      }))
    }

    if (this.status === Promise1.PENDING) {
      // 等待态：当异步调用resolve/rejected时 将onFulfilled/onRejected收集暂存到集合中
      return (newPromise = new Promise1((resolve, reject) => {
        this.onFulfilledCallbacks.push((value) => {
          try {
            let x = onFulfilled(value)
            this.resolvePromise(newPromise, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
        this.onRejectedCallbacks.push((reason) => {
          try {
            let x = onRejected(reason)
            this.resolvePromise(newPromise, x, resolve, reject)
          } catch (e) {
            reject(e)
          }
        })
      }))
    }
  }

  // 用于promise方法链时 捕获前面onFulfilled/onRejected抛出的异常
  catch(onRejected) {
    return this.then(null, onRejected)
  }

  /**
   * Promise.all Promise进行并行处理
   * 参数: promise对象组成的数组作为参数
   * 返回值: 返回一个Promise实例
   * 当这个数组里的所有promise对象全部变为resolve状态的时候，才会resolve。
   */
  static all(promises) {
    return new Promise1((resolve, reject) => {
      let done = Promise1.gen(promises.length, resolve)
      promises.forEach((promise, index) => {
        promise.then((value) => {
          done(index, value)
        }, reject)
      })
    })
  }

  static gen(length, resolve) {
    let count = 0
    let values = []
    return function (i, value) {
      values[i] = value
      if (++count === length) {
        resolve(values)
      }
    }
  }

  /**
   * Promise.race
   * 参数: 接收 promise对象组成的数组作为参数
   * 返回值: 返回一个Promise实例
   * 只要有一个promise对象进入 FulFilled 或者 Rejected 状态的话，就会继续进行后面的处理(取决于哪一个更快)
   */
  static race(promises) {
    return new Promise1((resolve, reject) => {
      promises.forEach((promise, index) => {
        promise.then(resolve, reject)
      })
    })
  }

  static resolve(value) {
    return new Promise((resolve) => {
      resolve(value)
    })
  }

  static reject(reason) {
    return new Promise1((resolve, reject) => {
      reject(reason)
    })
  }

  /**
   * 基于Promise实现Deferred的
   * Deferred和Promise的关系
   * - Deferred 拥有 Promise
   * - Deferred 具备对 Promise的状态进行操作的特权方法（resolve reject）
   *
   */
  static deferred() {
    let defer = {}
    defer.promise = new Promise1((resolve, reject) => {
      defer.resolve = resolve
      defer.reject = reject
    })
    return defer
  }
}
