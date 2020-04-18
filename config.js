/* global module */
module.exports = {
    server: {
        port: 5061,
        fullhost: "https://drumgen.apollolms.co.za"
    },
    tmpdir: "/opt/app/tmpgen/",
    tmpCleanupInterval: ( 1 * 60 * 1000), // 1 minutes
    tmpMaxAge: (6 * 60 * 60), // 6 hour
    tmpSizeOverMaxAge: (30), // 30 seconds
    tmpSizeLimit: (300 * 1024 ), // 300mb 
    worksheet: {
        pageItems: 20
    },
    queue: {
        timeout: 1000 * 5,
        concurrency: 2
    }
};
