const PROMISE_STATUS_PENDING = 'pending'
const PROMISE_STATUS_FULFILLED = 'fulfilled'
const PROMISE_STATUS_REJECTED = 'rejected'

function execFunctionWithCatchError(execFn, value, resolve, reject) {
    try {
        const result = execFn(value)
        // 如果then方法中的onFulfilled或onRejected函数的返回值是一个
        // Promise对象，那么Promise链中的下一个Promise对象的状态由该
        // Promise对象进行接管
         if (result instanceof HYPromise) {
            result.then(resolve, reject)
         } else {
            resolve(result)
         }
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

        const resolve = (value) => {
            if (this.status === PROMISE_STATUS_PENDING) {
                // 添加微任务
                queueMicrotask(() => {
                    if (this.status !== PROMISE_STATUS_PENDING) return
                    this.status = PROMISE_STATUS_FULFILLED
                    this.value = value
                    this.onFulfilledFns.forEach(fn => {
                        fn(this.value)
                    })
                });
            }
        }

        const reject = (reason) => {
            if (this.status === PROMISE_STATUS_PENDING) {
                // 添加微任务
                queueMicrotask(() => {
                    if (this.status !== PROMISE_STATUS_PENDING) return
                    this.status = PROMISE_STATUS_REJECTED
                    this.reason = reason
                    this.onRejectedFns.forEach(fn => {
                        fn(this.reason)
                    })
                })
            }
        }

        try {
            executor(resolve, reject)
        } catch (err) {
            reject(err)
        }
    }

    then(onFulfilled, onRejected) {
        const defaultOnRejected = err => {
            throw err
        }
        onRejected = onRejected || defaultOnRejected

        const defaultOnFulfilled = value => {
            return value
        }
        onFulfilled = onFulfilled || defaultOnFulfilled

        return new HYPromise((resolve, reject) => {
            // 1.如果在then调用的时候, 状态已经确定下来
            if (this.status === PROMISE_STATUS_FULFILLED && onFulfilled) {
                execFunctionWithCatchError(onFulfilled, this.value, resolve, reject)
            }
            if (this.status === PROMISE_STATUS_REJECTED && onRejected) {
                execFunctionWithCatchError(onRejected, this.reason, resolve, reject)
            }

            // 2.将成功回调和失败的回调放到数组中
            if (this.status === PROMISE_STATUS_PENDING) {
                if (onFulfilled) this.onFulfilledFns.push(() => {
                    execFunctionWithCatchError(onFulfilled, this.value, resolve, reject)
                })
                if (onRejected) this.onRejectedFns.push(() => {
                    execFunctionWithCatchError(onRejected, this.reason, resolve, reject)
                })
            }
        })
    }

    catch (onRejected) {
        return this.then(undefined, onRejected)
    } finally(onFinally) {
        this.then(() => {
            onFinally()
        }, () => {
            onFinally()
        })
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
            promises.forEach(promise => {
                promise.then(res => {
                    values.push(res)
                    if (values.length === promises.length) {
                        resolve(values)
                    }
                }, err => {
                    reject(err)
                })
            })
        })
    }

    static allSettled(promises) {
        return new HYPromise((resolve) => {
            const results = []
            promises.forEach(promise => {
                promise.then(res => {
                    results.push({
                        status: PROMISE_STATUS_FULFILLED,
                        value: res
                    })
                    if (results.length === promises.length) {
                        resolve(results)
                    }
                }, err => {
                    results.push({
                        status: PROMISE_STATUS_REJECTED,
                        value: err
                    })
                    if (results.length === promises.length) {
                        resolve(results)
                    }
                })
            })
        })
    }

    static race(promises) {
        return new HYPromise((resolve, reject) => {
            promises.forEach(promise => {
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
            promises.forEach(promise => {
                promise.then(resolve, err => {
                    reasons.push(err)
                    if (reasons.length === promises.length) {
                        reject(new AggregateError(reasons))
                    }
                })
            })
        })
    }
}

const p1 = new HYPromise((resolve) => {
    setTimeout(() => {
        console.log(1)
        resolve(2)
    }, 3000)
})

p1.then(res => {
    return new HYPromise((resolve) => {
        setTimeout(() => {
            console.log(res)
            resolve(3)
        }, 3000)
    })
}).then(res => {
    return new HYPromise((resolve) => {
        setTimeout(() => {
            console.log(res)
            resolve(4)
        }, 3000)
    })
}).then(res => {
    console.log(res)
})