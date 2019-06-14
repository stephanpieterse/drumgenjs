/* global module */
module.exports = {
  server: {
    port: 5061
  },
  tmpdir: "/opt/app/tmpgen/",
  queue: {
    timeout: 1000 * 30,
    concurrency: 4
  }
};
