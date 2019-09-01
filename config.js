/* global module */
module.exports = {
  server: {
    port: 5061,
    fullhost: "https://drumgen.apollolms.co.za"
  },
  tmpdir: "/opt/app/tmpgen/",
  worksheet: {
    pageItems: 50
  },
  queue: {
    timeout: 1000 * 15,
    concurrency: 2
  }
};
