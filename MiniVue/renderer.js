const h = (tag, props, children) => {
    return {
        tag,
        props,
        children
    }
}

const mount = (vnode, container) => {
    // 1. 创建出真实的元素，并在vnode上保留el
    const el = vnode.el = document.createElement(vnode.tag)

    // 2. 处理props
    if (vnode.props) {
        for (const key in vnode.props) {
            const value = vnode.props[key]
            
            if (key.startsWith("on")) {
                el.addEventListener(key.slice(2).toLowerCase(), value)
            } else {
                el.setAttribute(key, value)
            }
        }
    }

    // 3. 处理children
    if (vnode.children) {
        if (typeof vnode.children === "string") {
            el.textContent = vnode.children
        } else {
            vnode.children.forEach(element => {
                mount(element, el)
            });
        }
    }

    // 将el挂载到container上
    container.appendChild(el)
}

const patch = (n1, n2) => {
    if (n1.tag !== n2.tag) {
        n1.el.n1ElParent = n1.el.parentElement
        n1ElParent.removeChild(n1.el)
        mount(n2, n1ElParent)
    } else {
        // 1. 取出element对象，并且在n2中进行保存
        const el = n2.el = n1.el
        
        // 2. 处理props
        const oldProps = n1.props || {};
        const newProps = n2.props || {};
        // 2.1 获取所有的newProps添加到el
        for (const key in newProps) {
            const newValue = newProps[key]
            const oldValue = oldProps[key]
            if (newValue !== oldValue) {
                if (key.startsWith("on")) {
                    // 先取消掉先前绑定的事件,再绑定新的事件
                    if (oldValue) el.removeEventListener(key.slice(2).toLowerCase(), oldValue)
                    el.addEventListener(key.slice(2).toLowerCase(), newValue)
                } else {
                    el.setAttribute(key, newValue)
                }
            }
        }
        // 2.2 删除旧的不再使用的props
        for (const key in oldProps) {
            if (!(key in newProps)) {
                if (key.startsWith("on")) {
                    const value = oldProps[key]
                    el.removeEventListener(key.slice(2).toLowerCase(), value)
                } else {
                    el.removeAttribute(key)
                }
            }
        }

        // 3. 处理children
        const oldChildren = n1.children || []
        const newChildren = n2.children || []
        if (typeof newChildren === "string") { // 情况一: newChildren是一个string
            if (typeof oldChildren === "string") {
                if (oldChildren !== newChildren) el.textContent = newChildren
            } else {
                el.innerHtml = newChildren
            }
        } else { // 情况二: newChildren是一个Array
            if (typeof oldChildren === "string") {
                el.innerHtml = ""
                newChildren.forEach(item => {
                    mount(item, el)
                })
            } else {
                /*******************************************************************
                 * 这里newChildren和oldChildren都是数组,分两种情况:                  *
                 * 1. oldChildren的长度大于newChildren,这里要先patch再卸载多余元素    *
                 * 2. oldChildren的长度小于newChildren,这里要先patch再挂载新元素      *
                 *******************************************************************/
                const commonLength = Math.min(oldChildren.length, newChildren.length)
                for (let i = 0; i < commonLength; i++) {
                    patch(oldChildren[i], newChildren[i])
                }

                if (newChildren.length < oldChildren.length) {
                    oldChildren.slice(newChildren.length).forEach(item => {
                        el.removeChild(item.el)
                    })
                }

                if (newChildren.length > oldChildren.length) {
                    newChildren.slice(oldChildren.length).forEach(item => {
                        mount(item, el)
                    })
                }
            }
        }
    }
}