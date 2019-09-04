/* global module */
module.exports = {
    server: {
        port: 5061,
        fullhost: "https://drumgen.apollolms.co.za"
    },
    tmpdir: "/opt/app/tmpgen/",
    tmpCleanupInterval: ( 5 * 60 * 1000), // 5 minutes
    tmpMaxAge: (1 * 60 * 60), // 1 hour
    worksheet: {
        pageItems: 20
    },
    queue: {
        timeout: 1000 * 10,
        concurrency: 2
    }
};
