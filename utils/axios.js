import axios from "axios";
import { Message } from "element-ui";
import StorageUtil from ".storage.js";
const service = axios.create({
  // baseURL: process.env.VUE_APP_API_URL,
  baseURL: "",
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});
// 请求队列
const pending = [];
// 取消方法
const { CancelToken } = axios;
const removePending = (config) => {
  for (const p in pending) {
    if (pending[p].url === `${config.url}&${config.method}`) {
      pending[p].f();
      pending.splice(p, 1);
    }
  }
};

// 设置默认请求头
service.defaults.headers.get["Content-Type"] = "application/x-www-form-urlencoded";
// request拦截器
service.interceptors.request.use(
  (config) => {
    const { url } = config;
    removePending(config);
    config.cancelToken = new CancelToken((c) => {
      pending.push({ url: `${config.url}&${config.method}`, f: c });
    });
    if (
      !url.includes("/auth/user/login") &&
      !url.includes("/service/user/user-management") &&
      !url.includes("/register") &&
      !url.includes("/retrieve")
    ) {
      const user = StorageUtil.localStorage.get("user");
      if (user) {
        config.headers["Authorization"] = user.Authorization;
      } else {
        window.open("/user", "_self");
      }
    }
    return config;
  },
  (error) => {
    Message({
      message: error,
      type: "error",
    });
    return Promise.reject(error);
  }
);

// response拦截器
service.interceptors.response.use(
  (response) => {
    removePending(response.config);
    const res = response.data;
    if (res.code === 401) {
      Message({
        message: res.msg,
        type: "error",
      });
      // 去登陆页
      window.open("/user", "_self");
    }
    if (res.code !== 0) {
      Message({
        message: res.msg,
        type: "error",
      });
      return Promise.reject(res.msg);
    }
    return res;
  },
  (error) => {
    if (axios.isCancel(error)) {
      return new Promise(() => {}); // 取消axios请求时不报错
    }
    const path = error.response && error.response.request.responseURL;
    if (
      error.response &&
      error.response.data &&
      (path.includes("login") || path.includes("register") || path.includes("retrieve") || path.includes("user/info"))
    ) {
      const res = error.response;
      if (res.status === 401 || res.status === 403 || res.status === 500 || res.status === 400) {
        Message({
          message: res.data.errmsg,
          type: "warning",
          duration: 5000,
          showClose: true,
          offset: 80,
        });
        return Promise.reject(error);
      }
    }
    httpErrorStatusHandle(error);
    return Promise.reject(error);
  }
);
function httpErrorStatusHandle(error) {
  let message = "";
  if (error && error.response) {
    switch (error.response.status) {
      case 302:
        message = "接口重定向了！";
        break;
      case 400:
        message = "参数不正确！";
        break;
      case 401:
        message = "您未登录，或者登录已经超时，请先登录！";
        break;
      case 403:
        message = "您没有权限操作！";
        break;
      case 404:
        message = `请求地址出错: ${error.response.config.url}`;
        break;
      case 408:
        message = "请求超时！";
        break;
      case 409:
        message = "系统已存在相同数据！";
        break;
      case 500:
        message = "服务器内部错误！";
        break;
      case 501:
        message = "服务未实现！";
        break;
      case 502:
        message = "网关错误！";
        break;
      case 503:
        message = "服务不可用！";
        break;
      case 504:
        message = "服务暂时无法访问，请稍后再试！";
        break;
      case 505:
        message = "HTTP版本不受支持！";
        break;
      default:
        message = "异常问题，请联系管理员！";
        break;
    }
  }
  if (error.message.includes("timeout")) message = "网络请求超时！";
  if (error.message.includes("Network")) message = window.navigator.onLine ? "服务端异常！" : "您断网了！";

  Message({
    message: message,
    type: "error",
    duration: 5000,
    showClose: true,
    offset: 80,
  });
}
export function post(url, parameter, config = null) {
  return new Promise((resolve, reject) => {
    service
      .post(url, parameter, config)
      .then(
        (response) => {
          resolve(response);
        },
        (err) => {
          reject(err);
        }
      )
      .catch((error) => {
        reject(error);
      });
  });
}

export function get(url, params, config = null) {
  // console.log(config);
  return new Promise((resolve, reject) => {
    service
      .get(url, {
        params: params,
        ...config,
      })
      .then(
        (response) => {
          resolve(response);
        },
        (err) => {
          reject(err);
        }
      )
      .catch((error) => {
        reject(error);
      });
  });
}

export function doDelete(url, params, config = null, data = null) {
  return new Promise((resolve, reject) => {
    service
      .delete(url, {
        params: params,
        data,
        ...config,
      })
      .then(
        (response) => {
          resolve(response);
        },
        (err) => {
          reject(err);
        }
      )
      .catch((error) => {
        reject(error);
      });
  });
}

export function doDelete1(url, params, config = null) {
  return new Promise((resolve, reject) => {
    service
      .delete(url, {
        data: params,
        ...config,
      })
      .then(
        (response) => {
          resolve(response);
        },
        (err) => {
          reject(err);
        }
      )
      .catch((error) => {
        reject(error);
      });
  });
}

export function put(url, parameter, config = null) {
  return new Promise((resolve, reject) => {
    service
      .put(url, parameter, config)
      .then(
        (response) => {
          resolve(response);
        },
        (err) => {
          reject(err);
        }
      )
      .catch((error) => {
        reject(error);
      });
  });
}

export function patch(url, parameter, config = null) {
  return new Promise((resolve, reject) => {
    service
      .patch(url, parameter, config)
      .then(
        (response) => {
          resolve(response);
        },
        (err) => {
          reject(err);
        }
      )
      .catch((error) => {
        reject(error);
      });
  });
}
export function file(url, parameter, config = null) {
  const formData = new FormData();
  Object.keys(parameter).forEach((v) => {
    formData.append(v, parameter[v]);
  });
  return new Promise((resolve, reject) => {
    service
      .post(url, formData, config)
      .then(
        (response) => {
          resolve(response);
        },
        (err) => {
          reject(err);
        }
      )
      .catch((error) => {
        reject(error);
      });
  });
}
export default service;
