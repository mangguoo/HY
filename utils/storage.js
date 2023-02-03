class Storage {
  static _sessionStorage = null;
  static _localStorage = null;

  constructor(attrName = "session") {
    this.attrName = attrName + "Storage";
  }

  // 使用单例模式，保证整个应用中只有一个Storage实例，避免重复创建
  static get sessionStorage() {
    if (!Storage._sessionStorage) {
      Storage._sessionStorage = new Storage("session");
    }
    return Storage._sessionStorage;
  }

  static get localStorage() {
    if (!Storage._localStorage) {
      Storage._localStorage = new Storage("local");
    }
    return Storage._localStorage;
  }

  set(key, value) {
    if (/(Array|Object)/.test({}.toString.call(value))) {
      value = JSON.stringify(value);
    }
    if (typeof value !== "string" && typeof value !== "number") {
      throw new Error("存储的类型只能为 数组、对象、数字、字符串");
    }
    window[this.attrName].setItem(key, value);
  }

  get(key, defaultValue = "") {
    let value = window[this.attrName].getItem(key);
    if (value) {
      // 对象或数组 { 或 [开头
      if (/^\{|\[/.test(value)) {
        value = JSON.parse(value);
      }
      return value;
    }
    return defaultValue;
  }

  remove(key) {
    window[this.attrName].getItem(key) && window[this.attrName].removeItem(key);
  }

  has(key) {
    return window[this.attrName].getItem(key) ? true : false;
  }
}

export default Storage;
