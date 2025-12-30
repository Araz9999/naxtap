module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [
    // Your existing plugin: Remove console logs in production
    ...(process.env.NODE_ENV === 'production'
      ? [
        [
          'transform-remove-console',
          {
            exclude: ['error', 'warn'],
          },
        ],
      ]
      : []),
  ],
};
