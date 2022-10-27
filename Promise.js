const PROMISE_STATUS_PENDING = 'pending'
const PROMISE_STATUS_FULFILLED = 'fulfilled'
const PROMISE_STATUS_REJECTED = 'rejected'

function execFunctionWithCatchError(execFn, value, resolve, reject) {
  try {
    // 如果then方法中的onFulfilled或onRejected函数的返回值是一个Promise对象，
    // 那么Promise链中的下一个Promise对象的状态由该Promise对象进行接管
    const result = execFn(value)

    // 返回值可能是thenable对象、promise对象和其它值
    if (result instanceof HYPromise || result?.then instanceof Function)
      result.then(resolve, reject)
    else resolve(result)
  } catch (err) {
    reject(err)
  }
}

class HYPromise {
  constructor(executor) {
    this.status = PROMISE_STATUS_PENDING
    this.value = undefined
    this.reason = undefined
    this.onFulfilledFns = []
    this.onRejectedFns = []

    // 微任务会在本次事件循环最后执行，这就保证了promise对象能在
    // then方法的回调函数传入进来之后再更改状态
    // 内层的判断是为了防止在executor中同时执行resolve和reject
    // 方法，导致promise对象的状态多次发生改变
    const resolve = (value) => {
      if (this.status === PROMISE_STATUS_PENDING) {
        queueMicrotask(() => {
          if (this.status !== PROMISE_STATUS_PENDING) return
          this.status = PROMISE_STATUS_FULFILLED
          this.value = value
          this.onFulfilledFns.forEach((fn) => fn())
        })
      }
    }

    // resolve和reject函数都箭头函数，他们当中的this其实是外层this
    // 当promise对象的状态变为rejected时，就要判断它是否有相应的处理
    // 函数，如果没有,则抛出全局错误(在thenPromiseList中的除外)
    const reject = (reason) => {
      if (this.status === PROMISE_STATUS_PENDING) {
        queueMicrotask(() => {
          if (this.status !== PROMISE_STATUS_PENDING) return
          this.status = PROMISE_STATUS_REJECTED
          this.reason = reason
          if (this.onRejectedFns.length === 0) {
            throw new Error(reason)
          }
          this.onRejectedFns.forEach((fn) => fn())
        })
      }
    }

    // 如果捕获到executor中抛出了错误，则把状态转变为reject
    // 如果当前promise对象没有相应的处理函数，则直接抛出这个错误
    try {
      executor(resolve, reject)
    } catch (err) {
      reject(err)
    }
  }

  then(onFulfilled, onRejected) {
    // 设置默认reject处理函数，这是为了让处理函数中抛出的错误可以延着
    // promise链向后传递，直到找到reject处理函数
    const defaultOnRejected = (err) => {
      throw err
    }
    onRejected = onRejected || defaultOnRejected

    // 设置默认resolve处理函数，这是为了防止promise对象的状态变为
    // fulfilled，而我们没有定义resolve处理函数，这就会导致下面
    // if(onFulfilled)判断后,execFunctionWithCatchError函数不会
    // 执行，这就会造成promise对象的状态不会发生改变的问题
    const defaultOnFulfilled = (value) => {
      return value
    }
    onFulfilled = onFulfilled || defaultOnFulfilled

    return new HYPromise((resolve, reject) => {
      // 1.如果在then调用的时候, 状态已经确定下来了，那它传入的回调函
      // 数会被立即执行，就比如下面的代码。
      // 由于settimeout是宏任务，在宏任务执行之前会清除所有的微任务，
      // 因此在settimeout的回调函数执行时，p1的状态已经是fulfilled了
      // const p1 = new HYPromise(resolve => resolve("success"))
      // p1.then(res => console.log("res1", res))
      // setTimeout(() => {
      //   p1.then(res => console.log("res2", res))
      // }, 0);
      if (this.status === PROMISE_STATUS_FULFILLED && onFulfilled) {
        execFunctionWithCatchError(onFulfilled, this.value, resolve, reject)
      }
      if (this.status === PROMISE_STATUS_REJECTED && onRejected) {
        execFunctionWithCatchError(onRejected, this.reason, resolve, reject)
      }

      // 2.将成功回调和失败的回调放到数组中，等resolve或reject方法中的
      // 微任务执行时，再遍历这些回调函数，这样就能实现then方法的多次调用
      if (this.status === PROMISE_STATUS_PENDING) {
        if (onFulfilled) {
          this.onFulfilledFns.push(() => {
            execFunctionWithCatchError(onFulfilled, this.value, resolve, reject)
          })
        }
        if (onRejected) {
          this.onRejectedFns.push(() => {
            execFunctionWithCatchError(onRejected, this.reason, resolve, reject)
          })
        }
      }
    })
  }

  catch(onRejected) {
    return this.then(undefined, onRejected)
  }

  finally(onFinally) {
    this.then(
      () => {
        onFinally()
      },
      () => {
        onFinally()
      }
    )
  }

  static resolve(value) {
    return new HYPromise((resolve) => resolve(value))
  }

  static reject(reason) {
    return new HYPromise((resolve, reject) => reject(reason))
  }

  static all(promises) {
    // 问题关键: 什么时候要执行resolve, 什么时候要执行reject
    return new HYPromise((resolve, reject) => {
      const values = []
      promises.forEach((promise) => {
        promise.then(
          (res) => {
            values.push(res)
            if (values.length === promises.length) {
              resolve(values)
            }
          },
          (err) => {
            reject(err)
          }
        )
      })
    })
  }

  static allSettled(promises) {
    return new HYPromise((resolve) => {
      const results = []
      promises.forEach((promise) => {
        promise.then(
          (res) => {
            results.push({
              status: PROMISE_STATUS_FULFILLED,
              value: res
            })
            if (results.length === promises.length) {
              resolve(results)
            }
          },
          (err) => {
            results.push({
              status: PROMISE_STATUS_REJECTED,
              value: err
            })
            if (results.length === promises.length) {
              resolve(results)
            }
          }
        )
      })
    })
  }

  static race(promises) {
    return new HYPromise((resolve, reject) => {
      promises.forEach((promise) => {
        // promise.then(res => {
        //   resolve(res)
        // }, err => {
        //   reject(err)
        // })
        promise.then(resolve, reject)
      })
    })
  }

  static any(promises) {
    // resolve必须等到有一个成功的结果
    // reject所有的都失败才执行reject
    const reasons = []
    return new HYPromise((resolve, reject) => {
      promises.forEach((promise) => {
        promise.then(resolve, (err) => {
          reasons.push(err)
          if (reasons.length === promises.length) {
            reject(new AggregateError(reasons))
          }
        })
      })
    })
  }
}

const p1 = new HYPromise((resolve, reject) => {
  // throw new Error('err')
  setTimeout(() => {
    console.log('p0')
    resolve('p1')
  }, 1000)
})
// .then((res) => {
//   console.log(res);
// })
// .catch((err) => {
//   console.log(err.message);
// });
const p2 = p1
  .then((res) => {
    return new HYPromise((resolve, reject) => {
      // reject('err4')
      // throw new Error('err1')
      setTimeout(() => {
        console.log(res)
        resolve('p2')
      }, 1000)
    })
  })
  .then((res) => {
    return {
      then(resolve, reject) {
        reject('err3')
        // throw new Error('err2')
        setTimeout(() => {
          console.log(res)
          resolve('p3')
        }, 1000)
      }
    }
  })
const p3 = p2.catch((err) => {
  console.log(err)
})
