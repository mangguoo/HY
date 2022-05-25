class Dep {
    constructor() {
        this.subscribers = new Set();
    }
    depend() {
        if (activeEffect) {
            this.subscribers.add(activeEffect);
        }
    }
    notify() {
        this.subscribers.forEach(effect => {
            effect();
        })
    }
}

let activeEffect = null;
function watchEffect(effect) {
    activeEffect = effect;
    effect();
    activeEffect = null;
}

const targetMap = new WeakMap();
function getDep(target, key) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }

    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Dep();
        depsMap.set(key, dep);
    }
    return dep;
}

/***************************************************************
 * Vue3的数据劫持                                              *
 * 使用Proxy进行数据劫持时可以在setter中直接对代理对象进行修改     *
 * 而不会造成死循环，这是因为只有对Proxy对象进行set操作才会触      *
 * 发setter函数调用，而操作target其实是直接对原对象进行操作。      *
 ***************************************************************/
function reactive(raw) {
    return new Proxy(raw, {
        get(target, key) {
            const dep = getDep(target, key);
            dep.depend();
            return target[key];
        },
        set(target, key, newValue) {
            const dep = getDep(target, key);
            target[key] = newValue;
            dep.notify();
        }
    })
}

/************************************************************
 * Vue2的数据劫持                                            *
 * 通过defineProperty方法对对象进行数据劫持时，不能在setter    *
 * 函数中直接对原对象进行修改操作，这会造成程序死循环。          *
 ************************************************************/
function reactive(raw) {
    Object.keys(raw).forEach(key => {
        const dep = getDep(raw, key);
        let value = raw[key];
        Object.defineProperty(raw, key, {
            get() {
                dep.depend();
                return value;
            },
            set(newValue) {
                if (value !== newValue) {
                    value = newValue;
                    dep.notify();
                }
            }
        })
    })
    return raw;
}