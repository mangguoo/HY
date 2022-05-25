function throttle(fn, interval, options = {
    leading: true,
    trailing: false
}) {
    const {
        leading,
        trailing,
        resultCallback
    } = options
    let lastTime = 0
    let timer = null

    const _throttle = function (...args) {
        return new Promise((resolve, reject) => {
            const nowTime = new Date().getTime()
            if (lastTime == 0 && leading == false) lastTime = nowTime

            // 使用当前触发的时间和之前的时间间隔以及上一次开始的时间
            // 计算出还剩余多长事件需要去触发函数
            const remainTime = interval - (nowTime - lastTime)
            if (remainTime <= 0) {
                if (timer) {
                    clearTimeout(timer)
                    timer = null
                }

                const result = fn.apply(this, args)
                if (resultCallback) resultCallback(result)
                resolve(result)
                // 保留上次触发的时间
                lastTime = nowTime
                return
            }

            if (trailing && !timer) {
                timer = setTimeout(() => {
                    timer = null
                    lastTime = !leading ? 0 : new Date().getTime()
                    const result = fn.apply(this, args)
                    if (resultCallback) resultCallback(result)
                    resolve(result)
                }, remainTime)
            }
        })
    }

    _throttle.cancel = function () {
        if (timer) clearTimeout(timer)
        timer = null
        lastTime = 0
    }

    return _throttle
}