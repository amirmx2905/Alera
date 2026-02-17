module.exports = function (api) {
  const isTest = api.cache.using(
    () =>
      process.env.BABEL_ENV === "test" ||
      process.env.NODE_ENV === "test" ||
      Boolean(process.env.JEST_WORKER_ID),
  );

  return {
    presets: ["babel-preset-expo", !isTest && "nativewind/babel"].filter(
      Boolean,
    ),
  };
};
