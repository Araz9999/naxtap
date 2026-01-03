// Mock superjson for tests
module.exports = {
  serialize: (obj) => JSON.stringify(obj),
  deserialize: (str) => JSON.parse(str),
  stringify: (obj) => JSON.stringify(obj),
  parse: (str) => JSON.parse(str),
  default: {
    serialize: (obj) => JSON.stringify(obj),
    deserialize: (str) => JSON.parse(str),
    stringify: (obj) => JSON.stringify(obj),
    parse: (str) => JSON.parse(str),
  },
};
