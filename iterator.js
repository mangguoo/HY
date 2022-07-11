class Count {
  constructor(limit) {
    this.limit = limit;
  }

  [Symbol.iterator]() {
    let count = 1;
    const limit = this.limit;
    const result = {
      next() {
        if (count <= limit) {
          return { done: false, value: count++ };
        } else {
          return { done: true };
        }
      },
      return(value) {
        count = NaN;
        return { done: true, value };
      },
      [Symbol.iterator]() {
        return result;
      },
    };
    return result;
  }
}

const iter1 = new Count(5)[Symbol.iterator]();
for (const value of iter1) {
  if (value > 2) {
    break;
  }
  console.log(value);
}

for (const value of iter1) {
  console.log(value);
}
